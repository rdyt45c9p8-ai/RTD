/* ===== ランキング（オンライン共有） =====
 * 1. claude.ai の Artifact として開いたとき … 共有データベース（db）でみんなと競う
 * 2. server.js で配信したとき             … /api/scores でみんなと競う
 * 3. ファイルを直接ひらいたとき           … このブラウザの中だけで記録
 */
const Store = {
  get(k, d) { try { const v = localStorage.getItem('mg50.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mg50.' + k, JSON.stringify(v)); } catch (e) { /* 保存できない環境では何もしない */ } },
};

const Net = {
  mode: 'local',          // 'online' | 'view' | 'server' | 'local'
  status: '準備中…',
  note: '',
  rows: [],               // [{uid, nick, best:{gameId:score}}]
  uid: null,
  nick: '',
  local: {},
  listeners: [],
  db: null,
  chain: Promise.resolve(),

  on(f) { this.listeners.push(f); },
  emit() { this.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },

  clean(uid, d) {
    const best = {};
    if (d && typeof d.best === 'object' && d.best) for (const g of GAMES) { const v = d.best[g.id]; if (typeof v === 'number' && isFinite(v) && v > 0) best[g.id] = Math.min(Math.floor(v), 1e9); }
    return { uid: String(uid), nick: String((d && d.nick) || 'ななしさん').slice(0, 12), best };
  },
  mine() { return this.rows.find(r => r.uid === this.uid) || null; },
  myBest(g) { const m = this.mine(); return Math.max(this.local[g] || 0, (m && m.best[g]) || 0); },
  ranking(g) { return this.rows.filter(r => r.best[g] > 0).sort((a, b) => b.best[g] - a.best[g]); },
  isOnline() { return this.mode === 'online' || this.mode === 'server' || this.mode === 'view'; },

  async init() {
    this.local = Store.get('best', {}) || {};
    this.nick = Store.get('nick', '') || ('プレイヤー' + ri(100, 999));
    Store.set('nick', this.nick);
    if (await this.initArtifact()) return;
    if (await this.initServer()) return;
    this.mode = 'local'; this.status = 'このブラウザだけで記録中';
    this.syncLocalRows(); this.emit();
  },
  syncLocalRows() {
    if (this.mode !== 'local') return;
    this.uid = 'me';
    this.rows = [{ uid: 'me', nick: this.nick, best: { ...this.local } }];
  },

  /* ---- claude.ai Artifact の共有データベース ---- */
  async initArtifact() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== 'function') return false;
    this.status = 'ランキングに接続中…'; this.emit();
    let db = null, user = null;
    try { [db, user] = await Promise.all([cl.use('db'), cl.use('user')]); } catch (e) { db = null; }
    if (!db) { this.mode = 'local'; this.status = 'このブラウザだけで記録中'; this.note = 'サインインするとオンラインランキングに参加できます'; this.syncLocalRows(); this.emit(); return true; }
    this.db = db;
    this.uid = user ? await user.id() : null;
    let canWrite = null;
    try { canWrite = user ? await user.can('data.write') : null; } catch (e) { canWrite = null; }
    this.mode = this.uid && canWrite !== false ? 'online' : 'view';
    this.status = this.mode === 'online' ? 'オンライン' : 'オンライン（見るだけ）';
    if (this.mode === 'view') this.note = 'このリンクではランキングを見ることだけできます。記録はこのブラウザに残ります';
    const timer = setTimeout(() => { this.note = 'ランキングにまだつながりません。しばらく待つと表示されます'; this.emit(); }, 10000);
    let merged = false;
    db.collection('scores').limit(1000).onSnapshot(snap => {
      if (!snap.metadata.fromCache) { clearTimeout(timer); if (this.note.startsWith('ランキングにまだ')) this.note = ''; }
      this.rows = snap.docs.filter(d => d.exists).map(d => this.clean(d.id, d.data()));
      this.emit();
      if (!merged && !snap.metadata.fromCache) { merged = true; this.mergeLocal(); }
    }, e => {
      clearTimeout(timer); this.note = 'ランキングを読みこめませんでした。ページを開きなおしてください'; this.emit();
    });
    this.emit();
    return true;
  },
  /* このブラウザにしかない自己ベストがあれば、オンラインにも登録する */
  mergeLocal() {
    if (this.mode !== 'online') return;
    const m = this.mine(), best = { ...((m && m.best) || {}) }; let changed = false;
    for (const g in this.local) if (GAMES.some(x => x.id === g) && this.local[g] > (best[g] || 0)) { best[g] = this.local[g]; changed = true; }
    if (changed) this.writeMine(best);
  },
  writeMine(best) {
    const uid = this.uid;
    this.chain = this.chain.then(async () => {
      try { await this.db.doc('scores/' + uid).set({ nick: this.nick, best, upd: Date.now() }); }
      catch (e) {
        if (e && e.code === 'invalid_argument') { this.mode = 'view'; this.status = 'オンライン（見るだけ）'; this.note = 'このリンクでは記録を送れません。記録はこのブラウザに残ります'; }
        else if (e && e.code === 'quota_exceeded') this.note = 'ランキングの保存容量がいっぱいです';
        else this.note = '記録を送れませんでした。通信状態を確認してください';
        this.emit();
      }
    });
    return this.chain;
  },

  /* ---- 付属の server.js ---- */
  async initServer() {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      this.secret = Store.get('secret', null);
      if (!this.secret) { this.secret = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); Store.set('secret', this.secret); }
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch('api/scores', { headers: { 'X-Player': this.secret }, cache: 'no-store', signal: ctl.signal });
      clearTimeout(tm);
      if (!r.ok) return false;
      const j = await r.json(); if (!j || !Array.isArray(j.rows)) return false;
      this.mode = 'server'; this.status = 'オンライン'; this.applyServer(j);
      setInterval(() => this.pollServer(), 5000);
      this.pushLocalToServer();
      return true;
    } catch (e) { return false; }
  },
  applyServer(j) { this.uid = j.you; this.rows = j.rows.map(r => this.clean(r.uid, r)); this.emit(); },
  async pollServer() {
    try { const r = await fetch('api/scores', { headers: { 'X-Player': this.secret }, cache: 'no-store' }); if (r.ok) { this.applyServer(await r.json()); if (this.note.startsWith('サーバー')) this.note = ''; } }
    catch (e) { this.note = 'サーバーにつながりません'; this.emit(); }
  },
  async postServer(game, score) {
    try {
      const r = await fetch('api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Player': this.secret }, body: JSON.stringify({ nick: this.nick, game, score }) });
      if (r.ok) this.applyServer(await r.json());
    } catch (e) { this.note = 'サーバーに記録を送れませんでした'; this.emit(); }
  },
  pushLocalToServer() { const m = this.mine(); for (const g in this.local) if (this.local[g] > ((m && m.best[g]) || 0)) this.postServer(g, this.local[g]); },

  /* ---- 共通 ---- */
  submit(g, score) {
    score = Math.floor(score);
    if (score <= 0) return false;
    let newBest = false;
    if (score > (this.local[g] || 0)) { this.local[g] = score; Store.set('best', this.local); }
    if (this.mode === 'online') {
      const m = this.mine(), best = { ...((m && m.best) || {}) };
      if (score > (best[g] || 0)) { newBest = true; best[g] = score; this.writeMine(best); }
    } else if (this.mode === 'server') {
      const m = this.mine(); if (score > ((m && m.best[g]) || 0)) { newBest = true; this.postServer(g, score); }
    } else if (this.mode === 'local') { this.syncLocalRows(); }
    this.emit();
    return newBest;
  },
  setNick(n) {
    n = String(n || '').trim().slice(0, 12); if (!n || n === this.nick) return;
    this.nick = n; Store.set('nick', n);
    clearTimeout(this.nickT);
    this.nickT = setTimeout(() => {
      const m = this.mine();
      if (this.mode === 'online' && m && Object.keys(m.best).length) this.writeMine({ ...m.best });
      if (this.mode === 'server' && m) { const g = Object.keys(m.best)[0]; if (g) this.postServer(g, m.best[g]); }
      if (this.mode === 'local') { this.syncLocalRows(); this.emit(); }
    }, 900);
  },
  /* 総合ランキング：各ゲームのトップ10に入ると 1位10点〜10位1点 */
  overall() {
    const pts = {}, cnt = {};
    for (const g of GAMES) this.ranking(g.id).slice(0, 10).forEach((r, i) => { pts[r.uid] = (pts[r.uid] || 0) + 10 - i; });
    for (const r of this.rows) cnt[r.uid] = Object.keys(r.best).length;
    return this.rows.filter(r => cnt[r.uid] > 0).map(r => ({ r, p: pts[r.uid] || 0, n: cnt[r.uid] })).sort((a, b) => b.p - a.p || b.n - a.n).slice(0, 50);
  },
};

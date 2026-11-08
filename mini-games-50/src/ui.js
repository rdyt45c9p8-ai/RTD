/* ===== 画面まわり ===== */
(function () {
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
  const no = i => 'No.' + String(i + 1).padStart(2, '0');
  const CATS = ['すべて', 'アクション', 'パズル', '反射', '頭脳', '運'];
  let filter = Store.get('filter', 'すべて'); if (!CATS.includes(filter)) filter = 'すべて';
  let cur = null, curIdx = -1, lastResult = null;
  let showPad = Store.get('pad', null);
  if (showPad == null) showPad = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---- 一覧 ---- */
  function buildFilters() {
    const box = $('filters'); box.textContent = '';
    for (const c of CATS) {
      const b = el('button', 'fchip', c); b.type = 'button'; b.setAttribute('aria-pressed', String(c === filter));
      if (c !== 'すべて') b.dataset.cat = c;
      b.onclick = () => { filter = c; Store.set('filter', c); buildFilters(); renderGrid(); };
      box.appendChild(b);
    }
  }
  function renderGrid() {
    const grid = $('grid'); grid.textContent = '';
    GAMES.forEach((g, i) => {
      if (filter !== 'すべて' && g.cat !== filter) return;
      const b = el('button', 'cart'); b.type = 'button'; b.dataset.cat = g.cat;
      const top = el('div', 'no'); top.append(el('span', '', no(i)), el('span', '', g.cat));
      const dl = el('dl');
      const top1 = Net.ranking(g.id)[0];
      dl.append(el('dt', '', '自己ベスト'), el('dd', '', Net.myBest(g.id) ? fmt(Net.myBest(g.id)) : '—'));
      if (Net.isOnline()) {
        const dd = el('dd');
        if (top1) dd.append(document.createTextNode(fmt(top1.best[g.id]) + ' '), el('small', '', top1.nick)); else dd.textContent = '—';
        dl.append(el('dt', '', '1位'), dd);
      }
      b.append(top, el('h3', '', g.name), el('p', 'd', g.desc), dl);
      b.onclick = () => { location.hash = 'g-' + g.id; };
      grid.appendChild(b);
    });
  }
  function renderOverall() {
    const tb = $('overallBody'); tb.textContent = '';
    const list = Net.overall();
    if (!list.length) { const tr = el('tr'); const td = el('td', '', 'まだ記録がありません。好きなゲームで遊ぶと、ここに名前がのります。'); td.colSpan = 4; tr.append(td); tb.append(tr); return; }
    list.forEach((x, i) => {
      const tr = el('tr', x.r.uid === Net.uid ? 'me' : '');
      const m = el('span', 'medal' + (i < 3 ? ' m' + (i + 1) : ''), i + 1);
      const td0 = el('td'); td0.append(m);
      tr.append(td0, el('td', '', x.r.nick + (x.r.uid === Net.uid ? '（あなた）' : '')), el('td', 'n', fmt(x.p)), el('td', 'n', x.n + ' / 50'));
      tb.append(tr);
    });
  }
  function setTab(rank) {
    $('tabGames').setAttribute('aria-selected', String(!rank)); $('tabRank').setAttribute('aria-selected', String(rank));
    $('grid').hidden = rank; $('filters').hidden = rank; $('overall').hidden = !rank;
    if (rank) renderOverall();
  }

  /* ---- プレイ画面 ---- */
  function open(id) {
    const i = GAMES.findIndex(g => g.id === id); if (i < 0) { showHome(); return; }
    cur = GAMES[i]; curIdx = i; lastResult = null;
    $('home').hidden = true; $('play').hidden = false; document.body.classList.add('playing');
    $('pNo').textContent = no(i) + ' ・ ' + cur.cat; $('pName').textContent = cur.name; $('pHelp').textContent = cur.help;
    document.title = cur.name + '｜ミニゲーム50';
    Engine.load(cur); setupPad(); renderBoard(); overlay('ready');
    window.scrollTo(0, 0);
  }
  function showHome() {
    Engine.stop(); cur = null;
    $('play').hidden = true; $('home').hidden = false; document.body.classList.remove('playing'); document.title = 'ミニゲーム50';
    renderGrid(); if (!$('overall').hidden) renderOverall();
  }
  function route() { const h = location.hash.replace('#', ''); if (h.startsWith('g-')) open(h.slice(2)); else showHome(); }

  function overlay(kind) {
    const ov = $('ov'); ov.textContent = ''; ov.hidden = false;
    if (kind === 'ready') {
      const go = el('button', 'btn', 'スタート'); go.type = 'button'; go.onclick = start;
      ov.append(el('div', 'ono', no(curIdx)), el('h3', '', cur.name), el('p', '', cur.desc), el('p', 'keys', cur.help));
      if (cur.time) ov.append(el('p', '', `制限時間 ${cur.time} 秒`));
      ov.append(go, el('small', '', 'スペースキー・Enter でも始まります'));
      setTimeout(() => go.focus({ preventScroll: true }), 0);
    } else if (kind === 'over') {
      const r = lastResult;
      const again = el('button', 'btn', 'もう一度'); again.type = 'button'; again.onclick = start;
      const back = el('button', 'ghost', '一覧へ'); back.type = 'button'; back.onclick = () => { location.hash = 'list'; };
      ov.append(el('p', '', r.reason), el('div', 'big', fmt(r.score)));
      if (r.err) ov.append(el('p', '', 'このゲームでエラーが起きました。もう一度ためしてください'));
      else if (r.isBest) ov.append(el('p', 'newbest', '自己ベスト更新！'));
      else if (r.prev) ov.append(el('p', '', `自己ベスト ${fmt(r.prev)}`));
      if (r.rank && Net.isOnline()) ov.append(el('p', '', `この点数はランキング ${r.rank} 位`));
      if (r.isBest && Net.mode === 'online') ov.append(el('small', '', 'ランキングに記録しました'));
      if (r.isBest && Net.mode === 'local') ov.append(el('small', '', 'このブラウザに記録しました'));
      const bs = el('div', 'btns'); bs.append(again, back); ov.append(bs);
      setTimeout(() => again.focus({ preventScroll: true }), 0);
    }
  }
  function start() { if (!cur) return; $('ov').hidden = true; Engine.start(); $('cv').focus?.(); }

  Engine.onOver = (score, reason, err) => {
    const prev = Net.myBest(cur.id);
    const isBest = !err && score > prev && score > 0;
    if (!err) Net.submit(cur.id, score);
    const rank = score > 0 ? 1 + Net.ranking(cur.id).filter(r => r.uid !== Net.uid && r.best[cur.id] > score).length : 0;
    lastResult = { score, reason, prev, isBest, rank, err };
    setTimeout(() => { if (Engine.state === 'over' && cur) overlay('over'); }, 650);
    renderBoard();
  };

  let hudCache = {};
  Engine.onTick = () => {
    if (!cur) return;
    const s = fmt(Engine.score), b = fmt(Net.myBest(cur.id));
    let t = '—', low = '0', lab = 'TIME';
    if (Engine.limit) { const left = Math.max(0, Engine.limit - Engine.elapsed); t = left.toFixed(1); if (left < 5 && Engine.state === 'play') low = '1'; lab = 'のこり'; }
    else if (Engine.state !== 'ready') { t = Engine.elapsed.toFixed(1); lab = 'TIME'; }
    const set = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
    set('hudScore', s); set('hudBest', b); set('hudTime', t); set('hudTimeLabel', lab);
    if (hudCache.low !== low) { hudCache.low = low; $('hudTime').dataset.low = low; }
  };

  function renderBoard() {
    if (!cur) return;
    const list = Net.ranking(cur.id), ol = $('rank'); ol.textContent = '';
    $('boardSub').textContent = Net.mode === 'local' ? 'オンラインにつながっていないので、あなたの記録だけ表示しています' : `${list.length} 人が挑戦中・上位10人`;
    if (!list.length) { const li = el('li', 'none'); li.append(el('span', 'empty', 'まだ記録がありません。最初の1位になろう！')); ol.append(li); }
    list.slice(0, 10).forEach((r, i) => {
      const li = el('li', r.uid === Net.uid ? 'me' : '');
      li.append(el('span', 'medal' + (i < 3 ? ' m' + (i + 1) : ''), i + 1), el('span', 'nm', r.nick + (r.uid === Net.uid ? '（あなた）' : '')), el('span', 'sc', fmt(r.best[cur.id])));
      ol.append(li);
    });
    const mine = $('mine'); mine.textContent = '';
    const myPos = list.findIndex(r => r.uid === Net.uid);
    const best = Net.myBest(cur.id);
    mine.append('あなたの自己ベスト ', el('b', '', best ? fmt(best) : '—'));
    if (myPos >= 0 && Net.isOnline()) mine.append(`（${myPos + 1} 位）`);
  }

  /* ---- 画面ボタン ---- */
  let repT = null;
  function setupPad() {
    const mode = cur.pad || 'full', pad = $('pad');
    pad.hidden = !showPad || mode === 'none';
    $('padToggle').hidden = mode === 'none';
    $('padToggle').textContent = showPad ? '画面ボタンを隠す' : '画面ボタン';
    const vis = { full: 'LRUDA', lr: 'LRA', ud: 'UD', a: 'A' }[mode] || '';
    pad.querySelectorAll('.pb').forEach(b => { b.style.visibility = vis.includes(b.dataset.k) ? 'visible' : 'hidden'; });
    pad.querySelector('.dpad').style.display = /[LRUD]/.test(vis) ? '' : 'none';
    pad.style.justifyContent = /[LRUD]/.test(vis) ? 'space-between' : 'center';
  }
  function padUp(b) { b.dataset.down = '0'; Engine.held[b.dataset.k] = false; clearInterval(repT); clearTimeout(repT); repT = null; }
  document.querySelectorAll('.pb').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); Sound.init();
      if (Engine.state !== 'play') { if (b.dataset.k === 'A' && cur) start(); return; }
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      const k = b.dataset.k; b.dataset.down = '1'; Engine.held[k] = true; Engine.key(k, null, false);
      if (cur && cur.repeat && 'LRD'.includes(k)) { repT = setTimeout(() => { repT = setInterval(() => Engine.key(k, null, true), 70); }, 220); }
    });
    b.addEventListener('pointerup', () => padUp(b));
    b.addEventListener('pointercancel', () => padUp(b));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });

  /* ---- キーボード ---- */
  const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D', ' ': 'A', Enter: 'A', z: 'A', x: 'A', Z: 'A', X: 'A' };
  window.addEventListener('keydown', e => {
    if (!cur || $('play').hidden) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') { location.hash = 'list'; return; }
    if (Engine.state !== 'play') {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); }
      return;
    }
    let k = cur.id === 'typing' && e.key.length === 1 ? null : KEYMAP[e.key];
    if (cur.id === 'typing' && (e.key === ' ' || e.key === 'Enter')) k = 'A';
    if (k || e.key.length === 1) {
      e.preventDefault(); Sound.init();
      if (k) Engine.held[k] = true;
      Engine.key(k || null, e.key, e.repeat);
    }
  });
  window.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) Engine.held[k] = false; });
  window.addEventListener('blur', () => { for (const k in Engine.held) Engine.held[k] = false; });

  /* ---- 起動 ---- */
  function renderNet() {
    const c = $('net'); c.textContent = Net.status; c.dataset.on = Net.mode === 'online' || Net.mode === 'server' ? '1' : '0';
    $('note').hidden = !Net.note; $('note').textContent = Net.note;
    if (!$('home').hidden) { renderGrid(); if (!$('overall').hidden) renderOverall(); } else renderBoard();
  }
  function boot() {
    Engine.init($('cv'));
    buildFilters(); renderGrid();
    $('tabGames').onclick = () => setTab(false); $('tabRank').onclick = () => setTab(true);
    $('back').onclick = () => { location.hash = 'list'; };
    $('padToggle').onclick = () => { showPad = !showPad; Store.set('pad', showPad); if (cur) setupPad(); };
    Sound.on = Store.get('sound', true);
    const snd = $('snd'); const sr = () => (snd.textContent = Sound.on ? '効果音 ON' : '効果音 OFF'); sr();
    snd.onclick = () => { Sound.on = !Sound.on; Store.set('sound', Sound.on); Sound.init(); sr(); };
    const nick = $('nick');
    Net.on(renderNet);
    nick.value = Store.get('nick', '') || '';
    nick.addEventListener('input', () => Net.setNick(nick.value));
    nick.addEventListener('change', () => { Net.setNick(nick.value); nick.value = Net.nick; });
    window.addEventListener('hashchange', route);
    route();
    Net.init().then(() => { nick.value = Net.nick; renderNet(); });
    window.__mg50 = { Engine, Net, GAMES, open, start };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

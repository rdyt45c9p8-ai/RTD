/* ===== ゲーム 31〜40 ===== */

// 31 ハイ＆ロー
def({
  id: 'highlow', name: 'ハイ＆ロー', cat: '運', pad: 'ud',
  desc: '次のカードが今より大きいか小さいかを当て続ける。',
  help: '↑・HIGH で大きい、↓・LOW で小さい（同じ数は引き分け）',
  create(api) {
    const NAMES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS = ['♠', '♥', '♦', '♣'];
    const draw0 = () => ({ v: ri(1, 13), s: ri(0, 3) });
    let cur = draw0(), nxt = null, streak = 0, rev = 0, msg = '', guess = null;
    const HI = { x: 20, y: 410, w: 150, h: 90 }, LO = { x: 190, y: 410, w: 150, h: 90 };
    function go(g) {
      if (nxt) return; guess = g; nxt = draw0(); rev = 0.6; api.beep(440, 0.04);
    }
    function card(c, cd, x, y, open) {
      rrect(c, x, y, 120, 170, 12, open ? PAL.fg : COL[4]);
      if (!open) { rrect(c, x + 10, y + 10, 100, 150, 8, '#5a92e6'); return; }
      const red = cd.s === 1 || cd.s === 2, col = red ? '#d8344f' : PAL.bg;
      txt(c, NAMES[cd.v], x + 16, y + 24, 22, col, 'left', true); txt(c, SUITS[cd.s], x + 60, y + 95, 54, col);
    }
    return {
      down(x, y) { if (inR(x, y, HI)) go('hi'); if (inR(x, y, LO)) go('lo'); },
      key(k) { if (k === 'U') go('hi'); if (k === 'D') go('lo'); },
      update(dt) {
        if (!nxt) return; rev -= dt;
        if (rev <= 0) {
          const ok = nxt.v === cur.v ? null : (guess === 'hi') === (nxt.v > cur.v);
          if (ok === null) { msg = '引き分け'; api.beep(500, 0.05); }
          else if (ok) { streak++; api.add(10 * streak); msg = `あたり！ ${streak} 連続`; api.beep(880, 0.08); }
          else { msg = 'はずれ…'; cur = nxt; nxt = null; api.over(`${streak} 連続で終了`); return; }
          cur = nxt; nxt = null;
        }
      },
      draw(c) {
        txt(c, `${streak} 連続`, W / 2, 50, 26, COL[2], 'center', true);
        card(c, cur, 40, 120, true); card(c, nxt || cur, 200, 120, nxt && rev < 0.3);
        if (!nxt) { rrect(c, 200, 120, 120, 170, 12, COL[4]); rrect(c, 210, 130, 100, 150, 8, '#5a92e6'); txt(c, '?', 260, 205, 44, '#2d5aa8', 'center', true); }
        txt(c, msg, W / 2, 340, 20, PAL.fg);
        rrect(c, HI.x, HI.y, HI.w, HI.h, 14, COL[0]); txt(c, '↑ HIGH', HI.x + HI.w / 2, HI.y + 34, 22, PAL.bg); txt(c, '大きい', HI.x + HI.w / 2, HI.y + 64, 14, PAL.bg);
        rrect(c, LO.x, LO.y, LO.w, LO.h, 14, COL[4]); txt(c, '↓ LOW', LO.x + LO.w / 2, LO.y + 34, 22, PAL.bg); txt(c, '小さい', LO.x + LO.w / 2, LO.y + 64, 14, PAL.bg);
      },
    };
  },
});

// 32 タイピング
def({
  id: 'typing', name: 'ローマ字タイピング', cat: '頭脳', time: 60, pad: 'none',
  desc: 'ひらがなの言葉をローマ字で打つ。キーボードでも画面のキーでもOK。',
  help: 'キーボードで入力 ／ スマホは画面下のキーをタップ',
  create(api) {
    const WORDS = [['さくら', 'sakura'], ['ねこ', 'neko'], ['いぬ', 'inu'], ['すいか', 'suika'], ['りんご', 'ringo'], ['でんしゃ', 'densha'], ['ひこうき', 'hikouki'], ['やま', 'yama'], ['うみ', 'umi'], ['そら', 'sora'],
      ['ほし', 'hosi'], ['つき', 'tuki'], ['たいよう', 'taiyou'], ['かみなり', 'kaminari'], ['にじ', 'niji'], ['ともだち', 'tomodati'], ['がっこう', 'gakkou'], ['えんぴつ', 'enpitu'], ['けしごむ', 'kesigomu'], ['ぼうし', 'bousi'],
      ['くつした', 'kutusita'], ['おにぎり', 'onigiri'], ['すし', 'susi'], ['らーめん', 'ra-men'], ['ぎゅうにゅう', 'gyuunyuu'], ['ちず', 'tizu'], ['ふうせん', 'fuusen'], ['きって', 'kitte'], ['はなび', 'hanabi'], ['まつり', 'maturi'],
      ['ゆきだるま', 'yukidaruma'], ['かぶとむし', 'kabutomusi'], ['ぺんぎん', 'pengin'], ['こんぴゅーた', 'konpyu-ta'], ['げーむ', 'ge-mu'], ['ろけっと', 'roketto'], ['うちゅう', 'uchuu'], ['たんぽぽ', 'tanpopo'], ['あさがお', 'asagao'], ['ひまわり', 'himawari']];
    const ROWS = ['qwertyuiop', 'asdfghjkl-', 'zxcvbnm'];
    const KW = 34, KH = 44, KY = 360; const keys = [];
    ROWS.forEach((r, j) => { const ox = (W - r.length * (KW + 2)) / 2; [...r].forEach((ch, i) => keys.push({ ch, x: ox + i * (KW + 2), y: KY + j * (KH + 4), w: KW, h: KH })); });
    let w, pos = 0, miss = 0, done = 0, flash = 0, press = null, pT = 0;
    const next = () => { w = pick(WORDS); pos = 0; };
    function type(ch) {
      ch = ch.toLowerCase(); press = ch; pT = 0.1;
      if (ch === w[1][pos]) { pos++; api.add(1); api.beep(700, 0.015); if (pos >= w[1].length) { done++; api.add(10 + w[1].length); api.beep(990, 0.06); next(); } }
      else { miss++; flash = 0.2; api.beep(150, 0.06); }
    }
    next();
    return {
      key(k, raw) { if (raw && raw.length === 1 && /[a-zA-Z-]/.test(raw)) type(raw); },
      down(x, y) { for (const kk of keys) if (inR(x, y, kk)) type(kk.ch); },
      update(dt) { flash -= dt; pT -= dt; },
      draw(c) {
        if (flash > 0) rect(c, 0, 0, W, 330, '#3a1830');
        txt(c, w[0], W / 2, 140, 44, PAL.fg);
        const s = w[1], tw = s.length * 20, ox = W / 2 - tw / 2;
        [...s].forEach((ch, i) => txt(c, ch, ox + i * 20 + 10, 220, 26, i < pos ? COL[6] : i === pos ? COL[2] : PAL.dim, 'center', true));
        rect(c, ox + pos * 20 + 2, 238, 16, 3, COL[2]);
        label(c, `${done} 語 ／ ミス ${miss}`, 16, 30, PAL.fg);
        const nextCh = s[pos];
        for (const kk of keys) { rrect(c, kk.x, kk.y, kk.w, kk.h, 6, pT > 0 && press === kk.ch ? PAL.fg : kk.ch === nextCh ? '#3d3570' : PAL.grid); txt(c, kk.ch, kk.x + kk.w / 2, kk.y + kk.h / 2, 16, pT > 0 && press === kk.ch ? PAL.bg : PAL.fg, 'center', true); }
      },
    };
  },
});

// 33 リフティング
def({
  id: 'kickup', name: 'リフティング', cat: 'アクション', pad: 'a',
  desc: 'ボールをタップでけり上げて、地面に落とさないように続ける。',
  help: 'ボールの近くをタップ ／ A は下のほうに来たボールをける',
  create(api) {
    const b = { x: W / 2, y: 200, vx: 0, vy: 0, r: 24, rot: 0 }; let kicks = 0;
    function kick(tx) { b.vy = -Math.max(560, 620 - kicks * 0) - Math.min(120, kicks * 3); b.vx = clamp((b.x - tx) * 6, -260, 260); kicks++; api.add(10); api.beep(380 + Math.min(kicks, 30) * 15, 0.04); }
    return {
      down(x, y) { if (dist(x, y, b.x, b.y) < b.r + 44) kick(x); },
      key(k) { if ((k === 'A' || k === 'U') && b.y > 300) kick(b.x + rnd(-12, 12)); },
      update(dt) {
        b.vy += (900 + kicks * 8) * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt / b.r;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y > 510 - b.r) api.over(`${kicks} 回つづいた`);
      },
      draw(c) {
        rect(c, 0, 510, W, 30, '#2f6b4f');
        c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(b.x, 512, b.r * (0.4 + b.y / 900), 5, 0, 0, 6.28); c.fill(); c.globalAlpha = 1;
        c.save(); c.translate(b.x, b.y); c.rotate(b.rot); circ(c, 0, 0, b.r, PAL.fg);
        for (let i = 0; i < 5; i++) { const a = i * 1.2566; shape(c, 3, Math.cos(a) * 14, Math.sin(a) * 14, 5, PAL.bg); } circ(c, 0, 0, 6, PAL.bg); c.restore();
        txt(c, kicks, W / 2, 70, 48, PAL.fg, 'center', true); txt(c, '回', W / 2, 108, 14, PAL.dim);
        if (kicks === 0) txt(c, 'ボールをタップ！', W / 2, 300, 18, COL[2]);
      },
    };
  },
});

// 34 カーレース
def({
  id: 'race', name: 'カーレース', cat: 'アクション', pad: 'lr',
  desc: '3車線の道路で車線を変えながら、前の車をよけて走る。',
  help: '←→・画面の左右タップで車線を変える',
  create(api) {
    const LX = [90, 180, 270]; let lane = 1, x = 180, cars = [], t = 0.6, d0 = 0, stripe = 0;
    const turn = d => { lane = clamp(lane + d, 0, 2); api.beep(400, 0.02); };
    return {
      down(px) { turn(px < x ? -1 : 1); }, key(k) { if (k === 'L') turn(-1); if (k === 'R') turn(1); },
      update(dt) {
        const sp = 300 + api.t * 7; x += (LX[lane] - x) * Math.min(1, dt * 14); d0 += sp * dt; stripe = (stripe + sp * dt) % 60;
        t -= dt;
        if (t <= 0) { const free = shuffle([0, 1, 2]); const n = Math.random() < Math.min(0.5, api.t * 0.01) ? 2 : 1; for (let i = 0; i < n; i++) cars.push({ l: free[i], y: -90, c: pick([COL[0], COL[2], COL[4], COL[5], COL[6]]), v: rnd(0.25, 0.5) }); t = Math.max(0.42, 1.0 - api.t * 0.012) * 300 / sp + 0.2; }
        for (const cr of cars) { cr.y += sp * (1 - cr.v) * dt; if (Math.abs(LX[cr.l] - x) < 40 && cr.y + 74 > 440 && cr.y < 512) api.over('衝突！'); }
        cars = cars.filter(cr => cr.y < H + 20); api.set(Math.floor(d0 / 10));
      },
      draw(c) {
        rect(c, 40, 0, 280, H, '#2a2640'); rect(c, 36, 0, 4, H, PAL.fg); rect(c, 320, 0, 4, H, PAL.fg);
        for (let y = -60 + stripe; y < H; y += 60) { rect(c, 133, y, 4, 30, PAL.line); rect(c, 223, y, 4, 30, PAL.line); }
        const car = (cx, cy, col) => { rrect(c, cx - 22, cy, 44, 74, 10, col); rect(c, cx - 16, cy + 14, 32, 16, 'rgba(20,17,39,.7)'); rect(c, cx - 16, cy + 48, 32, 12, 'rgba(20,17,39,.5)'); };
        for (const cr of cars) car(LX[cr.l], cr.y, cr.c);
        car(x, 440, COL[3]);
        label(c, `${Math.floor(d0 / 10)} m`, 48, 18, PAL.fg);
      },
    };
  },
});

// 35 ゴールキーパー
def({
  id: 'keeper', name: 'ゴールキーパー', cat: '反射', pad: 'lr',
  desc: 'いろんな角度から飛んでくるシュートを止める。5点取られたら終わり。',
  help: 'マウス・指でなぞる ／ ←→ で動く',
  create(api) {
    let kx = W / 2, target = null, balls = [], t = 0.8, lives = 5; const fx = makeFx();
    return {
      move(x) { target = x; }, down(x) { target = x; },
      update(dt) {
        fx.update(dt);
        if (api.held.L || api.held.R) { target = null; kx += (api.held.R - api.held.L) * 360 * dt; } else if (target != null) kx += clamp(target - kx, -520 * dt, 520 * dt);
        kx = clamp(kx, 70, 290);
        t -= dt;
        if (t <= 0) { const sx = rnd(30, W - 30), tx = rnd(66, 294), sp = 230 + api.t * 5; const d = dist(sx, 60, tx, 500); balls.push({ x: sx, y: 60, vx: (tx - sx) / d * sp, vy: (500 - 60) / d * sp, curve: Math.random() < 0.3 ? rnd(-120, 120) : 0 }); t = Math.max(0.5, 1.4 - api.t * 0.012); }
        for (const b of balls) {
          b.vx += b.curve * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          if (!b.done && b.y > 456 && b.y < 486 && Math.abs(b.x - kx) < 42) { b.done = true; api.add(10); fx.burst(b.x, b.y, PAL.fg, 10); api.beep(620, 0.05); }
          if (!b.done && b.y > 500) { b.done = true; if (b.x > 60 && b.x < 300) { lives--; fx.pop(b.x, 470, 'ゴール…', COL[0]); api.beep(130, 0.3, 'sawtooth'); if (lives <= 0) api.over('5点取られた'); } }
        }
        balls = balls.filter(b => !b.done && b.y < H);
      },
      draw(c) {
        rect(c, 0, 0, W, H, '#1d3a2e'); for (let y = 0; y < H; y += 60) rect(c, 0, y, W, 30, '#21412f');
        rect(c, 56, 500, 248, 6, PAL.fg); rect(c, 56, 500, 6, 40, PAL.fg); rect(c, 298, 500, 6, 40, PAL.fg);
        for (const b of balls) { circ(c, b.x, b.y, 10, PAL.fg); circ(c, b.x, b.y, 4, PAL.bg); }
        rrect(c, kx - 40, 464, 80, 16, 8, COL[1]); circ(c, kx, 456, 10, '#f2c49b');
        fx.draw(c); hearts(c, lives);
      },
    };
  },
});

// 36 矢印反応
def({
  id: 'arrows', name: '矢印反応', cat: '反射', time: 30,
  desc: '出てきた矢印と同じ向きを押す。赤いときは反対向き！',
  help: '矢印キー・十字ボタンをタップ',
  create(api) {
    const keys = ['U', 'L', 'R', 'D'], opp = { U: 'D', D: 'U', L: 'R', R: 'L' };
    let q, shownAt = 0, combo = 0, flash = null, fT = 0, good = true;
    function gen() { q = { d: pick(keys), rev: api.t > 6 && Math.random() < 0.35 }; shownAt = api.t; }
    function answer(k) {
      if (!k) return; const want = q.rev ? opp[q.d] : q.d; good = k === want; flash = k; fT = 0.18;
      if (good) { combo++; api.add(10 + Math.max(0, Math.round(10 - (api.t - shownAt) * 10)) + Math.min(combo, 10)); api.beep(760, 0.03); } else { combo = 0; api.add(-10); api.beep(140, 0.12); }
      gen();
    }
    gen();
    return {
      down(x, y) { answer(crossHit(x, y)); }, key(k) { if (keys.includes(k)) answer(k); },
      update(dt) { fT -= dt; },
      draw(c) {
        const col = q.rev ? COL[0] : COL[3];
        circ(c, W / 2, 150, 86, col);
        txt(c, ARROW[q.d], W / 2, 152, 110, PAL.bg);
        txt(c, q.rev ? '反対！' : 'おなじ', W / 2, 252, 18, col);
        drawCross(c, { U: '', L: '', R: '', D: '' }, fT > 0 ? { flash, flashCol: good ? COL[6] : COL[0] } : {});
        for (const k of keys) txt(c, ARROW[k], CROSS[k].x + CROSS[k].w / 2, CROSS[k].y + CROSS[k].h / 2, 30, flash === k && fT > 0 ? PAL.bg : PAL.fg);
      },
    };
  },
});

// 37 ドロップ3
def({
  id: 'drop3', name: 'ドロップ3', cat: 'パズル',
  desc: '色ブロックを好きな列に落として、同じ色を3つ以上つなげて消す。',
  help: '列をタップで落とす ／ ←→ で列を選んで A・↓',
  create(api) {
    const CW = 7, CH = 9, S = 44, OX = (W - CW * S) / 2, OY = 120, cols = [COL[0], COL[2], COL[3], COL[5]];
    const g = Array.from({ length: CW }, () => []);
    let col = 3, cur = ri(0, 3), nxt = ri(0, 3), chainMsg = '', mT = 0; const fx = makeFx();
    const at = (x, y) => (x >= 0 && x < CW && y >= 0 && y < g[x].length ? g[x][y] : -1);
    function resolve() {
      let chain = 0;
      for (;;) {
        const kill = new Set();
        const seen = new Set();
        for (let x = 0; x < CW; x++) for (let y = 0; y < g[x].length; y++) {
          const k0 = x * 100 + y; if (seen.has(k0)) continue;
          const v = g[x][y], st = [[x, y]], grp = [];
          while (st.length) { const [a, b] = st.pop(), k = a * 100 + b; if (seen.has(k) || at(a, b) !== v) continue; seen.add(k); grp.push(k); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
          if (grp.length >= 3) grp.forEach(k => kill.add(k));
        }
        if (!kill.size) break;
        chain++;
        kill.forEach(k => { const a = Math.floor(k / 100), b = k % 100; fx.burst(OX + a * S + S / 2, OY + (CH - 1 - b) * S + S / 2, cols[g[a][b]], 4); g[a][b] = null; });
        for (let x = 0; x < CW; x++) g[x] = g[x].filter(v => v != null);
        api.add(kill.size * 10 * chain); api.beep(500 + chain * 150, 0.08);
      }
      if (chain > 1) { chainMsg = `${chain} れんさ！`; mT = 0.9; }
    }
    function drop(x) {
      if (g[x].length >= CH) { api.over('列があふれた'); return; }
      g[x].push(cur); cur = nxt; nxt = Math.random() < 0.15 && api.score > 300 ? ri(0, 3) : ri(0, 3); api.beep(300, 0.03);
      resolve();
      if (g.every(cc => cc.length >= CH)) api.over('置ける場所がない');
    }
    return {
      down(x) { const i = Math.floor((x - OX) / S); if (i >= 0 && i < CW) { col = i; drop(i); } },
      move(x) { const i = Math.floor((x - OX) / S); if (i >= 0 && i < CW) col = i; },
      key(k) { if (k === 'L') col = Math.max(0, col - 1); if (k === 'R') col = Math.min(CW - 1, col + 1); if (k === 'A' || k === 'D') drop(col); },
      update(dt) { fx.update(dt); mT -= dt; },
      draw(c) {
        rect(c, OX - 4, OY - 4, CW * S + 8, CH * S + 8, PAL.grid);
        rect(c, OX + col * S, OY, S, CH * S, '#2a2450');
        rect(c, OX - 4, OY + 2 * S - 2, CW * S + 8, 2, COL[0] + '66');
        g.forEach((cc, x) => cc.forEach((v, y) => cell(c, OX + x * S, OY + (CH - 1 - y) * S, S, cols[v])));
        cell(c, OX + col * S, OY - S - 12, S, cols[cur]);
        label(c, 'つぎ', W - 70, 40); cell(c, W - 60, 54, 28, cols[nxt]);
        if (mT > 0) txt(c, chainMsg, W / 2, 300, 30, COL[2]);
        fx.draw(c);
      },
    };
  },
});

// 38 風船割り
def({
  id: 'balloon', name: '風船割り', cat: '反射', time: 30, pad: 'none',
  desc: '下から上がってくる風船をタップで割る。灰色の風船はマイナス。',
  help: '風船をタップ（金色は30点、灰色は−20点）',
  create(api) {
    let bs = [], t = 0; const fx = makeFx();
    return {
      down(x, y) {
        for (let i = bs.length - 1; i >= 0; i--) {
          const b = bs[i];
          if (dist(x, y, b.x, b.y) < b.r + 6) {
            const p = b.k === 'bad' ? -20 : b.k === 'gold' ? 30 : 10; api.add(p);
            fx.burst(b.x, b.y, b.col, 12); fx.pop(b.x, b.y - 30, (p > 0 ? '+' : '') + p, p > 0 ? COL[2] : COL[0]); api.beep(p > 0 ? 700 : 150, 0.06);
            bs.splice(i, 1); return;
          }
        }
      },
      update(dt) {
        fx.update(dt); t -= dt;
        if (t <= 0) { const r = Math.random(), k = r < 0.12 ? 'gold' : r < 0.3 ? 'bad' : 'n'; bs.push({ x: rnd(30, W - 30), y: H + 30, r: k === 'gold' ? 20 : 26, vy: (k === 'gold' ? 170 : rnd(70, 130)) + api.t * 3, ph: rnd(0, 6), k, col: k === 'gold' ? COL[2] : k === 'bad' ? '#6b6585' : pick([COL[0], COL[3], COL[4], COL[5], COL[1]]) }); t = Math.max(0.22, 0.55 - api.t * 0.008); }
        for (const b of bs) { b.y -= b.vy * dt; b.ph += dt * 2; b.x += Math.sin(b.ph) * 20 * dt; }
        bs = bs.filter(b => b.y > -60);
      },
      draw(c) {
        for (const b of bs) {
          line(c, b.x, b.y + b.r, b.x + Math.sin(b.ph) * 6, b.y + b.r + 34, PAL.dim, 1);
          c.fillStyle = b.col; c.beginPath(); c.ellipse(b.x, b.y, b.r * 0.86, b.r, 0, 0, 6.28); c.fill();
          poly(c, [[b.x, b.y + b.r - 2], [b.x - 5, b.y + b.r + 6], [b.x + 5, b.y + b.r + 6]], b.col);
          circ(c, b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.18, 'rgba(255,255,255,.5)');
          if (b.k === 'bad') txt(c, '×', b.x, b.y, 22, PAL.bg);
        }
        fx.draw(c);
      },
    };
  },
});

// 39 月面着陸
def({
  id: 'lander', name: '月面着陸', cat: 'アクション',
  desc: '燃料に気をつけながら、ゆっくりと着陸台に降りる。',
  help: '↑・A 噴射 ／ ←→ 横に噴射 ／ 画面の左・中・右を長押しでも操作',
  create(api) {
    let L, terrain, pad, level = 0, fuel = 100, msg = '', mT = 0, flame = 0;
    function make() {
      level++; L = { x: rnd(60, 300), y: 70, vx: rnd(-30, 30), vy: 0 };
      const px = ri(1, 6) * 45; pad = { x: px, w: 70 };
      terrain = []; for (let x = 0; x <= W; x += 15) terrain.push(x >= px - 5 && x <= px + 75 ? 470 : rnd(430, 505));
      fuel = Math.min(100, fuel + 60);
    }
    const ground = x => { const i = clamp(Math.floor(x / 15), 0, terrain.length - 2), f = (x - i * 15) / 15; return terrain[i] * (1 - f) + terrain[i + 1] * f; };
    make();
    return {
      update(dt) {
        mT -= dt;
        const g = 45 + level * 7, p = api.ptr.down;
        const up = (api.held.U || api.held.A || (p && api.ptr.x >= 120 && api.ptr.x <= 240)) && fuel > 0;
        const lf = (api.held.L || (p && api.ptr.x < 120)) && fuel > 0, rt = (api.held.R || (p && api.ptr.x > 240)) && fuel > 0;
        L.vy += g * dt; if (up) { L.vy -= 130 * dt; fuel -= 22 * dt; }
        if (lf) { L.vx -= 70 * dt; fuel -= 8 * dt; } if (rt) { L.vx += 70 * dt; fuel -= 8 * dt; }
        fuel = Math.max(0, fuel); flame = up ? 1 : 0;
        L.x += L.vx * dt; L.y += L.vy * dt;
        if (L.x < 12 || L.x > W - 12) { L.vx *= -0.5; L.x = clamp(L.x, 12, W - 12); }
        if (L.y + 16 >= ground(L.x)) {
          const onPad = L.x - 12 >= pad.x && L.x + 12 <= pad.x + pad.w;
          if (onPad && L.vy < 70 && Math.abs(L.vx) < 40) { const p0 = 100 * level + Math.round(fuel) * 2; api.add(p0); msg = `着陸成功！ +${p0}`; mT = 1.5; api.beep(900, 0.2); make(); }
          else api.over(onPad ? 'スピードが速すぎた' : '着陸台をはずれた');
        }
      },
      draw(c) {
        for (let i = 0; i < 40; i++) rect(c, (i * 89) % W, (i * 53) % 400, 2, 2, PAL.line);
        c.fillStyle = '#4a4466'; c.beginPath(); c.moveTo(0, H); terrain.forEach((y, i) => c.lineTo(i * 15, y)); c.lineTo(W, H); c.fill();
        rect(c, pad.x, 468, pad.w, 6, COL[2]);
        const lx = L.x, ly = L.y;
        if (flame) poly(c, [[lx - 6, ly + 14], [lx + 6, ly + 14], [lx, ly + 28 + Math.random() * 10]], COL[1]);
        rrect(c, lx - 12, ly - 14, 24, 22, 8, PAL.fg); circ(c, lx, ly - 5, 5, COL[4]);
        line(c, lx - 10, ly + 6, lx - 15, ly + 16, PAL.fg, 3); line(c, lx + 10, ly + 6, lx + 15, ly + 16, PAL.fg, 3);
        label(c, `ステージ ${level}`, 10, 18, PAL.fg);
        rect(c, 10, 34, 100, 8, PAL.grid); rect(c, 10, 34, fuel, 8, fuel < 25 ? COL[0] : COL[6]); label(c, '燃料', 116, 38);
        const okv = L.vy < 70, okh = Math.abs(L.vx) < 40;
        txt(c, `たて ${Math.round(L.vy)}`, W - 10, 18, 13, okv ? COL[6] : COL[0], 'right');
        txt(c, `よこ ${Math.round(L.vx)}`, W - 10, 38, 13, okh ? COL[6] : COL[0], 'right');
        if (mT > 0) txt(c, msg, W / 2, 200, 22, COL[2]);
      },
    };
  },
});

// 40 回転砲台
def({
  id: 'turret', name: '回転砲台', cat: 'アクション',
  desc: 'まん中の砲台で、四方からせまる敵をうち落とす。',
  help: 'ねらう場所をタップ ／ ←→ で回転、A で発射',
  create(api) {
    const CX = W / 2, CY = 290; let ang = -Math.PI / 2, cd = 0, shots = [], foes = [], t = 1, lives = 3; const fx = makeFx();
    function fire() { if (cd > 0) return; cd = 0.14; shots.push({ x: CX + Math.cos(ang) * 30, y: CY + Math.sin(ang) * 30, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520 }); api.beep(900, 0.02, 'triangle'); }
    return {
      down(x, y) { ang = Math.atan2(y - CY, x - CX); cd = 0; fire(); },
      key(k) { if (k === 'A' || k === 'U') fire(); },
      update(dt) {
        fx.update(dt); cd -= dt;
        if (api.held.L) ang -= 3.2 * dt; if (api.held.R) ang += 3.2 * dt;
        if (api.held.A || api.held.U) fire();
        t -= dt;
        if (t <= 0) { const a = rnd(0, 6.28); foes.push({ a, r: 320, sp: 40 + api.t * 1.4 + rnd(0, 20), hp: Math.random() < 0.15 ? 3 : 1, wob: rnd(0, 6) }); t = Math.max(0.35, 1.3 - api.t * 0.014); }
        for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
        for (const f of foes) {
          f.r -= f.sp * dt; f.wob += dt * 3; f.x = CX + Math.cos(f.a + Math.sin(f.wob) * 0.08) * f.r; f.y = CY + Math.sin(f.a + Math.sin(f.wob) * 0.08) * f.r;
          for (const s of shots) if (!s.dead && dist(s.x, s.y, f.x, f.y) < (f.hp > 1 ? 18 : 13)) { s.dead = true; f.hp--; if (f.hp <= 0) { api.add(10); fx.burst(f.x, f.y, COL[5], 10); api.beep(260, 0.05); } }
          if (f.hp > 0 && f.r < 30) { f.hp = 0; lives--; fx.burst(CX, CY, COL[0], 20); api.beep(100, 0.3, 'sawtooth'); if (lives <= 0) api.over('砲台がやられた'); }
        }
        shots = shots.filter(s => !s.dead && s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10); foes = foes.filter(f => f.hp > 0);
      },
      draw(c) {
        ring(c, CX, CY, 120, PAL.grid, 1); ring(c, CX, CY, 220, PAL.grid, 1);
        for (const f of foes) { shape(c, f.hp > 1 ? 4 : 3, f.x, f.y, f.hp > 1 ? 16 : 11, f.hp > 1 ? COL[1] : COL[5]); }
        for (const s of shots) circ(c, s.x, s.y, 4, COL[2]);
        c.save(); c.translate(CX, CY); c.rotate(ang); rect(c, 0, -6, 34, 12, PAL.fg); c.restore();
        circ(c, CX, CY, 22, COL[3]); circ(c, CX, CY, 10, PAL.bg);
        fx.draw(c); hearts(c, lives);
      },
    };
  },
});

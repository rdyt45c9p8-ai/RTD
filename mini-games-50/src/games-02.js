/* ===== ゲーム 11〜20 ===== */

// 11 スライドパズル
def({
  id: 'slide', name: 'スライドパズル', cat: 'パズル', time: 90,
  desc: '1〜8の数字タイルをすべらせて、順番どおりに並べる。',
  help: 'あき地のとなりのタイルをタップ ／ 矢印キーでタイルを動かす',
  create(api) {
    const S = 96, OX = (W - 3 * S) / 2, OY = 150;
    let b, moves = 0, solved = 0, flash = 0;
    function newPuzzle() {
      b = [1, 2, 3, 4, 5, 6, 7, 8, 0]; let prev = -1;
      for (let n = 0; n < 30 + solved * 10; n++) {
        const z = b.indexOf(0), opts = [];
        if (z % 3 > 0) opts.push(z - 1); if (z % 3 < 2) opts.push(z + 1); if (z > 2) opts.push(z - 3); if (z < 6) opts.push(z + 3);
        const o = pick(opts.filter(v => v !== prev)); prev = z; [b[z], b[o]] = [b[o], b[z]];
      }
      if (b.every((v, i) => v === (i + 1) % 9)) newPuzzle();
      moves = 0;
    }
    function tryMove(i) {
      const z = b.indexOf(0);
      const adj = (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3)) || Math.abs(i - z) === 3;
      if (i < 0 || i > 8 || !adj) return;
      [b[z], b[i]] = [b[i], b[z]]; moves++; api.beep(420, 0.02);
      if (b.every((v, k) => v === (k + 1) % 9)) { solved++; api.add(Math.max(50, 300 - moves * 4)); api.beep(900, 0.15); flash = 0.5; newPuzzle(); }
    }
    newPuzzle();
    return {
      down(x, y) { const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i >= 0 && i < 3 && j >= 0 && j < 3) tryMove(j * 3 + i); },
      key(k) { const z = b.indexOf(0); const m = { L: z % 3 < 2 ? z + 1 : -1, R: z % 3 > 0 ? z - 1 : -1, U: z < 6 ? z + 3 : -1, D: z > 2 ? z - 3 : -1 }[k]; if (m != null && m >= 0) tryMove(m); },
      update(dt) { flash -= dt; },
      draw(c) {
        label(c, `クリア ${solved} 回 ／ 手数 ${moves}`, 20, 100);
        rrect(c, OX - 8, OY - 8, 3 * S + 16, 3 * S + 16, 14, flash > 0 ? COL[6] : PAL.line);
        b.forEach((v, i) => { if (!v) return; const x = OX + (i % 3) * S, y = OY + Math.floor(i / 3) * S; rrect(c, x + 4, y + 4, S - 8, S - 8, 10, v === i + 1 ? COL[3] : COL[4]); txt(c, v, x + S / 2, y + S / 2, 40, PAL.bg, 'center', true); });
        txt(c, '1 2 3 ／ 4 5 6 ／ 7 8 の順に', W / 2, 480, 14, PAL.dim);
      },
    };
  },
});

// 12 ライツアウト
def({
  id: 'lights', name: 'ライツアウト', cat: 'パズル', time: 120,
  desc: '押すと十字の形でライトが切りかわる。全部消せたらクリア。',
  help: 'マスをタップ ／ 矢印キーで選んで A',
  create(api) {
    const N = 5, S = 60, OX = 30, OY = 130;
    let g, level = 0, presses = 0, need = 0, cx = 2, cy = 2;
    function toggle(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && X < N && Y >= 0 && Y < N) g[Y][X] ^= 1; } }
    function make() {
      level++; g = Array.from({ length: N }, () => Array(N).fill(0)); need = Math.min(2 + level, 12);
      const cells = shuffle([...Array(25).keys()]).slice(0, need); cells.forEach(k => toggle(k % N, Math.floor(k / N))); presses = 0;
      if (g.every(r => r.every(v => !v))) make();
    }
    function press(x, y) {
      toggle(x, y); presses++; api.beep(380 + (g[y][x] ? 200 : 0), 0.03);
      if (g.every(r => r.every(v => !v))) { api.add(100 + Math.max(0, need * 3 - presses) * 10); api.beep(900, 0.15); make(); }
    }
    make();
    return {
      down(x, y) { const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i >= 0 && i < N && j >= 0 && j < N) { cx = i; cy = j; press(i, j); } },
      key(k) { if (k === 'L') cx = Math.max(0, cx - 1); if (k === 'R') cx = Math.min(N - 1, cx + 1); if (k === 'U') cy = Math.max(0, cy - 1); if (k === 'D') cy = Math.min(N - 1, cy + 1); if (k === 'A') press(cx, cy); },
      draw(c) {
        label(c, `レベル ${level} ／ 押した回数 ${presses}`, 30, 100);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          rrect(c, OX + x * S + 4, OY + y * S + 4, S - 8, S - 8, 10, g[y][x] ? COL[2] : PAL.grid);
          if (g[y][x]) rrect(c, OX + x * S + 12, OY + y * S + 10, S - 24, 8, 4, 'rgba(255,255,255,.5)');
        }
        c.strokeStyle = PAL.dim; c.lineWidth = 2; c.strokeRect(OX + cx * S + 1, OY + cy * S + 1, S - 2, S - 2);
      },
    };
  },
});

// 13 地雷さがし
def({
  id: 'mines', name: '地雷さがし', cat: '頭脳',
  desc: '数字をヒントに、地雷のないマスを全部ひらく。',
  help: 'タップでひらく ／ 下の旗ボタンで旗モード ／ キーボードは矢印・A・F',
  create(api) {
    const CW = 9, CH = 11, S = 36, OX = 18, OY = 52, M = 14;
    const g = Array.from({ length: CH }, () => Array.from({ length: CW }, () => ({ m: false, n: 0, open: false, flag: false })));
    let first = true, flagMode = false, done = false, cx = 4, cy = 5, opened = 0;
    const btn = { x: 90, y: 470, w: 180, h: 48 };
    const nb = (x, y, f) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if ((dx || dy) && X >= 0 && X < CW && Y >= 0 && Y < CH) f(X, Y); } };
    function plant(sx, sy) {
      let n = 0;
      while (n < M) { const x = ri(0, CW - 1), y = ri(0, CH - 1); if (g[y][x].m || (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1)) continue; g[y][x].m = true; n++; }
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) nb(x, y, (X, Y) => { if (g[Y][X].m) g[y][x].n++; });
    }
    function open(x, y) {
      const s = [[x, y]];
      while (s.length) {
        const [a, b] = s.pop(); const c0 = g[b][a];
        if (c0.open || c0.flag) continue;
        c0.open = true; opened++; api.add(10);
        if (!c0.n) nb(a, b, (X, Y) => s.push([X, Y]));
      }
    }
    function act(x, y, flag) {
      if (done) return;
      const c0 = g[y][x];
      if (flag) { if (!c0.open) { c0.flag = !c0.flag; api.beep(300, 0.03); } return; }
      if (c0.flag || c0.open) return;
      if (first) { plant(x, y); first = false; }
      if (c0.m) { done = true; c0.open = true; g.forEach(r => r.forEach(q => { if (q.m) q.open = true; })); api.beep(90, 0.4, 'sawtooth'); api.over('ドカン！'); return; }
      open(x, y); api.beep(500, 0.02);
      if (opened === CW * CH - M) { done = true; api.add(500 + Math.max(0, Math.round(300 - api.t)) * 2); api.over('ぜんぶクリア！'); }
    }
    return {
      down(x, y) {
        if (inR(x, y, btn)) { flagMode = !flagMode; return; }
        const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S);
        if (i >= 0 && i < CW && j >= 0 && j < CH) { cx = i; cy = j; act(i, j, flagMode); }
      },
      key(k, raw) {
        if (k === 'L') cx = Math.max(0, cx - 1); if (k === 'R') cx = Math.min(CW - 1, cx + 1);
        if (k === 'U') cy = Math.max(0, cy - 1); if (k === 'D') cy = Math.min(CH - 1, cy + 1);
        if (k === 'A') act(cx, cy, flagMode);
        if (raw === 'f' || raw === 'F') act(cx, cy, true);
      },
      draw(c) {
        const flags = g.flat().filter(q => q.flag).length;
        label(c, `地雷 ${M} ／ 旗 ${flags}`, 18, 26); txt(c, `${Math.floor(api.t)} 秒`, W - 18, 26, 14, PAL.dim, 'right');
        const nc = ['', COL[4], COL[6], COL[0], COL[5], COL[1], COL[3], PAL.fg, PAL.dim];
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
          const q = g[y][x], X = OX + x * S, Y = OY + y * S;
          if (q.open) { rect(c, X + 1, Y + 1, S - 2, S - 2, q.m ? COL[0] : '#1a1631'); if (q.m) circ(c, X + S / 2, Y + S / 2, 9, PAL.bg); else if (q.n) txt(c, q.n, X + S / 2, Y + S / 2 + 1, 20, nc[q.n], 'center', true); }
          else { rrect(c, X + 2, Y + 2, S - 4, S - 4, 5, '#3d3570'); if (q.flag) txt(c, '⚑', X + S / 2, Y + S / 2, 20, COL[1]); }
        }
        c.strokeStyle = PAL.dim; c.lineWidth = 2; c.strokeRect(OX + cx * S + 1, OY + cy * S + 1, S - 2, S - 2);
        rrect(c, btn.x, btn.y, btn.w, btn.h, 24, flagMode ? COL[1] : PAL.grid);
        txt(c, flagMode ? '⚑ 旗モード ON' : '⚑ 旗モード OFF', W / 2, btn.y + btn.h / 2, 16, flagMode ? PAL.bg : PAL.fg);
      },
    };
  },
});

// 14 ピンポン
def({
  id: 'pong', name: 'ピンポン', cat: 'アクション', pad: 'lr',
  desc: 'コンピューターとラリー対決。5点取られたら終わり。',
  help: 'マウス・指・←→ で下のラケットを動かす',
  create(api) {
    const pw = 72; let px = W / 2, cx = W / 2, you = 0, cpu = 0, ball, serveT = 1, rally = 0;
    function serve(dir) { const a = rnd(-0.5, 0.5); ball = { x: W / 2, y: H / 2, vx: Math.sin(a) * 260, vy: dir * Math.cos(a) * 260, sp: 260 }; serveT = 0.8; rally = 0; }
    serve(1);
    function bounce(bxp, dir) { const a = clamp((ball.x - bxp) / (pw / 2), -1, 1) * 0.9; ball.sp = Math.min(620, ball.sp + 18); ball.vx = Math.sin(a) * ball.sp; ball.vy = dir * Math.cos(a) * ball.sp; api.beep(dir < 0 ? 520 : 380, 0.03); }
    return {
      move(x) { px = x; }, down(x) { px = x; },
      update(dt) {
        if (api.held.L) px -= 420 * dt; if (api.held.R) px += 420 * dt; px = clamp(px, pw / 2, W - pw / 2);
        const cs = 190 + you * 18; cx += clamp(ball.x - cx, -cs * dt, cs * dt); cx = clamp(cx, pw / 2, W - pw / 2);
        if (serveT > 0) { serveT -= dt; return; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 8 || ball.x > W - 8) { ball.vx *= -1; ball.x = clamp(ball.x, 8, W - 8); }
        if (ball.vy > 0 && ball.y > 490 && ball.y < 506 && Math.abs(ball.x - px) < pw / 2 + 8) { ball.y = 490; bounce(px, -1); rally++; api.add(5); }
        if (ball.vy < 0 && ball.y < 56 && ball.y > 40 && Math.abs(ball.x - cx) < pw / 2 + 8) { ball.y = 56; bounce(cx, 1); }
        if (ball.y < 0) { you++; api.add(100 + rally * 10); api.beep(900, 0.12); serve(1); }
        if (ball.y > H) { cpu++; api.beep(140, 0.2); if (cpu >= 5) api.over(`${you} 対 ${cpu}`); else serve(-1); }
      },
      draw(c) {
        for (let x = 0; x < W; x += 24) rect(c, x, H / 2 - 1, 12, 2, PAL.line);
        txt(c, cpu, 30, H / 2 - 30, 30, PAL.dim, 'center', true); txt(c, you, 30, H / 2 + 30, 30, PAL.fg, 'center', true);
        rrect(c, cx - pw / 2, 44, pw, 12, 6, COL[0]); rrect(c, px - pw / 2, 494, pw, 12, 6, COL[3]);
        circ(c, ball.x, ball.y, 8, PAL.fg);
        label(c, 'コンピューター', 10, 18); txt(c, 'あなた', 10, 526, 14, PAL.dim, 'left');
      },
    };
  },
});

// 15 隕石よけ
def({
  id: 'meteor', name: '隕石よけ', cat: 'アクション', pad: 'lr',
  desc: '降ってくる隕石をよけ続ける。長く生きるほど高得点。',
  help: 'マウス・指でなぞる ／ ←→ で動く',
  create(api) {
    let sx = W / 2, target = null, rocks = [], t = 0, dodged = 0;
    return {
      move(x) { target = x; }, down(x) { target = x; },
      update(dt) {
        if (api.held.L || api.held.R) { target = null; sx += (api.held.R - api.held.L) * 300 * dt; }
        else if (target != null) sx += clamp(target - sx, -420 * dt, 420 * dt);
        sx = clamp(sx, 14, W - 14);
        t -= dt;
        if (t <= 0) { const r = rnd(9, 24); rocks.push({ x: rnd(r, W - r), y: -r, r, vy: rnd(140, 260) + api.t * 6, vx: rnd(-30, 30), a: 0 }); t = Math.max(0.12, 0.55 - api.t * 0.008); }
        for (const o of rocks) { o.y += o.vy * dt; o.x += o.vx * dt; o.a += dt * 2; if (dist(o.x, o.y, sx, 478) < o.r + 9) api.over('当たった！'); }
        const n0 = rocks.length; rocks = rocks.filter(o => o.y < H + 30); dodged += n0 - rocks.length;
        api.set(Math.floor(api.t * 10) + dodged * 2);
      },
      draw(c) {
        for (let i = 0; i < 30; i++) rect(c, (i * 71) % W, (i * 113 + api.t * 30 * (1 + i % 3)) % H, 2, 2, PAL.line);
        for (const o of rocks) { circ(c, o.x, o.y, o.r, '#9a7f6b'); circ(c, o.x - o.r * 0.3, o.y - o.r * 0.2, o.r * 0.3, '#7d6656'); }
        poly(c, [[sx, 462], [sx + 13, 492], [sx - 13, 492]], COL[3]); rect(c, sx - 4, 492, 8, 6 + Math.random() * 5, COL[1]);
        label(c, `${api.t.toFixed(1)} 秒`);
      },
    };
  },
});

// 16 スペースシューター
def({
  id: 'shooter', name: 'スペースシューター', cat: 'アクション', pad: 'lr',
  desc: '自動で弾を撃つ戦闘機で、敵の編隊をうち落とす。',
  help: 'マウス・指でなぞる ／ ←→ で動く（弾は自動）',
  create(api) {
    let sx = W / 2, target = null, shots = [], foes = [], eb = [], fire = 0, spawn = 1, lives = 3, inv = 0, wave = 0;
    const fx = makeFx();
    return {
      move(x) { target = x; }, down(x) { target = x; },
      update(dt) {
        fx.update(dt); inv -= dt;
        if (api.held.L || api.held.R) { target = null; sx += (api.held.R - api.held.L) * 320 * dt; }
        else if (target != null) sx += clamp(target - sx, -460 * dt, 460 * dt);
        sx = clamp(sx, 16, W - 16);
        fire -= dt; if (fire <= 0) { shots.push({ x: sx, y: 460 }); fire = 0.17; }
        spawn -= dt;
        if (spawn <= 0) {
          wave++; const n = 3 + Math.min(5, Math.floor(wave / 3)), bx = rnd(60, W - 60), big = wave % 5 === 0;
          for (let i = 0; i < n; i++) foes.push({ x: bx, y: -20 - i * 34, ph: i * 0.6, amp: rnd(40, 90), cx: bx, vy: 70 + wave * 2.5, hp: big && i === 0 ? 6 : 1, big: big && i === 0 });
          spawn = Math.max(0.9, 2.4 - wave * 0.05);
        }
        for (const s of shots) s.y -= 520 * dt;
        for (const f of foes) {
          f.y += f.vy * dt; f.ph += dt * 2; f.x = clamp(f.cx + Math.sin(f.ph) * f.amp, 14, W - 14);
          if (Math.random() < dt * (0.25 + wave * 0.02) && f.y > 0 && f.y < 380) eb.push({ x: f.x, y: f.y, vx: (sx - f.x) * 0.4, vy: 200 });
        }
        for (const b of eb) { b.x += b.vx * dt; b.y += b.vy * dt; }
        for (const s of shots) for (const f of foes) if (!s.dead && f.hp > 0 && Math.abs(s.x - f.x) < (f.big ? 22 : 14) && Math.abs(s.y - f.y) < 14) { s.dead = true; if (--f.hp <= 0) { api.add(f.big ? 100 : 10); fx.burst(f.x, f.y, f.big ? COL[1] : COL[0], 10); api.beep(240, 0.05, 'triangle'); } }
        const hitMe = o => inv <= 0 && Math.abs(o.x - sx) < 14 && Math.abs(o.y - 478) < 16;
        for (const o of [...foes.filter(f => f.hp > 0), ...eb]) if (hitMe(o)) { lives--; inv = 1.5; o.hp = 0; o.y = H + 99; fx.burst(sx, 478, COL[3], 16); api.beep(110, 0.25, 'sawtooth'); if (lives <= 0) api.over('撃墜された'); }
        shots = shots.filter(s => !s.dead && s.y > -10); foes = foes.filter(f => f.hp > 0 && f.y < H + 30); eb = eb.filter(b => b.y < H + 10);
      },
      draw(c) {
        for (let i = 0; i < 30; i++) rect(c, (i * 71) % W, (i * 113 + api.t * 60 * (1 + i % 3)) % H, 2, 2, PAL.line);
        for (const s of shots) rect(c, s.x - 2, s.y - 8, 4, 12, COL[2]);
        for (const f of foes) { const r = f.big ? 20 : 12; poly(c, [[f.x - r, f.y - r * 0.6], [f.x + r, f.y - r * 0.6], [f.x, f.y + r]], f.big ? COL[1] : COL[0]); circ(c, f.x, f.y - 2, r * 0.3, PAL.bg); }
        for (const b of eb) circ(c, b.x, b.y, 4, COL[5]);
        if (inv <= 0 || Math.floor(inv * 10) % 2) { poly(c, [[sx, 460], [sx + 15, 494], [sx - 15, 494]], COL[3]); rect(c, sx - 3, 470, 6, 10, PAL.fg); }
        fx.draw(c); label(c, `ウェーブ ${wave}`); hearts(c, lives);
      },
    };
  },
});

// 17 色と文字
def({
  id: 'stroop', name: '色と文字', cat: '頭脳', time: 30,
  desc: '文字の意味ではなく「文字の色」を答える。だまされないで。',
  help: '文字の色と同じ名前のボタンをタップ ／ 矢印キー',
  create(api) {
    const C = [['あか', COL[0]], ['あお', COL[4]], ['きいろ', COL[2]], ['みどり', COL[6]]];
    let q, combo = 0, flash = null, fT = 0, good = true;
    const keys = ['U', 'L', 'R', 'D'];
    function gen() { const w = ri(0, 3); let ink = ri(0, 3); if (Math.random() < 0.8) while (ink === w) ink = ri(0, 3); q = { w, ink, order: shuffle([0, 1, 2, 3]) }; }
    function answer(k) {
      if (!k) return; const i = keys.indexOf(k); good = q.order[i] === q.ink; flash = k; fT = 0.2;
      if (good) { combo++; api.add(10 + Math.min(combo, 15)); api.beep(700, 0.04); } else { combo = 0; api.add(-10); api.beep(140, 0.15); }
      gen();
    }
    gen();
    return {
      down(x, y) { answer(crossHit(x, y)); }, key(k) { if (keys.includes(k)) answer(k); },
      update(dt) { fT -= dt; },
      draw(c) {
        txt(c, 'この文字の「色」は？', W / 2, 70, 16, PAL.dim);
        txt(c, C[q.w][0], W / 2, 160, 64, C[q.ink][1]);
        if (combo > 1) txt(c, `${combo} れんぞく！`, W / 2, 226, 16, COL[2]);
        const labels = {}; keys.forEach((k, i) => (labels[k] = C[q.order[i]][0]));
        drawCross(c, labels, fT > 0 ? { flash, flashCol: good ? COL[6] : COL[0] } : {});
      },
    };
  },
});

// 18 数字順タップ
def({
  id: 'numtap', name: '数字順タップ', cat: '反射', pad: 'none',
  desc: 'バラバラに並んだ1〜25を、1から順番に早くタップする。',
  help: '1、2、3…と順番にタップ（まちがえると1秒ペナルティ）',
  create(api) {
    const S = 64, OX = (W - 5 * S) / 2, OY = 110;
    const nums = shuffle([...Array(25)].map((_, i) => i + 1));
    let next = 1, pen = 0, flash = -1, fT = 0;
    return {
      down(x, y) {
        const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i < 0 || i > 4 || j < 0 || j > 4) return;
        const k = j * 5 + i;
        if (nums[k] === next) { next++; api.beep(400 + next * 20, 0.03); if (next > 25) { const tt = api.t + pen; api.set(Math.max(100, Math.round(8000 - tt * 200))); api.over(`${tt.toFixed(2)} 秒`); } }
        else if (nums[k] > next) { pen += 1; flash = k; fT = 0.3; api.beep(140, 0.12); }
      },
      update(dt) { fT -= dt; },
      draw(c) {
        txt(c, `つぎ： ${Math.min(next, 25)}`, 20, 60, 22, COL[2], 'left');
        txt(c, `${(api.t + pen).toFixed(2)} 秒`, W - 20, 60, 22, PAL.fg, 'right', true);
        nums.forEach((n, k) => {
          const x = OX + (k % 5) * S, y = OY + Math.floor(k / 5) * S, done = n < next;
          rrect(c, x + 3, y + 3, S - 6, S - 6, 8, fT > 0 && flash === k ? COL[0] : done ? '#1a1631' : PAL.grid);
          txt(c, n, x + S / 2, y + S / 2 + 1, 24, done ? PAL.line : PAL.fg, 'center', true);
        });
        txt(c, '8000点 − 1秒ごとに200点', W / 2, 460, 13, PAL.dim);
      },
    };
  },
});

// 19 カラー消し
def({
  id: 'colorpop', name: 'カラー消し', cat: 'パズル',
  desc: 'となり合った同じ色のかたまりを消す。大きなかたまりほど高得点。',
  help: '2つ以上つながった同じ色をタップ ／ 矢印キーで選んで A',
  create(api) {
    const CW = 10, CH = 12, S = 32, OX = 20, OY = 72, cols = [COL[0], COL[2], COL[3], COL[4]];
    const g = Array.from({ length: CW }, () => Array.from({ length: CH }, () => ri(0, 3)));
    let cx = 0, cy = 0; const fx = makeFx();
    const at = (x, i) => (g[x] && g[x][i] != null ? g[x][i] : -1);
    function group(x, i) {
      const v = at(x, i); if (v < 0) return [];
      const seen = new Set(), st = [[x, i]], out = [];
      while (st.length) { const [a, b] = st.pop(), k = a * 100 + b; if (seen.has(k) || at(a, b) !== v) continue; seen.add(k); out.push([a, b]); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
      return out;
    }
    function anyMove() { for (let x = 0; x < g.length; x++) for (let i = 0; i < g[x].length; i++) if (at(x + 1, i) === g[x][i] || at(x, i + 1) === g[x][i]) return true; return false; }
    function pop(x, i) {
      const gr = group(x, i); if (gr.length < 2) return;
      const n = gr.length; api.add(n * (n - 1) * 5); api.beep(300 + Math.min(n, 20) * 30, 0.06);
      const sx = OX + x * S + S / 2, sy = OY + (CH - 1 - i) * S + S / 2; fx.pop(sx, sy, '+' + n * (n - 1) * 5, PAL.fg);
      gr.forEach(([a, b]) => (g[a][b] = null));
      for (let a = 0; a < g.length; a++) g[a] = g[a].filter(v => v != null);
      for (let a = g.length - 1; a >= 0; a--) if (!g[a].length) g.splice(a, 1);
      if (!g.length) { api.add(1000); api.over('ぜんぶ消えた！'); } else if (!anyMove()) api.over('もう消せない');
    }
    return {
      down(x, y) { const a = Math.floor((x - OX) / S), b = CH - 1 - Math.floor((y - OY) / S); if (a >= 0 && b >= 0 && b < CH) { cx = a; cy = b; pop(a, b); } },
      key(k) { if (k === 'L') cx = Math.max(0, cx - 1); if (k === 'R') cx = Math.min(CW - 1, cx + 1); if (k === 'U') cy = Math.min(CH - 1, cy + 1); if (k === 'D') cy = Math.max(0, cy - 1); if (k === 'A') pop(cx, cy); },
      update(dt) { fx.update(dt); },
      draw(c) {
        rect(c, OX - 4, OY - 4, CW * S + 8, CH * S + 8, PAL.grid);
        g.forEach((col, x) => col.forEach((v, i) => cell(c, OX + x * S, OY + (CH - 1 - i) * S, S, cols[v])));
        const hl = group(cx, cy); if (hl.length > 1) { c.globalAlpha = 0.35; hl.forEach(([a, b]) => rect(c, OX + a * S, OY + (CH - 1 - b) * S, S, S, PAL.fg)); c.globalAlpha = 1; }
        c.strokeStyle = PAL.fg; c.lineWidth = 2; c.strokeRect(OX + cx * S + 1, OY + (CH - 1 - cy) * S + 1, S - 2, S - 2);
        fx.draw(c); label(c, `のこり ${g.reduce((s, col) => s + col.length, 0)} 個`, 20, 40);
        txt(c, 'n個消すと n×(n−1)×5 点', W / 2, 500, 13, PAL.dim);
      },
    };
  },
});

// 20 フルーツキャッチ
def({
  id: 'catch', name: 'フルーツキャッチ', cat: 'アクション', pad: 'lr',
  desc: '落ちてくる果物をカゴで受け止める。爆弾はさける。',
  help: 'マウス・指でなぞる ／ ←→ で動く',
  create(api) {
    let bx = W / 2, target = null, items = [], t = 0, lives = 3; const fx = makeFx();
    return {
      move(x) { target = x; }, down(x) { target = x; },
      update(dt) {
        fx.update(dt);
        if (api.held.L || api.held.R) { target = null; bx += (api.held.R - api.held.L) * 340 * dt; } else if (target != null) bx += clamp(target - bx, -480 * dt, 480 * dt);
        bx = clamp(bx, 36, W - 36);
        t -= dt; if (t <= 0) { items.push({ x: rnd(20, W - 20), y: -20, vy: rnd(150, 230) + api.t * 4, bomb: Math.random() < 0.18 + Math.min(0.15, api.t * 0.003), c: ri(0, 4) }); t = Math.max(0.3, 0.9 - api.t * 0.01); }
        for (const o of items) {
          o.y += o.vy * dt;
          if (!o.done && o.y > 470 && o.y < 500 && Math.abs(o.x - bx) < 40) {
            o.done = true;
            if (o.bomb) { lives--; fx.burst(o.x, o.y, COL[1], 14); api.beep(100, 0.3, 'sawtooth'); if (lives <= 0) api.over('爆弾をとった！'); }
            else { api.add(10); fx.pop(o.x, 450, '+10', COL[2]); api.beep(760, 0.04); }
          }
          if (!o.done && o.y > H) { o.done = true; if (!o.bomb) { lives--; api.beep(160, 0.15); if (lives <= 0) api.over('落としすぎた'); } }
        }
        items = items.filter(o => !o.done);
      },
      draw(c) {
        for (const o of items) {
          if (o.bomb) { circ(c, o.x, o.y, 13, '#3a3555'); rect(c, o.x - 1, o.y - 20, 3, 8, PAL.dim); circ(c, o.x + 1, o.y - 21, 3, COL[1]); }
          else { circ(c, o.x, o.y, 13, [COL[0], COL[1], COL[2], COL[5], COL[6]][o.c]); rect(c, o.x - 1, o.y - 18, 3, 7, '#5fc169'); }
        }
        poly(c, [[bx - 38, 476], [bx + 38, 476], [bx + 28, 506], [bx - 28, 506]], '#c08a4a'); rect(c, bx - 38, 474, 76, 5, '#e0a861');
        fx.draw(c); hearts(c, lives);
      },
    };
  },
});

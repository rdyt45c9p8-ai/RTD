/* ===== ゲーム 1〜10 ===== */

// 1 落ちものブロック
def({
  id: 'blocks', name: '落ちものブロック', cat: 'パズル', swipe: true, repeat: true,
  desc: '落ちてくるブロックを回して、横一列そろえて消す。',
  help: '←→ 移動 ／ ↑・タップ 回転 ／ ↓ 少し落とす ／ A 一気に落とす',
  create(api) {
    const CW = 10, CH = 20, S = 23, OX = 14, OY = 52;
    const P = [[[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]];
    const g = Array.from({ length: CH }, () => Array(CW).fill(0));
    let cur, next = ri(0, 6), t = 0, lines = 0, flash = 0, dead = false;
    const fits = (c, x, y) => c.every(([a, b]) => { const X = a + x, Y = b + y; return X >= 0 && X < CW && Y < CH && (Y < 0 || !g[Y][X]); });
    const lvl = () => Math.floor(lines / 10) + 1;
    function spawn() { cur = { t: next, c: P[next].map(p => [...p]), x: 3, y: -1 }; next = ri(0, 6); if (!fits(cur.c, cur.x, cur.y)) { dead = true; api.over(); } }
    function rot() {
      if (cur.t === 1) return;
      const n = cur.c.map(([a, b]) => [-b, a]);
      const mx = Math.min(...n.map(p => p[0])), my = Math.min(...n.map(p => p[1]));
      const c = n.map(([a, b]) => [a - mx, b - my]);
      for (const k of [0, -1, 1, -2, 2]) if (fits(c, cur.x + k, cur.y)) { cur.c = c; cur.x += k; api.beep(520, 0.03); return; }
    }
    function lock() {
      for (const [a, b] of cur.c) { if (b + cur.y < 0) { dead = true; api.over(); return; } g[b + cur.y][a + cur.x] = cur.t + 1; }
      let n = 0;
      for (let y = CH - 1; y >= 0; y--) if (g[y].every(v => v)) { g.splice(y, 1); g.unshift(Array(CW).fill(0)); n++; y++; }
      if (n) { api.add([0, 100, 300, 500, 800][n] * lvl()); lines += n; api.beep(500 + n * 120, 0.12); flash = 0.15; } else api.beep(160, 0.04);
      spawn();
    }
    function drop() { if (fits(cur.c, cur.x, cur.y + 1)) cur.y++; else lock(); }
    spawn();
    return {
      update(dt) { flash -= dt; t += dt; const sp = Math.max(0.08, 0.75 - (lvl() - 1) * 0.07); if (t > sp && !dead) { t = 0; drop(); } },
      key(k) {
        if (dead) return;
        if (k === 'L' && fits(cur.c, cur.x - 1, cur.y)) cur.x--;
        if (k === 'R' && fits(cur.c, cur.x + 1, cur.y)) cur.x++;
        if (k === 'D') { drop(); api.add(1); t = 0; }
        if (k === 'U' || k === 'T') rot();
        if (k === 'A') { while (fits(cur.c, cur.x, cur.y + 1)) { cur.y++; api.add(2); } lock(); t = 0; }
      },
      draw(c) {
        rect(c, OX - 3, OY - 3, CW * S + 6, CH * S + 6, PAL.line);
        rect(c, OX, OY, CW * S, CH * S, flash > 0 ? '#2d2656' : PAL.grid);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (g[y][x]) cell(c, OX + x * S, OY + y * S, S, COL[g[y][x] - 1]);
        if (cur && !dead) {
          let gy = cur.y; while (fits(cur.c, cur.x, gy + 1)) gy++;
          c.globalAlpha = 0.25; for (const [a, b] of cur.c) if (b + gy >= 0) cell(c, OX + (a + cur.x) * S, OY + (b + gy) * S, S, COL[cur.t]); c.globalAlpha = 1;
          for (const [a, b] of cur.c) if (b + cur.y >= 0) cell(c, OX + (a + cur.x) * S, OY + (b + cur.y) * S, S, COL[cur.t]);
        }
        const sx = OX + CW * S + 14, cx = sx + (W - sx) / 2;
        label(c, 'つぎ', sx, 62);
        for (const [a, b] of P[next]) cell(c, cx - 28 + a * 14, 82 + b * 14, 14, COL[next]);
        label(c, 'ライン', sx, 150); txt(c, lines, sx, 176, 22, PAL.fg, 'left', true);
        label(c, 'レベル', sx, 214); txt(c, lvl(), sx, 240, 22, PAL.fg, 'left', true);
        label(c, '10ラインで', sx, 290); label(c, 'レベルアップ', sx, 310);
      },
    };
  },
});

// 2 スネーク
def({
  id: 'snake', name: 'スネーク', cat: 'アクション', swipe: true,
  desc: 'エサを食べるたびに体がのびる。壁と自分にぶつかったら終わり。',
  help: '矢印キー・スワイプで向きを変える',
  create(api) {
    const S = 20, CW = 18, CH = 24, OY = 40;
    let sn = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }], dir = { x: 1, y: 0 }, q = [], food, t = 0, spd = 0.14, dead = false;
    const D = { L: { x: -1, y: 0 }, R: { x: 1, y: 0 }, U: { x: 0, y: -1 }, D: { x: 0, y: 1 } };
    function place() { do { food = { x: ri(0, CW - 1), y: ri(0, CH - 1) }; } while (sn.some(p => p.x === food.x && p.y === food.y)); }
    place();
    return {
      key(k) {
        const d = D[k]; if (!d) return;
        const last = q.length ? q[q.length - 1] : dir;
        if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return;
        if (q.length < 3) q.push(d);
      },
      update(dt) {
        if (dead) return;
        t += dt; if (t < spd) return; t = 0;
        if (q.length) dir = q.shift();
        const h = { x: sn[0].x + dir.x, y: sn[0].y + dir.y };
        const ate = h.x === food.x && h.y === food.y;
        const body = ate ? sn : sn.slice(0, -1);
        if (h.x < 0 || h.y < 0 || h.x >= CW || h.y >= CH || body.some(p => p.x === h.x && p.y === h.y)) { dead = true; api.over('ぶつかった！'); return; }
        sn.unshift(h);
        if (ate) { api.add(10); api.beep(660, 0.05); spd = Math.max(0.06, spd - 0.003); place(); } else sn.pop();
      },
      draw(c) {
        rect(c, 0, OY, W, CH * S, PAL.grid);
        for (let x = 0; x < CW; x++) for (let y = 0; y < CH; y++) if ((x + y) % 2) rect(c, x * S, OY + y * S, S, S, '#1c1836');
        circ(c, food.x * S + S / 2, OY + food.y * S + S / 2, 7, COL[0]);
        sn.forEach((p, i) => rrect(c, p.x * S + 1, OY + p.y * S + 1, S - 2, S - 2, 5, i ? COL[6] : COL[3]));
        label(c, `長さ ${sn.length}`);
      },
    };
  },
});

// 3 ブロック崩し
def({
  id: 'breakout', name: 'ブロック崩し', cat: 'アクション',
  desc: 'バーでボールを打ち返して、上のブロックを全部こわす。',
  help: 'マウス・指・←→ でバーを動かす ／ タップ・A で発射',
  create(api) {
    const pw = 72, py = 500;
    let px = W / 2, ball, bricks = [], lives = 3, level = 1, stuck = true;
    const fx = makeFx();
    const speed = () => 300 + level * 30;
    function wall() { bricks = []; for (let r = 0; r < 6; r++) for (let i = 0; i < 8; i++) bricks.push({ x: 8 + i * 43.5, y: 64 + r * 20, w: 41, h: 16, c: COL[r % COL.length], hp: r < Math.min(level - 1, 3) ? 2 : 1 }); }
    function reset() { stuck = true; ball = { x: px, y: py - 10, vx: 0, vy: 0, r: 7 }; }
    function launch() { if (!stuck) return; stuck = false; const a = rnd(-0.4, 0.4); ball.vx = Math.sin(a) * speed(); ball.vy = -Math.cos(a) * speed(); }
    wall(); reset();
    return {
      move(x) { px = x; },
      down(x) { px = x; launch(); },
      key(k) { if (k === 'A' || k === 'U') launch(); },
      update(dt) {
        fx.update(dt);
        if (api.held.L) px -= 420 * dt; if (api.held.R) px += 420 * dt;
        px = clamp(px, pw / 2, W - pw / 2);
        if (stuck) { ball.x = px; ball.y = py - 10; return; }
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
          if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < 34 + ball.r) { ball.y = 34 + ball.r; ball.vy = Math.abs(ball.vy); }
          if (ball.vy > 0 && ball.y + ball.r >= py && ball.y < py + 12 && Math.abs(ball.x - px) < pw / 2 + ball.r) {
            const a = clamp((ball.x - px) / (pw / 2), -1, 1) * 1.05;
            ball.vx = Math.sin(a) * speed(); ball.vy = -Math.cos(a) * speed(); api.beep(300, 0.03);
          }
          for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i];
            const nx = clamp(ball.x, b.x, b.x + b.w), ny = clamp(ball.y, b.y, b.y + b.h);
            if ((ball.x - nx) ** 2 + (ball.y - ny) ** 2 < ball.r ** 2) {
              const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - ball.x + ball.r), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - ball.y + ball.r);
              if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
              if (--b.hp <= 0) { bricks.splice(i, 1); api.add(10 * level); fx.burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 8); api.beep(700, 0.03); }
              break;
            }
          }
        }
        if (ball.y > H + 20) { lives--; api.beep(120, 0.2); if (lives <= 0) api.over(); else reset(); }
        if (!bricks.length) { api.add(200); level++; wall(); reset(); }
      },
      draw(c) {
        for (const b of bricks) { rrect(c, b.x, b.y, b.w, b.h, 3, b.c); if (b.hp > 1) rect(c, b.x + 4, b.y + 6, b.w - 8, 4, 'rgba(0,0,0,.35)'); }
        rrect(c, px - pw / 2, py, pw, 12, 6, PAL.fg);
        circ(c, ball.x, ball.y, ball.r, COL[2]);
        fx.draw(c);
        label(c, `ステージ ${level}`); hearts(c, lives);
        if (stuck) txt(c, 'タップ・A で発射', W / 2, 420, 16, PAL.dim);
      },
    };
  },
});

// 4 数字合体
def({
  id: 'merge', name: '数字合体', cat: 'パズル', swipe: true,
  desc: '全部のタイルをすべらせて、同じ数字どうしを合体させる。',
  help: '矢印キー・スワイプで全部のタイルが動く',
  create(api) {
    const N = 4, S = 80, OX = 20, OY = 130;
    const b = Array(16).fill(0); let best = 2;
    function addTile() { const e = []; b.forEach((v, i) => { if (!v) e.push(i); }); if (e.length) b[pick(e)] = Math.random() < 0.9 ? 2 : 4; }
    function slide(row) {
      const a = row.filter(v => v);
      for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; api.add(a[i]); best = Math.max(best, a[i]); a.splice(i + 1, 1); }
      while (a.length < N) a.push(0);
      return a;
    }
    function canMove() {
      for (let i = 0; i < 16; i++) {
        if (!b[i]) return true;
        if (i % N < N - 1 && b[i] === b[i + 1]) return true;
        if (i < 12 && b[i] === b[i + N]) return true;
      }
      return false;
    }
    addTile(); addTile();
    const colors = ['#2b2550', '#3d3470', '#5c4a9a', COL[4], COL[3], COL[6], COL[2], COL[1], COL[0], COL[5], '#ff9a5a', '#ffffff'];
    return {
      key(k) {
        if (!'LRUD'.includes(k)) return;
        let moved = false;
        for (let i = 0; i < N; i++) {
          const idx = [];
          for (let j = 0; j < N; j++) idx.push(k === 'L' ? i * N + j : k === 'R' ? i * N + (N - 1 - j) : k === 'U' ? j * N + i : (N - 1 - j) * N + i);
          const nr = slide(idx.map(x => b[x]));
          idx.forEach((x, j) => { if (b[x] !== nr[j]) moved = true; b[x] = nr[j]; });
        }
        if (moved) { addTile(); api.beep(440, 0.03); if (!canMove()) api.over('もう動かせない'); }
      },
      draw(c) {
        label(c, `いちばん大きい数 ${best}`, 20, 90);
        rrect(c, OX - 6, OY - 6, N * S + 12, N * S + 12, 12, PAL.line);
        for (let i = 0; i < 16; i++) {
          const x = OX + (i % N) * S, y = OY + Math.floor(i / N) * S, v = b[i];
          const lv = v ? Math.min(colors.length - 1, Math.log2(v)) : 0;
          rrect(c, x + 4, y + 4, S - 8, S - 8, 8, v ? colors[lv] : PAL.grid);
          if (v) txt(c, v, x + S / 2, y + S / 2 + 1, v < 100 ? 30 : v < 1000 ? 25 : 20, lv >= 11 ? PAL.bg : lv >= 4 ? PAL.bg : PAL.fg, 'center', true);
        }
      },
    };
  },
});

// 5 パタパタ鳥
def({
  id: 'flap', name: 'パタパタ鳥', cat: 'アクション',
  desc: '羽ばたいて、土管のすき間をくぐりぬける。',
  help: 'タップ・A・↑ で羽ばたく',
  create(api) {
    const bx = 90; let by = 240, vy = -300, pipes = [], t = 0, passed = 0;
    const flap = () => { vy = -400; api.beep(620, 0.03); };
    return {
      down: flap,
      key(k) { if (k === 'A' || k === 'U') flap(); },
      update(dt) {
        const sp = 150 + passed * 3;
        vy += 1300 * dt; by += vy * dt; t += dt;
        if (t > 1.45) { t = 0; const gap = Math.max(120, 160 - passed * 1.5); pipes.push({ x: W + 30, y: rnd(90, 430 - gap), gap, done: false }); }
        for (const p of pipes) {
          p.x -= sp * dt;
          if (!p.done && p.x + 56 < bx) { p.done = true; passed++; api.add(10); api.beep(880, 0.04); }
          if (bx + 12 > p.x && bx - 12 < p.x + 56 && (by - 11 < p.y || by + 11 > p.y + p.gap)) api.over('ぶつかった！');
        }
        pipes = pipes.filter(p => p.x > -70);
        if (by > 500 || by < 0) api.over('落ちた！');
      },
      draw(c) {
        rect(c, 0, 500, W, 40, '#2d2648');
        for (const p of pipes) {
          rect(c, p.x, 0, 56, p.y, COL[6]); rect(c, p.x - 4, p.y - 18, 64, 18, '#5fc169');
          rect(c, p.x, p.y + p.gap, 56, 500 - p.y - p.gap, COL[6]); rect(c, p.x - 4, p.y + p.gap, 64, 18, '#5fc169');
        }
        c.save(); c.translate(bx, by); c.rotate(clamp(vy / 700, -0.5, 1));
        circ(c, 0, 0, 13, COL[2]); circ(c, 5, -4, 4, PAL.fg); circ(c, 6, -4, 2, PAL.bg); poly(c, [[11, 0], [20, 3], [11, 6]], COL[1]);
        poly(c, [[-8, 0], [-2, Math.sin(api.t * 20) * 6], [-14, 4]], '#e8c84a');
        c.restore();
        txt(c, passed, W / 2, 60, 40, PAL.fg, 'center', true);
      },
    };
  },
});

// 6 ジャンプラン
def({
  id: 'runner', name: 'ジャンプラン', cat: 'アクション',
  desc: 'どんどん速くなる道で、障害物をジャンプでよける。',
  help: 'タップ・A・↑ でジャンプ（長押しで高く）',
  create(api) {
    const G = 430; const p = { x: 60, y: G - 32, w: 28, h: 32, vy: 0 };
    let obs = [], t = 0.8, dist0 = 0, sp = 260;
    const ground = () => p.y >= G - p.h - 0.5;
    const jump = () => { if (ground()) { p.vy = -640; api.beep(520, 0.04); } };
    return {
      down: jump,
      key(k) { if (k === 'A' || k === 'U') jump(); },
      update(dt) {
        sp = 260 + api.t * 8;
        const hold = api.held.A || api.held.U || api.ptr.down;
        p.vy += (p.vy < 0 && hold ? 1100 : 2200) * dt; p.y += p.vy * dt;
        if (p.y > G - p.h) { p.y = G - p.h; p.vy = 0; }
        t -= dt;
        if (t <= 0) {
          const k = Math.random();
          if (k < 0.75 || api.t < 6) { const h = ri(26, 54); obs.push({ x: W + 10, y: G - h, w: ri(16, 34), h, fly: false }); }
          else obs.push({ x: W + 10, y: G - 74, w: 34, h: 18, fly: true });
          t = rnd(0.7, 1.5) * 300 / sp + 0.25;
        }
        for (const o of obs) { o.x -= sp * dt; if (ov({ x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 6 }, o)) api.over('ぶつかった！'); }
        obs = obs.filter(o => o.x > -50);
        dist0 += sp * dt; api.set(Math.floor(dist0 / 10));
      },
      draw(c) {
        rect(c, 0, G, W, H - G, '#2d2648');
        for (let i = 0; i < 12; i++) rect(c, ((i * 40 - dist0) % 480 + 480) % 480 - 40, G + 18, 20, 3, PAL.line);
        for (const o of obs) o.fly ? (rrect(c, o.x, o.y, o.w, o.h, 8, COL[5]), rect(c, o.x + 6, o.y - 6 + Math.sin(api.t * 18) * 4, 14, 5, COL[5])) : rrect(c, o.x, o.y, o.w, o.h, 4, COL[6]);
        rrect(c, p.x, p.y, p.w, p.h, 6, COL[1]); rect(c, p.x + 17, p.y + 8, 5, 5, PAL.bg);
        label(c, `${Math.floor(dist0 / 10)} m`);
      },
    };
  },
});

// 7 もぐらたたき
def({
  id: 'mole', name: 'もぐらたたき', cat: '反射', time: 30, pad: 'none',
  desc: '穴から出てきたモグラをすばやくたたく。金色は高得点。',
  help: 'モグラをタップ ／ キーボードの 1〜9 でも たたける',
  create(api) {
    const holes = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) holes.push({ x: 60 + i * 120, y: 190 + j * 120, up: 0, gold: false, hit: 0 });
    let t = 0.5; const fx = makeFx();
    function whack(h) {
      if (h.up > 0 && !h.hit) { h.hit = 0.3; const p = h.gold ? 30 : 10; api.add(p); fx.pop(h.x, h.y - 50, '+' + p, h.gold ? COL[2] : PAL.fg); api.beep(h.gold ? 900 : 600, 0.05); }
    }
    return {
      down(x, y) { for (const h of holes) if (dist(x, y, h.x, h.y - 10) < 50) whack(h); },
      key(k, raw) { const n = parseInt(raw, 10); if (n >= 1 && n <= 9) whack(holes[n - 1]); },
      update(dt) {
        fx.update(dt); t -= dt;
        if (t <= 0) {
          const free = holes.filter(h => h.up <= 0); if (free.length) { const h = pick(free); h.up = rnd(0.6, 1.1) - Math.min(0.35, api.t * 0.01); h.gold = Math.random() < 0.12; h.hit = 0; }
          t = rnd(0.25, 0.6);
        }
        for (const h of holes) { if (h.up > 0) h.up -= dt; if (h.hit > 0) { h.hit -= dt; if (h.hit <= 0) h.up = 0; } }
      },
      draw(c) {
        holes.forEach((h, i) => {
          c.fillStyle = '#0c0a1a'; c.beginPath(); c.ellipse(h.x, h.y + 20, 46, 16, 0, 0, 6.28); c.fill();
          if (h.up > 0) {
            const col = h.hit ? '#7d6a5a' : h.gold ? COL[2] : '#a77b58';
            rrect(c, h.x - 30, h.y - 40, 60, 62, 26, col);
            if (h.hit) txt(c, '× ×', h.x, h.y - 15, 16, PAL.bg); else { circ(c, h.x - 11, h.y - 15, 4, PAL.bg); circ(c, h.x + 11, h.y - 15, 4, PAL.bg); }
            circ(c, h.x, h.y - 2, 7, COL[0]);
          }
          c.fillStyle = '#3a2f5c'; c.beginPath(); c.ellipse(h.x, h.y + 26, 50, 12, 0, 0, Math.PI); c.fill();
          txt(c, i + 1, h.x + 44, h.y - 34, 12, PAL.line);
        });
        fx.draw(c);
      },
    };
  },
});

// 8 反射神経
def({
  id: 'reflex', name: '反射神経', cat: '反射', pad: 'a',
  desc: '画面が緑に変わった瞬間にタップ。5回の合計で勝負。',
  help: '緑になったらタップ・A（早すぎるとフライング）',
  create(api) {
    let round = 1, st = 'wait', wait = rnd(1.5, 3.5), goAt = 0, res = '', resT = 0;
    const times = [];
    function hit() {
      if (st === 'wait') { st = 'res'; res = 'フライング！ 0点'; resT = 1.4; times.push(null); api.beep(150, 0.2); }
      else if (st === 'go') { const ms = Math.round((api.t - goAt) * 1000); const p = Math.max(0, 1000 - ms); api.add(p); st = 'res'; res = `${ms} ミリ秒 ＋${p}`; resT = 1.4; times.push(ms); api.beep(880, 0.08); }
    }
    return {
      down: hit, key(k) { if (k === 'A') hit(); },
      update(dt) {
        if (st === 'wait') { wait -= dt; if (wait <= 0) { st = 'go'; goAt = api.t; } }
        else if (st === 'go' && api.t - goAt > 1.5) { st = 'res'; res = 'おそすぎ… 0点'; resT = 1.4; times.push(null); }
        else if (st === 'res') { resT -= dt; if (resT <= 0) { if (round >= 5) api.over('5回おわり'); else { round++; st = 'wait'; wait = rnd(1.2, 4); } } }
      },
      draw(c) {
        rect(c, 0, 0, W, H, st === 'go' ? '#2f9e6a' : st === 'wait' ? '#7a2340' : PAL.bg);
        txt(c, `${round} / 5 回目`, W / 2, 50, 18, PAL.fg);
        if (st === 'wait') txt(c, 'まだ…', W / 2, 250, 44, PAL.fg);
        if (st === 'go') txt(c, '今！', W / 2, 250, 64, PAL.fg);
        if (st === 'res') txt(c, res, W / 2, 250, 26, PAL.fg);
        times.forEach((m, i) => txt(c, m == null ? '—' : m + 'ms', W / 2, 360 + i * 28, 16, PAL.dim, 'center', true));
      },
    };
  },
});

// 9 計算バトル
def({
  id: 'math', name: '計算バトル', cat: '頭脳', time: 45,
  desc: '計算の答えを4つの中から選ぶ。連続正解でボーナス。',
  help: '答えのボタンをタップ ／ 矢印キーでも選べる',
  create(api) {
    let q, combo = 0, flash = null, fT = 0, good = true, solved = 0;
    function gen() {
      const lv = Math.min(5, Math.floor(solved / 5));
      const op = pick(lv < 1 ? ['+'] : lv < 2 ? ['+', '-'] : ['+', '-', '×']);
      let a, b, ans;
      if (op === '×') { a = ri(2, 4 + lv * 2); b = ri(2, 9); ans = a * b; }
      else { a = ri(2, 9 + lv * 12); b = ri(1, 9 + lv * 8); if (op === '-' && b > a) [a, b] = [b, a]; ans = op === '+' ? a + b : a - b; }
      const set = new Set([ans]); while (set.size < 4) { const d = ans + pick([-1, 1]) * ri(1, Math.max(3, Math.ceil(ans * 0.2))); if (d >= 0) set.add(d); }
      const ks = shuffle(['U', 'L', 'R', 'D']); const labels = {}; let correct;
      [...set].forEach((v, i) => { labels[ks[i]] = v; if (v === ans) correct = ks[i]; });
      q = { s: `${a} ${op} ${b} = ?`, labels, correct };
    }
    function answer(k) {
      if (!k || fT > 0.15) return;
      flash = k; fT = 0.25; good = k === q.correct;
      if (good) { combo++; solved++; api.add(10 + Math.min(combo, 10) * 2); api.beep(700 + combo * 20, 0.05); } else { combo = 0; api.add(-5); api.beep(140, 0.15); }
      gen();
    }
    gen();
    return {
      down(x, y) { answer(crossHit(x, y)); },
      key(k) { if ('ULRD'.includes(k)) answer(k); },
      update(dt) { fT -= dt; },
      draw(c) {
        txt(c, q.s, W / 2, 140, 40, PAL.fg, 'center', true);
        if (combo > 1) txt(c, `${combo} れんぞく！`, W / 2, 205, 18, COL[2]);
        drawCross(c, q.labels, fT > 0 ? { flash, flashCol: good ? COL[6] : COL[0] } : {});
      },
    };
  },
});

// 10 神経衰弱
def({
  id: 'memory', name: '神経衰弱', cat: '頭脳', time: 60, pad: 'none',
  desc: 'カードを2枚ずつめくって、同じ絵柄のペアを見つける。',
  help: 'カードをタップしてめくる。全部そろうと次の山へ',
  create(api) {
    const S = 74, G = 8, OX = (W - (4 * S + 3 * G)) / 2, OY = 120;
    let cards, open = [], wait = 0, deals = 0;
    function deal() { cards = shuffle([...Array(8).keys(), ...Array(8).keys()]).map(v => ({ v, up: false, done: false })); deals++; }
    deal();
    return {
      down(x, y) {
        if (wait > 0) return;
        const i = Math.floor((x - OX) / (S + G)), j = Math.floor((y - OY) / (S + G));
        if (i < 0 || i > 3 || j < 0 || j > 3) return;
        const cd = cards[j * 4 + i]; if (cd.up || cd.done) return;
        cd.up = true; open.push(cd); api.beep(500, 0.03);
        if (open.length === 2) {
          if (open[0].v === open[1].v) { open.forEach(o => (o.done = true)); open = []; api.add(50); api.beep(880, 0.08); if (cards.every(o => o.done)) { api.add(200); wait = 0.6; } }
          else wait = 0.7;
        }
      },
      update(dt) {
        if (wait > 0) { wait -= dt; if (wait <= 0) { if (cards.every(o => o.done)) deal(); else { open.forEach(o => (o.up = false)); open = []; } } }
      },
      draw(c) {
        label(c, `${deals} 山目`, 20, 80);
        cards.forEach((cd, k) => {
          const x = OX + (k % 4) * (S + G), y = OY + Math.floor(k / 4) * (S + G);
          if (cd.up || cd.done) { rrect(c, x, y, S, S, 10, cd.done ? '#2a2448' : '#3a3266'); shape(c, cd.v, x + S / 2, y + S / 2, 20, cd.v === 7 ? PAL.fg : COL[cd.v]); }
          else { rrect(c, x, y, S, S, 10, COL[4]); rrect(c, x + 8, y + 8, S - 16, S - 16, 6, '#5a92e6'); txt(c, '?', x + S / 2, y + S / 2, 26, '#2d5aa8', 'center', true); }
        });
      },
    };
  },
});

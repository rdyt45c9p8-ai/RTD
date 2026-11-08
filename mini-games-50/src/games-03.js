/* ===== ゲーム 21〜30 ===== */

// 21 タワー積み
def({
  id: 'stack', name: 'タワー積み', cat: '反射', pad: 'a',
  desc: '左右に動くブロックを、ちょうど真上で止めて積み上げる。',
  help: 'タップ・A でブロックを落とす。はみ出た分は切り落とされる',
  create(api) {
    const BH = 24, BASE = 500;
    const st = [{ x: 80, w: 200 }];
    let mv = { x: 0, w: 200, dir: 1 }, perfect = 0, camY = 0, cut = null; const fx = makeFx();
    function drop() {
      const top = st[st.length - 1];
      const l = Math.max(mv.x, top.x), r = Math.min(mv.x + mv.w, top.x + top.w);
      if (r - l <= 0) { cut = { x: mv.x, w: mv.w, y: BASE - st.length * BH, vy: 0 }; api.over('はずれた！'); return; }
      let nb;
      if (Math.abs(mv.x - top.x) < 5) { nb = { x: top.x, w: top.w }; perfect++; api.add(10 + perfect * 5); fx.pop(W / 2, BASE - st.length * BH + camY - 30, 'ぴったり！', COL[2]); api.beep(700 + perfect * 40, 0.08); }
      else { nb = { x: l, w: r - l }; perfect = 0; api.add(10); api.beep(400, 0.05); cut = { x: mv.x < top.x ? mv.x : r, w: mv.w - (r - l), y: BASE - st.length * BH, vy: 0 }; }
      st.push(nb);
      mv = { x: mv.dir > 0 ? -nb.w : W, w: nb.w, dir: -mv.dir };
    }
    return {
      down: drop, key(k) { if (k === 'A' || k === 'U' || k === 'D') drop(); },
      update(dt) {
        fx.update(dt);
        const sp = 150 + st.length * 7;
        mv.x += mv.dir * sp * dt; if (mv.x > W - mv.w * 0.2) { mv.x = W - mv.w * 0.2; mv.dir = -1; } if (mv.x < -mv.w * 0.8) { mv.x = -mv.w * 0.8; mv.dir = 1; }
        camY += (Math.max(0, (st.length - 12) * BH) - camY) * Math.min(1, dt * 6);
        if (cut) { cut.vy += 900 * dt; cut.y += cut.vy * dt; if (cut.y > H + camY + 50) cut = null; }
      },
      draw(c) {
        st.forEach((b, i) => rect(c, b.x, BASE - i * BH + camY, b.w, BH - 2, `hsl(${(i * 14) % 360},70%,${55 + (i % 2) * 6}%)`));
        rect(c, mv.x, BASE - st.length * BH + camY, mv.w, BH - 2, `hsl(${(st.length * 14) % 360},70%,${55 + (st.length % 2) * 6}%)`);
        if (cut) rect(c, cut.x, cut.y + camY, cut.w, BH - 2, PAL.dim);
        fx.draw(c);
        txt(c, st.length - 1, W / 2, 60, 40, PAL.fg, 'center', true); txt(c, '段', W / 2, 92, 14, PAL.dim);
      },
    };
  },
});

// 22 洞窟フライト
def({
  id: 'cave', name: '洞窟フライト', cat: 'アクション', pad: 'a',
  desc: 'せまくなっていく洞窟を、上下にゆれながら進む。',
  help: '押している間は上昇、はなすと下降（タップ長押し・A・↑）',
  create(api) {
    const SW = 12, sx = 90; let sy = 270, vy = 0, off = 0, segs = [], center = 270, gap = 280, d0 = 0;
    for (let x = 0; x < W + SW * 2; x += SW) segs.push({ top: center - gap / 2, bot: center + gap / 2 });
    function more() { gap = Math.max(120, 280 - d0 / 60); center = clamp(center + rnd(-18, 18), 40 + gap / 2, 520 - gap / 2); segs.push({ top: center - gap / 2, bot: center + gap / 2 }); }
    return {
      update(dt) {
        const hold = api.held.A || api.held.U || api.ptr.down;
        vy += (hold ? -900 : 900) * dt; vy = clamp(vy, -320, 320); sy += vy * dt;
        const sp = 170 + api.t * 3; off += sp * dt; d0 += sp * dt;
        while (off >= SW) { off -= SW; segs.shift(); more(); }
        const s = segs[Math.floor((sx + off) / SW)];
        if (sy - 8 < s.top || sy + 8 > s.bot) api.over('かべに当たった！');
        api.set(Math.floor(d0 / 5));
      },
      draw(c) {
        segs.forEach((s, i) => { const x = i * SW - off; rect(c, x, 0, SW + 1, s.top, '#3d2f63'); rect(c, x, s.bot, SW + 1, H - s.bot, '#3d2f63'); rect(c, x, s.top - 4, SW + 1, 4, COL[5]); rect(c, x, s.bot, SW + 1, 4, COL[5]); });
        c.save(); c.translate(sx, sy); c.rotate(vy / 900);
        poly(c, [[16, 0], [-12, -9], [-6, 0], [-12, 9]], COL[3]); c.restore();
        label(c, `${Math.floor(d0 / 10)} m`, 10, 18, PAL.fg);
      },
    };
  },
});

// 23 リズムタップ
def({
  id: 'rhythm', name: 'リズムタップ', cat: '反射', time: 40,
  desc: '4つのレーンを落ちてくるノーツを、線に重なった瞬間にたたく。',
  help: 'レーンをタップ ／ キーボードは ← ↓ ↑ → が左から順のレーン',
  create(api) {
    const LX = 20, LW = 80, HY = 460, SP = 330;
    let notes = [], t = 0.6, combo = 0, judge = '', jT = 0; const press = [0, 0, 0, 0];
    const lanes = { L: 0, D: 1, U: 2, R: 3 }, laneCol = [COL[0], COL[4], COL[6], COL[1]];
    function hit(l) {
      press[l] = 0.12;
      let best = null; for (const n of notes) if (n.l === l && !n.done && (!best || Math.abs(n.y - HY) < Math.abs(best.y - HY))) best = n;
      if (!best || Math.abs(best.y - HY) > 60) return;
      const d = Math.abs(best.y - HY); best.done = true;
      if (d < 18) { combo++; api.add(100 + combo * 2); judge = 'パーフェクト'; api.beep(880, 0.04); }
      else if (d < 40) { combo++; api.add(50 + combo); judge = 'グッド'; api.beep(660, 0.04); }
      else { combo = 0; api.add(10); judge = 'おしい'; api.beep(300, 0.04); }
      jT = 0.5;
    }
    return {
      down(x) { const l = Math.floor((x - LX) / LW); if (l >= 0 && l < 4) hit(l); },
      key(k) { if (k in lanes) hit(lanes[k]); },
      update(dt) {
        t -= dt; jT -= dt; press.forEach((v, i) => (press[i] = v - dt));
        if (t <= 0 && api.left > 1.6) { const l = ri(0, 3); notes.push({ l, y: -20 }); if (Math.random() < 0.15 + api.t * 0.006) notes.push({ l: (l + ri(1, 3)) % 4, y: -20 }); t = pick([0.25, 0.375, 0.5, 0.5]) * (api.t < 15 ? 1.4 : 1); }
        for (const n of notes) { n.y += SP * dt; if (!n.done && n.y > HY + 60) { n.done = true; combo = 0; judge = 'ミス'; jT = 0.5; } }
        notes = notes.filter(n => !n.done);
      },
      draw(c) {
        for (let l = 0; l < 4; l++) { rect(c, LX + l * LW + 2, 0, LW - 4, H, press[l] > 0 ? '#2d2656' : PAL.grid); txt(c, ['←', '↓', '↑', '→'][l], LX + l * LW + LW / 2, 510, 20, PAL.dim); }
        rect(c, LX, HY - 3, 4 * LW, 6, PAL.fg);
        for (const n of notes) rrect(c, LX + n.l * LW + 8, n.y - 10, LW - 16, 20, 8, laneCol[n.l]);
        if (jT > 0) txt(c, judge, W / 2, 380, 24, judge === 'ミス' ? COL[0] : COL[2]);
        if (combo > 1) txt(c, `${combo} コンボ`, W / 2, 60, 22, PAL.fg, 'center', true);
      },
    };
  },
});

// 24 記憶の光
def({
  id: 'simon', name: '記憶の光', cat: '頭脳',
  desc: '光った順番をおぼえて、同じ順にボタンを押す。1回ごとに1つずつ増える。',
  help: '光った順にボタンをタップ ／ 矢印キー',
  create(api) {
    const keys = ['U', 'L', 'R', 'D'], cols = { U: COL[6], L: COL[0], R: COL[4], D: COL[2] }, freq = { U: 523, L: 659, R: 784, D: 440 };
    const seq = [pick(keys)]; let st = 'show', i = 0, t = 0.8, lit = null, litT = 0;
    const dim = {}; keys.forEach(k => (dim[k] = cols[k] + '44'));
    function input(k) {
      if (st !== 'input' || !k) return;
      lit = k; litT = 0.2; api.beep(freq[k], 0.15, 'triangle', 0.06);
      if (k !== seq[i]) { api.over(`${seq.length - 1} 個まで覚えた`); return; }
      i++;
      if (i === seq.length) { api.add(seq.length * 10); seq.push(pick(keys)); st = 'show'; i = 0; t = 0.9; }
    }
    return {
      down(x, y) { input(crossHit(x, y)); }, key(k) { if (keys.includes(k)) input(k); },
      update(dt) {
        litT -= dt; if (litT <= 0) lit = null;
        if (st === 'show') {
          t -= dt;
          if (t <= 0) {
            if (i < seq.length) { lit = seq[i]; const on = Math.max(0.22, 0.5 - seq.length * 0.02); litT = on; api.beep(freq[lit], on, 'triangle', 0.06); i++; t = on + 0.18; }
            else { st = 'input'; i = 0; }
          }
        }
      },
      draw(c) {
        txt(c, st === 'show' ? 'よく見て…' : 'あなたの番', W / 2, 120, 26, st === 'show' ? PAL.dim : COL[2]);
        txt(c, `${seq.length} 個目`, W / 2, 180, 18, PAL.fg, 'center', true);
        const colors = {}; keys.forEach(k => (colors[k] = lit === k ? cols[k] : dim[k]));
        drawCross(c, null, { colors });
      },
    };
  },
});

// 25 連打チャレンジ
def({
  id: 'mash', name: '連打チャレンジ', cat: '反射', time: 10, pad: 'a',
  desc: '10秒間で何回たたけるか。指でもキーでもOK。',
  help: '画面をタップ・A（スペース）をひたすら連打',
  create(api) {
    let n = 0, pulse = 0;
    const hit = () => { n++; api.add(10); pulse = 1; api.beep(300 + (n % 12) * 40, 0.02); };
    return {
      down: hit, key(k, raw, rep) { if (k === 'A' && !rep) hit(); },
      update(dt) { pulse = Math.max(0, pulse - dt * 6); },
      draw(c) {
        circ(c, W / 2, 280, 110 + pulse * 14, COL[0]); circ(c, W / 2, 280, 92 + pulse * 10, '#ff8fa6');
        txt(c, n, W / 2, 284, 72, PAL.bg, 'center', true);
        txt(c, `1秒あたり ${(n / Math.max(0.5, api.t)).toFixed(1)} 回`, W / 2, 450, 18, PAL.dim);
      },
    };
  },
});

// 26 的あて
def({
  id: 'target', name: '的あて', cat: '反射', time: 30, pad: 'none',
  desc: '小さくなって消えていく的を、まん中ねらってタップ。',
  help: '的をタップ。中心に近いほど高得点、空振りはマイナス',
  create(api) {
    let ts = [], t = 0; const fx = makeFx();
    return {
      down(x, y) {
        let hitAny = false;
        for (const o of ts) { const r = o.r * o.life / o.max; const d = dist(x, y, o.x, o.y); if (d < r) { const p = Math.round(10 + 40 * (1 - d / r)); api.add(p); fx.pop(o.x, o.y, '+' + p, COL[2]); fx.burst(o.x, o.y, COL[0], 8); o.life = 0; hitAny = true; api.beep(500 + p * 10, 0.05); break; } }
        if (!hitAny) { api.add(-5); fx.pop(x, y, '-5', COL[0]); }
      },
      update(dt) {
        fx.update(dt); t -= dt;
        if (t <= 0 && ts.length < 3) { const max = Math.max(1, 2 - api.t * 0.025); ts.push({ x: rnd(50, W - 50), y: rnd(80, H - 50), r: 42, life: max, max }); t = 0.45; }
        for (const o of ts) o.life -= dt; ts = ts.filter(o => o.life > 0);
      },
      draw(c) {
        for (const o of ts) { const r = o.r * o.life / o.max; circ(c, o.x, o.y, r, COL[0]); circ(c, o.x, o.y, r * 0.66, PAL.fg); circ(c, o.x, o.y, r * 0.33, COL[0]); }
        fx.draw(c);
      },
    };
  },
});

// 27 カラースイッチ
def({
  id: 'colorswitch', name: 'カラースイッチ', cat: '反射', pad: 'lr',
  desc: '受け皿の色を切りかえて、落ちてくる玉と同じ色で受ける。',
  help: '← → ・画面の左右タップで色を切りかえる',
  create(api) {
    const cols = [COL[0], COL[2], COL[3], COL[5]];
    let cur = 0, balls = [], t = 0.5, lives = 3; const fx = makeFx();
    const turn = d => { cur = (cur + d + 4) % 4; api.beep(400 + cur * 80, 0.03); };
    return {
      down(x) { turn(x < W / 2 ? -1 : 1); },
      key(k) { if (k === 'L') turn(-1); if (k === 'R' || k === 'A' || k === 'U') turn(1); },
      update(dt) {
        fx.update(dt); t -= dt;
        if (t <= 0) { balls.push({ y: -16, c: ri(0, 3), vy: 170 + api.t * 3.5 }); t = Math.max(0.42, 1.2 - api.t * 0.015); }
        for (const b of balls) {
          b.y += b.vy * dt;
          if (!b.done && b.y >= 458) { b.done = true; if (b.c === cur) { api.add(10); fx.burst(W / 2, 458, cols[b.c], 8); api.beep(800, 0.04); } else { lives--; fx.burst(W / 2, 458, PAL.dim, 12); api.beep(120, 0.2); if (lives <= 0) api.over('色ちがい！'); } }
        }
        balls = balls.filter(b => !b.done);
      },
      draw(c) {
        rect(c, W / 2 - 2, 0, 4, 470, PAL.grid);
        for (const b of balls) circ(c, W / 2, b.y, 14, cols[b.c]);
        rrect(c, W / 2 - 60, 470, 120, 22, 10, cols[cur]);
        cols.forEach((col, i) => circ(c, W / 2 - 54 + i * 36, 520, i === cur ? 11 : 7, col));
        txt(c, '◀', 30, 480, 26, PAL.line); txt(c, '▶', W - 30, 480, 26, PAL.line);
        fx.draw(c); hearts(c, lives);
      },
    };
  },
});

// 28 道路横断
def({
  id: 'crossing', name: '道路横断', cat: 'アクション', swipe: true,
  desc: '車をよけながら道路をわたって、いちばん上のゴールを目指す。',
  help: '矢印キー・スワイプで1マス移動 ／ タップで前へ',
  create(api) {
    const S = 40, ROWS = 13, OY = 20;
    let px, py, level = 1, lives = 3, lanes, best, flash = 0;
    function setup() {
      lanes = [];
      for (let r = 0; r < ROWS; r++) {
        if (r === 0 || r === ROWS - 1 || r === 6) { lanes.push(null); continue; }
        const dir = r % 2 ? 1 : -1, sp = (50 + ri(0, 50) + level * 12) * dir, cars = [], n = ri(2, 3), w = ri(1, 2) * 40 + 10;
        for (let i = 0; i < n; i++) cars.push({ x: i * (W / n) + rnd(0, 40), w });
        lanes.push({ sp, cars, c: pick(COL) });
      }
      reset();
    }
    function reset() { px = 4; py = ROWS - 1; best = py; }
    function mv(k) {
      if (k === 'L') px = Math.max(0, px - 1); if (k === 'R') px = Math.min(8, px + 1);
      if (k === 'U' || k === 'T') py--; if (k === 'D') py = Math.min(ROWS - 1, py + 1);
      api.beep(500, 0.02);
      if (py < best) { best = py; api.add(10); }
      if (py <= 0) { api.add(100 * level); level++; api.beep(900, 0.15); flash = 0.4; setup(); }
    }
    setup();
    return {
      key: mv,
      update(dt) {
        flash -= dt;
        for (const ln of lanes) if (ln) for (const car of ln.cars) { car.x += ln.sp * dt; if (ln.sp > 0 && car.x > W) car.x = -car.w; if (ln.sp < 0 && car.x < -car.w) car.x = W; }
        const ln = lanes[py];
        if (ln) for (const car of ln.cars) if (px * S + 8 < car.x + car.w && px * S + S - 8 > car.x) { lives--; api.beep(100, 0.3, 'sawtooth'); if (lives <= 0) { api.over('ぶつかった！'); return; } reset(); break; }
      },
      draw(c) {
        for (let r = 0; r < ROWS; r++) {
          const y = OY + r * S;
          rect(c, 0, y, W, S, lanes[r] ? '#24203d' : r === 0 ? '#2f6b4f' : '#2d2648');
          if (lanes[r]) { for (let x = 0; x < W; x += 30) rect(c, x, y + S - 2, 14, 2, PAL.line); for (const car of lanes[r].cars) { rrect(c, car.x, y + 6, car.w, S - 12, 6, lanes[r].c); rect(c, lanes[r].sp > 0 ? car.x + car.w - 10 : car.x + 4, y + 10, 6, S - 20, PAL.fg); } }
        }
        txt(c, 'ゴール', W / 2, OY + S / 2, 14, PAL.fg);
        circ(c, px * S + S / 2, OY + py * S + S / 2, 13, COL[2]); circ(c, px * S + S / 2 - 4, OY + py * S + S / 2 - 3, 2, PAL.bg); circ(c, px * S + S / 2 + 4, OY + py * S + S / 2 - 3, 2, PAL.bg);
        if (flash > 0) txt(c, `レベル ${level}`, W / 2, H / 2, 30, COL[2]);
        label(c, `Lv ${level}`, 10, OY + 6 * S + S / 2, PAL.fg); hearts(c, lives, W - 10, OY + 6 * S + S / 2);
      },
    };
  },
});

// 29 迷路脱出
def({
  id: 'maze', name: '迷路脱出', cat: 'パズル', time: 90, swipe: true, repeat: true,
  desc: '90秒でいくつの迷路をぬけられるか。だんだん大きくなる。',
  help: '矢印キー・スワイプで進む。右下の旗がゴール',
  create(api) {
    let n, cw, m, px, py, level = 0, OX, OY;
    function make() {
      level++; n = Math.min(21, 5 + level * 2); cw = 320 / n; OX = 20; OY = 90;
      m = Array.from({ length: n * n }, () => 15); const seen = new Uint8Array(n * n); const st = [0]; seen[0] = 1;
      while (st.length) {
        const c0 = st[st.length - 1], x = c0 % n, y = Math.floor(c0 / n), opts = [];
        if (y > 0 && !seen[c0 - n]) opts.push([c0 - n, 1, 4]); if (x < n - 1 && !seen[c0 + 1]) opts.push([c0 + 1, 2, 8]);
        if (y < n - 1 && !seen[c0 + n]) opts.push([c0 + n, 4, 1]); if (x > 0 && !seen[c0 - 1]) opts.push([c0 - 1, 8, 2]);
        if (!opts.length) { st.pop(); continue; }
        const [nx, a, b] = pick(opts); m[c0] &= ~a; m[nx] &= ~b; seen[nx] = 1; st.push(nx);
      }
      px = 0; py = 0;
    }
    make();
    return {
      key(k) {
        const c0 = py * n + px, bit = { U: 1, R: 2, D: 4, L: 8 }[k]; if (!bit || m[c0] & bit) return;
        if (k === 'U') py--; if (k === 'D') py++; if (k === 'L') px--; if (k === 'R') px++;
        if (px === n - 1 && py === n - 1) { api.add(100 * level); api.beep(900, 0.15); make(); }
      },
      draw(c) {
        label(c, `${level} こ目の迷路`, 20, 60, PAL.fg);
        rect(c, OX, OY, n * cw, n * cw, PAL.grid);
        txt(c, '⚑', OX + (n - 0.5) * cw, OY + (n - 0.5) * cw, cw * 0.7, COL[1]);
        c.strokeStyle = COL[5]; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i < n * n; i++) {
          const x = OX + (i % n) * cw, y = OY + Math.floor(i / n) * cw;
          if (m[i] & 1) { c.moveTo(x, y); c.lineTo(x + cw, y); } if (m[i] & 2) { c.moveTo(x + cw, y); c.lineTo(x + cw, y + cw); }
          if (m[i] & 4) { c.moveTo(x, y + cw); c.lineTo(x + cw, y + cw); } if (m[i] & 8) { c.moveTo(x, y); c.lineTo(x, y + cw); }
        }
        c.stroke();
        circ(c, OX + (px + 0.5) * cw, OY + (py + 0.5) * cw, cw * 0.32, COL[3]);
      },
    };
  },
});

// 30 オービット
def({
  id: 'orbit', name: 'オービット', cat: 'アクション', pad: 'a',
  desc: '惑星のまわりを回りながら、飛んでくる隕石をよけて星を集める。',
  help: 'タップ・A で回る向きを逆にする',
  create(api) {
    const CX = W / 2, CY = 290, R = 115; let a = -Math.PI / 2, dir = 1, rocks = [], t = 1, star = Math.PI / 2, stars = 0; const fx = makeFx();
    const flip = () => { dir *= -1; api.beep(500, 0.03); };
    return {
      down: flip, key(k) { if (k === 'A' || k === 'U') flip(); },
      update(dt) {
        fx.update(dt);
        a += dir * (2.1 + api.t * 0.01) * dt;
        const x = CX + Math.cos(a) * R, y = CY + Math.sin(a) * R;
        const sx = CX + Math.cos(star) * R, sy = CY + Math.sin(star) * R;
        if (dist(x, y, sx, sy) < 20) { stars++; fx.burst(sx, sy, COL[2], 10); api.beep(880, 0.05); star = a + Math.PI * rnd(0.5, 1.5); }
        t -= dt;
        if (t <= 0) { const ang = rnd(0, 6.28), sp = 90 + api.t * 2.5, tx = CX + rnd(-60, 60), ty = CY + rnd(-60, 60), ox = CX + Math.cos(ang) * 330, oy = CY + Math.sin(ang) * 330, d = dist(ox, oy, tx, ty); rocks.push({ x: ox, y: oy, vx: (tx - ox) / d * sp, vy: (ty - oy) / d * sp, life: 8 }); t = Math.max(0.35, 1.3 - api.t * 0.015); }
        for (const o of rocks) { o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt; if (dist(o.x, o.y, x, y) < 19) api.over('隕石に当たった！'); }
        rocks = rocks.filter(o => o.life > 0);
        api.set(stars * 10 + Math.floor(api.t * 2));
      },
      draw(c) {
        ring(c, CX, CY, R, PAL.line, 2);
        circ(c, CX, CY, 46, COL[4]); circ(c, CX - 14, CY - 10, 10, '#8dbcff'); circ(c, CX + 16, CY + 14, 7, '#5a92e6');
        const sx = CX + Math.cos(star) * R, sy = CY + Math.sin(star) * R; shape(c, 4, sx, sy, 11, COL[2]);
        for (const o of rocks) circ(c, o.x, o.y, 10, '#b38b6d');
        circ(c, CX + Math.cos(a) * R, CY + Math.sin(a) * R, 10, COL[3]);
        fx.draw(c); label(c, `${api.t.toFixed(1)} 秒`);
      },
    };
  },
});

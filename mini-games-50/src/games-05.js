/* ===== ゲーム 41〜50 ===== */

// 41 スロット
def({
  id: 'slot', name: 'スロット', cat: '運', pad: 'a',
  desc: '回るリールを1つずつ止めて、絵柄をそろえる。10回勝負。',
  help: 'タップ・A で左から順にリールを止める',
  create(api) {
    const SYM = ['7', '★', '♦', '♣', '♥', '●'], PAY = [500, 300, 200, 150, 100, 80], SC = [COL[0], COL[2], COL[4], COL[6], COL[0], COL[1]];
    const SH = 64, RX = [70, 180, 290], WY = 270;
    const strips = [0, 1, 2].map(() => shuffle([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]));
    let pos = [0, 0, 0].map(() => rnd(0, 12)), spin = [true, true, true], stopN = 0, spins = 1, msg = 'タップでリールを止めよう', wait = 0;
    const res = i => strips[i][Math.round(pos[i]) % 12];
    function stop() {
      if (wait > 0) return;
      if (stopN >= 3) return;
      spin[stopN] = false; pos[stopN] = Math.round(pos[stopN]) % 12; stopN++; api.beep(300, 0.05);
      if (stopN === 3) {
        const r = [res(0), res(1), res(2)];
        let win = 0;
        if (r[0] === r[1] && r[1] === r[2]) { win = PAY[r[0]]; msg = `${SYM[r[0]]} が3つ！ +${win}`; api.beep(990, 0.3, 'triangle'); }
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { win = 30; msg = `2つそろった +${win}`; api.beep(700, 0.1); }
        else msg = 'ざんねん';
        api.add(win); wait = 1.2;
      }
    }
    return {
      down: stop, key(k) { if (k === 'A' || k === 'D' || k === 'U') stop(); },
      update(dt) {
        for (let i = 0; i < 3; i++) if (spin[i]) pos[i] = (pos[i] + dt * (11 + i * 1.5)) % 12;
        if (wait > 0) { wait -= dt; if (wait <= 0) { if (spins >= 10) api.over('10回おわり'); else { spins++; spin = [true, true, true]; stopN = 0; msg = ''; } } }
      },
      draw(c) {
        txt(c, `${spins} / 10 回目`, W / 2, 60, 20, PAL.fg, 'center', true);
        rrect(c, 20, WY - SH * 1.5 - 14, 320, SH * 3 + 28, 16, COL[0]);
        for (let i = 0; i < 3; i++) {
          const x = RX[i];
          c.save(); c.beginPath(); c.rect(x - 48, WY - SH * 1.5, 96, SH * 3); c.clip();
          rect(c, x - 48, WY - SH * 1.5, 96, SH * 3, PAL.fg);
          const p = pos[i], base = Math.floor(p), f = p - base;
          for (let k = -2; k <= 2; k++) { const idx = ((base + k) % 12 + 12) % 12, s = strips[i][idx], y = WY + (k - f) * SH; txt(c, SYM[s], x, y, 40, SC[s], 'center', true); }
          c.restore();
        }
        rect(c, 20, WY - 2, 320, 4, 'rgba(255,107,139,.5)');
        txt(c, msg, W / 2, 440, 20, COL[2]);
        txt(c, '7:500  ★:300  ♦:200  ♣:150  ♥:100  ●:80  2つ:30', W / 2, 490, 12, PAL.dim);
      },
    };
  },
});

// 42 ジャストストップ
def({
  id: 'juststop', name: 'ジャストストップ', cat: '反射', pad: 'a',
  desc: '途中から見えなくなるタイマーを、目標の秒数ぴったりで止める。',
  help: 'タップ・A でストップ。5回の合計点',
  create(api) {
    let round = 0, st = 'ready', t = 0, target = 0, res = '', rT = 0; const hist = [];
    function begin() { round++; target = ri(30, 70) / 10; t = 0; st = 'ready'; rT = 1; }
    function hit() {
      if (st !== 'run') return;
      const diff = t - target, p = Math.max(0, Math.round(1000 - Math.abs(diff) * 1000));
      api.add(p); hist.push(`${t.toFixed(2)}秒 (${diff >= 0 ? '+' : ''}${diff.toFixed(2)})  ${p}点`);
      res = Math.abs(diff) < 0.05 ? 'ぴったり！' : diff > 0 ? 'おそい' : 'はやい'; st = 'res'; rT = 1.6; api.beep(p > 900 ? 990 : 500, 0.1);
    }
    begin();
    return {
      down: hit, key(k) { if (k === 'A') hit(); },
      update(dt) {
        if (st === 'ready') { rT -= dt; if (rT <= 0) st = 'run'; }
        else if (st === 'run') { t += dt; if (t > target + 3) hit(); }
        else if (st === 'res') { rT -= dt; if (rT <= 0) { if (round >= 5) api.over('5回おわり'); else begin(); } }
      },
      draw(c) {
        txt(c, `${round} / 5 回目`, W / 2, 50, 18, PAL.fg);
        txt(c, `目標 ${target.toFixed(1)} 秒`, W / 2, 110, 28, COL[2]);
        const shown = st === 'ready' ? '0.00' : st === 'run' && t < 1.5 ? t.toFixed(2) : st === 'res' ? t.toFixed(2) : '?.??';
        rrect(c, 60, 160, 240, 110, 16, PAL.grid);
        txt(c, shown, W / 2, 216, 60, st === 'res' ? COL[3] : PAL.fg, 'center', true);
        if (st === 'ready') txt(c, 'よーい…', W / 2, 300, 18, PAL.dim);
        if (st === 'run' && t >= 1.5) txt(c, '心の中で数えて！', W / 2, 300, 18, PAL.dim);
        if (st === 'res') txt(c, res, W / 2, 300, 24, COL[2]);
        hist.forEach((h, i) => txt(c, h, W / 2, 360 + i * 26, 14, PAL.dim, 'center', true));
      },
    };
  },
});

// 43 ちがう色さがし
def({
  id: 'oddcolor', name: 'ちがう色さがし', cat: '反射', time: 30, pad: 'none',
  desc: '1つだけ少し色がちがうマスを見つける。進むほど見分けにくくなる。',
  help: '色がちがうマスをタップ（まちがえると−10点）',
  create(api) {
    const SZ = 320, OX = 20, OY = 120; let L = 0, n, odd, h, s, l, d, flash = 0;
    function make() { L++; n = Math.min(8, 2 + Math.floor((L + 1) / 2)); odd = ri(0, n * n - 1); h = ri(0, 359); s = ri(45, 75); l = ri(40, 60); d = Math.max(4, 26 - L * 1.3); }
    make();
    return {
      down(x, y) {
        const S = SZ / n, i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i < 0 || i >= n || j < 0 || j >= n) return;
        if (j * n + i === odd) { api.add(10 + L); api.beep(800, 0.04); make(); } else { api.add(-10); flash = 0.25; api.beep(140, 0.1); }
      },
      update(dt) { flash -= dt; },
      draw(c) {
        txt(c, `レベル ${L}`, W / 2, 70, 22, PAL.fg, 'center', true);
        const S = SZ / n;
        for (let k = 0; k < n * n; k++) rrect(c, OX + (k % n) * S + 3, OY + Math.floor(k / n) * S + 3, S - 6, S - 6, 8, `hsl(${h},${s}%,${k === odd ? l + d : l}%)`);
        if (flash > 0) { c.globalAlpha = 0.3; rect(c, 0, 0, W, H, COL[0]); c.globalAlpha = 1; }
      },
    };
  },
});

// 44 どっちが多い
def({
  id: 'more', name: 'どっちが多い', cat: '頭脳', time: 30, pad: 'lr',
  desc: '左右の点の数をパッと見て、多いほうを答える。',
  help: '多いほうをタップ ／ ← →',
  create(api) {
    let a, b, dl, dr, combo = 0, flash = 0, good = true, rounds = 0;
    function place(n, x0) { const pts = []; let tries = 0; while (pts.length < n && tries < 2000) { tries++; const p = { x: rnd(x0 + 14, x0 + 160), y: rnd(100, 440) }; if (pts.every(q => dist(p.x, p.y, q.x, q.y) > 22)) pts.push(p); } return pts; }
    function gen() {
      rounds++; const base = ri(5, 12 + Math.min(14, rounds)), diff = Math.max(1, ri(1, 6 - Math.min(4, Math.floor(rounds / 4))));
      if (Math.random() < 0.5) { a = base + diff; b = base; } else { a = base; b = base + diff; }
      dl = place(a, 8); dr = place(b, 190); a = dl.length; b = dr.length; if (a === b) gen();
    }
    function answer(left) { good = left === a > b; flash = 0.2; if (good) { combo++; api.add(10 + Math.min(combo, 10)); api.beep(760, 0.04); } else { combo = 0; api.add(-10); api.beep(140, 0.12); } gen(); }
    gen();
    return {
      down(x) { answer(x < W / 2); }, key(k) { if (k === 'L') answer(true); if (k === 'R') answer(false); },
      update(dt) { flash -= dt; },
      draw(c) {
        rect(c, 4, 80, 172, 380, PAL.grid); rect(c, 184, 80, 172, 380, PAL.grid);
        for (const p of dl) circ(c, p.x, p.y, 8, COL[1]); for (const p of dr) circ(c, p.x, p.y, 8, COL[4]);
        txt(c, '← こっち', 90, 490, 18, PAL.fg); txt(c, 'こっち →', 270, 490, 18, PAL.fg);
        txt(c, 'どっちが多い？', W / 2, 44, 20, PAL.fg);
        if (flash > 0) { c.globalAlpha = 0.25; rect(c, 0, 0, W, H, good ? COL[6] : COL[0]); c.globalAlpha = 1; }
      },
    };
  },
});

// 45 ハノイの塔
def({
  id: 'hanoi', name: 'ハノイの塔', cat: 'パズル', time: 180,
  desc: '円盤を全部右の柱へ移す。小さい円盤の上に大きいのは置けない。',
  help: '柱をタップで円盤を持ち上げ、別の柱をタップで置く ／ ←→ と A',
  create(api) {
    const PX = [70, 180, 290], BY = 440; let n = 2, pegs, held = null, moves = 0, cur = 0, msg = '', mT = 0;
    function make() { n++; pegs = [[], [], []]; for (let i = n; i >= 1; i--) pegs[0].push(i); held = null; moves = 0; }
    function act(p) {
      if (held == null) { if (pegs[p].length) { held = p; api.beep(500, 0.03); } return; }
      if (p === held) { held = null; return; }
      const d = pegs[held][pegs[held].length - 1], top = pegs[p][pegs[p].length - 1];
      if (top && top < d) { api.beep(140, 0.1); held = null; return; }
      pegs[p].push(pegs[held].pop()); held = null; moves++; api.beep(400, 0.03);
      if (pegs[2].length === n) { const min = 2 ** n - 1, p0 = n * 100 + Math.max(0, min * 2 - moves) * 10; api.add(p0); msg = `${n}枚クリア！ +${p0}`; mT = 1.5; api.beep(900, 0.2); make(); }
    }
    make();
    return {
      down(x) { const p = x < 125 ? 0 : x < 235 ? 1 : 2; cur = p; act(p); },
      key(k) { if (k === 'L') cur = Math.max(0, cur - 1); if (k === 'R') cur = Math.min(2, cur + 1); if (k === 'A' || k === 'U' || k === 'D') act(cur); },
      update(dt) { mT -= dt; },
      draw(c) {
        txt(c, `円盤 ${n} 枚 ／ ${moves} 手（最短 ${2 ** n - 1} 手）`, W / 2, 60, 15, PAL.fg);
        rect(c, 10, BY, 340, 10, PAL.line);
        PX.forEach((x, p) => {
          rect(c, x - 4, BY - 210, 8, 210, PAL.line);
          if (p === cur) rect(c, x - 50, BY + 16, 100, 4, COL[2]);
          pegs[p].forEach((d, i) => {
            const w = 20 + (d / n) * 84, lift = held === p && i === pegs[p].length - 1;
            rrect(c, x - w / 2, lift ? 140 : BY - 22 - i * 22, w, 20, 8, `hsl(${d * 40},70%,60%)`);
          });
        });
        txt(c, 'ゴール →', 290, BY + 40, 14, PAL.dim);
        if (mT > 0) txt(c, msg, W / 2, 110, 22, COL[2]);
      },
    };
  },
});

// 46 リバーシ
def({
  id: 'reversi', name: 'リバーシ', cat: '頭脳',
  desc: 'コンピューターと対戦。はさんだ石をひっくり返して、多く取ったほうが勝ち。',
  help: '光っているマスをタップ ／ 矢印キーで選んで A。あなたは黒',
  create(api) {
    const N = 8, S = 40, OX = 20, OY = 110;
    const b = Array.from({ length: N }, () => Array(N).fill(0));
    b[3][3] = b[4][4] = 2; b[3][4] = b[4][3] = 1;
    const WT = [[100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, 1, 1, 1, 1, -2, 10], [5, -2, 1, 0, 0, 1, -2, 5], [5, -2, 1, 0, 0, 1, -2, 5], [10, -2, 1, 1, 1, 1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100]];
    let turn = 1, cpuT = 0, cx = 2, cy = 3, msg = '', mT = 0, ended = false;
    function flips(x, y, p) {
      if (b[y][x]) return [];
      const out = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const line0 = []; let X = x + dx, Y = y + dy;
        while (X >= 0 && X < N && Y >= 0 && Y < N && b[Y][X] === 3 - p) { line0.push([X, Y]); X += dx; Y += dy; }
        if (line0.length && X >= 0 && X < N && Y >= 0 && Y < N && b[Y][X] === p) out.push(...line0);
      }
      return out;
    }
    const moves = p => { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const f = flips(x, y, p); if (f.length) m.push({ x, y, f }); } return m; };
    const count = p => b.flat().filter(v => v === p).length;
    function put(m, p) { b[m.y][m.x] = p; m.f.forEach(([X, Y]) => (b[Y][X] = p)); api.beep(p === 1 ? 500 : 350, 0.04); }
    function nextTurn() {
      const other = 3 - turn;
      if (moves(other).length) { turn = other; if (turn === 2) cpuT = 0.6; return; }
      if (moves(turn).length) { msg = (other === 1 ? 'あなた' : 'コンピューター') + 'はパス'; mT = 1.4; if (turn === 2) cpuT = 0.8; return; }
      ended = true; const me = count(1), cp = count(2);
      api.set(me * 10 + (me > cp ? 500 : 0));
      api.over(me > cp ? `勝ち！ ${me} 対 ${cp}` : me === cp ? `引き分け ${me} 対 ${cp}` : `負け… ${me} 対 ${cp}`);
    }
    function player(x, y) { if (turn !== 1 || ended) return; const f = flips(x, y, 1); if (!f.length) return; put({ x, y, f }, 1); api.set(count(1) * 10); nextTurn(); }
    return {
      down(x, y) { const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i >= 0 && i < N && j >= 0 && j < N) { cx = i; cy = j; player(i, j); } },
      key(k) { if (k === 'L') cx = Math.max(0, cx - 1); if (k === 'R') cx = Math.min(N - 1, cx + 1); if (k === 'U') cy = Math.max(0, cy - 1); if (k === 'D') cy = Math.min(N - 1, cy + 1); if (k === 'A') player(cx, cy); },
      update(dt) {
        mT -= dt;
        if (turn === 2 && !ended) {
          cpuT -= dt;
          if (cpuT <= 0) { const ms = moves(2); let best = null, bv = -1e9; for (const m of ms) { const v = WT[m.y][m.x] + m.f.length + Math.random() * 3; if (v > bv) { bv = v; best = m; } } if (best) put(best, 2); api.set(count(1) * 10); nextTurn(); }
        }
      },
      draw(c) {
        txt(c, `● あなた ${count(1)}`, 20, 60, 18, PAL.fg, 'left'); txt(c, `コンピューター ${count(2)} ○`, W - 20, 60, 18, PAL.dim, 'right');
        txt(c, turn === 1 ? 'あなたの番' : '考え中…', W / 2, 88, 14, turn === 1 ? COL[2] : PAL.dim);
        rect(c, OX - 4, OY - 4, N * S + 8, N * S + 8, '#1f5a43');
        const mv = turn === 1 ? moves(1) : [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          rect(c, OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, '#2e7a5b');
          if (b[y][x]) circ(c, OX + x * S + S / 2, OY + y * S + S / 2, 16, b[y][x] === 1 ? '#15122a' : '#f3eee2');
        }
        for (const m of mv) circ(c, OX + m.x * S + S / 2, OY + m.y * S + S / 2, 5, 'rgba(255,224,102,.7)');
        c.strokeStyle = COL[2]; c.lineWidth = 2; c.strokeRect(OX + cx * S + 1, OY + cy * S + 1, S - 2, S - 2);
        if (mT > 0) txt(c, msg, W / 2, 470, 18, COL[1]);
        txt(c, '黒の数×10点、勝つと＋500点', W / 2, 505, 13, PAL.dim);
      },
    };
  },
});

// 47 三目並べ
def({
  id: 'tictactoe', name: '三目並べ', cat: '頭脳',
  desc: 'コンピューターと3つ並べ対決を連戦。負けるまで続く。',
  help: 'マスをタップ ／ 矢印キーで選んで A。あなたは ○',
  create(api) {
    const S = 100, OX = 30, OY = 150, LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let b, turn, wait = 0, msg = '', wins = 0, draws = 0, games = 0, cur = 4, first = 1, line0 = null;
    const winner = () => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { p: b[l[0]], l }; return b.every(v => v) ? { p: 0 } : null; };
    function reset() { b = Array(9).fill(0); games++; first = 3 - first; turn = first; msg = turn === 1 ? 'あなたが先手' : 'コンピューターが先手'; line0 = null; if (turn === 2) wait = 0.6; }
    function cpu() {
      const empty = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
      const tryWin = p => { for (const i of empty) { b[i] = p; const w = winner(); b[i] = 0; if (w && w.p === p) return i; } return -1; };
      let m = tryWin(2); if (m < 0) m = tryWin(1);
      if (m < 0 || Math.random() < 0.12) m = !b[4] && Math.random() < 0.7 ? 4 : pick(empty);
      b[m] = 2; api.beep(350, 0.04);
    }
    function check() {
      const w = winner(); if (!w) return false;
      line0 = w.l || null;
      if (w.p === 1) { wins++; api.add(100); msg = '勝ち！ ＋100'; api.beep(900, 0.15); wait = 1.2; turn = 0; }
      else if (w.p === 0) { draws++; api.add(30); msg = '引き分け ＋30'; wait = 1.2; turn = 0; }
      else { msg = '負け…'; turn = 0; api.over(`${wins} 勝 ${draws} 分`); }
      return true;
    }
    function play(i) { if (turn !== 1 || b[i]) return; b[i] = 1; api.beep(500, 0.04); if (!check()) { turn = 2; wait = 0.5; } }
    reset();
    return {
      down(x, y) { const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i >= 0 && i < 3 && j >= 0 && j < 3) { cur = j * 3 + i; play(cur); } },
      key(k) { if (k === 'L' && cur % 3) cur--; if (k === 'R' && cur % 3 < 2) cur++; if (k === 'U' && cur > 2) cur -= 3; if (k === 'D' && cur < 6) cur += 3; if (k === 'A') play(cur); },
      update(dt) {
        if (wait > 0) { wait -= dt; if (wait <= 0) { if (turn === 2) { cpu(); if (!check()) turn = 1; } else if (turn === 0) reset(); } }
      },
      draw(c) {
        txt(c, `${wins} 勝 ${draws} 分`, W / 2, 60, 22, PAL.fg, 'center', true);
        txt(c, msg, W / 2, 110, 18, COL[2]);
        for (let i = 1; i < 3; i++) { rect(c, OX + i * S - 2, OY, 4, 3 * S, PAL.line); rect(c, OX, OY + i * S - 2, 3 * S, 4, PAL.line); }
        b.forEach((v, i) => { const x = OX + (i % 3) * S + S / 2, y = OY + Math.floor(i / 3) * S + S / 2; if (v === 1) ring(c, x, y, 30, COL[3], 8); if (v === 2) { line(c, x - 28, y - 28, x + 28, y + 28, COL[0], 8); line(c, x + 28, y - 28, x - 28, y + 28, COL[0], 8); } });
        if (line0) { const p = i => [OX + (i % 3) * S + S / 2, OY + Math.floor(i / 3) * S + S / 2]; const [a, bb] = [p(line0[0]), p(line0[2])]; line(c, a[0], a[1], bb[0], bb[1], COL[2], 6); }
        c.strokeStyle = PAL.dim; c.lineWidth = 2; c.strokeRect(OX + (cur % 3) * S + 6, OY + Math.floor(cur / 3) * S + 6, S - 12, S - 12);
        txt(c, '勝ち100点・引き分け30点', W / 2, 490, 13, PAL.dim);
      },
    };
  },
});

// 48 ジグザグ
def({
  id: 'zigzag', name: 'ジグザグ', cat: '反射', pad: 'a',
  desc: 'ななめに進むボールの向きを切りかえて、道からはみ出さないように進む。',
  help: 'タップ・A で左右の向きを切りかえる',
  create(api) {
    const BY = 400, HALF = 26;
    const nodes = [{ y: 0, x: W / 2 }]; let dir = 1, s = 0, bx = W / 2, turns = 0;
    function extend() {
      while (nodes[nodes.length - 1].y < s + 700) {
        const n0 = nodes[nodes.length - 1], d = nodes.length % 2 ? 1 : -1;
        const room = d > 0 ? 320 - n0.x : n0.x - 40, len = Math.max(30, Math.min(room, rnd(40, 170)));
        nodes.push({ y: n0.y + len, x: n0.x + d * len });
      }
      while (nodes.length > 2 && nodes[1].y < s - 300) nodes.shift();
    }
    function cxAt(y) { for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i], b = nodes[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y); } return null; }
    const flip = () => { dir *= -1; turns++; api.beep(520, 0.02); };
    extend();
    return {
      down: flip, key(k) { if (k === 'A' || k === 'L' || k === 'R' || k === 'U') flip(); },
      update(dt) {
        const v = Math.min(330, 150 + s * 0.012);
        s += v * dt; bx += dir * v * dt; extend();
        const cx = cxAt(s); if (cx == null || Math.abs(bx - cx) > HALF - 4) api.over('道から落ちた！');
        api.set(Math.floor(s / 10));
      },
      draw(c) {
        c.lineCap = 'square'; c.lineJoin = 'miter'; c.strokeStyle = '#3d3570'; c.lineWidth = HALF * 2 * 1.414;
        c.beginPath(); nodes.forEach((n, i) => { const y = BY - (n.y - s); i ? c.lineTo(n.x, y) : c.moveTo(n.x, y); }); c.stroke();
        c.strokeStyle = '#4b4285'; c.lineWidth = 4; c.beginPath(); nodes.forEach((n, i) => { const y = BY - (n.y - s); i ? c.lineTo(n.x, y) : c.moveTo(n.x, y); }); c.stroke();
        circ(c, bx, BY, 10, COL[1]);
        txt(c, Math.floor(s / 10), W / 2, 50, 36, PAL.fg, 'center', true);
      },
    };
  },
});

// 49 コイン集め
def({
  id: 'coins', name: 'コイン集め', cat: 'アクション',
  desc: '追いかけてくるオバケから逃げながら、コインを集める。',
  help: '矢印キーで移動 ／ 指・マウスで行きたい方向をなぞる',
  create(api) {
    const p = { x: W / 2, y: 300 }; let coin, ghosts = [], got = 0, target = null; const fx = makeFx();
    const placeCoin = () => { do { coin = { x: rnd(30, W - 30), y: rnd(70, H - 30) }; } while (dist(coin.x, coin.y, p.x, p.y) < 100); };
    const addGhost = () => { const a = rnd(0, 6.28); ghosts.push({ x: clamp(p.x + Math.cos(a) * 260, 20, W - 20), y: clamp(p.y + Math.sin(a) * 260, 60, H - 20), c: COL[ghosts.length % 2 ? 5 : 0] }); };
    placeCoin(); addGhost();
    return {
      move(x, y) { target = { x, y }; }, down(x, y) { target = { x, y }; },
      update(dt) {
        fx.update(dt);
        const kx = api.held.R - api.held.L, ky = api.held.D - api.held.U;
        if (kx || ky) { target = null; const m = Math.hypot(kx, ky); p.x += kx / m * 230 * dt; p.y += ky / m * 230 * dt; }
        else if (target) { const d = dist(p.x, p.y, target.x, target.y); if (d > 4) { const sp = Math.min(d, 250 * dt); p.x += (target.x - p.x) / d * sp; p.y += (target.y - p.y) / d * sp; } }
        p.x = clamp(p.x, 12, W - 12); p.y = clamp(p.y, 52, H - 12);
        if (dist(p.x, p.y, coin.x, coin.y) < 22) { got++; api.add(10); fx.burst(coin.x, coin.y, COL[2], 8); api.beep(990, 0.05); placeCoin(); if (got % 5 === 0 && ghosts.length < 8) addGhost(); }
        ghosts.forEach((g, i) => {
          const sp = 70 + ghosts.length * 6 + got * 0.8, d = dist(g.x, g.y, p.x, p.y) || 1;
          let vx = (p.x - g.x) / d, vy = (p.y - g.y) / d;
          ghosts.forEach((o, j) => { if (i !== j) { const dd = dist(g.x, g.y, o.x, o.y); if (dd < 40 && dd > 0) { vx += (g.x - o.x) / dd * 0.8; vy += (g.y - o.y) / dd * 0.8; } } });
          const m = Math.hypot(vx, vy) || 1; g.x += vx / m * sp * dt; g.y += vy / m * sp * dt;
          if (d < 24) api.over('つかまった！');
        });
      },
      draw(c) {
        rect(c, 0, 40, W, H - 40, PAL.grid);
        circ(c, coin.x, coin.y, 10, COL[2]); txt(c, '¥', coin.x, coin.y + 1, 12, '#b88a10');
        for (const g of ghosts) { circ(c, g.x, g.y - 3, 13, g.c); rect(c, g.x - 13, g.y - 3, 26, 14, g.c); circ(c, g.x - 5, g.y - 5, 4, PAL.fg); circ(c, g.x + 5, g.y - 5, 4, PAL.fg); circ(c, g.x - 4, g.y - 5, 2, PAL.bg); circ(c, g.x + 6, g.y - 5, 2, PAL.bg); }
        circ(c, p.x, p.y, 12, COL[3]); circ(c, p.x - 4, p.y - 3, 2, PAL.bg); circ(c, p.x + 4, p.y - 3, 2, PAL.bg);
        fx.draw(c); label(c, `コイン ${got} 枚 ／ オバケ ${ghosts.length}`, 10, 20, PAL.fg);
      },
    };
  },
});

// 50 ブロックパズル
def({
  id: 'blockfit', name: 'ブロックパズル', cat: 'パズル', pad: 'none',
  desc: '3つのピースを盤面に置いて、縦か横の1列をうめて消す。',
  help: '下のピースを盤面までドラッグして置く',
  create(api) {
    const N = 8, S = 36, OX = (W - N * S) / 2, OY = 44, TY = 400;
    const SH = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]];
    const g = Array.from({ length: N }, () => Array(N).fill(-1));
    let tray = [], drag = null, combo = 0; const fx = makeFx();
    const dims = s => [Math.max(...s.map(p => p[0])) + 1, Math.max(...s.map(p => p[1])) + 1];
    function refill() { tray = [0, 1, 2].map(() => ({ s: pick(SH), c: ri(0, 6) })); }
    const fits = (s, x, y) => s.every(([a, b]) => x + a >= 0 && x + a < N && y + b >= 0 && y + b < N && g[y + b][x + a] < 0);
    const anyFit = s => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(s, x, y)) return true; return false; };
    const slotX = i => 60 + i * 120;
    function gridPos(px, py, s) { const [w, h] = dims(s); return [Math.round((px - OX) / S - w / 2), Math.round((py - OY) / S - h / 2)]; }
    function place(i, x, y) {
      const pc = tray[i]; pc.s.forEach(([a, b]) => (g[y + b][x + a] = pc.c)); api.add(pc.s.length); tray[i] = null; api.beep(400, 0.03);
      const rows = [], colsF = [];
      for (let k = 0; k < N; k++) { if (g[k].every(v => v >= 0)) rows.push(k); if (g.every(r => r[k] >= 0)) colsF.push(k); }
      const n = rows.length + colsF.length;
      if (n) { combo++; rows.forEach(k => g[k].fill(-1)); colsF.forEach(k => g.forEach(r => (r[k] = -1))); const p0 = n * 80 * n * combo; api.add(p0); fx.pop(W / 2, OY + N * S / 2, `${n} 列！ +${p0}`, COL[2]); api.beep(700 + n * 100, 0.12); }
      else combo = 0;
      if (tray.every(t0 => !t0)) refill();
      if (!tray.some(t0 => t0 && anyFit(t0.s))) api.over('置ける場所がない');
    }
    refill();
    return {
      down(x, y) { if (y < TY - 20) return; const i = clamp(Math.floor(x / 120), 0, 2); if (tray[i]) drag = { i, x, y }; },
      move(x, y) { if (drag) { drag.x = x; drag.y = y; } },
      up(x, y) {
        if (!drag) return; const pc = tray[drag.i]; const [gx, gy] = gridPos(x, y - 70, pc.s);
        if (fits(pc.s, gx, gy)) place(drag.i, gx, gy); drag = null;
      },
      update(dt) { fx.update(dt); },
      draw(c) {
        rect(c, OX - 4, OY - 4, N * S + 8, N * S + 8, PAL.line);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g[y][x] >= 0 ? cell(c, OX + x * S, OY + y * S, S, COL[g[y][x]]) : rect(c, OX + x * S + 1, OY + y * S + 1, S - 2, S - 2, PAL.grid);
        if (drag) {
          const pc = tray[drag.i], [gx, gy] = gridPos(drag.x, drag.y - 70, pc.s);
          if (fits(pc.s, gx, gy)) { c.globalAlpha = 0.35; pc.s.forEach(([a, b]) => rect(c, OX + (gx + a) * S, OY + (gy + b) * S, S, S, COL[pc.c])); c.globalAlpha = 1; }
        }
        rect(c, 0, TY - 20, W, 2, PAL.grid);
        tray.forEach((pc, i) => {
          if (!pc || (drag && drag.i === i)) return;
          const [w, h] = dims(pc.s), cs = 18, ok = anyFit(pc.s);
          c.globalAlpha = ok ? 1 : 0.3; pc.s.forEach(([a, b]) => cell(c, slotX(i) - w * cs / 2 + a * cs, TY + 60 - h * cs / 2 + b * cs, cs, COL[pc.c])); c.globalAlpha = 1;
        });
        if (drag) { const pc = tray[drag.i], [w, h] = dims(pc.s); pc.s.forEach(([a, b]) => cell(c, drag.x - w * S / 2 + a * S, drag.y - 70 - h * S / 2 + b * S, S, COL[pc.c])); }
        fx.draw(c);
      },
    };
  },
});

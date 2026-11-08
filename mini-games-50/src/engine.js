'use strict';
/* ===== ミニゲーム50 エンジン =====
 * どのゲームも 360×540 の画面に描く。
 * def({id,name,cat,desc,help,time?,swipe?,pad?,repeat?,create(api)}) で登録する。
 * create が返すオブジェクト: update(dt) / draw(c) / key(k,raw,rep) / down(x,y) / move(x,y) / up(x,y)
 * k は 'L' 'R' 'U' 'D' 'A'、スワイプ型のゲームではタップが 'T' になる。
 */
const W = 360, H = 540;
const PAL = {
  bg: '#141127', grid: '#211c3c', line: '#3a3266', fg: '#f3eee2', dim: '#8d86b3',
  c: ['#ff6b8b', '#ffb547', '#ffe066', '#5fd3c4', '#6aa8ff', '#c08bff', '#7ee081'],
};
const COL = PAL.c;
const GAMES = [];
const def = g => GAMES.push(g);

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const inR = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---- 描画ヘルパー ---- */
function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function rrect(c, x, y, w, h, r, col) {
  c.fillStyle = col; c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
  c.fill();
}
function circ(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill(); }
function ring(c, x, y, r, col, w = 2) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.stroke(); }
function line(c, x1, y1, x2, y2, col, w = 2) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function txt(c, s, x, y, size = 16, col = PAL.fg, al = 'center', pix = false) {
  c.fillStyle = col;
  c.font = pix ? `${size}px "DotGothic16", ui-monospace, monospace` : `700 ${size}px "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif`;
  c.textAlign = al; c.textBaseline = 'middle';
  c.fillText(String(s), x, y);
}
function cell(c, x, y, s, col) {
  rect(c, x + 1, y + 1, s - 2, s - 2, col);
  rect(c, x + 1, y + 1, s - 2, Math.max(2, s * 0.18), 'rgba(255,255,255,.28)');
  rect(c, x + 1, y + s - 1 - Math.max(2, s * 0.14), s - 2, Math.max(2, s * 0.14), 'rgba(0,0,0,.22)');
}
function hearts(c, n, x = W - 10, y = 18) { for (let i = 0; i < n; i++) txt(c, '♥', x - i * 18, y, 16, COL[0], 'right'); }
function label(c, s, x = 10, y = 18, col = PAL.dim) { txt(c, s, x, y, 14, col, 'left'); }
function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
/* 形（神経衰弱などで使う） */
function shape(c, t, x, y, r, col) {
  const s = r;
  switch (t % 8) {
    case 0: circ(c, x, y, s, col); break;
    case 1: rect(c, x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7, col); break;
    case 2: poly(c, [[x, y - s], [x + s, y + s * 0.8], [x - s, y + s * 0.8]], col); break;
    case 3: poly(c, [[x, y - s], [x + s, y], [x, y + s], [x - s, y]], col); break;
    case 4: { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * 0.45 : s; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } poly(c, p, col); break; }
    case 5: txt(c, '♥', x, y + 2, s * 2.2, col); break;
    case 6: rect(c, x - s, y - s * 0.3, s * 2, s * 0.6, col); rect(c, x - s * 0.3, y - s, s * 0.6, s * 2, col); break;
    case 7: ring(c, x, y, s * 0.75, col, s * 0.45); break;
  }
}
/* 十字に並んだ4つの選択ボタン（矢印キーと同じ並び） */
const CROSS = {
  U: { x: 105, y: 268, w: 150, h: 64 }, L: { x: 16, y: 346, w: 158, h: 64 },
  R: { x: 186, y: 346, w: 158, h: 64 }, D: { x: 105, y: 424, w: 150, h: 64 },
};
const ARROW = { U: '↑', L: '←', R: '→', D: '↓' };
function crossHit(x, y) { for (const k in CROSS) if (inR(x, y, CROSS[k])) return k; return null; }
function drawCross(c, labels, opt = {}) {
  for (const k in CROSS) {
    const r = CROSS[k];
    const lit = opt.flash === k;
    rrect(c, r.x, r.y, r.w, r.h, 12, lit ? (opt.flashCol || PAL.fg) : (opt.colors?.[k] || PAL.grid));
    if (!opt.colors) rrect(c, r.x + 2, r.y + 2, r.w - 4, 4, 2, 'rgba(255,255,255,.08)');
    txt(c, ARROW[k], r.x + 14, r.y + r.h / 2, 14, lit ? PAL.bg : PAL.dim, 'left');
    if (labels?.[k] != null) txt(c, labels[k], r.x + r.w / 2 + 6, r.y + r.h / 2, opt.size || 24, lit ? PAL.bg : (opt.textCol?.[k] || PAL.fg));
  }
}
/* ふわっと消える小さな文字・粒 */
function makeFx() {
  const list = [];
  return {
    pop(x, y, s, col = PAL.fg) { list.push({ x, y, s, col, t: 0.8, k: 'txt' }); },
    burst(x, y, col, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = rnd(60, 200); list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, t: rnd(0.3, 0.7), k: 'p' }); } },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.t -= dt;
        if (p.k === 'p') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; } else p.y -= 40 * dt;
        if (p.t <= 0) list.splice(i, 1);
      }
    },
    draw(c) {
      for (const p of list) {
        c.globalAlpha = clamp(p.t / 0.5, 0, 1);
        if (p.k === 'p') rect(c, p.x - 2, p.y - 2, 4, 4, p.col); else txt(c, p.s, p.x, p.y, 18, p.col);
      }
      c.globalAlpha = 1;
    },
  };
}

/* ---- 効果音 ---- */
const Sound = {
  on: true, ac: null,
  init() { if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ac = null; } } if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {}); },
  beep(f = 440, d = 0.06, type = 'square', v = 0.04) {
    if (!this.on || !this.ac || this.ac.state !== 'running') return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + d + 0.02);
  },
};

/* ---- 本体 ---- */
const Engine = {
  cv: null, ctx: null, d: null, game: null, state: 'idle',
  score: 0, elapsed: 0, limit: 0, held: { L: false, R: false, U: false, D: false, A: false }, ptr: { x: W / 2, y: H / 2, down: false, active: false },
  reason: '', onOver: null, onTick: null, err: null, dpr: 1,
  init(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindPointer();
    let last = 0;
    const frame = ts => {
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0); last = ts;
      this.step(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (dpr !== this.dpr || this.cv.width !== W * dpr) { this.dpr = dpr; this.cv.width = W * dpr; this.cv.height = H * dpr; }
  },
  api() {
    const E = this;
    return {
      W, H, held: E.held, ptr: E.ptr,
      get score() { return E.score; },
      get t() { return E.elapsed; },
      get left() { return E.limit ? Math.max(0, E.limit - E.elapsed) : Infinity; },
      add(n) { if (E.state === 'play') E.score = Math.max(0, Math.round(E.score + n)); },
      set(n) { if (E.state === 'play') E.score = Math.max(0, Math.round(n)); },
      over(msg) { E.finish(msg || 'ゲームオーバー'); },
      beep(f, d, t, v) { Sound.beep(f, d, t, v); },
    };
  },
  load(d) { this.d = d; this.game = null; this.state = 'ready'; this.score = 0; this.elapsed = 0; this.limit = d.time || 0; },
  start() {
    if (!this.d) return;
    Sound.init();
    for (const k in this.held) this.held[k] = false;
    this.ptr.down = false;
    this.score = 0; this.elapsed = 0; this.limit = this.d.time || 0; this.reason = '';
    this.state = 'play';
    try { this.game = this.d.create(this.api()); } catch (e) { this.fail(e); }
  },
  finish(msg) {
    if (this.state !== 'play') return;
    this.state = 'over'; this.reason = msg;
    Sound.beep(160, 0.25, 'sawtooth', 0.05);
    if (this.onOver) this.onOver(this.score, msg);
  },
  stop() { this.state = 'idle'; this.game = null; this.d = null; },
  fail(e) { console.error(e); this.err = e; this.state = 'over'; this.reason = 'エラーが起きました'; if (this.onOver) this.onOver(this.score, this.reason, true); },
  call(fn, ...a) { if (this.state !== 'play' || !this.game || !this.game[fn]) return; try { this.game[fn](...a); } catch (e) { this.fail(e); } },
  step(dt) {
    if (!this.d) return;
    if (this.state === 'play' && !document.hidden) {
      this.elapsed += dt;
      if (this.limit && this.elapsed >= this.limit) { this.elapsed = this.limit; this.finish('タイムアップ'); }
      else this.call('update', dt);
    }
    this.draw();
    if (this.onTick) this.onTick();
  },
  draw() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    rect(c, 0, 0, W, H, PAL.bg);
    if (this.game && this.game.draw) { try { this.game.draw(c); } catch (e) { if (this.state === 'play') this.fail(e); } }
    else this.drawAttract(c);
  },
  drawAttract(c) {
    const t = performance.now() / 1000;
    for (let i = 0; i < 18; i++) {
      const x = (i * 53 + t * 20 * (1 + (i % 3))) % (W + 40) - 20, y = (i * 97) % H;
      shape(c, i, x, y, 8 + (i % 4) * 3, COL[i % COL.length] + '55');
    }
  },
  key(k, raw, rep) {
    if (this.state !== 'play' || !this.game) return;
    this.call('key', k, raw, rep);
  },
  pos(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  },
  bindPointer() {
    const cv = this.cv; let sx = 0, sy = 0, pid = null;
    cv.addEventListener('pointerdown', e => {
      if (this.state !== 'play') return;
      e.preventDefault();
      Sound.init();
      pid = e.pointerId;
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      const p = this.pos(e); sx = p.x; sy = p.y;
      Object.assign(this.ptr, { x: p.x, y: p.y, down: true, active: true });
      if (!this.d.swipe) this.call('down', p.x, p.y);
    });
    cv.addEventListener('pointermove', e => {
      if (this.state !== 'play') return;
      const p = this.pos(e);
      this.ptr.x = p.x; this.ptr.y = p.y; this.ptr.active = true;
      if (!this.d.swipe && (this.ptr.down || e.pointerType === 'mouse')) this.call('move', p.x, p.y);
    });
    const end = e => {
      if (e.pointerId !== pid) return;
      pid = null;
      const wasDown = this.ptr.down; this.ptr.down = false;
      if (this.state !== 'play' || !wasDown) return;
      const p = this.pos(e);
      if (this.d.swipe) {
        const dx = p.x - sx, dy = p.y - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) this.key(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
        else this.key('T');
      } else this.call('up', p.x, p.y);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('contextmenu', e => e.preventDefault());
  },
};

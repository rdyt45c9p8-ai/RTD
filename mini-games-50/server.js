// ミニゲーム50 のランキングサーバー（追加パッケージ不要）
//   起動: node server.js   →  http://localhost:8080 を開く
//   記録は同じフォルダの scores.json に保存されます。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const FILE = path.join(__dirname, 'scores.json');
const PAGE = path.join(__dirname, 'index.html');

let data = {}; // { uid: { nick, best: { gameId: score } } }
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { data = {}; }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(data), () => {}), 500);
}

// 秘密の合言葉（ブラウザごとにランダム）から公開用の ID を作る。
// ランキングに出る ID からは合言葉がわからないので、他人の記録を書きかえられない。
const idOf = secret => crypto.createHash('sha256').update(String(secret)).digest('hex').slice(0, 16);
const rows = () => Object.entries(data).map(([uid, v]) => ({ uid, nick: v.nick, best: v.best }));

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const secret = req.headers['x-player'];
  const you = secret && String(secret).length >= 8 ? idOf(secret) : null;

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    return fs.readFile(PAGE, (err, buf) => (err ? send(res, 500, 'index.html がありません', 'text/plain; charset=utf-8') : send(res, 200, buf, 'text/html; charset=utf-8')));
  }
  if (url === '/api/scores' && req.method === 'GET') return send(res, 200, { you, rows: rows() });
  if (url === '/api/scores' && req.method === 'POST') {
    if (!you) return send(res, 400, { error: 'X-Player ヘッダーが必要です' });
    let body = '';
    req.on('data', ch => { body += ch; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      let j; try { j = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'JSON が読めません' }); }
      const game = String(j.game || ''), score = Math.floor(Number(j.score));
      if (!/^[a-z0-9-]{1,24}$/.test(game) || !isFinite(score) || score <= 0 || score > 1e9) return send(res, 400, { error: '記録の形がちがいます' });
      const me = data[you] || (data[you] = { nick: 'ななしさん', best: {} });
      me.nick = String(j.nick || me.nick).trim().slice(0, 12) || 'ななしさん';
      if (score > (me.best[game] || 0)) me.best[game] = score;
      save();
      send(res, 200, { you, rows: rows() });
    });
    return;
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`ミニゲーム50: http://localhost:${PORT}`));

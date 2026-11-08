// ソースをまとめて 1 つの HTML にする:  node build.js
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const js = ['engine.js', 'games-01.js', 'games-02.js', 'games-03.js', 'games-04.js', 'games-05.js', 'net.js', 'ui.js'].map(src).join('\n');
const body = src('shell.html') + '\n<script>\n' + js + '\n</script>\n';
// そのままブラウザで開ける完全版
const full = '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + body + '</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), full);
// claude.ai の Artifact 用（外側の html/head/body は公開時に付く）
const out = process.argv[2];
if (out) fs.writeFileSync(out, body);
console.log('games:', (js.match(/^def\(\{/gm) || []).length, 'bytes:', full.length);

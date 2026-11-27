// Jembatan TikTok LIVE -> game Attack on DEPR (aod_live).
// Jalankan di mini PC:  npm install && node server.js <username_tiktok>
// Lalu buka http://localhost:8080 (atau pakai sebagai Browser Source di TikTok LIVE Studio / OBS).
// Halaman game disajikan dari ../aod_live/index.html dengan skrip kecil yang disisipkan saat disajikan
// (file game aslinya tidak diubah). Skrip itu memanggil GiftIn() dan LiveEvent() milik game.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const USERNAME = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');
const PORT = +(process.env.PORT || 8080);
const GAME = path.join(__dirname, '..', 'aod_live', 'index.html');
const LIKE_EVERY_MS = 3000; // like sangat ramai; gabungkan jadi satu LiveEvent per 3 detik

const clients = new Set();
function broadcast(msg) {
  const line = 'data: ' + JSON.stringify(msg) + '\n\n';
  for (const res of clients) res.write(line);
  console.log('->', JSON.stringify(msg));
}

// Skrip yang disisipkan ke halaman game: terima event lewat SSE, teruskan ke hook game.
const CLIENT = `<script>(function(){
function go(){
  var es=new EventSource('/events');
  es.onmessage=function(e){var m;try{m=JSON.parse(e.data);}catch(x){return;}
    if(m.t==='gift'&&window.GiftIn)window.GiftIn({name:m.name,coins:m.coins,user:m.user,count:m.count});
    else if(m.t==='event'&&window.LiveEvent)window.LiveEvent(m.kind,m.user);};
}
if(document.readyState==='complete')go();else addEventListener('load',go);
})();</script>`;

function page() {
  const html = fs.readFileSync(GAME, 'utf8');
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + CLIENT : html.slice(0, i) + CLIENT + html.slice(i);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (u.pathname === '/sim') { // uji tanpa TikTok: /sim?gift=Rose&coins=1&count=1 atau /sim?kind=follow
    const q = u.searchParams;
    if (q.get('kind')) broadcast({ t: 'event', kind: q.get('kind'), user: q.get('user') || 'Tester' });
    else broadcast({ t: 'gift', name: q.get('gift') || 'Rose', coins: +q.get('coins') || 1, user: q.get('user') || 'Tester', count: +q.get('count') || 1 });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok\n');
  }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(page());
    } catch (e) {
      res.writeHead(500); return res.end('Tidak bisa membaca ' + GAME);
    }
  }
  res.writeHead(404); res.end('not found');
});
server.listen(PORT, '127.0.0.1', () => console.log('Game: http://localhost:' + PORT + '  (uji: /sim?gift=Rose&coins=1)'));

if (!USERNAME) {
  console.log('Tanpa username TikTok: hanya mode uji (/sim). Pakai: node server.js <username>');
} else {
  connectTikTok();
}

function connectTikTok() {
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
  let likes = 0, lastLikeUser = '', retry = 5000;
  setInterval(() => {
    if (likes > 0) { broadcast({ t: 'event', kind: 'like', user: lastLikeUser }); likes = 0; }
  }, LIKE_EVERY_MS);

  const start = () => {
    const conn = new TikTokLiveConnection(USERNAME, { enableExtendedGiftInfo: true });
    const who = d => (d && d.user && (d.user.nickname || d.user.uniqueId)) || 'Penonton';
    conn.on(WebcastEvent.GIFT, d => {
      const det = d.giftDetails || {};
      if (det.giftType === 1 && !d.repeatEnd) return; // streak masih berjalan; hitung saat selesai
      const coins = det.diamondCount || (d.extendedGiftInfo && d.extendedGiftInfo.diamond_count) || 1;
      broadcast({ t: 'gift', name: det.giftName || 'Gift', coins, user: who(d), count: d.repeatCount || 1 });
    });
    conn.on(WebcastEvent.LIKE, d => { likes++; lastLikeUser = who(d); });
    conn.on(WebcastEvent.CHAT, d => broadcast({ t: 'event', kind: 'comment', user: who(d) }));
    conn.on(WebcastEvent.FOLLOW, d => broadcast({ t: 'event', kind: 'follow', user: who(d) }));
    conn.on(ControlEvent.DISCONNECTED, () => { console.log('Terputus, mencoba lagi...'); setTimeout(start, retry); });
    conn.on(ControlEvent.ERROR, e => console.error('Error:', e && e.message || e));
    conn.connect().then(s => { retry = 5000; console.log('Tersambung ke LIVE @' + USERNAME + ' (room ' + s.roomId + ')'); })
      .catch(e => {
        console.error('Gagal tersambung (' + (e && e.message || e) + '); coba lagi ' + retry / 1000 + ' dtk. Pastikan LIVE sudah mulai.');
        setTimeout(start, retry); retry = Math.min(retry * 2, 60000);
      });
  };
  start();
}

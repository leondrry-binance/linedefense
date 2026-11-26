# Claude-github
For testing create game

## Attack on DEPR — TikTok LIVE (`aod_live`)

Game yang dikendalikan penonton lewat gift TikTok LIVE. Jembatan di folder `bridge/` membaca event LIVE
(gift, like, komentar, follow) dan meneruskannya ke `GiftIn()` / `LiveEvent()` milik game.

### Menjalankan di mini PC
```bash
cd bridge
npm install
node server.js <username_tiktok_anda>     # tanpa @, LIVE harus sudah mulai
```
Buka `http://localhost:8080` di browser (atau jadikan Browser Source di TikTok LIVE Studio / OBS).

- Gift: streak dihitung saat selesai; jumlah = `repeatCount`, koin = nilai diamond gift.
- Like digabung (maks. satu event per 3 detik), komentar dan follow dikirim sebagai `LiveEvent`.
- Terputus otomatis disambung lagi.
- Uji tanpa TikTok: `http://localhost:8080/sim?gift=Rose&coins=1&count=3` atau `/sim?kind=follow`.
- Port lain: `PORT=9000 node server.js <username>`.

Catatan: `tiktok-live-connector` adalah library tidak resmi; bisa berhenti bekerja jika TikTok mengubah protokolnya.

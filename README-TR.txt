PLAY UNO 1.4.0 - KURULUM VE ASSETLER

1) Bilgisayarında Node.js 18+ kurulu olmalı.
2) Projeyi aç, npm install çalıştır ve npm start ile sunucuyu başlat.
3) Tarayıcıdan http://localhost:3000 adresini aç.
4) Doğru UnoPlay-Setup-1.0.0.exe dosyasını proje köküne ekle. Tüm indirme düğmeleri /download.php üzerinden doğrudan indirme başlatır.

İNDİRME
- Node sunucusu /download ve /download.php adreslerini destekler.
- Apache/PHP için download.php web kökünde çalışır; exe ile aynı kökte olmalıdır.
- Eski /downloads/Uno-Setup-1.0.0%20(1).exe adresi güncel .htaccess ile /download.php adresine yönlenir. Canlı hostingde güncel .htaccess dosyasını yükle.
- .htaccess exe dosyasına doğrudan erişimi kapatır.
- Dosya yoksa ya da yanlış kurulum dosyasıysa düğme indirmeyi başlatmaz ve çok dilli hata gösterir.
- Gerçek kurulum dosyasının kimliği dağıtım öncesi doğrulanmalıdır.

ODA SİSTEMİ
- Oda, sohbet ve Socket.IO için Node.js sunucusu gerekir; salt PHP indirme sayfası oda sistemini çalıştırmaz.
- Oda verileri RAM'de tutulur; sunucu yeniden başlatılınca odalar silinir.
- Oda kapasitesi 2–10 kişidir. Oyunu başlatmak için en az iki oyuncu ve herkesin hazır olması gerekir.
- Sohbete PNG/JPEG/GIF/WebP fotoğrafı (en fazla 5 MB) eklenebilir.
- Tema düğmesi Midnight, Aurora ve Classic görünümleri arasında geçiş yapar.

GELİŞTİRİCİ
- npm run check JavaScript sözdizimini denetler.
- Ayrıntılar CHANGELOG-TR.md içinde.

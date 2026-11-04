# Geliştirme günlüğü

## İndirme düzeltmesi — eski bağlantı uyumluluğu

- Eski `/downloads/Uno-Setup-1.0.0 (1).exe` adresi Apache/PHP'de doğrulamalı `/download.php` uç noktasına yönlendirilir.
- Node.js sunucusu da eski URL biçimini aynı dosya doğrulamasına bağlar.
- İndirme güvenliği korunur: engelli SHA-256 değerine sahip kurulum dosyası gönderilmez.

## 1.4.0 — Tema seçenekleri ve fotoğraflı sohbet

- Midnight, Aurora ve Classic temaları eklendi; seçim tarayıcıda hatırlanır ve ana sayfa ile oda arasında korunur.
- Sohbete JPEG, PNG, GIF ve WebP fotoğraf ekleme eklendi. Sunucu dosya imzasını ve 5 MB boyut sınırını doğrular; eski mesajlardan düşen görseller temizlenir.
- Mesaj tekrarları önlenir; fotoğraf gönderimi oda içindeki herkese gerçek zamanlı iletilir.
- Sürüm 1.4.0.

## 1.3.0 — Masaüstü indirme ve ana sayfa yenilemesi

- Tüm indirme düğmeleri `/download.php` uç noktasını kullanıyor; Node.js ve Apache/PHP için doğrudan indirme desteği var.
- İndirme öncesi kurulum dosyası denetleniyor; dosya yoksa düğme hata mesajı gösteriyor.
- Yanlış olduğu tespit edilen kurulum dosyasının SHA-256 değeri Node ve PHP indirme yolunda engelleniyor.
- Yeni Windows indirme alanı, ürün bilgileri, doğru ürün sayaçları, favicon ve sayfa açıklaması eklendi.
- Mobil indirme düzeni ve azaltılmış hareket tercihi iyileştirildi.

## 1.2.0 — Lobi güvenliği ve oyun başlangıcı

- Oda durumu ve sohbet geçmişi artık katılımcı kimliği olmadan okunamıyor; kimlik URL yerine Authorization başlığında taşınıyor.
- API isteklerine IP başına dakikada 180 istek, sohbet mesajlarına oyuncu başına yaklaşık saniyede bir mesaj sınırı eklendi.
- Oda kodları kriptografik rastgelelikle üretiliyor; sunucu dosyaları ve `node_modules` statik sunumdan kapatıldı.
- Bağlı oyuncular lobi zaman aşımından etkilenmiyor.
- Başlatma için en az iki oyuncu ve herkesin hazır olması gerekiyor.
- Türkçe, İngilizce ve Almanca başlangıç/sohbet uyarıları eklendi.
- `npm run check` JavaScript sözdizimi denetimini çalıştırır.

## Bilinen kapsam

Oyun motoru ve masaüstü uygulaması bu web projesinde bulunmuyor. Lobi oyuna geçişi masaüstü uygulamasına bırakıyor. Oda verileri RAM'de tutulduğu için sunucu yeniden başlatıldığında silinir. Doğrulanmış UnoPlay kurulum dosyası sağlanana kadar indirme uç noktası dosya göndermeyecektir.

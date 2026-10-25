# ÖNCE OKU — İçerik 2026.10.25.3

1. ZIP'i aç. İçindeki dosya ve klasörleri GitHub projenin ANA DİZİNİNE yükle. ZIP dosyasını veya onu saran klasörü yükleme. package.json ile codemagic.yaml ana dizinde olmalı. www, scripts, tests dahil bütün klasörleri güncelle ve Commit changes ile kaydet.
2. Codemagic: Start new build → dosyaları yüklediğin branch → ios-testflight-workflow → başlat. Bu seçenekte Google TEST reklamları açık.
3. Yeni build tamamlanıp Apple'da işlendikten sonra TestFlight'tan yükle. 121'i tekrar yüklemek dosyaları değiştirmez. Yeni numara Apple'daki en yüksek numaradan bir fazla olur.
4. Komuta Menüsü veya Siber Evrim ekranında İçerik / Content: 2026.10.25.3 yazmalı. Bu yazı yoksa bu paket kurulmamıştır.

## Beklenen sonuç
- Foton, atış hızı, can ve başlangıç enerjisi: ilk geliştirme 65 Gear + 5 elmas; ikinci 100 Gear + 9 elmas; üçüncü 135 Gear + 13 elmas.
- Eski kayıt seviyeleri korunur. Daha önce geliştirdiğin özellik mevcut seviyesinin fiyatını gösterir: örneğin Lv.5 için 205 Gear + 21 elmas. Oyunu silme.
- Bölüm tamamlama şartı yok. Dron geliştirmesine oyun seviyesi sınırı yok.
- Mağazada 8 paket: 50, 115, 240, 500, 650, 1350, 7000, 15000. Son ikisi için aşağı kaydır. Apple fiyatları yüklenene kadar satın alma düğmeleri kapalı kalır.

## iPad olmadan kontrol
Codemagic: Start new build → ios-ipad-check. Bu ayrı simülatör build'i App Store'a yüklenmez.
- 13/12.9 inç iPad Pro simülatöründe uygulamayı açar. Artifacts bölümünde ipad-first-screen.png ve device.json oluşur; indirip gönder.
- Başlangıç resmi izin ekranı olabilir. Bu tek resim tüm oyunun testi veya tam App Store görsel seti değildir.
- Oynanış, evrim ve mağazayı elle kontrol etmek için build başlatırken Remote access açılarak VNC ile builder Mac'teki simülatör kullanılabilir. iPad satın almak gerekmez.
- App Preview hesabında açıksa .app yanında Quick Launch kullanılabilir; cihaz listesinde iPad varsa seç. App Preview planına bağlı ve ücretli olabilir; bu paket ücretli bir hizmet etkinleştirmez.
- Apple satın alma teslimatını iPhone TestFlight üzerinde ayrıca dene.
- Burada Xcode yok. Simülatör adımı hazırlandı ve sözdizimi kontrol edildi; henüz Mac üzerinde çalıştırılmadı.

## Yayın ve kontroller
Test bitince ios-appstore-release gerçek reklamlarla yayın adayı üretir; bu build de TestFlight'ta denenebilir.
54 otomatik test geçti. Gerçek geliştirme düğmeleri, fiyat metinleri, iki kaynağın düşmesi, yetersiz bakiye ve mevcut kayıt seviyeleri kontrol edildi. Bunlar fiziksel iOS testi değildir.
Evrim kodu index.html içine gömülü. build:web eski/yeni dosya karışımını reddeder. Capacitor sync sonrası verify:native iOS'a kopyalanan dosyaların kaynakla aynı olduğunu kontrol eder. release-verification.json içerik özetini ve commit bilgisini tutar.

# Gezegeni Koru — yayın adayı · 25 Ekim 2026

Bu tam kaynak paketi yeni bir iOS build gerektirir. Derlenmiş IPA veya Apple onayı değildir.

## Codemagic

1. ZIP içindeki dosyaları GitHub deposunun köküne aktar ve yeni commit oluştur. ZIP'in kendisini yüklemek yeterli değildir. `www`, `tests`, `ios_config`, `package.json`, `package-lock.json` ve `codemagic.yaml` birlikte güncellenmeli. `PRIVACY_POLICY.md` de aynı commit ile canlı politika adresinde güncellenmeli.
2. Önce **ios-testflight-workflow** seç: Google test reklamları (`GK_TEST_ADS=1`). VIP olmayan test profiliyle 3 bölüm tamamla; sonraki bölümün ilk dalgası başlamadan reklam gelmeli. Reklam kapanana kadar dalga başlamamalı. 3 bölüm daha tamamlayınca tekrar denenir. Reklam hazır değilse oyun bekletilmez ve sonraki bölümde tekrar denenir. VIP sahibi oyuncuya zorunlu reklam gösterilmez.
3. Gerçek cihaz testi tamamlanınca **ios-appstore-release** seç: mevcut gerçek AdMob kimlikleri (`GK_TEST_ADS=0`). Bu ZIP'in hazır web çıktısı yayın modundadır; test iş akışı çıktıyı yeniden test modunda derler. Test reklamlı build'i App Store sürümüne seçme.
4. İmzalama isimleri korundu: `Apple AppStore`, `neonvoid-appstore-profile`, `ios-distribution`. Build numarası son TestFlight numarasından bir artırılır. `submit_to_testflight: false`, IPA yüklemesini engellemez; dış test beta incelemesini otomatik istemez.
5. Apple işlemesi tamamlanınca yeni yayın build'ini App Store sürümünde seç. Kaynak değişiklikleri eski build'lere uygulanmaz. Sürüm/iç satın alma incelemesi ayrı gönderim adımıdır.

## Bu düzeltme

- Geçiş reklamı iki bölümde bir zafer ekranından kaldırıldı; her 3 tamamlanan bölümden sonra sonraki bölümün ilk dalgasından önce gösterilir.
- Dalga başlatmaya çift dokunmak iki reklam veya iki dalga oluşturmaz. Bölüm değişirse eski reklam isteği yeni bölümde dalga başlatmaz.
- Reklam izni, UMP'nin gerçek `canRequestAds` sonucuyla kontrol edilir. İzin durumunun metni tek başına yüklemeyi engellemez. İzin verilmiyorsa reklam yüklenmez.
- AdMob 6.2.0 / UMP 2.7.0 için native izin sorgusu ve gizlilik seçenekleri köprüsü npm kurulumu sırasında tekrarlanabilir biçimde uygulanır.
- Reklamlar önceden yüklenir. Duraklatma menüsündeki **Destek bilgileri** ekranı test/yayın modunu, VIP durumunu, yükleme durumunu ve hatayı gösterir. Reklamları yeniden hazırlama düğmesi eklendi.
- Gerektiğinde mağazada reklam gizlilik seçenekleri açılır. Gizlilik politikası oyun içinde okunabilir.
- Mevcut satın alma/bonus/kayıt korumaları ve gerçek reklam kimlikleri korundu. Yerel skor tablosunun bilgisayar rakipleri içerdiği açıklandı.

## Kontrol ve sınırlar

Web derlemesi ve 28 otomatik test; kayıt/tekrar teslimat, satın alma köprüsü, reklam kapanışı, 3 bölüm sayacı, çift dokunma, bölüm değişimi, UMP izin koşulları ve native yamanın tekrarlanabilirliği kontrol edilir. Gerçek iPhone, Xcode/IPA derlemesi, canlı AdMob doluluk oranı ve Apple ödeme akışı bu Linux ortamında çalıştırılamadı; Codemagic ve TestFlight doğrulaması gerekir.

Üretim reklamı gösterilmiyorsa Destek bilgileri ekranını kontrol et. AdMob sunucu onayı, uygulama/reklam birimi durumu, UMP mesaj yapılandırması ve reklam bulunabilirliği ayrıca etkili olabilir. Test için canlı reklamlara tıklama. TestFlight'ta VIP aldıysan zorunlu reklamların görünmemesi beklenen davranıştır; gerçek ilerlemeyi silme.

Ürün kimlikleri, toplam elmaslar ve satın alma test adımları için [ONCE_OKU_TESTFLIGHT.md](ONCE_OKU_TESTFLIGHT.md).

## App Store Connect — son doğrulanan durum

24 Ekim oturumunda kaydedilenler: 13+ yaş derecelendirmesi (bölgeye göre değişebilir), Strategy/Action alt kategorileri, Türkçe alt başlık, ücretsiz indirme, 175 ülkede onaydan sonra erişilebilirlik ve AdMob veri türlerini içeren yayınlanmış gizlilik beyanı. Elmas paketlerinin fiyatları değiştirilmedi. Bunlar uygulamanın yayında olduğu anlamına gelmez.

Son görülen sürüm: 1.0 / Prepare for Submission; seçili eski build 114. Bu paketten henüz IPA oluşturulmadı ve Apple'a yüklenmedi.

Gönderim öncesi kalanlar: yeni yayın build'i ve gerçek cihaz reklam testi; sekiz elmas paketi için güncel mağaza inceleme ekran görüntüleri; App Review iletişim alanları (özellikle telefon); Copyright; içerik hakları beyanı; oyunda gerçek entegrasyon bulunmadığı için sürümün Game Center seçiminin kaldırılması; uygulama ekran görüntülerinin kontrolü; güncellenen politika dosyasının GitHub'a aktarılması. Game Center ve iletişim alanlarını kaydetme girişimi tamamlanmadı. 25 Ekimde Apple oturumu kapalı bulundu; yeni giriş gerekiyor.

Politika beyanı Google'ın AdMob veri açıklaması ve mevcut kaynak kod üzerinden hazırlandı. Yeni native build'in SDK gizlilik raporu ve AdMob hesap yapılandırması ile son kontrol de yapılmalı.

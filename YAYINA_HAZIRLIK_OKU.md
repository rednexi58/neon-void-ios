# Gezegeni Koru — denge, ses ve drone güncellemesi · 25 Ekim 2026

Bu tam kaynak paketi yeni bir iOS build gerektirir. Derlenmiş IPA veya Apple onayı değildir.

## Codemagic

1. ZIP içindeki dosyaları GitHub deposunun köküne aktar ve yeni commit oluştur. ZIP'in kendisini yüklemek yeterli değildir. `www`, `tests`, `ios_config`, `package.json`, `package-lock.json` ve `codemagic.yaml` birlikte güncellenmeli. `PRIVACY_POLICY.md` de aynı commit ile canlı politika adresinde güncellenmeli.
2. Önce **ios-testflight-workflow** seç: Google test reklamları (`GK_TEST_ADS=1`). VIP olmayan test profiliyle 3 bölüm tamamla; sonraki bölümün ilk dalgası başlamadan reklam gelmeli. Reklam kapanana kadar dalga başlamamalı. 3 bölüm daha tamamlayınca tekrar denenir. Reklam hazır değilse oyun bekletilmez ve sonraki bölümde tekrar denenir. VIP sahibi oyuncuya zorunlu reklam gösterilmez.
3. Gerçek cihaz testi tamamlanınca **ios-appstore-release** seç: mevcut gerçek AdMob kimlikleri (`GK_TEST_ADS=0`). Bu ZIP'in hazır web çıktısı yayın modundadır; test iş akışı çıktıyı yeniden test modunda derler. Test reklamlı build'i App Store sürümüne seçme.
4. İmzalama isimleri korundu: `Apple AppStore`, `neonvoid-appstore-profile`, `ios-distribution`. Build numarası son TestFlight numarasından bir artırılır. `submit_to_testflight: false`, IPA yüklemesini engellemez; dış test beta incelemesini otomatik istemez.
5. Apple işlemesi tamamlanınca yeni yayın build'ini App Store sürümünde seç. Kaynak değişiklikleri eski build'lere uygulanmaz. Sürüm/iç satın alma incelemesi ayrı gönderim adımıdır.

## Bu paketin yeni değişiklikleri

Ses/müzik, drone, kule yerleşimi, günlük görev, yıldız ödülleri, geliştirme fiyatları ve ilerleme sınırları yenilendi. Ayrıntılı hesaplar, 49 test ve 448 savaş modelinin sonuçları [DENGE_VE_TEST_RAPORU.md](DENGE_VE_TEST_RAPORU.md) dosyasında. En büyük iki elmas paketi oyun mağazasında gizli; Apple fiyatları ve teslimat kimlikleri korunuyor.

## Korunan önceki düzeltmeler

- Haritanın tamamını rastgele kaydıran ekran sallanması kaldırıldı. Telefonun dokunsal geri bildirimi, kule tepkileri ve çatışma efektleri korunuyor.
- Canvas normal flex yerleşiminden çıkarılıp harita alanına sabitlendi. Bitmap boyutu, çizimden hemen önce güncellenir; ResizeObserver çizimden sonra ekranı temizlemez. Bir piksele kadar ölçüm dalgalanması haritayı tekrar boyutlandırmaz.
- Mağaza, lobi, duraklatma, laboratuvar, kahramanlar, kule bilgisi ve gizlilik pencereleri açıkken simülasyon ve görsel animasyon saati ilerlemez. Şimşek geometrisi de duraklatılmış karede sabittir.
- Lobiden açılan mağazayı kapatmak lobiye döner. Mağazanın altında duraklatma menüsü açıksa oyun başlamaz. Son pencere kapandığında oyun devam eder.
- Elmas miktarları/fiyat eşleştirmeleri, reklam birimleri, 3 bölüm reklam kuralı, kayıtlar ve önceki düzeltmeler korunmuştur.

## Cihazda son kontrol

Önce seslerin karakterini ve müziğin rahatsız edip etmediğini dinle; ses sürgüleri ve sessiz modu dene. Tesla/füze farkını, yeni drone görünümünü ve harita kule mesafelerini kontrol et. Mevcut ilerlemeyi silmeden elmas iadesi, kilitli geliştirmeler, yıldız ödülleri ve günlük görevleri kontrol et. İlk bölümleri özellikle ücretsiz oyuncu gibi dene. Yeni günlük görevler gün değişince sıfırlanır.

TestFlight test iş akışı ile yeni build al. Lobiden mağazayı 10 kez aç/kapat; her seferinde lobiye dönmeli. Savaş sırasında menü → mağaza → kapat yap; savaş menü kapanana kadar durmalı, harita yerinden oynamamalı. Kahraman, günlük ödül, kule bilgisi ve laboratuvar pencerelerini dene. Grafik kalitesini değiştirip kule seçimini dene. Her 3 bölüm sonrası geçiş reklamı ve isteğe bağlı ödüllü reklamı test reklamlarıyla kontrol et. Eski ilerlemeni silmen gerekmez.

## Önceki reklam ve satın alma düzeltmeleri

- Geçiş reklamı iki bölümde bir zafer ekranından kaldırıldı; her 3 tamamlanan bölümden sonra sonraki bölümün ilk dalgasından önce gösterilir.
- Dalga başlatmaya çift dokunmak iki reklam veya iki dalga oluşturmaz. Bölüm değişirse eski reklam isteği yeni bölümde dalga başlatmaz.
- Reklam izni, UMP'nin gerçek `canRequestAds` sonucuyla kontrol edilir. İzin durumunun metni tek başına yüklemeyi engellemez. İzin verilmiyorsa reklam yüklenmez.
- AdMob 6.2.0 / UMP 2.7.0 için native izin sorgusu ve gizlilik seçenekleri köprüsü npm kurulumu sırasında tekrarlanabilir biçimde uygulanır.
- Reklamlar önceden yüklenir. Duraklatma menüsündeki **Destek bilgileri** ekranı test/yayın modunu, VIP durumunu, yükleme durumunu ve hatayı gösterir. Reklamları yeniden hazırlama düğmesi eklendi.
- Gerektiğinde mağazada reklam gizlilik seçenekleri açılır. Gizlilik politikası oyun içinde okunabilir.
- Mevcut satın alma/bonus/kayıt korumaları ve gerçek reklam kimlikleri korundu. Yerel skor tablosunun bilgisayar rakipleri içerdiği açıklandı.

## Kontrol ve sınırlar

Web derlemesi ve 49 otomatik test; sabit kamera, 30 tekrarlı lobi/mağaza geçişi, pencere açıkken duraklama, sabit şimşek geometrisi, 100 tekrarlı boyut ölçüm dalgalanması, ekran yönü/kalite değişimi ve dokunma koordinatları dahil; kayıt/tekrar teslimat, satın alma köprüsü, reklam kapanışı, 3 bölüm sayacı, çift dokunma, bölüm değişimi, UMP izin koşulları ve native yamanın tekrarlanabilirliği kontrol edilir. Gerçek iPhone, Xcode/IPA derlemesi, canlı AdMob doluluk oranı ve Apple ödeme akışı bu Linux ortamında çalıştırılamadı; Codemagic ve TestFlight doğrulaması gerekir.

Üretim reklamı gösterilmiyorsa Destek bilgileri ekranını kontrol et. AdMob sunucu onayı, uygulama/reklam birimi durumu, UMP mesaj yapılandırması ve reklam bulunabilirliği ayrıca etkili olabilir. Test için canlı reklamlara tıklama. TestFlight'ta VIP aldıysan zorunlu reklamların görünmemesi beklenen davranıştır; gerçek ilerlemeyi silme.

Ürün kimlikleri, toplam elmaslar ve satın alma test adımları için [ONCE_OKU_TESTFLIGHT.md](ONCE_OKU_TESTFLIGHT.md).

## App Store Connect — son doğrulanan durum

24 Ekim oturumunda kaydedilenler: 13+ yaş derecelendirmesi (bölgeye göre değişebilir), Strategy/Action alt kategorileri, Türkçe alt başlık, ücretsiz indirme, 175 ülkede onaydan sonra erişilebilirlik ve AdMob veri türlerini içeren yayınlanmış gizlilik beyanı. Elmas paketlerinin fiyatları değiştirilmedi. Bunlar uygulamanın yayında olduğu anlamına gelmez.

Son doğrulanan sürüm: 1.0 / Prepare for Submission; seçili build 118. Telefon ve inceleme iletişim bilgileri, Copyright, İngilizce açıklama/anahtar kelimeler/destek URL'si ve İngilizce gizlilik URL'si kaydedildi. Sürümde Game Center kapalı ve Apple onayından sonra otomatik yayın seçili.

Bu kaynak değişikliği build 118'e uygulanmış değildir. Yeni IPA Codemagic ile alınmalı ve gerçek cihazda test edilmelidir. Sonra yayın iş akışıyla alınmış yeni build App Store sürümünde seçilmelidir.

Apple'ın son doğrulamasında kalan zorunlu eksikler: iPhone Dynamic Island orta boy ekran görüntüsü, 13 inç iPad ekran görüntüsü ve içerik hakları beyanı. Oyun içinde görünür altı elmas ürünü ve VIP için inceleme görselleri/ürün eşleştirmesi yeni build ile kontrol edilmeli; gizlenen iki paket için önceki taslak kayıtları ayrıca gözden geçirilmelidir. Draft Submissions inceleme taslağıdır; VIP ürünü taslakta, uygulama sürümü eksikler nedeniyle henüz eklenemedi. Yeni politika dosyası GitHub'daki herkese açık URL'ye de aktarılmalı.

İçerik hakları beyanı tahmin edilmemeli: oyundaki ikon/görsel/seslerin sahipliği veya ticari kullanım lisansı geliştirici tarafından doğrulanmalıdır. Kodla çizilen oyun grafikleri ve sentezlenen sesler görüldü; uygulama ikonunun kaynağı kaynak dosyadan doğrulanamıyor.

Politika beyanı Google'ın AdMob veri açıklaması ve mevcut kaynak kod üzerinden hazırlandı. Yeni native build'in SDK gizlilik raporu ve AdMob hesap yapılandırması ile son kontrol de yapılmalı.

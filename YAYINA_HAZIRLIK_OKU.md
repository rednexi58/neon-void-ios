# GEZEGENİ KORU — iOS Para Kazanma Entegrasyonu

Bu ZIP, mevcut `NeonVoid_iOS_TestFlight_Package(2).zip` projesi üzerinden hazırlandı.
Ana iOS oyunu **Capacitor 6 + HTML/JavaScript** kullanıyor. `Unity_Project_Scripts` klasörü asıl App Store derlemesinde çalışmayan referans kodlardır; korunmuştur.

## İsim ve bundle ID
- Oyunun ana ekran/cihaz altı görünen adı **Gezegeni Koru** olarak ayarlı (`capacitor.config.json`, `codemagic.yaml`, iOS Info.plist scripti).
- **`com.neonvoid.cyberdefense` aynı kaldı.** Bunu değiştirmek App Store Connect'teki mevcut oyun bağlantısını ve imzalama profillerini bozabilir. Oyuncular uygulama adını Gezegeni Koru görecek.
- Uygulama ikonunun içinde zaten “GEZEGENİ KORU” yazıyor.

## Bu pakette yapılan değişiklikler
1. iOS AdMob App ID `ca-app-pub-6370997467091906~2944398467` iOS Info.plist'e eklenir.
2. Tam ekran geçiş reklamı kimliği `ca-app-pub-6370997467091906/2718709749`.
3. İsteğe bağlı ödüllü reklam kimliği `ca-app-pub-6370997467091906/1556215045`.
4. Başarılı tamamlanan **her iki bölümden sonra** tam ekran reklam istenir. Reklam yüklenmediyse oyun kesintiye uğramaz. Yenilgi reklam sayacını artırmaz.
5. Ödüllü reklamın ödülü ancak Google SDK'sı ödül kazanıldığını bildirdiğinde verilir. Önceki sahte sayaç kaldırıldı.
6. Tek seferlik VIP ürünü Apple Product ID: `vip_lifetime`. Apple StoreKit 2 işlemi dışında VIP açılmaz; StoreKit geri yükleme kullanılır.
7. Oyundaki sahte ödeme butonları devre dışı bırakıldı. App Store Connect'te tanımlı olmayan elmas ve terfi paketleri henüz satılmıyor.
8. Oyun mekaniği, seviye sayısı, grafikler, kayıt anahtarları, iconlar ve mevcut bundle ID korundu.
9. `www/native-monetization.js` web önizleme için güvenli yer tutucudur. **Codemagic, `npm run build:web` ile bu dosyayı gerçek native köprüye dönüştürür.**

## Codemagic kullanımı
- Tüm ZIP içeriğini depo köküne koy. Eski dosyaları bu paketle değiştir.
- `codemagic.yaml` içindeki `app_store_connect: Apple AppStore` entegrasyonu, sertifika ve provisioning profil adların eskisiyle aynıdır.
- YAML ilk olarak `npm install`, sonra `npm run build:web`, ardından Capacitor iOS senkronizasyonu ve IPA derlemesi yapar.
- **TestFlight için varsayılan `GK_TEST_ADS: "1"`** → Google'ın test reklamları; gerçek reklam gelirini henüz üretmez.
- Testler başarıyla bitip App Store'a canlı sürüm göndereceğinde `GK_TEST_ADS: "0"` yap, **yeniden build al** ve yeni build'i yayınla. Kod gerçek AdMob birimlerini seçer. TestFlight'ta gerçek reklamları bilinçsizce deneme.
- Gerekli NPM paketleri Codemagic'de internetten yüklenecek. Bu çalışma ortamında npm erişimi olmadığı için **gerçek macOS/Xcode IPA build'i çalıştırılıp doğrulanamadı**.
- StoreKit 2 eklentisi nedeniyle minimum iOS sürümü **iOS 15** olarak ayarlanır. Daha önce dağıtılan iOS 13/14 cihazları bu yeni sürümü yükleyemez.

## Para kazanmaya başlamadan gerekenler
1. Apple App Store Connect'te Paid Apps Agreement **Active**, banka/vergi bilgileri tamamlanmış olmalı.
2. App Store Connect'teki `vip_lifetime` Non-Consumable ürününün Türkiye fiyatı 300 TL ve ülke müsaitliği doğru olmalı.
3. İlk IAP, **yeni uygulama sürümüyle birlikte** review'a eklenmeli.
4. Apple'ın **Review Information → Screenshot** alanına oyunun gerçek TestFlight VIP mağaza ekranından alınmış ekran görüntüsü yükle. Yapay zekâyla tasarlanmış **Promotional Image** bunun yerine geçmez.
5. AdMob'da AB/AEA ve ilgili bölgeler için **Privacy & messaging (UMP/GDPR)** mesajları hazırlanmalı. ATT/IDFA ve App Store Connect **App Privacy** veri beyanları kullanılan SDK'lara göre doldurulmalı.
6. Oyunu App Store'da yayınladıktan sonra AdMob mağaza bağlantısını yap; geliştirici web alanında `app-ads.txt` yayınla ve AdMob doğrulamasını tamamla.
7. Gerçek ödeme, geri yükleme, 2 başarılı seviye → reklam ve ödüllü reklam akışını **TestFlight sandbox ortamında iPhone'da test et**. Bu paket bunu doğruladığını iddia etmez.
8. Bu MVP'de StoreKit 2'nin Apple cihazındaki aktif hak bilgisi kullanılır; harici sunucu üzerinde ayrıca makbuz doğrulaması yoktur. Tam üretim güvenliği için App Store Server API tabanlı doğrulama ve olay bildirimleri önerilir.

## İlk deneme (TestFlight)
- Kullanıcı oyunu açar → App Store ürün bilgisi ve reklam rızası istenir.
- VIP mağazasında `300 TL` yazılı fiyat, cihazın mağaza bölgesine göre Apple fiyatıyla güncellenir.
- `VIP` butonu native App Store sandbox ödeme ekranını açmalı. *Bir butona basmak tek başına satın alma hakkı vermez.*
- `Satın Alımları Geri Yükle` mevcut Apple hesabındaki VIP hakkını tekrar açmalı.
- Testi yapınca oyun içindeki VIP hakkı satın alma öncesinde açılmıyorsa doğru çalışıyor.

## Sorun giderme
- **`Cannot find package` veya npm install hatası:** NPM sürümlerini ve Codemagic kurulumunu kontrol et.
- **CocoaPods `required a higher minimum deployment target`:** `ios/App/Podfile`, Xcode target ve pluginlerin min iOS 15 olduğunu teyit et.
- **Reklam çıkmıyor:** GDPR rıza mesajı, native plugin yüklenmesi, AdMob durumları ve test cihazı internet bağlantısını kontrol et. Reklam yüklenememesi oyun çökmesine neden olmamalı.
- **VIP ürün bulunamıyor:** Apple Product ID `vip_lifetime`, imzalama Bundle ID, Paid Apps sözleşmesi ve App Store Connect ürün meta verilerini kontrol et.
- **Oyunun adı NeonVoid görünüyor:** TestFlight'taki mevcut build eski olabilir; yeni build kur, `Info.plist` CFBundleDisplayName değerini ve App Store Connect uygulama adını denetle.

## Değişen dosyalar (ana)
`package.json`, `codemagic.yaml`, `www/index.html`, `www/native-monetization.js`, `monetization-setup.js`, `build-monetization.cjs`, `ios_config/apply_ios_settings.sh`, `ios_config/Info.plist.additions.xml`.

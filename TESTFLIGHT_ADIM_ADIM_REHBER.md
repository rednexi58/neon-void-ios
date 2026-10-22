# Neon Void: Cyber Defense — Windows'tan (Mac Olmadan) TestFlight & App Store Yayınlama Rehberi

Fiziksel bir Mac bilgisayarınız olmasa bile bu paketin içindeki hazır **`codemagic.yaml`** ve **`.github/workflows/ios-testflight.yml`** dosyalarıyla **Windows bilgisayarınızdan** bulut tabanlı bir Mac (Cloud macOS) kullanarak oyununuzu doğrudan **Apple TestFlight**'a gönderebilirsiniz.

---

## 💻 WINDOWS KULLANICILARI İÇİN ADIM ADIM TESTFLIGHT YÜKLEMESİ (MAC GEREKTİRMEZ)

Normalde Apple sertifikası (`.p12`) üretmek için Mac'teki *Keychain Access* uygulaması gerekir. Ancak **App Store Connect API Key (`.p8`)** ve **Codemagic Otomatik İmzalama** kullandığınızda **hiçbir aşamada Mac bilgisayara ihtiyaç duymazsınız**:

1. **App Store Connect API Anahtarı Oluşturma (Windows Tarayıcınızdan):**
   - [App Store Connect](https://appstoreconnect.apple.com/) -> **Users and Access** -> **Integrations** -> **App Store Connect API** sekmesine girin.
   - `+` butonuna tıklayıp `NeonVoid_Cloud_Key` adında **Admin** veya **App Manager** yetkili bir anahtar oluşturun.
   - Ekranda görünen **Issuer ID**, **Key ID** bilgilerini kopyalayın ve **`AuthKey_XXXXXX.p8`** dosyasını Windows bilgisayarınıza indirin.
2. **Bu Klasörü GitHub'a Yükleyin:**
   - Bu ZIP paketini Windows'ta bir klasöre çıkarın ve [GitHub](https://github.com/) üzerinde oluşturduğunuz yeni bir depoya (repository) yükleyin.
3. **Codemagic (Ücretsiz Aylık 500 Dakika M2 Mac Derlemesi) ile Bağlayın:**
   - [Codemagic.io](https://codemagic.io/) adresine GitHub hesabınızla ücretsiz giriş yapın ve deponuzu seçin.
   - **Teams / Personal Account -> Integrations -> Developer Portal / App Store Connect** bölümüne gidip 1. adımda aldığınız `Issuer ID`, `Key ID` ve `.p8` dosyasını (`NeonVoid_AppStore_Key` adıyla) kaydedin.
   - **Start New Build** butonuna basın! Paketin içindeki `codemagic.yaml` dosyası buluttaki M2 Mac sunucusunda otomatik olarak:
     - `npm install && npx cap add ios` ile Xcode projesini üretir,
     - `Info.plist` içine Apple ATT takip iznini ve `ITSAppUsesNonExemptEncryption = false` ayarını yazar,
     - Apple hesabınızdan sertifika ve profilleri otomatik çeker (`xcode-project use-profiles`),
     - `.ipa` dosyasını derleyip doğrudan **Apple TestFlight**'a yükler!

---

# Neon Void: Cyber Defense — Apple TestFlight & App Store Yayınlama Rehberi

Bu paket hem **Capacitor iOS (Doğrudan Çalışan Web/Canvas Oyunu -> Native Xcode Projesi)** hem de **Unity iOS** üzerinden oyunu **TestFlight** ve **App Store**'a çıkarmak için gereken tüm dosyaları içerir.

---

## 1. Ön Hazırlık (Apple Developer & App Store Connect)

1. **Apple Developer Program Üyeliği:** [developer.apple.com](https://developer.apple.com/) üzerinden yıllık 99 USD olan bireysel veya kurumsal geliştirici hesabınızı aktif edin.
2. **Bundle ID Oluşturma:**
   - Apple Developer Portal -> **Certificates, Identifiers & Profiles** -> **Identifiers** bölümüne gidin.
   - `+` butonuna basıp **App IDs** seçin ve Bundle ID olarak `com.neonvoid.cyberdefense` (Explicit) girin.
   - **In-App Purchase** ve **Game Center** kutucuklarını işaretleyip kaydedin.
3. **App Store Connect'te Uygulama Kaydı:**
   - [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) -> **Apps** -> `+` -> **New App** seçin.
   - **Platform:** iOS
   - **Name:** `Neon Void: Cyber Defense`
   - **Primary Language:** Turkish (veya English)
   - **Bundle ID:** `com.neonvoid.cyberdefense`
   - **SKU:** `NEONVOID001`

---

## 2. YÖNTEM A (En Hızlı Yol — 10 Dakikada Hazır Oyunu Xcode ile TestFlight'a Atmak)

Bu klasördeki `www/index.html` içinde şu an oynadığınız tam sürüm oyun, iOS Safe Area (`viewport-fit=cover`), `Restore Purchases` ve `Apple ATT` uyumluluğuyla hazır durumdadır.

Mac bilgisayarınızda Terminal'i açıp bu klasörün içinde sırasıyla şu 4 komutu çalıştırın:

```bash
# 1. Gerekli Capacitor iOS paketlerini kurun
npm install

# 2. Native iOS Xcode projesini oluşturun
npx cap add ios

# 3. Oyun dosyalarını Xcode projesine senkronize edin
npx cap sync ios

# 4. Projeyi Xcode'da açın
npx cap open ios
```

---

## 3. YÖNTEM B (Unity Üzerinden Xcode Projesi Üretmek İsterseniz)

1. Unity Hub'dan projenizi açın (`Unity_Project_Scripts/Assets` klasörünü projenize atın).
2. **Window -> Package Manager -> Unity Registry** altından **iOS 14 Advertising Support** ve **In-App Purchasing** paketlerini kurun.
3. **File -> Build Settings -> iOS -> Switch Platform** yapın.
4. **Player Settings -> iOS -> Other Settings** altında:
   - **Bundle Identifier:** `com.neonvoid.cyberdefense`
   - **Target Minimum iOS Version:** `15.0`
   - **Target SDK:** `Device SDK`
5. **Build** butonuna basarak Xcode klasörünü dışa aktarın ve üretilen `Unity-iPhone.xcodeproj` dosyasını Xcode ile açın.

---

## 4. Xcode'dan TestFlight'a Yükleme (Archive & Upload)

1. **Signing & Capabilities:**
   - Xcode'da sol panelden `App` (veya `Unity-iPhone`) hedefine tıklayın.
   - **Signing & Capabilities** sekmesinde **Automatically manage signing** kutusunu işaretleyin ve **Team** kısmından kendi Apple Developer hesabınızı seçin.
2. **Info.plist Kontrolleri (`ios_config/Info.plist.additions.xml`):**
   - `Info.plist` dosyasına `ITSAppUsesNonExemptEncryption = NO` satırını ekleyin (böylece TestFlight'ta her yüklemede şifreleme belgesi sormaz).
   - `NSUserTrackingUsageDescription` anahtarının eklendiğinden emin olun.
3. **Uygulama İkonu (App Icon):**
   - `Assets.xcassets -> AppIcon` içerisine 1024x1024 piksel boyutunda (şeffaflık/alpha içermeyen PNG) oyun ikonunuzu sürükleyin.
4. **Archive ve Gönderim:**
   - Xcode üst barından hedef cihaz olarak **Any iOS Device (arm64)** seçin.
   - Üst menüden **Product -> Archive** seçeneğine tıklayın.
   - Derleme bitince açılan **Organizer** penceresinde **Distribute App -> App Store Connect -> Upload** adımlarını tamamlayın.

---

## 5. TestFlight'ta Testi Başlatma

1. Yükleme bittikten 5–10 dakika sonra **App Store Connect -> TestFlight** sekmesinde sürümünüz `Ready to Submit / Ready to Test` durumuna geçer.
2. **Internal Testing (İç Test):** Kendi ekibinizden 100 kişiye kadar e-posta ekleyerek **Apple incelemesi beklemeden anında** iPhone/iPad cihazlarınıza TestFlight uygulamasıyla indirip oynayabilirsiniz.
3. **External Testing (Dış Test):** İlk sürümü dış testçilere açarken **Beta App Review**'a gönderirsiniz (genellikle 24 saat içinde onaylanır) ve ardından **Public Link (Herkese Açık Davet Linki)** oluşturup oyuncularla paylaşabilirsiniz.

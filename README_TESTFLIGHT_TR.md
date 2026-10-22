# NEON VOID — Codemagic TestFlight İlk Derleme (Windows)

## Bu ZIP ne için?
Bu ZIP, mevcut oyunun `www/index.html` dosyasını Capacitor ile iOS uygulamasına çevirip Codemagic üzerinde imzalı `.ipa` üretmek içindir. **iOS IPA'sı burada derlenmedi; Codemagic'te test edilmesi gerekiyor.**

## Önce yaptığımız kurulum
- Codemagic API key entegrasyonu: **Apple AppStore** (farklı görünüyorsa `codemagic.yaml` içinde `integrations.app_store_connect` değerini gerçek adıyla birebir eşleştirin)
- Apple dağıtım sertifikası: Codemagic'e eklenmiş
- iOS provisioning profile: `neonvoid-appstore-profile`, bundle ID: `com.neonvoid.cyberdefense`

## GitHub'a yüklemek
1. ZIP'i **Windows'ta klasöre çıkarın**. ZIP'i tek dosya olarak GitHub'a yüklemek işe yaramaz.
2. `https://github.com/rednexi58/neon-void-ios` -> **Add file** -> **Upload files**.
3. Çıkarılan klasördeki `www`, `src`, `.gitignore`, `codemagic.yaml`, `package.json`, `capacitor.config.json`, `tailwind.config.cjs` ve bu README'yi repository köküne yükleyin. `www/index.html` ve `src/tailwind.css` alt klasörleri korunmalı.
4. `Commit changes` ile kaydedin. Eski `codemagic.yaml` üzerine yazılmalı.
5. Repository'de en azından `www/index.html` dosyasını görün.
6. Codemagic -> Applications -> neon-void-ios -> Start new build -> workflow: `ios-testflight-release`, branch: `main`.
7. Build bittikten sonra IPA'nın oluştuğunu ve App Store Connect'e yüklendiğini kontrol edin. Gerekirse TestFlight'ta iç test grubuna elle ekleyin.

## Önemli: App Store Connect
Apple Developer'da App ID oluşturulmuş olması ayrı, **App Store Connect > Apps** altında oyuna ait uygulama kaydı olması ayrıdır. Yüklemeden önce App Store Connect'te uygulama kaydı oluşturun ve `com.neonvoid.cyberdefense` kimliğini seçin.

## Bu TestFlight prototipinde henüz olmayanlar
- Apple StoreKit üzerinden **gerçek** uygulama içi ödeme / satın alımları geri yükleme.
- Gerçek AdMob/Unity Ads ödüllü reklam ve geçiş reklamı.
- Gerçek iOS AppTrackingTransparency izin isteği.
- Onaylı uygulama ikonu, App Store ekran görüntüleri ve gizlilik beyanları.

Mevcut oyunun bu işlemlerle ilgili düğmeleri DEMO'dur; **App Store için hazır veya onay garantili değildir.** Para tahsil edilmez. Gerçek parasal işlemler sunulmadan önce Apple uyumlu native entegrasyon gereklidir.

## Bağımlılıklar ve stil
Önceki sürüm `cdn.tailwindcss.com` üzerinden CSS üretiyordu. Bu paket Codemagic derlemesinde Tailwind CSS'yi `www/tailwind.css` olarak yerel oluşturur. Böylece oyun arayüzü dış ağ kapalıyken de stilini koruyabilir. Google Fonts ise opsiyonel çevrimiçi yazı tipi kullanır; ağ yoksa sistem yazı tipine döner.

## Dikkat
Bu ZIP iOS için **Capacitor WebView** rotasını kullanır. `Unity_Project_Scripts` klasörü yalnızca C# kaynak parçalarıdır, bir Unity projesi değildir. Kaynak ZIP'inizi ayrıca saklayın.

# Gezegeni Koru — TestFlight son kaynak paket (23.10.2026)

Bu ZIP **tam kaynak proje paketidir**, Apple onaylı IPA değildir.

## İçerik
- `www/index.html`: mevcut oyun (oyun mekaniği değiştirilmedi)
- `monetization-setup.js`: gönderdiğin en son VIP + reklam test/teşhis kodu
- `codemagic.yaml`: önceki `ios-distribution`, App.xcworkspace ve UMP 2.7.0 düzeltmeleri korunarak build numarası `BUILD_NUMBER + 100` yapıldı
- `ios_config/`, `resources/`, `package.json`, `build-monetization.cjs` ve diğer özgün kaynaklar

## GitHub / Codemagic
1. Önce GitHub deposunun çalışan mevcut hâlinin yedeğini al.
2. Bu ZIP'i aç; içindekileri **aynı repo kök dizinine** aktar. ZIP dosyasını tek başına repo içine atma.
3. GitHub `main` dalına commit yap; `codemagic.yaml` ve `monetization-setup.js` gerçekten güncellenmiş olsun.
4. Codemagic → neon-void-ios → Start new build → main → mevcut TestFlight workflow.
5. IPA yüklendikten sonra iPhone üzerinde 🧪 TEST panelini aç ve StoreKit / AdMob durumlarına bak.

## ÖNEMLİ: Son build neden hata verdi?
Son gönderilen Yapıştırılan metin(2).txt **Codemagic hata günlüğü değil**, JavaScript kaynak dosyasıdır.
Bu nedenle son derlemenin neden başarısız olduğu bu paketten kesin saptanamaz. Hata devam ederse
Codemagic Build overview → kırmızı adıma tıkla → ilk gerçek ERROR satırını paylaş.

## Sınırlar
- Bu makinede Xcode/CocoaPods derlemesi ve gerçek iPhone/StoreKit testleri doğrulanmadı.
- AdMob TEST modunda; reklamlar gelir üretmez.
- VIP satın alma ve iOS kullanıcı rızası akışı cihazda doğrulanmadan **canlı App Store sürümü göndermeyin**.
- Hâlihazırdaki StoreKit satın alma akışı sunucu tarafı makbuz doğrulaması içermiyor;
  para kazanma sürümünden önce güvenlik değerlendirmesi gerektirir.
- Bundle ID `com.neonvoid.cyberdefense` bilerek korunur; App Store görünen ad `Gezegeni Koru`dur.

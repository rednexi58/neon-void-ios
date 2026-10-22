# GEZEGENI KORU — TESTFLIGHT GUNCELLEME PAKETI

Bu paket Gemini'den gelen **2026-10-22 yeni oyun kodunu** icerir. Oyun kodunu `www/index.html` icinde **degistirmedik**; yalnizca disaridan gelen Tailwind CDN betigini yerel, derleme sirasinda uretilen `www/tailwind.css` baglantisina cevirdik.

## Neden `codemagic.yaml` yenilendi?
- Orijinal ZIP'deki `neonvoid-dist-cert` referansi mevcut hesaptaki sertifika adi ile uyusmayabilir.
- Daha once sorunsuz calisan `distribution_type: app_store` + `bundle_identifier: com.neonvoid.cyberdefense` ile imzalama otomatik bulunur.
- Codemagic API baglantisi aynidir: `Apple AppStore`.
- Eski workflow ID'si `ios-testflight-release` korunur.
- `PROJECT_BUILD_NUMBER` kullanilir; minimum 5. Onceki basarili build 4 idi. Ayni numara App Store Connect'e ikinci kez yuklenemez.
- `submit_to_testflight: false` beta incelemesine **otomatik gonderme** demektir; IPA, `publishing.app_store_connect` sayesinde **App Store Connect'e yuklenir**. TestFlight'in Internal Testing bolumunden elle gruba eklenebilir.
- CDN Tailwind yerine Codemagic build esnasinda yerel CSS olusturulur.
- Oyun adi: Gezegeni Koru. Uygulama kimligi degismez.

## Kullanim
1. ZIP'i Windows'ta tamamen ayikla.
2. GitHub https://github.com/rednexi58/neon-void-ios => Add file => Upload files.
3. Ayiklanmis paketin **icindeki dosyalari ve klasorleri** beraber surukle, `www` ve `src` klasorlerinin gorundugunu kontrol et. ZIP'i tek dosya olarak yukleme.
4. Degisiklikleri `main` dalina Commit changes ile kaydet.
5. Codemagic => Applications => neon-void-ios => Start new build => branch `main` => workflow `Gezegeni Koru iOS TestFlight` => Start.
6. `Build signed IPA` ve `Publishing` adimlari basarili olmali. `UPLOAD SUCCEEDED` gorulurse App Store Connect'e aktarilmistir.
7. App Store Connect => Neon Void (uygulamanin paneldeki adi otomatik degismeyebilir) => TestFlight => iOS Builds => yeni build islenene kadar kontrol et. Gerektiginde Internal Testing grubuna yeni build ekle; telefonda TestFlight => Update.

## Notlar
- Bu paket **IPA degildir**. iOS derlemesini Codemagic Mac isletim ortaminda uretir.
- `Unity_Project_Scripts` bu Capacitor iOS derlemesinde kullanilmiyor; Gemini'nin orijinal ZIP'inde kalir.
- Oyun ici render halen HTML Canvas 2D'dir, gercek Unity/WebGL 3D degildir.
- Kaynak kodunu ve YAML sozdizimini kontrol ettik; Mac uzerinde gercek IPA/TestFlight build calistirmadik. Build hatasi olursa Codemagic logu incelenmeli.
- Oyundaki reklam veya odeme benzetimlerini gercek App Store odemesi olarak kabul etme; yayina gecmeden dogrula.

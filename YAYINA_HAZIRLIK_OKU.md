# Gezegeni Koru — gelir modeli ve ses revizyonu · 25 Ekim 2026

Bu tam kaynak paketidir. ZIP'in kendisini değil, içindeki dosyaları GitHub deposunun köküne yükle. Önceki sürümün üstüne www, scripts, tests, package.json, package-lock.json, codemagic.yaml, ios_config ve politika dosyaları birlikte gelmeli. Dosyaları ikinci bir proje klasörünün içine koyma.

## Bu sürüm

- Bölüm tamamlama şartları kaldırıldı; temel geliştirmeler eski Gear + elmas maliyetinde.
- Drone seviye/güç tavanı kaldırıldı; büyük filolar performans için güçlendirilmiş gruplar halinde çizilir.
- Eski elit ve kahraman fiyatları/etkileri geri geldi. Kritik matrisi önceki isteğe uygun +0,5 yüzde puan/seviye; etkisiz alım yapmamak için matris katkısı en fazla +60 puan (120 seviye). Nova katkısı ayrıdır.
- Otomatik bölüm hasarı/enerji araştırması ve yeni elmas iadesi kaldırıldı. Mevcut kayıt/bakiye geri çekilmez.
- Sekiz elmas paketi görünür. Apple ürün kimlikleri/fiyatları/teslimat toplamları değiştirilmedi.
- Müzik korundu; Tesla vızıltısı, tank topu ve parçacık lazer sesleri yenilendi.
- Harita, titreme, menüde duraklama, drone çizimi, yıldız ve günlük görev düzeltmeleri korundu.

Ayrıntılı fiyat/değer hesabı ve test sınırları: DENGE_VE_TEST_RAPORU.md. Önceki 49 test/448 zafer raporu bu sürüme ait değildir. Bu sürümde 51 otomatik test ve 432 savaş senaryosu vardır; savaşların bir bölümü kaybedildi ve raporda açıkça belirtilir.

## Codemagic — hangi seçeneğe basılacak?

“Workflow”, derleme ayarının adıdır.

- Telefonda Google test reklamlarıyla son kontrol: **ios-testflight-workflow**. GK_TEST_ADS=1.
- App Store'a gönderilecek gerçek reklamlı dosya: **ios-appstore-release**. GK_TEST_ADS=0.

Bu paketteki hazır web çıktısı yayın modundadır. Her iki Codemagic seçeneği de kendi ayarına göre dosyaları yeniden derler. Test reklamlı build App Store incelemesine seçilmemeli. Yayın build'i de Apple'da işlendikten sonra TestFlight üzerinden kurulup kısa kontrol yapılabilir; gerçek reklamlara test amacıyla tıklanmaz.

Sertifika/profil ve App Store Connect entegrasyonu korunmuştur. Yeni build numarası son TestFlight numarasından otomatik bir fazla alınır. `submit_to_testflight: false` dış beta incelemesini otomatik istememek içindir; IPA yüklemesini engellemez. Bu kod mevcut eski bir build'e uygulanmaz, yeni build gerekir.

## Cihazda kısa doğrulama

1. Eski kayıt silinmeden açılmalı; satın alınmış elmaslar ve seviyeler görünmeli.
2. Foton/atış hızı/üs canı/enerji alımı hem Gear hem elmas kesmeli. Bölüm tamamlama kilidi çıkmamalı.
3. Drone 6→7 alınabilmeli; filo güçlenmeli. Dron sayısı 12'yi geçtiğinde ek güç daha güçlü gövdeler üzerinden temsil edilir.
4. Tesla elektrik sesi, zırh delici tank topu sesi, parçacık lazeri ve değişmeyen müzik dinlenmeli. Ses sürgüleri/sessiz modu denenmeli.
5. Lobi → mağaza → kapat lobiye dönmeli; menü açıkken savaş durmalı; harita titrememeli.
6. VIP olmayan test hesabında 3 tamamlanan bölümün ardından sonraki bölümün ilk dalgasından önce test geçiş reklamı denenmeli. Ödüllü reklam kapanınca oyun devam etmeli, ödül yalnızca hak edilince gelmeli. VIP zorunlu reklamları kaldırır.
7. Sandbox satın alma yeni elmasları bir defa teslim etmeli. Ağ kesintisi/tekrar açma teslimatı çoğaltmamalı.

## App Store Connect durumu

Bu turda güvenli giriş tamamlandı ve canlı hesap tekrar kontrol edildi:

- Sürüm 1.0 / Prepare for Submission; yayın formunda hâlâ build 118 seçili.
- TestFlight'taki en son build 120, Ready to Submit. Bu kaynak değişikliklerini içermiyor; yeni build otomatik olarak en güncel numaranın bir üstünü alacak (şu an en az 121).
- Türkçe iPhone Dynamic Island orta boy ekran görüntüsü: 0/10. Kabul edilen dikey boyutlar 1179×2556 veya 1206×2622.
- Türkçe 13 inç iPad ekran görüntüsü: 0/10. Kabul edilen dikey boyutlar 2048×2732 veya 2064×2752.
- App Information → Content Rights henüz kurulmamış.
- Sekiz elmas ürünü Prepare for Submission, VIP Ready for Review. Örnek olarak açılan gems_50 ürününde Review Information → Screenshot boş. Önceki incelemede diğer elmas ürünlerinde de görsel eksikti; yeni build'in gerçek mağaza görüntüleriyle ürünler birlikte tamamlanmalı.
- Apple onayından sonra otomatik yayın seçili. Draft Submissions (1) hâlâ taslak; yayın anlamına gelmez.

Bu turda eski build incelemeye gönderilmedi ve hesapta fiyat/ürün değişikliği yapılmadı. Yeni derleme, gerçek cihaz/simülatör görselleri ve içerik haklarının doğrulanması gerekiyor.
Kodla sentezlenen sesler/Canvas çizimleri bu projededir. Uygulama ikonunun kökeni koddan doğrulanamıyor; sahibi veya ticari kullanım hakkı hakkında bilgi olmadan içerik hakları beyanı tahmin edilmemeli.

PRIVACY_POLICY.md GitHub'a birlikte yüklenmeli. Gizlilik/SDK beyanları ve gerçek reklam yapılandırması yayın build'iyle kontrol edilmeli. Kaynak paketini hazırlamak veya Codemagic'te build almak uygulamayı tek başına App Store'da yayınlamaz; yeni build seçilmeli ve Apple incelemesi tamamlanmalıdır.

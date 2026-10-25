# Gezegeni Koru — Codemagic test paketi · 24 Ekim 2026

Bu ZIP tam kaynak projedir; derlenmiş veya Apple onaylı IPA değildir. Güncel reklam düzeltmesi ve yayın iş akışı için önce **YAYINA_HAZIRLIK_OKU.md** dosyasını oku.

## Build alma

1. Mevcut deponun yedeğini al. ZIP'i açıp **içindeki dosyaları depo köküne** aktar, eskileri güncelle ve Codemagic'in kullandığı dala commit et. ZIP dosyasını tek başına depoya yüklemek yeterli değildir. `codemagic.yaml`, `package.json`, `package-lock.json`, `www/`, `tests/`, `ios_config/` aynı kökte olmalı.
2. Codemagic'te yeni commit için `ios-testflight-workflow` çalıştır. Önceki imzalama adları korundu: `Apple AppStore`, `neonvoid-appstore-profile`, `ios-distribution`.
3. Workflow npm ci, web derlemesi ve testleri çalıştırır. iOS 15 ve UMP 2.7.0 ayarları ilk cap add/sync işleminden önce uygulanır. Build numarası son TestFlight numarasından bir artırılır. Numara sorgusu başarısızsa build durur.
4. Başarılı IPA App Store Connect'e yüklenir. `submit_to_testflight: false` korundu; dış test beta incelemesi otomatik istenmez. Apple işlemesi bittikten sonra iç test grubunda yeni build'i seçip iPhone'a yükle. Gerekirse tester/grup atamasını tamamla.
5. Uygulamayı silmek yerine TestFlight üzerinden güncelle; mevcut ilerleme ve elmaslar cihazda saklanıyor.

Bundle ID: `com.neonvoid.cyberdefense`. Apple uygulama ID: `6825732487`.

## Değişiklikler

- Mağaza paneli çentik ve ana ekran göstergesi için güvenli alan bırakır; başlık ve düğmeler dar ekranlarda satırlara ayrılır.
- Fiyat yalnızca Apple'ın yerelleştirilmiş ürün bilgisinden gelir. Fiyatı/teklifi hazır olmayan paket satın alınamaz. Durum ve mağazayı yenile düğmesi eklendi.
- Elmas bakiyesi ve Apple işlem numarası aynı kayıtta saklandıktan sonra işlem bitirilir. Tekrarlanan işlem ikinci kez elmas vermez. Kaydetme hatası bakiyeyi geri alır ve işlemi tamamlamaz.
- Kayıt yüklenmeden satın alma başlamaz. Bozuk kayıt sessizce sıfırlanıp üzerine yazılmaz.
- Ödülsüz kapatılan reklam oyunu beklemede bırakmaz. Ödül yalnızca SDK'nın kazanıldı bildirimiyle verilir.
- `GK_TEST_ADS: "1"` ile Google test reklamları açıktır; gelir üretmez. Bu değişken Apple satın alma ortamını belirlemez.
- Sahte ATT penceresi kaldırıldı; mevcut izin düğmesi gerçek iOS API'sini çağırır. Reklam yükleme yetkisi UMP `canRequestAds` sonucuyla belirlenir.
- Tailwind ve Türkçe/Latin fontlar pakete alındı. Arayüz için CDN gerekmez; oyunun mevcut internet gereksinimi korunur.
- Kilit dosyası, otomatik kontroller ve ilk native senkronizasyon öncesi yapılandırma eklendi. Oyun mekaniği ve ürün kimlikleri korundu.

## iPhone test listesi

1. Güncellemeden önce elmas bakiyeni not et; güncellemeden sonra aynı kaldığını kontrol et.
2. Mağazada başlık ve Menü/Kapat düğmeleri görünmeli; son pakete kaydırarak ulaşılmalı. Beklenen durum 8/8 pakettir. Eksik varsa mağazayı yenile; Apple ürün durumu ve bağlantıyı kontrol et. SDK kısa aralıklarla yenilemeyi sınırlayabilir.
3. Oyun fiyatını Apple ödeme ekranıyla karşılaştır. Para birimi Apple hesabının mağaza ülkesine göre değişir.
4. TestFlight/Sandbox ortamını ödeme ekranında doğrula. Oyun taklit ödeme yapmaz; gerçek StoreKit ürünlerini ister.
5. gems_50 satın al: tam +50; gems_100 satın al: tam +115. Kapatıp yeniden açınca bakiye korunmalı ve ikinci kez eklenmemeli.
6. Satın almayı iptal et: bakiye değişmemeli. Aynı paketi tekrar başarılı al: yeni işlem için bir kez daha doğru miktar gelmeli.
7. VIP satın al/geri yükle: zorunlu reklamlar kalkmalı. Tüketilebilir elmaslar VIP geri yükleme düğmesiyle geri gelmez.
8. Ödüllü reklamı erken kapat: ödül verilmemeli ve oyun devam etmeli. Tamamla: bir kez ödül gelmeli. Test reklamı işaretini kontrol et.
9. Bağlantıyı kesip açarak mevcut çevrimdışı uyarısını ve yeniden bağlanmayı kontrol et. Kayıt testi için uygulamayı silme.

| Product ID | Toplam elmas |
| --- | ---: |
| gems_50 | 50 |
| gems_100 | 115 |
| gems_200 | 240 |
| gems_400 | 500 |
| gems_500 | 650 |
| gems_1000 | 1350 |
| gems_5000 | 7000 |
| gems_10000 | 15000 |

Türkiye baz fiyatları App Store Connect'te yönetilir. Önceki yapılandırmada gems_5000 için mevcut fiyat kademesi **7.499,99 TL** seçildi; oyun sabit 7.500 TL göstermez. Diğer ülke fiyatları Apple fiyat programından gelir. Uygulamanın indirme fiyatı ve yayın ülkeleri ayrı ayarlardır.

## Doğrulama ve sınırlar

- **28 otomatik kontrol** kayıt/tekrar teslimat, bonuslar, mock SDK ile StoreKit köprüsü, reklam kapanışı, 3 bölüm sayacı, UMP izin koşulları ve native hazırlık scriptini kapsar.
- Bu ortamda Xcode/CocoaPods IPA derlemesi, gerçek iPhone görünümü, Apple ödeme ekranı ve AdMob sunucu akışı çalıştırılmadı. TestFlight ile doğrulanacak.
- İşlem kaydı cihazdadır. Sunucu makbuz doğrulaması, hesaplar arası bakiye senkronizasyonu veya uygulama silindikten sonra tüketilebilir elmas kurtarma servisi eklenmedi. Önceki build'de tamamlanmış ama teslim edilmemiş işlemler geriye dönük otomatik onarılamaz.
- Bu paket App Store Connect inceleme görsellerini, yaş derecelendirmesini, gizlilik beyanlarını, indirme fiyatını veya yayın ülkelerini değiştirmez. Bunlar canlı yayın öncesinde ayrıca tamamlanmalı; gizlilik beyanları AdMob veri kullanımıyla eşleştirilmeli.
- Unity_Project_Scripts özgün referans kodudur; Codemagic'in derlediği uygulama www içindeki Capacitor oyunudur.

Teknik kaynaklar: [Apple işlem tamamlama sırası](https://developer.apple.com/documentation/storekit/finishing-a-transaction), [Codemagic build numarası](https://docs.codemagic.io/knowledge-codemagic/build-versioning/).

Build başarısızsa Codemagic'teki ilk kırmızı adımın gerçek hata günlüğünü, hata satırının öncesi ve sonrasıyla paylaş.

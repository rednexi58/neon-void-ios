# Gezegeni Koru — eski satın alma modeli ve yeni taret sesleri
25 Ekim 2026. Bu rapor önceki ücretsiz geliştirme/bölüm kilidi raporunun yerine geçer.

## İsteğe göre geri alınanlar

- Laboratuvarda ve kahraman terfisinde farklı bölüm tamamlama şartı kaldırıldı.
- Foton hasarı, atış hızı, üs canı ve başlangıç enerjisi yeniden hem Gear hem elmas ister. İlk alım 65 Gear + 5 elmas; her sonraki alım +35 Gear ve +4 elmas pahalıdır.
- Bu dört temel geliştirme, drone, ganimet ve orbital geliştirmesinin oyun tasarımı kaynaklı seviye tavanı yoktur. Kaynak yeterliyse alınabilir; sayısal taşma gibi geçersiz işlemler yine reddedilir.
- Drone fiyatı tekrar 33 + mevcut seviye × 20 elmas. Eski altı seviyelik güç sınırı kaldırıldı. Her yeni seviye toplam teorik filo hasarına bir drone daha ekler. Telefonu yormamak için en fazla 12 uçan gövde çizilir; daha büyük filolar güçlendirilmiş gruplar halinde temsil edilir. Bu görsel bütçe geliştirme/güç sınırı değildir. Arayüzde bu durum açıklanır.
- Ganimet 20 + seviye × 13 elmas; seviye başına +%5 öldürme enerjisi ve bölüm Gear ödülü. Orbital 26 + seviye × 13 elmas; seviye başına -3 saniye ve +%12 hasar. Bekleme en az 10 saniyedir; bu noktadan sonra da her alım hasarı artırır.
- Kahraman terfisi yeniden 350 + (seviye−1) × 100 elmas. Kahramanın eski 10 seviye sınırı ve 25 zafer başına XP ilerleyişi korunur; ek bölüm kilidi yoktur. Vega/Kaan/Nova etkileri önceki değerlerine döndü.
- Bölüm numarasıyla bedava gelen hasar araştırması ve otomatik başlangıç enerjisi artışı kaldırıldı. İlk bölümlerdeki eski başlangıç yardımı kaldı.
- Sekiz elmas paketi yeniden görünür. Apple fiyatları, kimlikler, teslimat miktarları ve bonusları değişmedi.
- Önceki indirim sürümünün otomatik elmas iadesi artık yeni kayıtlara uygulanmaz. Daha önce verilmiş iade geri çekilmez; satın alınmış seviyeler, elmaslar, Gear ve işlem kayıtları korunur. Eski bir test build'inde altı seviyeye düşürülmüş drone kaydının orijinal seviyesi mevcut kayıttan bilinemez; bu paket tahmin ederek seviye eklemez.

Harita yerleşimi, titreme düzeltmesi, menüde duraklama, yeni drone çizimi, yıldızlar ve günlük görevler korunur. Kazanılan kaynaklarla geliştirme satın alınabilir; otomatik ücretsiz laboratuvar geliştirmesi yoktur.

## Kritik matrisi

Daha önce istenen seviye başına +0,5 yüzde puanı korunur. Matris fiyatı eski 26 + seviye × 13 elmasa döndü. Matrisin kendi katkısı en fazla +60 yüzde puandır (120 seviye). Bu, drone/bölüm kilidi değildir; etkisiz kritik olasılığı satın almayı engeller. Nova bonusu bu katkıya ayrıca eklenir; en üst eski Nova +%30,5 verir. Birlikte en fazla %90,5 kritik ihtimali olur. Bu kadar yüksek olasılık 120 matris seviyesi ve en güçlü Nova gerektirir; matris tek başına 95.940 elmas tutar. Eski 20 seviye sınırı kaldırıldı.

Kritik hasar 1,65×, yani olasılık × 0,65 kadar beklenen hasar katkısı sağlar. Örneğin 20 matris seviyesi +%10 olasılık ve tek başına ortalama +%6,5 hasar getirir. Matris 20 + Nova 10 birlikte %40,5 kritik ve ortalama +%26,325 kritik hasar katkısı verir. Zırh sonradan uygulanır; gerçek hasar kritik atmaz.

Önemli fiyat/değer bulgusu: İlk Foton alımı 5 elmas + 65 Gear ile +%1 hasar verirken ilk matris alımı 26 elmas ile ortalama +%0,325 kritik hasar katkısı verir. Gear maliyeti hariç tutulursa, ilk alımda matrisin elmas başına ortalama hasar getirisi Foton'un 1/16'sıdır. Kullanıcı eski fiyatları istediği için fiyatı tekrar kendiliğimden değiştirmedim. Kritik ilk satın alma için zayıf değer sunabilir; yayın sonrası tercih edilme oranı izlenmeli.

## Paket karşılığı ve artan maliyet

Aşağıdaki her sütun paketin yalnızca o geliştirmeye harcandığı ayrı bir senaryodur. Başlangıç/oynayarak kazanılmış bakiye dahil değildir. Foton ayrıca Gear ister; elmas almak Gear şartını kaldırmaz.

| Paket | Drone seviyeleri (0'dan) | Foton satın alma sayısı (Lv.1'den) | Foton için gereken Gear |
|---|---:|---:|---:|
| 50 elmas | 1 | 4 (+%4) | 470 |
| 115 elmas | 2 | 6 (+%6) | 915 |
| 240 elmas | 3 | 10 (+%10) | 2.225 |
| 500 elmas | 6 | 15 (+%15) | 4.650 |
| 650 elmas | 6 | 17 (+%17) | 5.865 |
| 1.350 elmas | 10 | 25 (+%25) | 12.125 |
| 7.000 elmas | 25 | 58 (+%58) | 61.625 |
| 15.000 elmas | 37 | 85 (+%85) | 130.475 |

Drone toplam maliyeti n seviye için 10n² + 23n elmas. İlk 10 seviye 1.230, ilk 20 seviye 4.460, ilk 30 seviye 9.690 elmas. Artan maliyet ilerlemeyi yavaşlatır fakat yüksek harcayanın büyük avantaj elde etmesini engellemez. Bu, sınırsız güç geliştirme tercihinin sonucudur.

650 elmas paketi, sıfır bakiyeden yedi drone için gereken 651 elmasın bir altında kalır. Oyuncunun başlangıçta veya oynayarak kazandığı elmaslar bunu karşılayabilir; yine de tek paket karşılığında yedi drone vaat edilmemelidir. Sekiz paketin fiyatları bu çalışma sırasında değiştirilmedi.

Tek kahraman Lv.1→10 toplam 6.750 elmas; üç kahraman 20.250 elmas. XP ile ücretsiz ilerleme seçeneği eski oyunda olduğu gibi sürer. Büyük paketin bütün oyun gelişimini bitirdiği söylenemez; sınırsız laboratuvar ilerleyişi vardır. Ancak büyük satın alma mevcut bölümleri çok kolaylaştırabilir.

## Ses değişiklikleri

Beğenilen arka plan müziğinin akor, melodi, zamanlama ve varsayılan ses ayarları değiştirilmedi. Tesla iki katmanlı elektrik uğultusu/vızıltısı ve kıvılcım çatırdaması; zırh delici kısa patlama, düşük frekanslı tank topu gövdesi ve kuyruk; parçacık lazeri kısa yüksek frekanslı atış ve hava/enerji dokusu kullanır. Sesler kodla sentezlenmiştir, gerçek silah kayıtları değildir.

Aynı anda efekt katmanı sınırı, tekrar aralığı, kompresör, ses sürgüleri, sessiz mod, reklamda ses kısılması ve arka plan davranışı korunur. Yeni elektrik modülasyon düğümleri ses bittiğinde ayrılır. Duyulan karakter ve telefon hoparlöründeki bas mutlaka cihazda dinlenmelidir.

## Test yöntemi ve sınırları

Otomatik test, derleme ve savaş sonuçları QA klasöründedir. Yeni savaş profili her varsayılan ilk zaferde temel Gear ve iki yıldızlı elmas ödülünü biriktirir, gerçek fiyatlarla alım yapar; önceki alımlar korunur. Kaynak açıkları, eksi bakiyeler ve sonradan kaybolan geliştirmeler test edilir.

Ücretsiz profil: satın alma, günlük görev/giriş, reklam, tekrar ödülü ve hız bonusu yok. Ücretli profil: buna bir defalık 1.350 elmas eklenir. Kule yerleştiren bot hasar/menzil/maliyet tahmini kullanır; manuel orbital ve acil yardım kullanmaz. Bunlar bütün insan oyuncuların davranışlarını temsil etmez. Her bölüm ayrı savaş denemesidir: kaybedilen bölümlerden sonraki profil, önceki bölümler tamamlanmış varsayımıyla kurulur. Bu yüzden 200 bölümü kesintisiz geçen oyuncu yolculuğu olarak okunmamalıdır.

200 bölüm × iki profil = 400 ana savaş: ücretsiz 158/200, bir defalık +1.350 elmas profili 200/200 zafer. Ücretsiz profilin ilk kaybı 84. bölüm. İki ek rastgelelik tohumu, 10/50/100/200. bölümler ve dört bütçeyle 32 ek deneme: ücretsiz 6/8, +1.350 elmas 7/8, +7.000 elmas 8/8, +15.000 elmas 8/8. Toplam 432 savaş senaryosu. Başarısızlıkları gizlemek için kaybedilen bölümlerin zorluğu değiştirilmedi.

Bu sonuçlar satın almanın anlamlı avantaj verdiğini gösterir. Ücretsiz oyuncunun bazı ileri bölümlerde kaynak biriktirme, yeniden deneme veya taktik değiştirme ihtiyacı var. Bunun keyifli hedef mi yoksa sıkıcı engel mi olduğu gerçek oyuncu testiyle anlaşılır. Bütün oyuncular için dengeli veya gelir garantili olduğu söylenemez. Bu turda zorluk eğrisi yeniden değiştirilmedi.

51 otomatik test geçti. Gerçek hasar yolunda 50.000 vuruşluk kritik testi; çift kaynak kesimi; bölüm kilitsiz alım; 6/12/13/50/1000 seviyeli drone gücü; eski kayıtların korunması; harita/menü, satın alma, reklam ve ses davranışları dahil. Web derlemesi başarılı. iOS imzalı IPA ve gerçek cihaz sesi bu ortamda doğrulanmadı.

## Gelir hakkında doğrudan değerlendirme

Satın alma motivasyonu var: ilk paketle görünür drone gücü, sonraki paketlerle daha fazla güç, temel geliştirmeler için Gear toplama ve mevcut ödüllü reklamlar. Gelirin miktarı ise oyun içi fiyat tablosundan hesaplanamaz; oyuncu sayısı, devam etme, satın alma oranı ve reklam gösterimleri gerekir.

Örnek, tahmin değildir: ayda 1.000 aktif oyuncunun %2'si ortalama 150 TL harcarsa 3.000 TL brüt satın alma hacmi olur. Aynı oranlarla 10.000 aktif oyuncu 30.000 TL brüt eder. Bu net kazanç değildir; komisyon, vergi, iade ve diğer giderler dahil değil. Sadece pahalı paket koymak bu oyuncu sayısını veya dönüşümü sağlamaz.

Reklam tahmini = gerçekleşen gösterim / 1.000 × gerçekleşen eCPM. Google eCPM'nin piyasa, platform ve ülkeye göre değişebildiğini belirtir; burada sabit bir reklam kazancı vaat edilmedi. Kaynak: https://support.google.com/admob/answer/15337570?hl=en

Apple Small Business Program uygun ve kabul edilmiş hesaplarda ücretli uygulama/IAP komisyonunu %15 olarak açıklar. Kullanıcının bu programa kayıtlı olduğu doğrulanmadı; banka hesabına yatacak tutar bu varsayımla hesaplanmadı. Kaynak: https://developer.apple.com/app-store/small-business-program/

İlk yayın sonrası karar: satın alan/almayan oyuncuların hangi bölümde bıraktığı, D1/D7 dönüş, paket tercihleri ve ödüllü reklam kullanımı. Yeni analitik SDK eklenmedi. Fiyat/etki değişiklikleri bu verilerden sonra ayrı bir güncellemeyle yapılabilir.

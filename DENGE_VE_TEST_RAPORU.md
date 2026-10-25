# Gezegeni Koru — ses, ekonomi ve oynanabilirlik güncellemesi
25 Ekim 2026. Bu paket kaynak koddur; IPA, cihaz testi veya Apple yayın onayı değildir.

## Yapılan değişiklikler

- Sakin, yavaş akorlu arka plan müziği ve seyrek melodi eklendi. Tesla elektrik çatırtısı, füze fırlatma/çarpma, top, lazer, buz ve onarım sesleri ayrıldı. Tamamı kodla sentezlenir; gerçek ses kaydı değildir. Varsayılan müzik %32, efekt %55; önceki kişisel ses tercihleri korunur. Ses sıkışması için kompresör, aynı anda en fazla 8 efekt katmanı ve tekrar aralığı var. Sessize alma, arka plana geçme ve reklamlar mevcut seslerin çıkışını da kısar.
- Kule yuvaları aktif yoldan 42–86 oyun birimi uzaklıkta, birbirinden en az 60 birim ayrı yerleştirilir. Eski bazı yuvalar aktif yoldan 210 birim uzaktaydı. Hesaplanan yerleşimler yeniden kullanılır; bölüm açılışında gereksiz tekrar hesaplama azaltıldı.
- Ok şeklindeki drone yerine dört pervaneli, gövdeli, kamera ve konum ışıkları olan küçük drone çizilir. Menü açıkken pervaneler de durur.
- Bölüm 5 → 6 can çarpanı eski 1,09 → 2,06 yerine 1,09 → 1,12. Bölümler 3–8 dalga ile sınırlı; 200. bölüm başlangıç can çarpanı 8,63. Her bölümde ücretsiz sefer araştırması hasarı artırır ve başlangıç enerjisi ilerlemeyle artar.
- Temel geliştirmeler artık elmas istemez. Elit ve kahraman geliştirmelerinde farklı tamamlanan bölüm sayısına bağlı açılma sınırları var. Aynı bölümü tekrar oynamak bu sınırı ilerletmez. Eski kayıtların kazanılmış seviyeleri genel üst sınıra kadar korunur.
- Maksimum seviyede veya kilitli seviyede kaynak kesilmez. Eski temel geliştirmelerin elmas harcamaları ve ucuzlayan elit geliştirmelerin farkları bir defa iade edilir. Satın alma işlem kayıtları korunur. Kahraman terfileri XP/elmas ayrımı kayıtlı olmadığı için onlara geriye dönük iade hesaplanmaz.
- Günlük görevler artık gün değişince yenilenir; eski ömür boyu istatistikler günlük hedefi otomatik tamamlamaz.
- Bölüm yıldızları: tam üs canıyla 3, en az yarısıyla 2, diğer zaferlerde 1 yıldız. Her bölümde yalnızca yeni kazanılan yıldız başına 1 elmas. Tekrar kazanmak 1 temel elmas verir; aynı yıldız tekrar ödenmez. İlk zafer temel ödülü normal bölümde 2, mini boss'ta 3, boss'ta 5 elmas. Aynı zafer işleminin iki kez ödül yazması engellendi.
- Önceki titreme, menüde savaşın durması ve mağazadan lobiye dönüş düzeltmeleri korundu.

## Geliştirme matematiği

| Geliştirme | Üst seviye | Toplam maliyet | Etki sınırı |
|---|---:|---:|---|
| Hasar | 21 | 5.950 Gear | +%20; ücretsiz bölüm araştırmasından ayrı |
| Atış hızı | 21 | 5.950 Gear | +%20 |
| Üs canı | 11 | 2.725 Gear | +20 can, +10 kalkan |
| Başlangıç enerjisi | 11 | 2.825 Gear | +100 enerji; ücretsiz bölüm katkısından ayrı |
| Drone | 6 | 192 elmas | En fazla 6 drone |
| Kritik matrisi | 20 | 440 elmas | Seviye başına +0,5 yüzde puan; toplam +10 puan |
| Ganimet | 10 | 195 elmas | Öldürme enerjisi ve bölüm Gear ödülüne +%20 |
| Orbital | 8 | 176 elmas | -8 saniye, +%32 hasar; toplam bekleme en az 18 saniye |

Kritik gerçekten çalışır: normal hasarı 1,65 ile çarpar; zırh sonra uygulanır. Gerçek hasar kritik atmaz. En üst Nova +%14,75 kritik verir; matrisle toplam %24,75 olur. Ortalama hasar katkısı 0,2475 × 0,65 = %16,0875'tir. Bu yalnızca kritik etkisidir; diğer geliştirmelerin toplam etkisiyle karıştırılmamalıdır.

Tüm temel geliştirmeler 17.450 Gear, dört elit geliştirme toplam 1.003 elmas tutar. Kahramanların 1→10 elmas terfisi kişi başı 540, üç kahraman toplam 1.620 elmas; kahramanlar oynayarak XP ile de yükselir. Elmasla terfi mevcut XP'yi silmez.

200 bölüm ilk zaferlerinin temel Gear toplamı 101.965'tir; hız bonusu, ganimet, günlük ödül ve reklamlar buna dahil değildir. Başlangıçtaki 5 elmasla birlikte, bütün bölümlerde 3 yıldız alan oyuncunun ilk zafer gelirleri 1.084 elmas eder; 1 yıldızla bitirirse 684 olur. Bütün oyuncuların ilk denemede üç yıldız alacağı varsayılmamalıdır. Günlük görev/giriş ödülleri, tekrarlar ve mevcut diğer ödüller ek kaynak sağlar. Dolayısıyla matematikte temel ilerleme satın alma veya reklam izlemeye mecbur bırakılmadı.

## Elmas fiyatları hakkında değerlendirme

Apple fiyatları, ürün kimlikleri ve satın alınan elmas miktarları değiştirilmedi. 75–300 TL giriş paketleriyle başlayıp gerçek oyuncu davranışını ölçmek daha doğru. Daha pahalı paketlerin dönüşümünü ancak yayın sonrası görebiliriz; bu rapor gelir veya oyuncu tutma garantisi vermez.

7.000 ve 15.000 elmas paketleri mevcut kalıcı geliştirme ihtiyacının çok üzerinde kaldığı için oyun arayüzünde gizlendi. Ürün ve teslimat desteği silinmedi; önceden alınmış elmaslar korunur. Görünür paketler 50/115/240/500/650/1.350 elmas. App Store Connect'teki ürünleri bu çalışma sırasında kaldırmadım veya fiyatlandırmadım.

25 Ekim 2026 tarihinde incelenen Türkiye App Store örnekleri: Bloons TD 6 ve Kingdom Rush Vengeance. Ürün kapsamları farklı olduğundan fiyatlar birebir eşdeğer kabul edilmedi:
- https://apps.apple.com/tr/app/bloons-td-6/id1118115766
- https://apps.apple.com/tr/app/kingdom-rush-vengeance-td/id1248033433

## Doğrulama ve sınırlar

49 otomatik test geçti. Satın alma teslimatı/kayıt, reklam kapanışı ve 3 bölüm sayacı, sabit harita/menü davranışları, ekonomi kapıları, iade, günlük görev sıfırlama, tekrar yıldız ödülleri, harita mesafeleri ve ses çıkış kontrolü dahil. Gerçek hasar fonksiyonunda 50.000 vuruşla kritik olasılığı ayrıca sınandı. Web derlemesi başarılı. Test reklamları test iş akışında açık, yayın iş akışında kapalı kalır; AdMob kimlikleri korunmuştur.

Gerçek savaş fonksiyonlarını çalıştıran Node modelinde 200 bölüm × 2 profil = 400 senaryo ve iki ilave rastgelelik tohumu ile 48 örnek senaryo çalıştırıldı. 448/448 zafer. Ana ücretsiz profil toplam 37.379, ödeme yapan profil 36.730 oyun saniyesi sürdü: yaklaşık %1,7 fark. Bu süreler 1× simülasyon süresidir; menü, reklam, düşünme veya insan hatası içermez. Oyunun reklam dahil toplam oynanma süresi olarak kullanılmamalıdır.

Model kuleleri düzenli ve etkili yerleştirir, satın alma yapmadan kazanılabilir tahmini geliştirme seviyeleri kullanır; bölüm başında profil kurulması tam bir hesap ilerleme simülasyonu değildir. Reklam/manuel orbital/acil yardım kullanmaz. Ek örneklerin 16'sında laboratuvar geliştirmesi olmadan da zafer alındı; ücretsiz bölüm araştırması ve kahraman seviyesi bu profilde de vardır. Bu sonuçlar ödeme duvarı görmediğimizi destekler, oyunun herkese uygun zorlukta veya eğlenceli olduğunu ispatlamaz. Özellikle deneyimli oyuncuya kolay gelme ihtimali cihaz testinde değerlendirilmeli. Ham sonuçlar ve teşhis çizimleri QA klasöründedir; çizimler App Store ekran görüntüsü değildir.

Gerçek iPhone/iPad, StoreKit sandbox, AdMob gösterimi ve duyulan ses bu Linux ortamında test edilmedi. Codemagic imzalı IPA ve TestFlight kontrolü hâlâ gerekir.

## Oyuncuyu tutmak için sonraki güncellemeler

Bu pakette günlük görev, üç yıldız ve kademeli açılma var. Yayından sonra öncelik: haftalık eşit koşullu taktik meydan okuma, güç satmayan kozmetik drone/kule görünümleri, yeni düşman-harita kombinasyonları ve oyuncunun takıldığı bölümün yeniden dengelenmesi. Bunlar bu pakette uygulanmış özellikler değildir. Sonsuz mod ve mevcut günlük giriş ödülleri korunmuştur.

İlk ölçülecekler: ilk oturumda bırakılan bölüm, bölüm başına kaybetme/tekrar sayısı, 1. ve 7. gün dönüş, isteğe bağlı reklam seçimi ve satın alma sonrası devam etme. Bu çalışmada yeni analitik SDK eklenmedi. Reklam sayısını artırmak yerine isteğe bağlı ödülün anlamlı kalması ve savaş akışının kesilmemesi tercih edildi.

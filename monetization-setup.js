
 // This file is compiled by esbuild into www/native-monetization.js.
 // TestFlight uses demo ads. Production requires GK_TEST_ADS=0.
 import { Capacitor } from '@capacitor/core';
 import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
 import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';

 const IOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
 const TEST_ADS = __GK_TEST_ADS__;
 const VIP_ID = 'vip_lifetime';

 const ADS = {
   interstitial: TEST_ADS
     ? 'ca-app-pub-3940256099942544/4411468910'
     : 'ca-app-pub-6370997467091906/2718709749',
   rewarded: TEST_ADS
     ? 'ca-app-pub-3940256099942544/1712485313'
     : 'ca-app-pub-6370997467091906/1556215045',
 };

 let initializedAds = false;
 let interstitialReady = false;
 let rewardedReady = false;
 let interstitialBusy = false;
 let rewardedBusy = false;
 let iapReady = false;
 let vipOwned = false;
 let vipPrice = '';
 let vipChangeListener = null;
 let vipPriceListener = null;

 const diagnostics = {
   ios: IOS,
   testAds: TEST_ADS,
   store: 'Başlatılıyor',
   storeError: '',
   ads: 'Başlatılıyor',
   adsError: '',
   interstitial: 'Hazırlanıyor',
   rewarded: 'Hazırlanıyor',
   vipProduct: 'Bekleniyor',
 };

 let refreshDiagnosticsUI = () => {};

 const report = (field, value) => {
   diagnostics[field] = String(value);
   refreshDiagnosticsUI();
 };

 const errorText = error =>
   String(error?.message || error?.code || error || 'Bilinmeyen hata');

 const log = (name, err) => {
   console.warn('[Gezegeni Koru]', name, err || '');
   const text = errorText(err);

   if (/StoreKit|VIP|purchase/i.test(name)) {
     report('storeError', `${name}: ${text}`);
   } else {
     report('adsError', `${name}: ${text}`);
   }
 };

 const emitOwned = () => {
   if (typeof vipChangeListener === 'function') {
     vipChangeListener(vipOwned);
   }
 };

 const emitPrice = () => {
   if (typeof vipPriceListener === 'function') {
     vipPriceListener(vipPrice);
   }
 };

 const refreshVip = () => {
   if (!IOS || !iapReady) return false;

   try {
     const owned = Boolean(store.owned(VIP_ID));

     if (owned !== vipOwned) {
       vipOwned = owned;
       emitOwned();
     }

     return owned;
   } catch (error) {
     log('VIP entitlement read', error);
     return false;
   }
 };

 async function initializeIAP() {
   if (!IOS) return;

   report('store', 'Başlatılıyor');

   try {
     store.register({
       id: VIP_ID,
       type: ProductType.NON_CONSUMABLE,
       platform: Platform.APPLE_APPSTORE
     });

     store.when()
       .productUpdated(product => {
         if (product.id === VIP_ID) {
           report('vipProduct', 'App Store’dan yüklendi');

           vipPrice =
             product.getOffer()?.pricingPhases?.[0]?.price ||
             product.pricing?.price ||
             '';

           emitPrice();
           refreshVip();
         }
       })
       .receiptUpdated(() => refreshVip())
       .approved(async transaction => {
         if (!transaction.products?.some(item => item.id === VIP_ID)) {
           return;
         }

         try {
           await transaction.finish();
           vipOwned = true;
           emitOwned();
           refreshVip();
         } catch (e) {
           log('Apple purchase finish', e);
         }
       })
       .verified(receipt => {
         receipt.finish();
         refreshVip();
       })
       .finished(() => refreshVip());

     store.error(error => log('StoreKit error', error));

     await store.initialize([Platform.APPLE_APPSTORE]);

     iapReady = true;
     report('store', 'SDK hazır');

     const product = store.get(VIP_ID, Platform.APPLE_APPSTORE);

     if (product?.getOffer()) {
       report('vipProduct', 'App Store’dan yüklendi');
     } else {
       report('vipProduct', 'Ürün veya teklif henüz yok');
     }

     refreshVip();
   } catch (error) {
     report('store', 'Hata');
     log('StoreKit initialization', error);
   }
 }

 async function prepareInterstitial() {
   if (
     !initializedAds ||
     interstitialReady ||
     interstitialBusy
   ) return;

   try {
     await AdMob.prepareInterstitial({
       adId: ADS.interstitial,
       isTesting: TEST_ADS
     });

     interstitialReady = true;
     report('interstitial', 'Yüklendi');
   } catch (e) {
     interstitialReady = false;
     report('interstitial', 'Yükleme hatası');
     log('Interstitial preload', e);
   }
 }

 async function prepareRewarded() {
   if (
     !initializedAds ||
     rewardedReady ||
     rewardedBusy
   ) return;

   try {
     await AdMob.prepareRewardVideoAd({
       adId: ADS.rewarded,
       isTesting: TEST_ADS
     });

     rewardedReady = true;
     report('rewarded', 'Yüklendi');
   } catch (e) {
     rewardedReady = false;
     report('rewarded', 'Yükleme hatası');
     log('Reward preload', e);
   }
 }

 async function initializeAds() {
   if (!IOS) return;

   report('ads', 'Başlatılıyor');

   try {
     await AdMob.initialize();

     report('ads', 'SDK hazır, izin kontrolü');

     let consent = await AdMob.requestConsentInfo();

     if (
       consent.isConsentFormAvailable &&
       consent.status === AdmobConsentStatus.REQUIRED
     ) {
       consent = await AdMob.showConsentForm();
     }

     const consentAllowsAds =
       consent.status === AdmobConsentStatus.NOT_REQUIRED ||
       consent.status === AdmobConsentStatus.OBTAINED;

     if (!consentAllowsAds) {
       report(
         'ads',
         `Reklam izni yok / bekleniyor (${consent.status || 'UNKNOWN'})`
       );
       return;
     }

     initializedAds = true;
     report('ads', 'Hazır');

     await Promise.allSettled([
       prepareInterstitial(),
       prepareRewarded()
     ]);
   } catch (e) {
     report('ads', 'Hata');
     log('AdMob consent/initialization', e);
   }
 }

 window.GameMonetization = {
   get isIOS() {
     return IOS;
   },

   get vipPrice() {
     return vipPrice;
   },

   get vipOwned() {
     return vipOwned;
   },

   getDebugInfo() {
     return {
       ...diagnostics,
       iapReady,
       initializedAds,
       interstitialReady,
       rewardedReady,
       vipOwned,
       vipPrice
     };
   },

   onVipChange(callback) {
     vipChangeListener = callback;
     if (vipOwned) emitOwned();
   },

   onVipPrice(callback) {
     vipPriceListener = callback;
     if (vipPrice) emitPrice();
   },

   async buyVIP() {
     if (!IOS) {
       throw new Error(
         'Apple satın alma yalnızca iOS uygulamasında yapılabilir.'
       );
     }

     if (!iapReady) {
       throw new Error(
         'App Store bağlantısı henüz hazır değil. TEST panelinden StoreKit durumunu kontrol edin.'
       );
     }

     if (refreshVip()) return true;

     const offer = store
       .get(VIP_ID, Platform.APPLE_APPSTORE)
       ?.getOffer();

     if (!offer) {
       throw new Error(
         'VIP ürünü App Store’dan yüklenemedi.'
       );
     }

     const outcome = await offer.order();

     if (outcome?.isError) {
       throw new Error(
         outcome.message || 'Satın alma tamamlanamadı.'
       );
     }

     return refreshVip();
   },

   async restoreVIP() {
     if (!IOS || !iapReady) {
       throw new Error(
         'App Store bağlantısı henüz hazır değil.'
       );
     }

     const result = await store.restorePurchases();

     if (result?.isError) {
       throw new Error(
         result.message || 'Geri yükleme başarısız.'
       );
     }

     return refreshVip();
   },

   async showInterstitial() {
     if (
       !IOS ||
       vipOwned ||
       !initializedAds ||
       !interstitialReady ||
       interstitialBusy
     ) return false;

     report('interstitial', 'Gösteriliyor');

     interstitialBusy = true;
     interstitialReady = false;

     try {
       await AdMob.showInterstitial();
       return true;
     } catch (e) {
       log('Interstitial display', e);
       return false;
     } finally {
       interstitialBusy = false;
       void prepareInterstitial();
     }
   },

   async showRewarded() {
     if (
       !IOS ||
       !initializedAds ||
       !rewardedReady ||
       rewardedBusy
     ) return false;

     report('rewarded', 'Gösteriliyor');

     rewardedBusy = true;
     rewardedReady = false;

     try {
       const earned = await AdMob.showRewardVideoAd();

       return Boolean(
         earned && (earned.amount > 0 || earned.type)
       );
     } catch (e) {
       log('Reward display', e);
       return false;
     } finally {
       rewardedBusy = false;
       void prepareRewarded();
     }
   }
 };

 // TestFlight diagnostic UI
 if (IOS && TEST_ADS) {
   const buildPanel = () => {
     if (document.getElementById('gk-monetization-test')) {
       return;
     }

     const root = document.createElement('div');
     root.id = 'gk-monetization-test';

     root.style.cssText =
       'position:fixed;right:8px;top:78px;' +
       'z-index:2147483000;' +
       'font-family:Arial,sans-serif;font-size:12px';

     root.innerHTML = `
       <button id="gk-open-diagnostics"
         style="border:1px solid #ffffff99;
         background:#123854;color:#fff;
         border-radius:10px;padding:6px 10px;
         font-weight:bold">
         🧪 TEST
       </button>

       <section id="gk-diagnostics-box"
         style="display:none;margin-top:6px;
         width:min(85vw,320px);max-height:68vh;
         overflow:auto;padding:12px;
         background:#081a2cee;
         border:1px solid #60a5fa;
         color:#fff;border-radius:12px;
         box-shadow:0 8px 28px #0007">

         <div style="font-weight:bold;margin-bottom:8px">
           Gezegeni Koru — Test Paneli
         </div>

         <pre id="gk-diagnostics-text"
           style="font-size:11px;
           white-space:pre-wrap;
           word-break:break-word;
           line-height:1.5"></pre>

         <button id="gk-ad-reload"
           style="padding:7px;background:#2f68a8;
           color:white;border-radius:5px;margin:3px">
           Reklam Yükle
         </button>

         <button id="gk-ad-interstitial"
           style="padding:7px;background:#2f68a8;
           color:white;border-radius:5px;margin:3px">
           Geçiş Testi
         </button>

         <button id="gk-ad-rewarded"
           style="padding:7px;background:#2f68a8;
           color:white;border-radius:5px;margin:3px">
           Ödüllü Test
         </button>

         <div id="gk-test-result"
           style="margin-top:8px;color:#fbbf24"></div>

         <small style="display:block;
           opacity:.75;margin-top:6px">
           Yalnızca test reklamları.
           Bu butonlar oyun içi hak vermez.
         </small>
       </section>
     `;

     document.body.appendChild(root);

     const panel = root.querySelector('#gk-diagnostics-box');
     const details = root.querySelector('#gk-diagnostics-text');
     const result = root.querySelector('#gk-test-result');

     refreshDiagnosticsUI = () => {
       if (!panel || panel.style.display === 'none') {
         return;
       }

       const d = window.GameMonetization.getDebugInfo();

       details.textContent = [
         `iOS native: ${d.ios ? 'Evet' : 'Hayır'}`,
         `StoreKit: ${d.store}`,
         `VIP ürün: ${d.vipProduct}`,
         `VIP: ${d.vipOwned ? 'Satın alınmış' : 'Satın alınmamış'}`,
         `AdMob: ${d.ads}`,
         `Geçiş reklamı: ${d.interstitial}`,
         `Ödüllü reklam: ${d.rewarded}`,
         d.storeError ? `Apple hata: ${d.storeError}` : '',
         d.adsError ? `Google hata: ${d.adsError}` : ''
       ].filter(Boolean).join('\n');
     };

     root.querySelector('#gk-open-diagnostics').onclick = () => {
       panel.style.display =
         panel.style.display === 'none' ? 'block' : 'none';

       refreshDiagnosticsUI();
     };

     root.querySelector('#gk-ad-reload').onclick = async () => {
       result.textContent = 'Yeniden yükleniyor…';

       await Promise.allSettled([
         prepareInterstitial(),
         prepareRewarded()
       ]);

       result.textContent =
         'Yükleme işlemi bitti, durumları kontrol et.';

       refreshDiagnosticsUI();
     };

     root.querySelector('#gk-ad-interstitial').onclick = async () => {
       result.textContent = 'Geçiş reklamı deneniyor…';

       const success =
         await window.GameMonetization.showInterstitial();

       result.textContent = success
         ? 'Geçiş reklamı açıldı.'
         : 'Açılmadı; durum ve hataya bak.';

       refreshDiagnosticsUI();
     };

     root.querySelector('#gk-ad-rewarded').onclick = async () => {
       result.textContent = 'Ödüllü reklam deneniyor…';

       const earned =
         await window.GameMonetization.showRewarded();

       result.textContent = earned
         ? 'Google ödül kazanıldığını bildirdi.'
         : 'Ödül gelmedi; durum ve hataya bak.';

       refreshDiagnosticsUI();
     };
   };

   if (document.readyState === 'loading') {
     document.addEventListener(
       'DOMContentLoaded',
       buildPanel,
       { once: true }
     );
   } else {
     buildPanel();
   }
 }

 if (IOS) {
   window.addEventListener('load', () => {
     void initializeIAP();
     void initializeAds();
   });
 }

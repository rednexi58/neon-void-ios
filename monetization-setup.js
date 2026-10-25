import { isInterstitialDue } from './interstitial-cadence.cjs';
// This file is compiled by esbuild into www/native-monetization.js.
// TestFlight uses demo ads (GK_TEST_ADS=1). Production requires GK_TEST_ADS=0.
import { commitGrant, createDelivery } from './purchase-delivery.cjs';
import { Capacitor } from '@capacitor/core';
import { presentAd } from './ad-presentation.cjs';
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import * as CdvPurchasePkg from 'capacitor-plugin-cdv-purchase';

const IOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
const TEST_ADS = __GK_TEST_ADS__;
const VIP_ID = 'vip_lifetime';

const GEM_PACKS = [
  { id: 'gems_50', baseGems: 50, bonusGems: 0, totalGems: 50 },
  { id: 'gems_100', baseGems: 100, bonusGems: 15, totalGems: 115 },
  { id: 'gems_200', baseGems: 200, bonusGems: 40, totalGems: 240 },
  { id: 'gems_400', baseGems: 400, bonusGems: 100, totalGems: 500 },
  { id: 'gems_500', baseGems: 500, bonusGems: 150, totalGems: 650 },
  { id: 'gems_1000', baseGems: 1000, bonusGems: 350, totalGems: 1350 },
  { id: 'gems_5000', baseGems: 5000, bonusGems: 2000, totalGems: 7000 },
  { id: 'gems_10000', baseGems: 10000, bonusGems: 5000, totalGems: 15000 }
];

const GEM_PACK_MAP = Object.fromEntries(GEM_PACKS.map(p => [p.id, p]));

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
let adRequestBusy = false;
let interstitialLoading = null;
let rewardedLoading = null;
let iapReady = false;
let iapInitializing = null;
let vipOwned = false;
let vipPrice = '';
let gemPrices = {};
let vipChangeListener = null;
let vipPriceListener = null;
let gemPriceListener = null;
let gemGrantListener = null;
let gameReady = false;
let orderBusy = false;
let catalogListener = null;
let adsInitializing = null;
window.GamePurchaseLedger = { commitGrant };
const delivery = createDelivery({
  packs: GEM_PACK_MAP, vipId: VIP_ID,
  grant: grant => gameReady && gemGrantListener ? gemGrantListener(grant) : false,
  unlockVip: () => { if (!gameReady) return false; vipOwned = true; emitOwned(); return true; },
  finish: transaction => getCdvPurchase().store.finish(transaction),
  onError: error => log('Apple purchase delivery', error)
});
function emitCatalog() {
  if (catalogListener) catalogListener({ ready: iapReady, ios: IOS, testAds: TEST_ADS,
    busy: orderBusy, status: diagnostics.store, error: diagnostics.storeError,
    products: Object.fromEntries([VIP_ID, ...GEM_PACKS.map(p => p.id)].map(id => {
      const cdv = getCdvPurchase();
      const product = cdv?.store.get(id, cdv?.Platform.APPLE_APPSTORE);
      const price = product?.getOffer()?.pricingPhases?.[0]?.price || product?.pricing?.price || '';
      return [id, { price, available: Boolean(gameReady && iapReady && price && product?.canPurchase) }];
    })) });
}
async function orderProduct(id) {
  if (orderBusy) throw new Error('Bir satın alma işlemi zaten açık.');
  if (!gameReady || !IOS) throw new Error('Satın alma yalnızca kayıtları yüklenmiş iOS uygulamasında kullanılabilir.');
  orderBusy = true; emitCatalog();
  try {
    if (!await initializeIAP()) throw new Error('App Store bağlantısı hazır değil. Mağazayı yenileyin.');
    const cdv = getCdvPurchase();
    const product = cdv.store.get(id, cdv.Platform.APPLE_APPSTORE);
    const offer = product?.getOffer();
    if (!product?.canPurchase || !offer || !offer.pricingPhases?.[0]?.price) {
      throw new Error('Bu ürün App Store’dan henüz yüklenmedi veya işlem bekliyor. Mağazayı yenileyin.');
    }
    const result = await offer.order();
    if (result?.isError) throw new Error(result.message || 'Satın alma tamamlanamadı.');
    return true;
  } finally { orderBusy = false; emitCatalog(); }
}

const diagnostics = {
  ios: IOS,
  testAds: TEST_ADS,
  store: 'Başlatılıyor',
  storeError: '',
  ads: 'Başlatılıyor',
  adsError: '',
  interstitial: 'Hazırlanıyor',
  rewarded: 'Hazırlanıyor',
  canRequestAds: 'Bekleniyor',
  privacyOptionsRequired: false,
  vipProduct: 'Bekleniyor',
};

let refreshDiagnosticsUI = () => {};

const report = (field, value) => {
  diagnostics[field] = String(value);
  refreshDiagnosticsUI();
  emitCatalog();
  window.dispatchEvent(new CustomEvent('gk-monetization-status'));
};

const errorText = error =>
  String(error?.message || error?.code || error || 'Bilinmeyen hata');

const log = (name, err) => {
  console.warn('[Gezegeni Koru]', name, err || '');
  const text = errorText(err);

  if (/StoreKit|VIP|purchase|gem/i.test(name)) {
    report('storeError', `${name}: ${text}`);
  } else {
    report('adsError', `${name}: ${text}`);
  }
};

function getCdvPurchase() {
  if (typeof window !== 'undefined' && window.CdvPurchase && window.CdvPurchase.store) {
    return window.CdvPurchase;
  }
  if (CdvPurchasePkg && CdvPurchasePkg.store) {
    return CdvPurchasePkg;
  }
  if (CdvPurchasePkg && CdvPurchasePkg.CdvPurchase && CdvPurchasePkg.CdvPurchase.store) {
    return CdvPurchasePkg.CdvPurchase;
  }
  return null;
}

function waitForDeviceReady(timeoutMs = 1800) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    document.addEventListener('deviceready', finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

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

const emitGemPrices = () => {
  if (typeof gemPriceListener === 'function') {
    gemPriceListener({ ...gemPrices });
  }
};

const refreshVip = () => {
  if (!IOS || !iapReady) return false;

  try {
    const cdv = getCdvPurchase();
    if (!cdv || !cdv.store) return false;
    const owned = Boolean(cdv.store.owned(VIP_ID));

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

let iapHooksRegistered = false;
async function initializeIAP() {
  if (!IOS || !gameReady) return false;
  if (iapReady) {
    refreshVip();
    return true;
  }
  if (iapInitializing) return iapInitializing;

  iapInitializing = (async () => {
    report('store', 'Başlatılıyor');

    try {
      await waitForDeviceReady(1800);
      const cdv = getCdvPurchase();
      if (!cdv || !cdv.store) {
        report('store', 'Eklenti bekleniyor');
        log('StoreKit plugin', 'CdvPurchase henüz yüklenmedi');
        return false;
      }

      const { store, ProductType, Platform } = cdv;

      if (!iapHooksRegistered) {
        iapHooksRegistered = true;
        const catalog = [
          {
            id: VIP_ID,
            type: ProductType.NON_CONSUMABLE,
            platform: Platform.APPLE_APPSTORE
          },
          ...GEM_PACKS.map(pack => ({
            id: pack.id,
            type: ProductType.CONSUMABLE,
            platform: Platform.APPLE_APPSTORE
          }))
        ];
        store.register(catalog);

        store.when()
          .productUpdated(product => {
            const priceStr =
              product.getOffer()?.pricingPhases?.[0]?.price ||
              product.pricing?.price ||
              '';
            if (product.id === VIP_ID) {
              report('vipProduct', 'App Store’dan yüklendi');
              vipPrice = priceStr;
              emitPrice();
              refreshVip();
            } else if (GEM_PACK_MAP[product.id] && priceStr) {
              gemPrices[product.id] = priceStr;
              emitGemPrices();
            }
            emitCatalog();
          })
          .receiptUpdated(() => refreshVip())
          .approved(transaction => { void delivery.approve(transaction); })
          .finished(() => { refreshVip(); emitCatalog(); });

        store.error(error => log('StoreKit error', error));
      }

      const errors = await store.initialize([Platform.APPLE_APPSTORE]);
      if (errors?.length) throw new Error(errors.map(errorText).join('; '));
      try { await store.update(); } catch (_) {}

      iapReady = true;
      report('storeError', '');
      report('store', 'App Store hazır');

      const product = store.get(VIP_ID, Platform.APPLE_APPSTORE) || store.get(VIP_ID);

      if (product?.getOffer()) {
        report('vipProduct', `Yüklendi (${vipPrice || 'Hazır'})`);
      } else {
        report('vipProduct', 'App Store Connect’te vip_lifetime / Paid Apps bekleniyor');
      }

      GEM_PACKS.forEach(pack => {
        const gp = store.get(pack.id, Platform.APPLE_APPSTORE) || store.get(pack.id);
        const pStr = gp?.getOffer()?.pricingPhases?.[0]?.price || gp?.pricing?.price || '';
        if (pStr) gemPrices[pack.id] = pStr;
      });
      emitGemPrices();

      refreshVip();
      return true;
    } catch (error) {
      report('store', 'Hata');
      log('StoreKit initialization', error);
      return false;
    } finally {
      iapInitializing = null;
    }
  })();

  return iapInitializing;
}

async function loadInterstitial() {
  if (!initializedAds || interstitialReady || interstitialBusy) return interstitialReady;

  try {
    await AdMob.prepareInterstitial({
      adId: ADS.interstitial,
      isTesting: TEST_ADS
    });

    interstitialReady = true;
    report('interstitial', 'Hazır (Yüklendi)');
    return true;
  } catch (e) {
    interstitialReady = false;
    report('interstitial', 'Yükleme hatası');
    log('Interstitial preload', e);
    return false;
  }
}

async function loadRewarded() {
  if (!initializedAds || rewardedReady || rewardedBusy) return rewardedReady;

  try {
    await AdMob.prepareRewardVideoAd({
      adId: ADS.rewarded,
      isTesting: TEST_ADS
    });

    rewardedReady = true;
    report('rewarded', 'Hazır (Yüklendi)');
    return true;
  } catch (e) {
    rewardedReady = false;
    report('rewarded', 'Yükleme hatası');
    log('Reward preload', e);
    return false;
  }
}

function prepareInterstitial() {
  if (!interstitialLoading) interstitialLoading = loadInterstitial().finally(() => { interstitialLoading = null; });
  return interstitialLoading;
}
function prepareRewarded() {
  if (!rewardedLoading) rewardedLoading = loadRewarded().finally(() => { rewardedLoading = null; });
  return rewardedLoading;
}

async function initializeAdsOnce() {
  if (!IOS) return false;
  if (initializedAds) return true;

  report('ads', 'Başlatılıyor');

  try {
    await AdMob.initialize({
      initializeForTesting: TEST_ADS
    });

    report('ads', 'SDK hazır, izin kontrolü');

    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch (error) {
      // UMP itself may still authorize requests using valid consent from an earlier session.
      log('AdMob consent update', error);
    }
    const consentInfo = await AdMob.getConsentInfo();
    diagnostics.privacyOptionsRequired = consentInfo.privacyOptionsRequired === true;
    report('canRequestAds', String(consentInfo.canRequestAds === true));
    if (consentInfo.canRequestAds !== true) {
      report('ads', 'Reklam izni bekleniyor');
      return false;
    }
    initializedAds = true;
    report('adsError', '');

    report('ads', 'Hazır (Aktif)');

    await Promise.allSettled([
      prepareInterstitial(),
      prepareRewarded()
    ]);
    return true;
  } catch (e) {
    report('ads', 'Hata');
    log('AdMob initialization', e);
    return false;
  }
}

function initializeAds() {
  if (!gameReady) return Promise.resolve(false);
  if (!adsInitializing) adsInitializing = initializeAdsOnce().finally(() => { adsInitializing = null; });
  return adsInitializing;
}

window.GameMonetization = {
  isInterstitialDue,
  async openPrivacyOptions() {
    if (!IOS) return;
    await AdMob.showPrivacyOptionsForm();
    initializedAds = false; interstitialReady = false; rewardedReady = false;
    await initializeAds();
  },
  async preloadAds() { if (gameReady) { await initializeAds(); await Promise.allSettled([prepareInterstitial(), prepareRewarded()]); } },
  get isIOS() {
    return IOS;
  },

  get vipPrice() {
    return vipPrice;
  },

  get vipOwned() {
    return vipOwned;
  },

  get gemPacks() {
    return GEM_PACKS.slice();
  },

  get gemPrices() {
    return { ...gemPrices };
  },

  getDebugInfo() {
    return {
      ...diagnostics,
      iapReady,
      initializedAds,
      interstitialReady,
      rewardedReady,
      vipOwned,
      vipPrice,
      gemPrices
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

  onGemPrices(callback) {
    gemPriceListener = callback;
    if (Object.keys(gemPrices).length > 0) emitGemPrices();
  },

  onGemGranted(callback) {
    gemGrantListener = callback;
  },

  async buyVIP() { await orderProduct(VIP_ID); return refreshVip(); },
  async buyGemPack(id) {
    if (!GEM_PACK_MAP[id]) throw new Error('Geçersiz elmas paketi.');
    return orderProduct(id);
  },
  onCatalogChange(callback) { catalogListener = callback; emitCatalog(); },
  async refreshStore() {
    if (!await initializeIAP()) return false;
    await getCdvPurchase().store.update();
    await delivery.retry();
    emitCatalog();
    return true;
  },
  start(ready) {
    gameReady = ready === true;
    if (!gameReady) { report('store', 'Kayıt dosyası okunamadı; satın alma kapalı'); return; }
    if (!IOS) { report('store', 'Satın alma için TestFlight / iPhone gerekir'); return; }
    void initializeIAP(); void initializeAds(); void delivery.retry();
  },
  async requestTrackingPermission() {
    if (!IOS) throw new Error('Bu izin yalnızca iOS uygulamasında kullanılabilir.');
    await AdMob.requestTrackingAuthorization();
    return (await AdMob.trackingAuthorizationStatus()).status;
  },

  async restoreVIP() {
    if (!IOS) {
      throw new Error('Geri yükleme yalnızca iOS uygulamasında çalışır.');
    }
    if (!iapReady) {
      await initializeIAP();
    }
    if (!iapReady) {
      throw new Error('App Store bağlantısı henüz hazır değil.');
    }

    const cdv = getCdvPurchase();
    const result = await cdv.store.restorePurchases();

    if (result?.isError) {
      throw new Error(
        result.message || 'Geri yükleme başarısız.'
      );
    }

    return refreshVip();
  },

  async showInterstitial(forceTest = false) {
    if (!IOS || (!forceTest && vipOwned) || interstitialBusy || rewardedBusy || adRequestBusy) return false;
    adRequestBusy = true;
    interstitialBusy = true;
    try {
      // Never delay a level transition while waiting for an ad network request.
      if (!initializedAds || !interstitialReady) {
        void window.GameMonetization.preloadAds();
        return false;
      }
      interstitialReady = false;
      report('interstitial', 'Gösteriliyor');
      return await presentAd({ sdk: AdMob, events: InterstitialAdPluginEvents,
        show: () => AdMob.showInterstitial(), rewarded: false });
    } catch (error) { log('Interstitial display', error); return false; }
    finally { adRequestBusy = false; interstitialBusy = false; void prepareInterstitial(); }
  },
  async showRewarded() {
    if (!IOS || rewardedBusy || interstitialBusy || adRequestBusy) return false;
    adRequestBusy = true;
    rewardedBusy = true;
    try {
      if (!initializedAds) await initializeAds();
      rewardedBusy = false;
      if (!rewardedReady) await prepareRewarded();
      rewardedBusy = true;
      if (!rewardedReady) return false;
      rewardedReady = false;
      report('rewarded', 'Gösteriliyor');
      return await presentAd({ sdk: AdMob, events: RewardAdPluginEvents,
        show: () => AdMob.showRewardVideoAd(), rewarded: true });
    } catch (error) { log('Reward display', error); return false; }
    finally { adRequestBusy = false; rewardedBusy = false; void prepareRewarded(); }
  }
};
// Start only after the game has loaded its saved balance and installed delivery callbacks.
document.addEventListener('resume', () => {
  if (gameReady && IOS) { void window.GameMonetization.refreshStore().catch(error => log('StoreKit refresh', error)); }
});

// This file is compiled by esbuild into www/native-monetization.js.
// TestFlight uses demo ads (GK_TEST_ADS=1). Production requires GK_TEST_ADS=0.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import * as CdvPurchasePkg from 'capacitor-plugin-cdv-purchase';

const IOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
const TEST_ADS = __GK_TEST_ADS__;
const VIP_ID = 'vip_lifetime';

const GEM_PACKS = [
  { id: 'gems_50', baseGems: 50, bonusGems: 0, totalGems: 50, defaultPrice: '75 TL' },
  { id: 'gems_100', baseGems: 100, bonusGems: 15, totalGems: 115, defaultPrice: '150 TL' },
  { id: 'gems_200', baseGems: 200, bonusGems: 40, totalGems: 240, defaultPrice: '300 TL' },
  { id: 'gems_400', baseGems: 400, bonusGems: 100, totalGems: 500, defaultPrice: '600 TL' },
  { id: 'gems_500', baseGems: 500, bonusGems: 150, totalGems: 650, defaultPrice: '750 TL' },
  { id: 'gems_1000', baseGems: 1000, bonusGems: 350, totalGems: 1350, defaultPrice: '1.500 TL' },
  { id: 'gems_5000', baseGems: 5000, bonusGems: 2000, totalGems: 7000, defaultPrice: '7.500 TL' },
  { id: 'gems_10000', baseGems: 10000, bonusGems: 5000, totalGems: 15000, defaultPrice: '15.000 TL' }
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
let iapReady = false;
let iapInitializing = null;
let vipOwned = false;
let vipPrice = '';
let gemPrices = {};
let vipChangeListener = null;
let vipPriceListener = null;
let gemPriceListener = null;
let gemGrantListener = null;
const processedTxIds = new Set();

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
  if (CdvPurchasePkg && CdvPurchasePkg.default && CdvPurchasePkg.default.store) {
    return CdvPurchasePkg.default;
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
  if (!IOS) return false;
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
          })
          .receiptUpdated(() => refreshVip())
          .approved(async transaction => {
            try {
              const txKey = transaction.transactionId || `${Date.now()}_${Math.random()}`;
              const hasVip = transaction.products?.some(item => item.id === VIP_ID);
              const gemItems = (transaction.products || [])
                .map(item => GEM_PACK_MAP[item.id])
                .filter(Boolean);

              await transaction.finish();

              if (hasVip) {
                vipOwned = true;
                emitOwned();
                refreshVip();
              }

              if (gemItems.length > 0 && !processedTxIds.has(txKey)) {
                processedTxIds.add(txKey);
                gemItems.forEach(pack => {
                  if (typeof gemGrantListener === 'function') {
                    gemGrantListener(pack.totalGems, pack);
                  }
                });
              }
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
      }

      await store.initialize([Platform.APPLE_APPSTORE]);
      try { await store.update(); } catch (_) {}

      iapReady = true;
      report('store', 'SDK hazır');

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

async function prepareInterstitial() {
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

async function prepareRewarded() {
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

async function initializeAds() {
  if (!IOS) return false;
  if (initializedAds) return true;

  report('ads', 'Başlatılıyor');

  try {
    await AdMob.initialize({
      initializeForTesting: TEST_ADS
    });
    initializedAds = true;
    report('ads', 'SDK hazır, izin kontrolü');

    try {
      let consent = await AdMob.requestConsentInfo();
      if (
        consent &&
        consent.isConsentFormAvailable &&
        consent.status === AdmobConsentStatus.REQUIRED
      ) {
        consent = await AdMob.showConsentForm();
      }
    } catch (consentErr) {
      console.warn('[Gezegeni Koru] UMP consent form skipped:', consentErr);
    }

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

  async buyVIP() {
    if (!IOS) {
      throw new Error(
        'Apple satın alma yalnızca iOS uygulamasında yapılabilir.'
      );
    }

    if (!iapReady) {
      await initializeIAP();
    }

    if (!iapReady) {
      throw new Error(
        'App Store bağlantısı hazırlanıyor, lütfen birkaç saniye sonra tekrar deneyin.'
      );
    }

    if (refreshVip()) return true;

    const cdv = getCdvPurchase();
    let prod = cdv.store.get(VIP_ID, cdv.Platform.APPLE_APPSTORE) || cdv.store.get(VIP_ID);
    if (!prod?.getOffer()) {
      try { await cdv.store.update(); } catch (_) {}
      prod = cdv.store.get(VIP_ID, cdv.Platform.APPLE_APPSTORE) || cdv.store.get(VIP_ID);
    }

    const offer = prod?.getOffer();

    if (!offer) {
      throw new Error(
        'VIP ürünü (vip_lifetime) App Store’dan yüklenemedi. App Store Connect’te vip_lifetime ürününün ve Paid Apps sözleşmesinin aktif olduğundan emin olun.'
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

  async buyGemPack(packId) {
    const pack = GEM_PACK_MAP[packId];
    if (!pack) {
      throw new Error('Geçersiz elmas paketi seçildi.');
    }
    if (!IOS) {
      throw new Error('Elmas satın alımı yalnızca iOS App Store üzerinden yapılabilir.');
    }
    if (!iapReady) {
      await initializeIAP();
    }
    if (!iapReady) {
      throw new Error('App Store bağlantısı hazırlanıyor, lütfen birkaç saniye sonra tekrar deneyin.');
    }

    const cdv = getCdvPurchase();
    let prod = cdv.store.get(packId, cdv.Platform.APPLE_APPSTORE) || cdv.store.get(packId);
    if (!prod?.getOffer()) {
      try { await cdv.store.update(); } catch (_) {}
      prod = cdv.store.get(packId, cdv.Platform.APPLE_APPSTORE) || cdv.store.get(packId);
    }

    const offer = prod?.getOffer();
    if (!offer) {
      throw new Error(
        `Elmas paketi (${packId}) App Store’dan yüklenemedi. App Store Connect’te ürünün tanımlı olduğundan emin olun.`
      );
    }

    const outcome = await offer.order();
    if (outcome?.isError) {
      throw new Error(outcome.message || 'Elmas satın alma işlemi tamamlanamadı.');
    }
    return true;
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
    if (!IOS || (!forceTest && vipOwned) || interstitialBusy) return false;

    if (!initializedAds) await initializeAds();
    if (!interstitialReady) await prepareInterstitial();
    if (!interstitialReady) return false;

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
    if (!IOS || rewardedBusy) return false;

    if (!initializedAds) await initializeAds();
    if (!rewardedReady) await prepareRewarded();
    if (!rewardedReady) return false;

    report('rewarded', 'Gösteriliyor');

    rewardedBusy = true;
    rewardedReady = false;

    try {
      const earned = await AdMob.showRewardVideoAd();
      return Boolean(earned);
    } catch (e) {
      log('Reward display', e);
      return false;
    } finally {
      rewardedBusy = false;
      void prepareRewarded();
    }
  }
};

if (IOS) {
  window.addEventListener('load', () => {
    void initializeIAP();
    void initializeAds();
  });
  document.addEventListener('deviceready', () => {
    void initializeIAP();
    void initializeAds();
  });
}

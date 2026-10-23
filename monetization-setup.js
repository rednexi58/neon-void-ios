// This file is compiled by esbuild into www/native-monetization.js.
// TestFlight uses demo ads (GK_TEST_ADS=1). Production requires GK_TEST_ADS=0.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import * as CdvPurchasePkg from 'capacitor-plugin-cdv-purchase';

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
let iapInitializing = null;
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

    // Wrap UMP consent in its own try/catch so missing GDPR form in AdMob console NEVER blocks ads!
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
      await initializeIAP();
    }

    if (!iapReady) {
      throw new Error(
        'App Store bağlantısı henüz hazır değil. TEST panelinden StoreKit durumunu kontrol edin.'
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

// TestFlight diagnostic UI
if (IOS && TEST_ADS) {
  const buildPanel = () => {
    if (document.getElementById('gk-monetization-test')) {
      return;
    }

    const root = document.createElement('div');
    root.id = 'gk-monetization-test';

    let savedPos = null;
    try {
      savedPos = JSON.parse(localStorage.getItem('gk_test_pos') || 'null');
    } catch (_) {}
    const initLeft = savedPos && typeof savedPos.left === 'number'
      ? Math.max(4, Math.min(window.innerWidth - 95, savedPos.left))
      : Math.max(8, window.innerWidth - 102);
    const initTop = savedPos && typeof savedPos.top === 'number'
      ? Math.max(44, Math.min(window.innerHeight - 54, savedPos.top))
      : 118;

    root.style.cssText =
      `position:fixed;left:${initLeft}px;top:${initTop}px;` +
      'z-index:2147483000;' +
      'font-family:Arial,sans-serif;font-size:12px;touch-action:none;user-select:none;-webkit-user-select:none;';

    root.innerHTML = `
      <button id="gk-open-diagnostics"
        style="border:1.5px solid #38bdf8;
        background:linear-gradient(180deg,#123854,#091e32);color:#fff;
        border-radius:999px;padding:6px 11px;
        font-weight:bold;box-shadow:0 4px 14px rgba(0,0,0,0.6);
        cursor:grab;touch-action:none;display:flex;align-items:center;gap:4px">
        <span>✋</span><span>🧪 TEST</span>
      </button>

      <section id="gk-diagnostics-box"
        style="display:none;position:fixed;left:50%;top:50%;
        transform:translate(-50%,-50%);
        width:min(88vw,320px);max-height:72vh;
        overflow:auto;padding:12px;
        background:#081a2cf5;
        border:1.5px solid #38bdf8;
        color:#fff;border-radius:14px;
        box-shadow:0 12px 36px rgba(0,0,0,0.85)">

        <div id="gk-diagnostics-header" style="display:flex;align-items:center;justify-content:space-between;font-weight:bold;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #1e3a5f">
          <span>🧪 Gezegeni Koru — Test Paneli</span>
          <button id="gk-close-diagnostics" style="background:#1e293b;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:2px 8px;font-weight:bold">✕</button>
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

    const toggleBtn = root.querySelector('#gk-open-diagnostics');
    const closeBtn = root.querySelector('#gk-close-diagnostics');
    let dragActive = false;
    let dragMoved = false;
    let startX = 0, startY = 0, origLeft = initLeft, origTop = initTop;

    toggleBtn.addEventListener('pointerdown', (ev) => {
      dragActive = true;
      dragMoved = false;
      startX = ev.clientX;
      startY = ev.clientY;
      const rect = root.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      try { toggleBtn.setPointerCapture(ev.pointerId); } catch (_) {}
    });

    toggleBtn.addEventListener('pointermove', (ev) => {
      if (!dragActive) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) > 6) {
        dragMoved = true;
      }
      if (dragMoved) {
        const nextL = Math.max(4, Math.min(window.innerWidth - 92, origLeft + dx));
        const nextT = Math.max(40, Math.min(window.innerHeight - 48, origTop + dy));
        root.style.left = `${Math.round(nextL)}px`;
        root.style.top = `${Math.round(nextT)}px`;
        root.style.right = 'auto';
      }
    });

    const endDrag = (ev) => {
      if (!dragActive) return;
      dragActive = false;
      try { toggleBtn.releasePointerCapture(ev.pointerId); } catch (_) {}
      if (dragMoved) {
        try {
          const rect = root.getBoundingClientRect();
          localStorage.setItem('gk_test_pos', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
        } catch (_) {}
      } else {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        refreshDiagnosticsUI();
      }
    };

    toggleBtn.addEventListener('pointerup', endDrag);
    toggleBtn.addEventListener('pointercancel', () => { dragActive = false; });

    if (closeBtn) {
      closeBtn.onclick = () => {
        panel.style.display = 'none';
      };
    }

    root.querySelector('#gk-ad-reload').onclick = async () => {
      result.textContent = 'Yeniden yükleniyor…';

      if (!initializedAds) await initializeAds();
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
        await window.GameMonetization.showInterstitial(true);

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
  document.addEventListener('deviceready', () => {
    void initializeIAP();
    void initializeAds();
  });
}

// This small file is compiled by esbuild into www/native-monetization.js.
// TestFlight builds use demo ads. App Store builds require GK_TEST_ADS=0.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';

const IOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
const TEST_ADS = __GK_TEST_ADS__;
const VIP_ID = 'vip_lifetime';
const ADS = {
  interstitial: TEST_ADS ? 'ca-app-pub-3940256099942544/4411468910' : 'ca-app-pub-6370997467091906/2718709749',
  rewarded: TEST_ADS ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-6370997467091906/1556215045',
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

const log = (name, err) => console.warn('[Gezegeni Koru]', name, err || '');
const emitOwned = () => { if (typeof vipChangeListener === 'function') vipChangeListener(vipOwned); };
const emitPrice = () => { if (typeof vipPriceListener === 'function') vipPriceListener(vipPrice); };
const refreshVip = () => {
  if (!IOS || !iapReady) return false;
  try {
    const owned = Boolean(store.owned(VIP_ID));
    if (owned !== vipOwned) { vipOwned = owned; emitOwned(); }
    return owned;
  } catch (error) { log('VIP entitlement read', error); return false; }
};

async function initializeIAP() {
  if (!IOS) return;
  try {
    store.register({ id: VIP_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE });
    store.when()
      .productUpdated(product => {
        if (product.id === VIP_ID) {
          vipPrice = product.getOffer()?.pricingPhases?.[0]?.price || product.pricing?.price || '';
          emitPrice();
          refreshVip();
        }
      })
      .receiptUpdated(() => refreshVip())
      .approved(async transaction => {
        // StoreKit 2 delivers Apple's authorized transaction after the native purchase sheet.
        // Do NOT unlock based on a button press or localStorage.
        if (!transaction.products?.some(item => item.id === VIP_ID)) return;
        try {
          // No remote receipt validator is configured; StoreKit 2 local ownership is our MVP source.
          await transaction.finish();
          // StoreKit 2 supplies the authorized, current entitlement.
          vipOwned = true;
          emitOwned();
          refreshVip();
        } catch (e) { log('Apple purchase finish', e); }
      })
      .verified(receipt => { receipt.finish(); refreshVip(); })
      .finished(() => refreshVip())
      .cancelled(() => {});
    store.error(error => log('StoreKit error', error));
    await store.initialize([Platform.APPLE_APPSTORE]);
    iapReady = true;
    refreshVip();
  } catch (error) { log('StoreKit initialization', error); }
}

async function prepareInterstitial() {
  if (!initializedAds || interstitialReady || interstitialBusy) return;
  try {
    await AdMob.prepareInterstitial({adId: ADS.interstitial, isTesting: TEST_ADS});
    interstitialReady = true;
  } catch(e) { interstitialReady = false; log('Interstitial preload', e); }
}
async function prepareRewarded() {
  if (!initializedAds || rewardedReady || rewardedBusy) return;
  try {
    await AdMob.prepareRewardVideoAd({adId: ADS.rewarded, isTesting: TEST_ADS});
    rewardedReady = true;
  } catch(e) { rewardedReady = false; log('Reward preload', e); }
}
async function initializeAds() {
  if (!IOS) return;
  try {
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    // Fail closed when the SDK explicitly forbids ads after the consent flow.
    if (consent.canRequestAds === false) return;
    await AdMob.initialize();
    initializedAds = true;
    await Promise.allSettled([prepareInterstitial(), prepareRewarded()]);
  } catch (e) { log('AdMob consent/initialization', e); }
}

window.GameMonetization = {
  get isIOS() {return IOS;},
  get vipPrice() {return vipPrice;},
  get vipOwned() {return vipOwned;},
  onVipChange(callback) { vipChangeListener = callback; if (vipOwned) emitOwned(); },
  onVipPrice(callback) { vipPriceListener = callback; if (vipPrice) emitPrice(); },
  async buyVIP() {
    if (!IOS) throw new Error('Apple satın alma yalnızca iOS uygulamasında yapılabilir.');
    if (!iapReady) throw new Error('App Store bağlantısı henüz hazır değil.');
    if (refreshVip()) return true;
    const offer = store.get(VIP_ID, Platform.APPLE_APPSTORE)?.getOffer();
    if (!offer) throw new Error('VIP ürünü App Store’dan yüklenemedi.');
    const outcome = await offer.order();
    if (outcome?.isError) throw new Error(outcome.message || 'Satın alma tamamlanamadı.');
    // The purchase sheet closing is not proof of payment: approved/current entitlements decide.
    return refreshVip();
  },
  async restoreVIP() {
    if (!IOS || !iapReady) throw new Error('App Store bağlantısı henüz hazır değil.');
    const result = await store.restorePurchases();
    if (result?.isError) throw new Error(result.message || 'Geri yükleme başarısız.');
    return refreshVip();
  },
  async showInterstitial() {
    if (!IOS || vipOwned || !initializedAds || !interstitialReady || interstitialBusy) return false;
    interstitialBusy = true;
    interstitialReady = false;
    try { await AdMob.showInterstitial(); return true; }
    catch(e) { log('Interstitial display', e); return false; }
    finally { interstitialBusy = false; void prepareInterstitial(); }
  },
  async showRewarded() {
    if (!IOS || !initializedAds || !rewardedReady || rewardedBusy) return false;
    rewardedBusy = true;
    rewardedReady = false;
    try {
      // Resolves only when Google reports that the player earned the reward.
      const earned = await AdMob.showRewardVideoAd();
      return Boolean(earned && (earned.amount > 0 || earned.type));
    } catch(e) { log('Reward display', e); return false; }
    finally { rewardedBusy = false; void prepareRewarded(); }
  }
};

if (IOS) {
  // DOM starts first, so UI is always visible even if remote consent / SDK fails.
  window.addEventListener('load', () => {
    void initializeIAP();
    void initializeAds();
  });
}

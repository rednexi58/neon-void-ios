// Preview-only fallback. Replaced by npm run build:web on Codemagic.
window.GameMonetization = {
  get vipOwned() { return false; },
  get vipPrice() { return ''; },
  get gemPrices() { return {}; },
  onVipChange() {},
  onVipPrice() {},
  onGemPrices() {},
  onGemGranted() {},
  async buyVIP() { throw new Error('VIP yalnızca gerçek iOS StoreKit bağlantısı ile satın alınabilir.'); },
  async buyGemPack() { throw new Error('Elmas paketleri yalnızca gerçek iOS App Store bağlantısı ile satın alınabilir.'); },
  async restoreVIP() { throw new Error('Bu özellik yalnızca iOS uygulamasında çalışır.'); },
  async showInterstitial() { return false; },
  async showRewarded() { return false; }
};

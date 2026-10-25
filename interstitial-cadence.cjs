function isInterstitialDue(state) {
  return !state.removeAds && !state.endlessMode && state.waveIndex === 0 &&
    state.adClears - (state.lastInterstitialClear || 0) >= 3;
}
module.exports = { isInterstitialDue };

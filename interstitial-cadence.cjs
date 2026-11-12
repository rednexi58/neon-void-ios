// Forced interstitials appear only at a natural break: right after a level is won,
// once every LEVELS_PER_INTERSTITIAL victories. Never during a fight, never for VIP,
// never in endless mode (it has no level end).
const LEVELS_PER_INTERSTITIAL = 2;

function isInterstitialDue(state) {
  return !state.removeAds && !state.endlessMode &&
    state.adClears - (state.lastInterstitialClear || 0) >= LEVELS_PER_INTERSTITIAL;
}

module.exports = { isInterstitialDue, LEVELS_PER_INTERSTITIAL };

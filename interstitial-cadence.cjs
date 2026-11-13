// Forced interstitials appear only at a natural break: right after a level is won.
// Rules (player complaints in 1.3: ads felt too frequent and too long):
//   - never before the player has reached level FIRST_AD_LEVEL (first sessions stay ad-free),
//   - at most once every LEVELS_PER_INTERSTITIAL victories,
//   - at least MIN_SECONDS_BETWEEN_ADS apart, so quick levels do not stack ads back to back,
//   - never during a fight, never for VIP, never in endless mode (it has no level end).
const FIRST_AD_LEVEL = 6;
const LEVELS_PER_INTERSTITIAL = 3;
const MIN_SECONDS_BETWEEN_ADS = 180;

function secondsSinceLastAd(state, nowMs) {
  const last = Number(state.lastInterstitialAt) || 0;
  if (last <= 0 || nowMs < last) return Infinity; // never shown, or the device clock moved back
  return (nowMs - last) / 1000;
}

function isInterstitialDue(state, nowMs = Date.now()) {
  if (state.removeAds || state.endlessMode) return false;
  if ((Number(state.level) || 0) < FIRST_AD_LEVEL) return false;
  if (state.adClears - (state.lastInterstitialClear || 0) < LEVELS_PER_INTERSTITIAL) return false;
  return secondsSinceLastAd(state, nowMs) >= MIN_SECONDS_BETWEEN_ADS;
}

module.exports = { isInterstitialDue, FIRST_AD_LEVEL, LEVELS_PER_INTERSTITIAL, MIN_SECONDS_BETWEEN_ADS };

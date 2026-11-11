/*
 * Gezegeni Koru — wave flow rules.
 *
 * Decides WHEN the next wave starts; the game decides WHAT spawns. Kept free of DOM, canvas and
 * audio so the rules can be unit tested (tests/wave-flow.test.cjs) and tuned in one place.
 *
 * Rules
 *  - Before the first wave a countdown runs (firstWaveDelay). During the tutorial the first wave
 *    is held until the player starts it, so new players are never rushed.
 *  - Once every launched enemy is gone, the next wave counts down (betweenWaveDelay) and starts
 *    on its own.
 *  - The player may call the next wave at ANY time, even while enemies are on the field; waves
 *    then overlap. Calling early pays an energy bonus:
 *      countdown running  -> bonusPerSecond for every whole second skipped
 *                            (capped at firstWaveBonusCap before the first wave)
 *      enemies on field   -> midWaveBonus
 *  - A campaign level is complete when all waves were launched and the field is clear.
 */
(function (root) {
  'use strict';

  var DEFAULTS = Object.freeze({
    firstWaveDelay: 15,
    betweenWaveDelay: 7,
    bonusPerSecond: 2,
    firstWaveBonusCap: 10,
    midWaveBonus: 20
  });

  function createWaveFlow(options) {
    var cfg = Object.assign({}, DEFAULTS, (options && options.config) || {});
    var totalWaves = 0;
    var endless = false;
    var launched = 0;
    var phase = 'countdown';      // 'countdown' | 'held' | 'running'
    var countdown = cfg.firstWaveDelay;

    function reset(setup) {
      totalWaves = Math.max(0, Math.floor((setup && setup.totalWaves) || 0));
      endless = Boolean(setup && setup.endless);
      launched = 0;
      if (setup && setup.holdFirstWave) {
        phase = 'held';
        countdown = 0;
      } else {
        phase = 'countdown';
        countdown = cfg.firstWaveDelay;
      }
    }

    function hasMoreWaves() {
      return endless || launched < totalWaves;
    }

    // Advances time. Returns true exactly when a wave should start automatically.
    function tick(dt, fieldClear) {
      if (!hasMoreWaves() || phase === 'held') return false;
      if (phase === 'running') {
        if (fieldClear) {
          phase = 'countdown';
          countdown = cfg.betweenWaveDelay;
        }
        return false;
      }
      countdown -= Math.max(0, dt);
      return countdown <= 0;
    }

    // Energy paid if the player calls the next wave right now.
    function earlyBonus() {
      if (!hasMoreWaves() || phase === 'held') return 0;
      if (phase === 'running') return cfg.midWaveBonus;
      var seconds = Math.max(0, Math.floor(countdown));
      var bonus = seconds * cfg.bonusPerSecond;
      return launched === 0 ? Math.min(cfg.firstWaveBonusCap, bonus) : bonus;
    }

    // Marks the next wave as started and returns its 0-based index, or null when none is left.
    function launch() {
      if (!hasMoreWaves()) return null;
      var index = launched;
      launched += 1;
      phase = 'running';
      countdown = 0;
      return index;
    }

    function isComplete(fieldClear) {
      return !endless && launched >= totalWaves && launched > 0 && Boolean(fieldClear);
    }

    return {
      reset: reset,
      tick: tick,
      earlyBonus: earlyBonus,
      launch: launch,
      isComplete: isComplete,
      hasMoreWaves: hasMoreWaves,
      get launched() { return launched; },
      get phase() { return phase; },
      get secondsLeft() { return phase === 'countdown' ? Math.max(0, countdown) : null; },
      config: cfg
    };
  }

  var api = { createWaveFlow: createWaveFlow, DEFAULTS: DEFAULTS };
  root.WaveFlow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

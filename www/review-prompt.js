/*
 * ReviewPrompt — decides when to ask for an App Store rating.
 *
 * Asks only at a happy moment: right after a won level with at least 2 stars, never on the
 * same victory as a forced ad, and only at three progress milestones (levels 3, 10, 25),
 * at least 4 days apart. iOS itself shows the sheet at most 3 times a year, so these rules
 * spend those chances on players who are clearly enjoying the game.
 */
(function (root) {
  "use strict";

  var MILESTONES = Object.freeze([3, 10, 25]);
  var MIN_STARS = 2;
  var MIN_DAYS_BETWEEN = 4;
  var DAY_MS = 24 * 60 * 60 * 1000;

  /**
   * @param {{level:number, stars:number, adShown:boolean, now:number,
   *          asked:number, lastAskedAt:number}} ctx
   */
  function shouldAsk(ctx) {
    var asked = Math.max(0, ctx.asked | 0);
    if (asked >= MILESTONES.length) return false;
    if (ctx.adShown) return false;
    if ((ctx.stars | 0) < MIN_STARS) return false;
    if ((ctx.level | 0) < MILESTONES[asked]) return false;
    if (ctx.lastAskedAt && ctx.now - ctx.lastAskedAt < MIN_DAYS_BETWEEN * DAY_MS) return false;
    return true;
  }

  var api = Object.freeze({ MILESTONES: MILESTONES, MIN_STARS: MIN_STARS, MIN_DAYS_BETWEEN: MIN_DAYS_BETWEEN, shouldAsk: shouldAsk });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ReviewPrompt = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null));

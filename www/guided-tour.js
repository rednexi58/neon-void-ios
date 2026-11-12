/*
 * GuidedTour — spotlight walkthrough that can step through any screen,
 * including modals opened mid-tour.
 *
 * Why a separate module: the battle trainer is a banner wired into combat
 * events; a menu tour needs the opposite (dim everything, point at one
 * element, open and close screens between steps). Keeping it generic means
 * the lobby tour is just data, and later tours (e.g. new features) reuse it.
 *
 * Step shape:
 *   { target: () => Element | null,   // what to spotlight (null = centred card)
 *     title: string, body: string,     // body may hold trusted inline HTML
 *     enter?: () => void,              // runs before the step is shown
 *     leave?: () => void }             // runs when moving past the step
 */
(function (root) {
  "use strict";

  var PAD = 6;
  var GAP = 12;
  var active = null;

  function el(tag, cls, parent) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  /**
   * Where the card goes relative to the spotlight: below if there is room,
   * otherwise above, otherwise centred. Pure so it can be unit tested.
   */
  function placeCard(rect, cardH, viewH, viewW, cardW) {
    var w = Math.min(cardW, viewW - 24);
    var left = Math.max(12, Math.min(viewW - w - 12, (rect ? rect.left + rect.width / 2 : viewW / 2) - w / 2));
    if (!rect) return { top: Math.max(12, (viewH - cardH) / 2), left: left, width: w, side: "center" };
    var below = viewH - (rect.top + rect.height + PAD + GAP);
    var above = rect.top - PAD - GAP;
    if (below >= cardH) return { top: rect.top + rect.height + PAD + GAP, left: left, width: w, side: "below" };
    if (above >= cardH) return { top: rect.top - PAD - GAP - cardH, left: left, width: w, side: "above" };
    return { top: Math.max(12, viewH - cardH - 12), left: left, width: w, side: "overlay" };
  }

  function start(opts) {
    if (active) active.stop(false);
    var steps = opts.steps || [];
    var labels = opts.labels || {};
    var index = -1;
    var timers = [];

    var overlay = el("div", "gk-tour", root.document.body);
    var spot = el("div", "gk-tour__spot", overlay);
    var card = el("div", "gk-tour__card", overlay);
    var count = el("div", "gk-tour__count", card);
    var title = el("div", "gk-tour__title", card);
    var body = el("div", "gk-tour__body", card);
    var actions = el("div", "gk-tour__actions", card);
    var skip = el("button", "gk-tour__skip", actions);
    var next = el("button", "gk-tour__next", actions);
    skip.textContent = labels.skip || "Skip";

    overlay.addEventListener("click", function (e) { e.stopPropagation(); });
    skip.addEventListener("click", function () { if (opts.onSound) opts.onSound(); stop(false); });
    next.addEventListener("click", function () { if (opts.onSound) opts.onSound(); go(index + 1); });

    function current() { return steps[index]; }

    function layout() {
      var step = current();
      if (!step) return;
      var target = step.target ? step.target() : null;
      var vw = root.innerWidth, vh = root.innerHeight;
      var rect = null;
      if (target && target.getBoundingClientRect) {
        var r = target.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      }
      if (rect) {
        spot.style.display = "block";
        spot.style.top = (rect.top - PAD) + "px";
        spot.style.left = (rect.left - PAD) + "px";
        spot.style.width = (rect.width + PAD * 2) + "px";
        spot.style.height = (rect.height + PAD * 2) + "px";
        overlay.classList.remove("gk-tour--dim");
      } else {
        spot.style.display = "none";
        overlay.classList.add("gk-tour--dim");
      }
      var pos = placeCard(rect, card.offsetHeight || 180, vh, vw, 360);
      card.style.width = pos.width + "px";
      card.style.left = pos.left + "px";
      card.style.top = pos.top + "px";
    }

    function go(i) {
      var prev = current();
      if (prev && prev.leave) prev.leave();
      if (i >= steps.length) { stop(true); return; }
      index = i;
      var step = current();
      if (step.enter) step.enter();
      count.textContent = (labels.stepOf ? labels.stepOf(index + 1, steps.length) : (index + 1) + "/" + steps.length);
      title.textContent = step.title;
      body.innerHTML = step.body;
      next.textContent = index === steps.length - 1 ? (labels.done || "Done") : (labels.next || "Next");
      skip.style.visibility = index === steps.length - 1 ? "hidden" : "visible";
      var target = step.target ? step.target() : null;
      // Only scroll inside scrollable panels (menus); fixed shells such as the
      // lobby must never be scrolled, or the whole screen shifts.
      if (target && target.scrollIntoView && !(target.closest && target.closest("[data-tour-noscroll]"))) {
        try { target.scrollIntoView({ block: "center", behavior: "auto" }); } catch (_) { target.scrollIntoView(); }
      }
      layout();
      // Modals fade/slide in; measure again once they have settled.
      timers.push(root.setTimeout(layout, 120), root.setTimeout(layout, 360));
    }

    function stop(completed) {
      var step = current();
      if (step && step.leave && !completed) step.leave();
      timers.forEach(function (t) { root.clearTimeout(t); });
      root.removeEventListener("resize", layout);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      active = null;
      if (opts.onFinish) opts.onFinish(!!completed);
    }

    root.addEventListener("resize", layout);
    active = { stop: stop, next: function () { go(index + 1); }, get index() { return index; } };
    go(0);
    return active;
  }

  var api = { start: start, placeCard: placeCard, isActive: function () { return !!active; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GuidedTour = api;
})(typeof window !== "undefined" ? window : globalThis);

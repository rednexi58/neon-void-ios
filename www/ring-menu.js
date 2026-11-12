/*
 * RingMenu — Kingdom Rush style radial menu that opens around a build plot.
 *
 * The game hands it a screen point and a list of items; the menu lays the
 * buttons out on a circle, keeps the whole ring inside the battlefield and
 * reports the choice. It knows nothing about towers, so the same widget
 * serves "build here", "upgrade / sell" and "pick a branch".
 *
 * Item shape: { id, icon (trusted SVG/HTML), label, cost, disabled, dim,
 *               accent, onSelect() }
 */
(function (root) {
  "use strict";

  var BTN = 52;          // button diameter (px)
  var EDGE = 6;          // min gap to container edge

  /**
   * Button centres on a circle around (cx, cy). Starts at the top and goes
   * clockwise; with few items the arc is tightened so they stay together.
   * The centre is nudged so every button fits inside width x height.
   * Pure for testing.
   */
  function layoutRing(cx, cy, count, width, height, radius) {
    var r = radius || (count <= 3 ? 60 : count <= 5 ? 70 : 90);
    var arc = count <= 2 ? Math.PI * 0.55 : count <= 4 ? Math.PI * 1.15 : Math.PI * 2;
    var full = arc >= Math.PI * 2 - 1e-6;
    var step = count > 1 ? arc / (full ? count : count - 1) : 0;
    var start = -Math.PI / 2 - (full ? 0 : arc / 2);
    var half = BTN / 2 + EDGE;
    var reach = r + half;
    var ox = Math.max(reach, Math.min(width - reach, cx));
    var oy = Math.max(reach, Math.min(height - reach - 16, cy));
    var pts = [];
    for (var i = 0; i < count; i++) {
      var a = start + step * i;
      pts.push({ x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r });
    }
    return { cx: ox, cy: oy, radius: r, points: pts };
  }

  function create(container) {
    var doc = (typeof document !== "undefined" && document) || root.document;
    var layer = doc.createElement("div");
    layer.className = "gk-ring hidden";
    layer.setAttribute("aria-hidden", "true");
    var halo = doc.createElement("div");
    halo.className = "gk-ring__halo";
    var title = doc.createElement("div");
    title.className = "gk-ring__title";
    layer.appendChild(halo);
    layer.appendChild(title);
    container.appendChild(layer);
    var buttons = [];
    var current = null;
    var openedAt = 0;

    function close() {
      if (!current) return;
      current = null;
      layer.classList.add("hidden");
      layer.setAttribute("aria-hidden", "true");
      buttons.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
      buttons = [];
    }

    function paintButton(btn, item) {
      btn.className = "gk-ring__btn" + (item.disabled ? " is-locked" : "") + (item.dim ? " is-dim" : "");
      if (item.accent) btn.style.setProperty("--ring-accent", item.accent);
      btn.innerHTML = '<span class="gk-ring__icon">' + (item.icon || "") + "</span>" +
        (item.cost != null ? '<span class="gk-ring__cost">' + item.cost + "</span>" : "") +
        (item.label ? '<span class="gk-ring__label">' + item.label + "</span>" : "");
      btn.setAttribute("aria-label", item.aria || item.label || item.id);
    }

    function open(cx, cy, items, opts) {
      close();
      opts = opts || {};
      current = { items: items, key: opts.key };
      openedAt = Date.now();
      var w = container.clientWidth, h = container.clientHeight;
      var lay = layoutRing(cx, cy, items.length, w, h, opts.radius);
      halo.style.left = (lay.cx - lay.radius - 8) + "px";
      halo.style.top = (lay.cy - lay.radius - 8) + "px";
      halo.style.width = halo.style.height = (lay.radius * 2 + 16) + "px";
      title.textContent = opts.title || "";
      title.style.left = lay.cx + "px";
      title.style.top = (lay.cy - 9) + "px";
      title.style.display = opts.title ? "block" : "none";
      items.forEach(function (item, i) {
        var btn = doc.createElement("button");
        btn.type = "button";
        btn.dataset.id = item.id;
        paintButton(btn, item);
        btn.style.left = (lay.points[i].x - BTN / 2) + "px";
        btn.style.top = (lay.points[i].y - BTN / 2) + "px";
        btn.style.animationDelay = (i * 18) + "ms";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          // Ignore the tail of the tap that opened the ring.
          if (Date.now() - openedAt < 120) return;
          var it = current && current.items[i];
          if (it && it.onSelect) it.onSelect();
        });
        btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        layer.appendChild(btn);
        buttons.push(btn);
      });
      layer.classList.remove("hidden");
      layer.setAttribute("aria-hidden", "false");
    }

    /** Repaint costs and affordability without rebuilding (keeps taps intact). */
    function update(items) {
      if (!current || items.length !== buttons.length) return false;
      current.items = items;
      items.forEach(function (item, i) { paintButton(buttons[i], item); });
      return true;
    }

    return {
      open: open,
      close: close,
      update: update,
      isOpen: function () { return !!current; },
      key: function () { return current ? current.key : null; }
    };
  }

  var api = { create: create, layoutRing: layoutRing, BTN: BTN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RingMenu = api;
})(typeof window !== "undefined" ? window : globalThis);

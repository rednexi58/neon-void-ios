/*
 * WorldMap — Kingdom Rush style campaign map for the start lobby.
 *
 * The 200 campaign levels are laid out bottom-to-top along one winding
 * hyperlane, grouped into 8 sectors of 25 levels. Each sector borrows its
 * colours from SpaceTheme so the map previews the planets the player will
 * actually defend.
 *
 * Design notes
 *  - Layout and hit-testing are pure functions (exported for tests); the
 *    renderer only reads their output. Swapping the art never touches the
 *    geometry, and the geometry can be verified headlessly.
 *  - Scrolling is native (an overflow container with a tall spacer) so iOS
 *    keeps its momentum and rubber-band feel; the canvas behind it only
 *    paints the visible window, which keeps 200 nodes cheap.
 *  - The controller never reads game globals. The host passes `getState`
 *    and callbacks, so the module stays reusable and testable.
 */
(function (root) {
  "use strict";

  var LEVEL_COUNT = 200;
  var SECTOR_SIZE = 25;
  var NODE_SPACING = 86;
  var SECTOR_GAP = 132;
  var TOP_PAD = 150;
  var BOTTOM_PAD = 230;
  var NODE_R = 19;
  var BOSS_R = 25;
  var GOLD = "#f6b93b";
  var GOLD_DEEP = "#b7791f";

  var SECTORS = Object.freeze([
    { tr: "Öncü Kuşak", en: "Frontier Belt" },
    { tr: "Kızıl Sınır", en: "Crimson Rim" },
    { tr: "Buzul Geçidi", en: "Glacier Pass" },
    { tr: "Yeşil Nebula", en: "Verdant Nebula" },
    { tr: "Altın Halkalar", en: "Golden Rings" },
    { tr: "Kuantum Yarığı", en: "Quantum Rift" },
    { tr: "Fırtına Koridoru", en: "Storm Corridor" },
    { tr: "Karanlık Çekirdek", en: "Dark Core" }
  ]);

  // ---------------------------------------------------------------- pure

  function clampLevel(level) {
    var lv = Math.floor(Number(level) || 1);
    return Math.max(1, Math.min(LEVEL_COUNT, lv));
  }

  function sectorForLevel(level) {
    return Math.floor((clampLevel(level) - 1) / SECTOR_SIZE);
  }

  function isBossLevel(level) { return clampLevel(level) % 10 === 0; }

  /**
   * Node positions for every level. y grows downward (canvas space), level 1
   * sits at the bottom. Returns { nodes, height, sectors } where sectors holds
   * each sector's vertical band and banner position.
   */
  function layout(width, count) {
    var w = Math.max(280, Number(width) || 390);
    var n = Math.max(1, Math.min(LEVEL_COUNT, count || LEVEL_COUNT));
    var sectorCount = Math.ceil(n / SECTOR_SIZE);
    var height = TOP_PAD + BOTTOM_PAD + (n - 1) * NODE_SPACING + sectorCount * SECTOR_GAP;
    var amp = Math.min(w * 0.29, 150);
    var cx = w / 2;
    var nodes = [];
    var sectors = [];
    for (var i = 0; i < n; i++) {
      var s = Math.floor(i / SECTOR_SIZE);
      var y = height - BOTTOM_PAD - i * NODE_SPACING - (s + 1) * SECTOR_GAP + SECTOR_GAP * 0.35;
      var phase = s * 1.7;
      var x = cx + Math.sin(i * 0.62 + phase) * amp + Math.sin(i * 0.23 + phase * 0.5) * amp * 0.18;
      var lv = i + 1;
      nodes.push({ level: lv, x: x, y: y, sector: s, boss: lv % 10 === 0, r: lv % 10 === 0 ? BOSS_R : NODE_R });
    }
    for (var k = 0; k < sectorCount; k++) {
      var first = nodes[k * SECTOR_SIZE];
      var last = nodes[Math.min(n - 1, (k + 1) * SECTOR_SIZE - 1)];
      sectors.push({
        index: k,
        bannerY: first.y + SECTOR_GAP * 0.62,
        top: last.y - SECTOR_GAP * 0.5,
        bottom: first.y + SECTOR_GAP * 0.95,
        firstLevel: k * SECTOR_SIZE + 1,
        lastLevel: Math.min(n, (k + 1) * SECTOR_SIZE),
        planetSide: k % 2 === 0 ? 1 : -1
      });
    }
    return { nodes: nodes, height: height, sectors: sectors, width: w };
  }

  /** Level whose node contains (x, y), with a generous finger radius. */
  function hitTest(nodes, x, y, slop) {
    var best = null;
    var bestD = Infinity;
    var pad = slop == null ? 14 : slop;
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i];
      var dx = nd.x - x;
      var dy = nd.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= nd.r + pad && d < bestD) { best = nd; bestD = d; }
    }
    return best ? best.level : null;
  }

  /** scrollTop that puts `level` slightly below the middle of the viewport. */
  function scrollTopForLevel(map, level, viewportH) {
    var nd = map.nodes[clampLevel(level) - 1] || map.nodes[0];
    var target = nd.y - viewportH * 0.55;
    return Math.max(0, Math.min(map.height - viewportH, target));
  }

  function nodeStatus(level, unlocked, stars) {
    var lv = clampLevel(level);
    var un = clampLevel(unlocked);
    if (lv > un) return "locked";
    if ((stars && stars[lv]) > 0) return "done";
    return lv === un ? "current" : "done";
  }

  function sectorStars(sectorIndex, stars) {
    var got = 0;
    var first = sectorIndex * SECTOR_SIZE + 1;
    for (var lv = first; lv < first + SECTOR_SIZE; lv++) got += Math.min(3, (stars && stars[lv]) || 0);
    return { got: got, max: SECTOR_SIZE * 3 };
  }

  // ------------------------------------------------------------ renderer

  function seeded(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function paletteFor(sector) {
    var ST = root.SpaceTheme;
    if (ST && ST.PALETTES) return ST.PALETTES[sector % ST.PALETTES.length];
    return { sky: ["#030712", "#0b1736", "#13254d"], nebula: ["rgba(56,189,248,0.25)", "rgba(168,85,247,0.18)"],
      accent: "#38bdf8", backdrop: ["#93c5fd", "#1e3a8a"], kind: "ocean" };
  }

  var STAR_TILE = 1400;
  var starField = (function () {
    var rnd = seeded(7);
    var out = [];
    for (var i = 0; i < 170; i++) out.push({ x: rnd(), y: rnd() * STAR_TILE, r: rnd() < 0.85 ? 0.6 + rnd() * 0.7 : 1.3 + rnd() * 0.9, a: 0.25 + rnd() * 0.6, tw: rnd() * 6.28 });
    return out;
  })();

  function drawBackground(ctx, w, h, scroll, map, t) {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < map.sectors.length; i++) {
      var sec = map.sectors[i];
      var top = sec.top - scroll;
      var bottom = sec.bottom - scroll;
      if (bottom < -200 || top > h + 200) continue;
      var pal = paletteFor(i);
      var g = ctx.createLinearGradient(0, top - 160, 0, bottom + 160);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.3, pal.sky[1]);
      g.addColorStop(0.7, pal.sky[2]);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = g;
      ctx.fillRect(0, top - 160, w, bottom - top + 320);
      ctx.globalAlpha = 1;
      var rnd = seeded(31 + i * 17);
      for (var b = 0; b < 3; b++) {
        var nx = rnd() * w;
        var ny = top + rnd() * (bottom - top);
        var nr = w * (0.45 + rnd() * 0.4);
        var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, pal.nebula[b % 2]);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ng;
        ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }
    }
    var par = scroll * 0.35;
    for (var s = 0; s < starField.length; s++) {
      var st = starField[s];
      var y = ((st.y - par) % STAR_TILE + STAR_TILE) % STAR_TILE;
      for (var yy = y; yy < h; yy += STAR_TILE) {
        ctx.globalAlpha = st.a * (0.75 + Math.sin(t * 1.6 + st.tw) * 0.25);
        ctx.fillStyle = "#e8eeff";
        ctx.beginPath();
        ctx.arc(st.x * w, yy, st.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSectorPlanet(ctx, sec, w, scroll, t) {
    var pal = paletteFor(sec.index);
    var r = Math.min(w * 0.34, 160);
    var cy = (sec.top + sec.bottom) / 2 - scroll;
    var h = ctx.canvas.height;
    if (cy + r * 1.6 < 0 || cy - r * 1.6 > h) return;
    var side = sec.planetSide;
    var cx = side > 0 ? w + r * 0.12 : -r * 0.12;
    ctx.save();
    var halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.55);
    halo.addColorStop(0, pal.nebula[0]);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.55, 0, 6.2832); ctx.fill();
    if (pal.kind === "gas" || pal.kind === "quantum") drawRing(ctx, cx, cy, r, pal, true);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.clip();
    var body = ctx.createRadialGradient(cx - side * r * 0.45, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05);
    body.addColorStop(0, pal.backdrop[0]);
    body.addColorStop(0.5, pal.accent);
    body.addColorStop(1, pal.backdrop[1]);
    ctx.fillStyle = body;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (root.SpaceTheme && root.SpaceTheme.drawPlanetSurface) {
      ctx.save(); ctx.translate(cx, cy);
      root.SpaceTheme.drawPlanetSurface(ctx, pal.kind, r, t * 0.35, sec.index + 3, { glow: pal.backdrop[0], core: pal.backdrop[1], mid: pal.accent });
      ctx.restore();
    }
    // Night side faces the screen centre so the hyperlane reads over the dark half.
    var term = ctx.createLinearGradient(cx + side * r, cy, cx - side * r, cy);
    term.addColorStop(0, "rgba(5,8,22,0)");
    term.addColorStop(0.45, "rgba(5,8,22,0.25)");
    term.addColorStop(1, "rgba(5,8,22,0.9)");
    ctx.fillStyle = term;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = pal.backdrop[0];
    ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, side > 0 ? Math.PI * 0.55 : -Math.PI * 0.45, side > 0 ? Math.PI * 1.45 : Math.PI * 0.45, false); ctx.stroke();
    ctx.globalAlpha = 1;
    if (pal.kind === "gas" || pal.kind === "quantum") drawRing(ctx, cx, cy, r, pal, false);
    ctx.restore();
  }

  function drawRing(ctx, cx, cy, r, pal, back) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-0.35);
    ctx.beginPath();
    if (back) ctx.ellipse(0, 0, r * 1.55, r * 0.34, 0, Math.PI, Math.PI * 2);
    else ctx.ellipse(0, 0, r * 1.55, r * 0.34, 0, 0, Math.PI);
    ctx.strokeStyle = pal.backdrop[0]; ctx.globalAlpha = back ? 0.25 : 0.55; ctx.lineWidth = r * 0.09; ctx.stroke();
    ctx.strokeStyle = pal.accent; ctx.globalAlpha = back ? 0.2 : 0.45; ctx.lineWidth = r * 0.03; ctx.stroke();
    ctx.restore();
  }

  // ---- scenery: asteroids, moons, stations, satellites, crystals, wrecks
  var DECOR_KINDS = ["asteroid", "asteroid", "asteroid", "moon", "station", "satellite", "crystal", "wreck", "buoy"];
  var decorCache = { width: 0, items: [] };

  function buildDecor(map) {
    if (decorCache.width === map.width && decorCache.items.length) return decorCache.items;
    var items = [];
    for (var s = 0; s < map.sectors.length; s++) {
      var sec = map.sectors[s];
      var rnd = seeded(101 + s * 37);
      var planetR = Math.min(map.width * 0.34, 160);
      var pcx = sec.planetSide > 0 ? map.width + planetR * 0.12 : -planetR * 0.12;
      var pcy = (sec.top + sec.bottom) / 2;
      var placed = 0, tries = 0;
      while (placed < 28 && tries < 700) {
        tries++;
        var kind = DECOR_KINDS[Math.floor(rnd() * DECOR_KINDS.length)];
        var size = kind === "asteroid" ? 6 + rnd() * 13 : kind === "moon" ? 9 + rnd() * 8 : kind === "buoy" ? 7 : 12 + rnd() * 6;
        var x = 14 + rnd() * (map.width - 28);
        var y = sec.top + rnd() * (sec.bottom - sec.top);
        if (Math.hypot(x - pcx, y - pcy) < planetR * 1.25 + size) continue;
        if (Math.abs(y - sec.bannerY) < 46 + size) continue;
        var clear = true;
        for (var n = sec.firstLevel - 1; n < sec.lastLevel && clear; n++) {
          var nd = map.nodes[n];
          if (Math.hypot(nd.x - x, nd.y - y) < 46 + size) clear = false;
        }
        for (var k = 0; k < items.length && clear; k++) {
          if (Math.hypot(items[k].x - x, items[k].y - y) < items[k].s + size + 22) clear = false;
        }
        if (!clear) continue;
        items.push({ kind: kind, x: x, y: y, s: size, rot: rnd() * 6.28, spin: (rnd() - 0.5) * 0.3, seed: Math.floor(rnd() * 1000), sector: s });
        placed++;
      }
    }
    decorCache = { width: map.width, items: items };
    return items;
  }

  function drawDecor(ctx, map, scroll, h, t) {
    var items = buildDecor(map);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var y = it.y - scroll;
      if (y < -40 || y > h + 40) continue;
      var pal = paletteFor(it.sector);
      ctx.save();
      ctx.translate(it.x, y);
      DECOR_PAINTERS[it.kind](ctx, it, pal, t);
      ctx.restore();
    }
  }

  var DECOR_PAINTERS = {
    asteroid: function (ctx, it, pal, t) {
      var rnd = seeded(it.seed + 3);
      var n = 9;
      ctx.rotate(it.rot + t * it.spin);
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var a = i / n * 6.2832;
        var rr = it.s * (0.72 + rnd() * 0.3);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      var g = ctx.createLinearGradient(-it.s, -it.s, it.s, it.s);
      g.addColorStop(0, "#7d7a8c"); g.addColorStop(0.5, "#4a4757"); g.addColorStop(1, "#1d1b26");
      ctx.fillStyle = g; ctx.fill();
      ctx.globalAlpha = 0.18; ctx.fillStyle = pal.accent; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(15,13,22,0.55)";
      for (var c = 0; c < 3; c++) {
        ctx.beginPath(); ctx.arc((rnd() - 0.5) * it.s, (rnd() - 0.5) * it.s, it.s * (0.12 + rnd() * 0.12), 0, 6.2832); ctx.fill();
      }
    },
    moon: function (ctx, it, pal) {
      var g = ctx.createRadialGradient(-it.s * 0.4, -it.s * 0.4, 1, 0, 0, it.s);
      g.addColorStop(0, "#e5e7f0"); g.addColorStop(0.55, pal.backdrop[0]); g.addColorStop(1, "#151a33");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, it.s, 0, 6.2832); ctx.fill();
      var rnd = seeded(it.seed);
      ctx.fillStyle = "rgba(20,24,48,0.35)";
      for (var c = 0; c < 4; c++) { ctx.beginPath(); ctx.arc((rnd() - 0.5) * it.s * 1.1, (rnd() - 0.5) * it.s * 1.1, it.s * (0.1 + rnd() * 0.14), 0, 6.2832); ctx.fill(); }
    },
    station: function (ctx, it, pal, t) {
      ctx.rotate(it.rot * 0.2);
      ctx.strokeStyle = "#8b93b5"; ctx.lineWidth = it.s * 0.22;
      ctx.beginPath(); ctx.ellipse(0, 0, it.s, it.s * 0.42, 0, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = "#3b4263"; ctx.lineWidth = 1.5;
      for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * 1.5708 + 0.785) * it.s, Math.sin(k * 1.5708 + 0.785) * it.s * 0.42); ctx.stroke(); }
      ctx.fillStyle = "#a7b0d6"; ctx.beginPath(); ctx.arc(0, 0, it.s * 0.24, 0, 6.2832); ctx.fill();
      var on = Math.sin(t * 3 + it.seed) > 0.2;
      ctx.fillStyle = on ? "#f87171" : "#4b1d1d";
      ctx.beginPath(); ctx.arc(it.s, 0, 2, 0, 6.2832); ctx.fill();
      ctx.fillStyle = on ? "#4b1d1d" : "#4ade80";
      ctx.beginPath(); ctx.arc(-it.s, 0, 2, 0, 6.2832); ctx.fill();
    },
    satellite: function (ctx, it, pal, t) {
      ctx.rotate(it.rot + Math.sin(t * 0.5 + it.seed) * 0.15);
      var s = it.s;
      ctx.fillStyle = "#1e3a6b"; ctx.strokeStyle = "#5b7fc4"; ctx.lineWidth = 1;
      ctx.fillRect(-s * 1.25, -s * 0.28, s * 0.8, s * 0.56); ctx.strokeRect(-s * 1.25, -s * 0.28, s * 0.8, s * 0.56);
      ctx.fillRect(s * 0.45, -s * 0.28, s * 0.8, s * 0.56); ctx.strokeRect(s * 0.45, -s * 0.28, s * 0.8, s * 0.56);
      ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.28); ctx.lineTo(-s * 0.85, s * 0.28); ctx.moveTo(s * 0.85, -s * 0.28); ctx.lineTo(s * 0.85, s * 0.28); ctx.stroke();
      ctx.fillStyle = "#c9cfe6"; ctx.fillRect(-s * 0.32, -s * 0.36, s * 0.64, s * 0.72);
      ctx.strokeStyle = "#c9cfe6"; ctx.beginPath(); ctx.moveTo(0, -s * 0.36); ctx.lineTo(0, -s * 0.75); ctx.stroke();
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, -s * 0.78, 1.8, 0, 6.2832); ctx.fill();
    },
    crystal: function (ctx, it, pal, t) {
      var s = it.s;
      ctx.shadowColor = pal.accent; ctx.shadowBlur = 8 + Math.sin(t * 2 + it.seed) * 3;
      var shards = [[0, 1, 0], [-0.55, 0.7, -0.35], [0.5, 0.62, 0.4]];
      for (var k = 0; k < shards.length; k++) {
        var sh = shards[k];
        ctx.save(); ctx.translate(sh[0] * s, 0); ctx.rotate(sh[2]);
        var g = ctx.createLinearGradient(0, -s * sh[1], 0, s * 0.3);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.4, pal.accent); g.addColorStop(1, pal.backdrop[1]);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -s * sh[1]); ctx.lineTo(s * 0.22, 0); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.22, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur = 0;
    },
    wreck: function (ctx, it) {
      var s = it.s;
      ctx.rotate(it.rot);
      ctx.fillStyle = "#3a3f58"; ctx.strokeStyle = "#5d6488"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.lineTo(s * 0.4, -s * 0.35); ctx.lineTo(s * 0.9, 0); ctx.lineTo(s * 0.35, s * 0.3); ctx.lineTo(-s * 0.7, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1a1d2e"; ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.28); ctx.lineTo(s * 0.1, 0); ctx.lineTo(-s * 0.3, s * 0.24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(251,146,60,0.7)"; ctx.beginPath(); ctx.arc(s * 0.6, 0, 1.6, 0, 6.2832); ctx.fill();
    },
    buoy: function (ctx, it, pal, t) {
      var on = (Math.sin(t * 2.4 + it.seed) + 1) / 2;
      ctx.fillStyle = "#59618a";
      ctx.beginPath(); ctx.moveTo(0, -it.s); ctx.lineTo(it.s * 0.7, it.s * 0.6); ctx.lineTo(-it.s * 0.7, it.s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.35 + on * 0.65;
      ctx.beginPath(); ctx.arc(0, -it.s, 2.4, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = on * 0.25; ctx.beginPath(); ctx.arc(0, -it.s, 8, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  function tracePath(ctx, pts) {
    if (!pts.length) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
  }

  function drawRoute(ctx, map, scroll, h, unlocked, t) {
    var vis = [];
    for (var i = 0; i < map.nodes.length; i++) {
      var nd = map.nodes[i];
      var y = nd.y - scroll;
      if (y > -NODE_SPACING * 2 && y < h + NODE_SPACING * 2) vis.push({ x: nd.x, y: y, level: nd.level });
    }
    if (vis.length < 2) return;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); tracePath(ctx, vis);
    ctx.strokeStyle = "rgba(3,6,18,0.78)"; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = "rgba(148,163,214,0.16)"; ctx.lineWidth = 8; ctx.stroke();
    ctx.setLineDash([2, 12]);
    ctx.strokeStyle = "rgba(148,163,214,0.35)"; ctx.lineWidth = 3; ctx.stroke();
    var done = vis.filter(function (p) { return p.level <= unlocked; });
    if (done.length >= 2) {
      ctx.beginPath(); tracePath(ctx, done);
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(246,185,59,0.28)"; ctx.lineWidth = 8; ctx.stroke();
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -t * 24;
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function shieldPath(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  function drawLock(ctx, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y - s * 0.25, s * 0.32, Math.PI, 0); ctx.stroke();
    ctx.fillRect(x - s * 0.45, y - s * 0.22, s * 0.9, s * 0.72);
    ctx.restore();
  }

  function drawNode(ctx, nd, y, status, starsGot, t, pal, heroColor) {
    var x = nd.x;
    var r = nd.r;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.95, r * 0.32, 0, 0, 6.2832); ctx.fill();
    if (status === "current") {
      var pulse = 0.5 + Math.sin(t * 3.2) * 0.5;
      ctx.strokeStyle = "rgba(246,185,59," + (0.25 + pulse * 0.45) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r + 7 + pulse * 5, 0, 6.2832); ctx.stroke();
    }
    var shape = nd.boss ? shieldPath : function (c, px, py, pr) { c.beginPath(); c.arc(px, py, pr, 0, 6.2832); };
    var rim;
    if (status === "locked") {
      rim = "#2a3354";
    } else {
      rim = ctx.createLinearGradient(x, y - r, x, y + r);
      if (nd.boss) { rim.addColorStop(0, "#fca5a5"); rim.addColorStop(1, "#b91c1c"); }
      else { rim.addColorStop(0, "#ffe29a"); rim.addColorStop(1, GOLD_DEEP); }
    }
    shape(ctx, x, y, r);
    ctx.fillStyle = rim; ctx.fill();
    var inner = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r);
    if (status === "locked") { inner.addColorStop(0, "#1a2140"); inner.addColorStop(1, "#0c1128"); }
    else { inner.addColorStop(0, pal.accent); inner.addColorStop(1, "#0a0f24"); }
    shape(ctx, x, y, r - 3.5);
    ctx.fillStyle = inner; ctx.fill();
    if (status === "locked") {
      drawLock(ctx, x, y + 1, r * 0.75, "#56608a");
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 " + (nd.boss ? 13 : 12) + "px Orbitron, Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 3;
      ctx.fillText(String(nd.level), x, y + 1);
      ctx.shadowBlur = 0;
    }
    if (status === "done" || (status === "current" && starsGot > 0)) {
      for (var k = 0; k < 3; k++) {
        var sx = x + (k - 1) * 11;
        var sy = y + r + 8 - (k === 1 ? 3 : 0);
        starPath(ctx, sx, sy, 5.2);
        ctx.fillStyle = k < starsGot ? GOLD : "rgba(15,20,44,0.92)";
        ctx.fill();
        ctx.strokeStyle = k < starsGot ? "#7c4a03" : "rgba(148,163,214,0.45)";
        ctx.lineWidth = 1; ctx.stroke();
      }
    }
    if (nd.boss && status !== "current") {
      ctx.font = "800 8.5px Orbitron, Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var tw = 34;
      ctx.fillStyle = status === "locked" ? "#2a3354" : "#b91c1c";
      roundRect(ctx, x - tw / 2, y - r - 15, tw, 13, 6.5); ctx.fill();
      ctx.fillStyle = status === "locked" ? "#8089ad" : "#fff1f2";
      ctx.fillText("BOSS", x, y - r - 8.2);
    }
    if (status === "current") drawMarker(ctx, x, y - r - 10 - Math.abs(Math.sin(t * 2.6)) * 7, heroColor || GOLD);
    ctx.restore();
  }

  function drawMarker(ctx, x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(5,8,22,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-13, -12, -12, -30, 0, -30);
    ctx.bezierCurveTo(12, -30, 13, -12, 0, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#0b1022";
    ctx.beginPath();
    ctx.moveTo(0, -25); ctx.lineTo(5.5, -13); ctx.lineTo(0, -16); ctx.lineTo(-5.5, -13);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBanner(ctx, sec, y, w, lang, unlocked, stars) {
    var name = SECTORS[sec.index] ? SECTORS[sec.index][lang === "en" ? "en" : "tr"] : "";
    var label = (lang === "en" ? "SECTOR " : "SEKTÖR ") + (sec.index + 1);
    var open = unlocked >= sec.firstLevel;
    var st = sectorStars(sec.index, stars);
    var bw = Math.min(w - 48, 270);
    var bx = (w - bw) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(6,10,26,0.86)";
    ctx.strokeStyle = open ? "rgba(246,185,59,0.55)" : "rgba(148,163,214,0.22)";
    ctx.lineWidth = 1;
    roundRect(ctx, bx, y - 24, bw, 48, 12); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = open ? GOLD : "#6b7499";
    ctx.font = "800 10px Orbitron, Inter, sans-serif";
    ctx.fillText(label + (open ? "" : (lang === "en" ? " · LOCKED" : " · KİLİTLİ")), w / 2, y - 9);
    ctx.fillStyle = open ? "#f4f6ff" : "#7d86aa";
    ctx.font = "700 15px Inter, sans-serif";
    ctx.fillText(name + (open ? "   ★ " + st.got + "/" + st.max : ""), w / 2, y + 9);
    ctx.restore();
  }

  function render(ctx, map, view, model, t) {
    var w = view.w, h = view.h, scroll = view.scroll;
    drawBackground(ctx, w, h, scroll, map, t);
    for (var i = 0; i < map.sectors.length; i++) drawSectorPlanet(ctx, map.sectors[i], w, scroll, t);
    drawDecor(ctx, map, scroll, h, t);
    drawRoute(ctx, map, scroll, h, model.unlocked, t);
    for (var s = 0; s < map.sectors.length; s++) {
      var by = map.sectors[s].bannerY - scroll;
      if (by > -40 && by < h + 40) drawBanner(ctx, map.sectors[s], by, w, model.lang, model.unlocked, model.stars);
    }
    for (var n = 0; n < map.nodes.length; n++) {
      var nd = map.nodes[n];
      var y = nd.y - scroll;
      if (y < -60 || y > h + 60) continue;
      var status = nodeStatus(nd.level, model.unlocked, model.stars);
      var levelPal = root.SpaceTheme && root.SpaceTheme.paletteForLevel ? root.SpaceTheme.paletteForLevel(nd.level) : paletteFor(nd.sector);
      drawNode(ctx, nd, y, status, Math.min(3, model.stars[nd.level] || 0), t, levelPal, model.heroColor);
    }
  }

  // ---------------------------------------------------------- controller

  function create(opts) {
    var scroller = opts.scroller;
    var canvas = opts.canvas;
    var spacer = opts.spacer;
    var ctx = canvas.getContext("2d");
    var map = null;
    var dpr = 1;
    var raf = 0;
    var running = false;
    var start = (root.performance && root.performance.now()) || Date.now();

    function model() {
      var s = opts.getState() || {};
      return { unlocked: clampLevel(s.unlocked || 1), stars: s.stars || {}, lang: s.lang || "tr", heroColor: s.heroColor };
    }

    function resize() {
      var w = scroller.clientWidth || root.innerWidth || 390;
      var h = scroller.clientHeight || root.innerHeight || 800;
      dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      map = layout(w, LEVEL_COUNT);
      spacer.style.height = map.height + "px";
    }

    function frame() {
      if (!running) return;
      draw();
      raf = root.requestAnimationFrame(frame);
    }

    function draw() {
      if (!map) resize();
      var now = (root.performance && root.performance.now()) || Date.now();
      var t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(ctx, map, { w: map.width, h: canvas.height / dpr, scroll: scroller.scrollTop }, model(), t);
    }

    function onClick(e) {
      if (!map) return;
      var rect = scroller.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top + scroller.scrollTop;
      var lv = hitTest(map.nodes, x, y);
      if (lv == null) return;
      var m = model();
      if (lv > m.unlocked) { if (opts.onLocked) opts.onLocked(lv, m.unlocked); }
      else if (opts.onSelect) opts.onSelect(lv);
    }

    scroller.addEventListener("click", onClick);
    root.addEventListener("resize", function () { if (running) { var lv = currentCenterLevel(); resize(); scrollToLevel(lv); } });

    function currentCenterLevel() {
      if (!map) return 1;
      var mid = scroller.scrollTop + scroller.clientHeight * 0.55;
      var best = 1, bd = Infinity;
      for (var i = 0; i < map.nodes.length; i++) {
        var d = Math.abs(map.nodes[i].y - mid);
        if (d < bd) { bd = d; best = map.nodes[i].level; }
      }
      return best;
    }

    function scrollToLevel(level, smooth) {
      if (!map) resize();
      var top = scrollTopForLevel(map, level, scroller.clientHeight);
      if (smooth && scroller.scrollTo) scroller.scrollTo({ top: top, behavior: "smooth" });
      else scroller.scrollTop = top;
    }

    return {
      show: function (focusLevel) {
        resize();
        scrollToLevel(focusLevel || model().unlocked);
        if (!running) { running = true; raf = root.requestAnimationFrame(frame); }
      },
      hide: function () { running = false; if (raf) root.cancelAnimationFrame(raf); raf = 0; },
      refresh: draw,
      scrollToLevel: scrollToLevel
    };
  }

  var api = {
    LEVEL_COUNT: LEVEL_COUNT,
    SECTOR_SIZE: SECTOR_SIZE,
    SECTORS: SECTORS,
    sectorForLevel: sectorForLevel,
    isBossLevel: isBossLevel,
    layout: layout,
    hitTest: hitTest,
    scrollTopForLevel: scrollTopForLevel,
    nodeStatus: nodeStatus,
    sectorStars: sectorStars,
    create: create
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.WorldMap = api;
})(typeof window !== "undefined" ? window : globalThis);

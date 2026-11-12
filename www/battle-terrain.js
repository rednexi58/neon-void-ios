/*
 * BattleTerrain — painted battlefield in the Kingdom Rush manner, set on alien
 * planets: textured ground per planet kind, a carved road with kerbs and
 * stones, round stone build plots and seeded scenery.
 *
 * Design notes
 *  - Everything here is static per level, so it is painted once into an
 *    offscreen canvas (`bake`) and blitted every frame. Animated things
 *    (portals, lava glow, units) stay in the game's renderer.
 *  - Placement is deterministic (seeded by level), so a level always looks
 *    the same and screenshots are reproducible.
 *  - `freeSpots` is pure and shared with gameplay (map props), so props never
 *    land on the road or on a build plot.
 */
(function (root) {
  "use strict";

  var W = 540, H = 860, HORIZON = 104;

  // Ground, road and scenery colours per planet kind (SpaceTheme kinds).
  var STYLES = {
    ocean:    { ground: ["#25505d", "#123039"], patch: ["#2e6573", "#1b3f4a"], road: ["#8b7657", "#5e4f3a"], kerb: "#2c241b", rock: ["#5d7682", "#33454f"], accent: "#7dd3fc", decor: ["pool", "pool", "rock", "rock", "reed", "crater", "rock"] },
    volcanic: { ground: ["#3a1f18", "#1a0d0a"], patch: ["#4a2a20", "#2a1410"], road: ["#5a4a44", "#3a2e2a"], kerb: "#140906", rock: ["#4d3b36", "#271b18"], accent: "#fb923c", decor: ["lavaCrack", "lavaCrack", "rock", "rock", "crater", "vent", "rock"] },
    ice:      { ground: ["#7e9bb0", "#4d687c"], patch: ["#a9c3d4", "#6f8ba0"], road: ["#5a6f80", "#3d4f5e"], kerb: "#2b3946", rock: ["#8aa2b3", "#4f6576"], accent: "#e0f2fe", decor: ["iceShard", "iceShard", "snow", "snow", "rock", "crater", "rock"] },
    bio:      { ground: ["#29512f", "#12291a"], patch: ["#356a3c", "#1d3d24"], road: ["#7a6040", "#523f29"], kerb: "#21180f", rock: ["#56654f", "#2f3a2b"], accent: "#86efac", decor: ["plant", "plant", "mushroom", "mushroom", "rock", "pool", "rock"] },
    gas:      { ground: ["#6a4628", "#33200f"], patch: ["#80562f", "#4a2f17"], road: ["#9a7a52", "#6b5236"], kerb: "#2a1c0e", rock: ["#7a5d42", "#45321f"], accent: "#fcd34d", decor: ["rock", "rock", "crater", "crater", "dune", "dune", "rock"] },
    quantum:  { ground: ["#2e2552", "#16112b"], patch: ["#3b3066", "#221a40"], road: ["#4a4570", "#2f2b4c"], kerb: "#120e24", rock: ["#4d4570", "#2a2445"], accent: "#c084fc", decor: ["crystal", "crystal", "rock", "rock", "rock", "crater", "crystal"] },
    storm:    { ground: ["#323b48", "#181e27"], patch: ["#3d4857", "#232b37"], road: ["#5b6370", "#3d434e"], kerb: "#11151b", rock: ["#56606e", "#2e3540"], accent: "#93c5fd", decor: ["puddle", "puddle", "debris", "rock", "rock", "crater", "antenna"] },
    reactor:  { ground: ["#34392f", "#191c17"], patch: ["#3f4539", "#252920"], road: ["#4c544b", "#323831"], kerb: "#0f120e", rock: ["#5a6152", "#30352b"], accent: "#a3e635", decor: ["plate", "plate", "pipe", "debris", "rock", "barrel", "antenna"] }
  };

  function styleFor(kind) { return STYLES[kind] || STYLES.ocean; }

  function rng(seed) {
    var s = (Math.floor(seed) * 9301 + 49297) % 233280;
    if (s <= 0) s += 233279;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  // ------------------------------------------------------------------ geometry

  function distToSegment(px, py, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2)) : 0;
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }

  function distToPaths(px, py, paths) {
    var best = Infinity;
    for (var p = 0; p < paths.length; p++) {
      var path = paths[p];
      for (var i = 0; i < path.length - 1; i++) {
        var d = distToSegment(px, py, path[i], path[i + 1]);
        if (d < best) best = d;
      }
    }
    return best;
  }

  /**
   * Seeded free spots away from the road, build plots and the planet.
   * Used for scenery and for interactive map props.
   */
  function freeSpots(opts) {
    var r = rng(opts.seed || 1);
    var out = [];
    var count = opts.count || 10;
    var clearRoad = opts.clearRoad == null ? 40 : opts.clearRoad;
    var clearPad = opts.clearPad == null ? 44 : opts.clearPad;
    var minGap = opts.minGap == null ? 26 : opts.minGap;
    var top = opts.top == null ? HORIZON + 30 : opts.top;
    var bottom = opts.bottom == null ? H - 24 : opts.bottom;
    var margin = opts.margin == null ? 14 : opts.margin;
    var avoid = opts.avoid || [];
    for (var tries = 0; tries < count * 60 && out.length < count; tries++) {
      var x = margin + r() * (W - margin * 2);
      var y = top + r() * (bottom - top);
      if (distToPaths(x, y, opts.paths) < clearRoad) continue;
      var ok = true;
      for (var s = 0; s < opts.sockets.length && ok; s++) if (Math.hypot(opts.sockets[s].x - x, opts.sockets[s].y - y) < clearPad) ok = false;
      for (var a = 0; a < avoid.length && ok; a++) if (Math.hypot(avoid[a].x - x, avoid[a].y - y) < (avoid[a].r || 60)) ok = false;
      for (var k = 0; k < out.length && ok; k++) if (Math.hypot(out[k].x - x, out[k].y - y) < minGap) ok = false;
      if (!ok) continue;
      out.push({ x: x, y: y, r: r() });
    }
    return out;
  }

  // ------------------------------------------------------------------- paint

  function shade(hex, amt) {
    var h = String(hex).replace("#", "");
    var n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
    var r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function paintGround(ctx, st, r) {
    var g = ctx.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, st.ground[0]);
    g.addColorStop(1, st.ground[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, HORIZON - 20, W, H - HORIZON + 20);
    // Large soft patches break up the flat colour.
    for (var i = 0; i < 26; i++) {
      var x = r() * W, y = HORIZON + r() * (H - HORIZON);
      var rad = 40 + r() * 90;
      var pg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      var c = st.patch[i % 2];
      pg.addColorStop(0, c);
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = pg;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    // Fine grain: pebbles and specks.
    for (var p = 0; p < 900; p++) {
      var px = r() * W, py = HORIZON + r() * (H - HORIZON);
      ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(px, py, 1 + r() * 2, 1 + r() * 1.5);
    }
  }

  function paintHorizon(ctx, st, r) {
    // Jagged ridge separating sky and ground.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, HORIZON + 30);
    var x = 0;
    while (x <= W) {
      ctx.lineTo(x, HORIZON - 8 + r() * 22);
      x += 14 + r() * 26;
    }
    ctx.lineTo(W, HORIZON + 30);
    ctx.closePath();
    var rg = ctx.createLinearGradient(0, HORIZON - 10, 0, HORIZON + 30);
    rg.addColorStop(0, shade(st.rock[0], -10));
    rg.addColorStop(1, st.ground[0]);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  // Corners are rounded for the painted road; units still walk the waypoints,
  // the radius is small enough that they stay on the road bed.
  var CORNER_R = 26;
  function strokePath(ctx, path) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (var i = 1; i < path.length - 1; i++) ctx.arcTo(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, CORNER_R);
    if (path.length > 1) ctx.lineTo(path[path.length - 1].x, path[path.length - 1].y);
  }

  function paintRoads(ctx, st, paths, r) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Shadowed trench, kerb, road bed, lit centre: four passes over all lanes so
    // crossings merge cleanly instead of stacking edges.
    var passes = [
      { w: 52, c: "rgba(0,0,0,0.28)", dy: 4 },
      { w: 48, c: st.kerb, dy: 0 },
      { w: 40, c: st.road[1], dy: 0 },
      { w: 32, c: st.road[0], dy: 0 }
    ];
    passes.forEach(function (ps) {
      ctx.save();
      ctx.translate(0, ps.dy);
      ctx.strokeStyle = ps.c;
      ctx.lineWidth = ps.w;
      paths.forEach(function (path) { strokePath(ctx, path); ctx.stroke(); });
      ctx.restore();
    });
    // Stones and ruts along every segment.
    paths.forEach(function (path) {
      for (var i = 0; i < path.length - 1; i++) {
        var a = path[i], b = path[i + 1];
        var len = Math.hypot(b.x - a.x, b.y - a.y);
        var ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
        for (var d = 0; d < len; d += 7) {
          var off = (r() - 0.5) * 30;
          var sx = a.x + ux * d - uy * off;
          var sy = a.y + uy * d + ux * off;
          var sr = 1 + r() * 2.6;
          ctx.fillStyle = r() < 0.5 ? shade(st.road[0], 18) : shade(st.road[1], -12);
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.ellipse(sx, sy, sr * 1.3, sr, r() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        [-8, 8].forEach(function (o) {
          ctx.beginPath();
          ctx.moveTo(a.x - uy * o, a.y + ux * o);
          ctx.lineTo(b.x - uy * o, b.y + ux * o);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
  }

  function paintPads(ctx, st, sockets) {
    sockets.forEach(function (s) {
      var x = s.x, y = s.y;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(x + 2, y + 9, 27, 13, 0, 0, Math.PI * 2); ctx.fill();
      // Side wall of the plot.
      ctx.fillStyle = shade(st.rock[1], -6);
      ctx.beginPath(); ctx.ellipse(x, y + 5, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
      // Top face.
      var top = ctx.createLinearGradient(x, y - 14, x, y + 10);
      top.addColorStop(0, shade(st.rock[0], 26));
      top.addColorStop(1, shade(st.rock[0], -8));
      ctx.fillStyle = top;
      ctx.beginPath(); ctx.ellipse(x, y, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Inner landing ring and four bolts.
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y, 16, 8.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = shade(st.rock[1], -20);
      [[-19, 0], [19, 0], [0, -10.5], [0, 10.5]].forEach(function (b) {
        ctx.beginPath(); ctx.arc(x + b[0], y + b[1], 1.8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    });
  }

  // ------------------------------------------------------------- scenery

  var DECOR = {
    rock: function (ctx, x, y, s, st, r) {
      var n = 7, rad = 6 + s * 9;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(x + 2, y + rad * 0.55, rad * 1.05, rad * 0.4, 0, 0, 6.283); ctx.fill();
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var a = i / n * 6.283, rr = rad * (0.75 + r() * 0.3);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72);
      }
      ctx.closePath();
      var g = ctx.createLinearGradient(x - rad, y - rad, x + rad, y + rad);
      g.addColorStop(0, shade(st.rock[0], 22)); g.addColorStop(1, st.rock[1]);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.stroke();
    },
    crater: function (ctx, x, y, s, st) {
      var rad = 10 + s * 14;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.55, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 1.5, rad, rad * 0.55, 0, 0.2, 3.0); ctx.stroke();
    },
    pool: function (ctx, x, y, s, st) {
      var rad = 12 + s * 14;
      ctx.fillStyle = "#1c5f7a";
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.55, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = st.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.ellipse(x - rad * 0.3, y - rad * 0.15, rad * 0.35, rad * 0.1, 0, 0, 6.283); ctx.fill();
    },
    puddle: function (ctx, x, y, s) {
      var rad = 10 + s * 10;
      ctx.fillStyle = "rgba(96,125,160,0.45)";
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.45, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath(); ctx.ellipse(x - 3, y - 1, rad * 0.4, rad * 0.1, 0, 0, 6.283); ctx.fill();
    },
    reed: function (ctx, x, y, s) {
      ctx.lineCap = "round";
      for (var i = -2; i <= 2; i++) {
        ctx.strokeStyle = i % 2 ? "#2dd4bf" : "#0f766e";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + i * 3, y + 4); ctx.quadraticCurveTo(x + i * 6, y - 6, x + i * 4 + (s - 0.5) * 6, y - 12 - Math.abs(i) * -2 - s * 5); ctx.stroke();
      }
    },
    lavaCrack: function (ctx, x, y, s, st, r) {
      ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 5; ctx.lineCap = "round";
      var pts = [[x - 18, y - 4]];
      for (var i = 1; i < 5; i++) pts.push([x - 18 + i * 9, y - 4 + (r() - 0.5) * 12]);
      ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
      ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 0.8; ctx.stroke();
    },
    vent: function (ctx, x, y, s) {
      ctx.fillStyle = "#2a1410"; ctx.beginPath(); ctx.ellipse(x, y, 9, 5, 0, 0, 6.283); ctx.fill();
      var g = ctx.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, "#fdba74"); g.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 8, 4.5, 0, 0, 6.283); ctx.fill();
    },
    iceShard: function (ctx, x, y, s) {
      for (var i = -1; i <= 1; i++) {
        var h = 12 + s * 12 - Math.abs(i) * 5;
        var g = ctx.createLinearGradient(x, y - h, x, y);
        g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#7dd3fc");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x + i * 6, y - h); ctx.lineTo(x + i * 6 + 4, y); ctx.lineTo(x + i * 6 - 4, y); ctx.closePath(); ctx.fill();
      }
    },
    snow: function (ctx, x, y, s) {
      var rad = 14 + s * 16;
      ctx.fillStyle = "rgba(240,248,255,0.55)";
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 0.5, 0, 0, 6.283); ctx.fill();
    },
    plant: function (ctx, x, y, s) {
      ctx.strokeStyle = "#166534"; ctx.lineWidth = 2;
      for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + i * 5, y - 4, x + i * 7, y - 9 - s * 5); ctx.stroke(); }
      ctx.fillStyle = s > 0.5 ? "#e879f9" : "#22d3ee";
      ctx.beginPath(); ctx.arc(x, y - 10 - s * 5, 3, 0, 6.283); ctx.fill();
    },
    mushroom: function (ctx, x, y, s) {
      ctx.fillStyle = "#e2e8f0"; ctx.fillRect(x - 1.5, y - 6, 3, 8);
      ctx.fillStyle = s > 0.5 ? "#a855f7" : "#14b8a6";
      ctx.beginPath(); ctx.ellipse(x, y - 7, 7 + s * 3, 4.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(x - 2, y - 9, 1.2, 0, 6.283); ctx.fill();
    },
    dune: function (ctx, x, y, s, st) {
      ctx.strokeStyle = "rgba(255,230,180,0.18)"; ctx.lineWidth = 2;
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y + i * 5, 18 + s * 10, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    },
    crystal: function (ctx, x, y, s, st) {
      var cols = ["#f0abfc", "#c084fc", "#7c3aed"];
      [[-6, 10, -0.3], [0, 16, 0], [6, 11, 0.3]].forEach(function (c, i) {
        ctx.save(); ctx.translate(x + c[0], y); ctx.rotate(c[2]);
        var h = c[1] + s * 8;
        var g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, "#fff"); g.addColorStop(0.4, cols[i]); g.addColorStop(1, "#3b0764");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(4, -h * 0.3); ctx.lineTo(0, 2); ctx.lineTo(-4, -h * 0.3); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    },
    debris: function (ctx, x, y, s) {
      ctx.fillStyle = "#4b5563"; ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(s * 3);
      ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(6, -6); ctx.lineTo(11, 2); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f97316"; ctx.fillRect(2, -3, 3, 2);
      ctx.restore();
    },
    antenna: function (ctx, x, y, s) {
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x, y - 18); ctx.lineTo(x + 6, y + 4); ctx.moveTo(x - 3.5, y - 6); ctx.lineTo(x + 3.5, y - 6); ctx.stroke();
      ctx.fillStyle = "#f87171"; ctx.beginPath(); ctx.arc(x, y - 19, 2, 0, 6.283); ctx.fill();
    },
    plate: function (ctx, x, y, s, st) {
      ctx.fillStyle = shade(st.rock[1], 8); ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x - 14, y - 9, 28, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      [[-11, -6], [11, -6], [-11, 6], [11, 6]].forEach(function (b) { ctx.beginPath(); ctx.arc(x + b[0], y + b[1], 1.2, 0, 6.283); ctx.fill(); });
    },
    pipe: function (ctx, x, y, s) {
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 6; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x + 20, y); ctx.stroke();
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 20, y - 2); ctx.lineTo(x + 20, y - 2); ctx.stroke();
      ctx.fillStyle = "#334155"; ctx.fillRect(x - 3, y - 5, 6, 10);
    },
    barrel: function (ctx, x, y, s) {
      ctx.fillStyle = "#a16207"; ctx.fillRect(x - 5, y - 10, 10, 13);
      ctx.fillStyle = "#facc15"; ctx.fillRect(x - 5, y - 6, 10, 3);
      ctx.fillStyle = "#713f12"; ctx.beginPath(); ctx.ellipse(x, y - 10, 5, 2, 0, 0, 6.283); ctx.fill();
    }
  };

  function paintScenery(ctx, st, opts, r) {
    var spots = freeSpots({ paths: opts.paths, sockets: opts.sockets, seed: opts.seed * 3 + 11, count: 48, clearRoad: 36, clearPad: 40, minGap: 22, avoid: opts.avoid });
    spots.sort(function (a, b) { return a.y - b.y; });
    spots.forEach(function (sp) {
      var kind = st.decor[Math.floor(sp.r * st.decor.length) % st.decor.length];
      ctx.save();
      DECOR[kind](ctx, sp.x, sp.y, r(), st, r);
      ctx.restore();
    });
  }

  function paintVignette(ctx) {
    var g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = g;
    ctx.fillRect(0, HORIZON - 20, W, H - HORIZON + 20);
  }

  /** Paint the full static battlefield into `ctx` (virtual 540x860 space). */
  function paint(ctx, opts) {
    var st = styleFor(opts.kind);
    var r = rng(opts.seed || 1);
    paintGround(ctx, st, r);
    paintScenery(ctx, st, opts, r);
    paintRoads(ctx, st, opts.paths, r);
    paintPads(ctx, st, opts.sockets);
    paintVignette(ctx);
    paintHorizon(ctx, st, r);
  }

  var cache = { key: "", canvas: null };

  /**
   * Bake into an offscreen canvas at `pixelScale` and return it. The key covers
   * everything the picture depends on, so a level is painted once.
   */
  function bake(opts, pixelScale) {
    var s = Math.max(0.5, Math.min(3, pixelScale || 1));
    var key = [opts.kind, opts.seed, s.toFixed(2), JSON.stringify(opts.paths), JSON.stringify(opts.sockets.map(function (k) { return [Math.round(k.x), Math.round(k.y)]; }))].join("|");
    if (cache.key === key && cache.canvas) return cache.canvas;
    var doc = root.document;
    if (!doc) return null;
    var cv = cache.canvas || doc.createElement("canvas");
    cv.width = Math.round(W * s);
    cv.height = Math.round(H * s);
    var c = cv.getContext("2d");
    c.setTransform(s, 0, 0, s, 0, 0);
    c.clearRect(0, 0, W, H);
    paint(c, opts);
    cache = { key: key, canvas: cv };
    return cv;
  }

  var api = { W: W, H: H, HORIZON: HORIZON, STYLES: STYLES, styleFor: styleFor, distToPaths: distToPaths, freeSpots: freeSpots, paint: paint, bake: bake };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BattleTerrain = api;
})(typeof window !== "undefined" ? window : globalThis);

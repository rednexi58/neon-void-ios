/*
 * SpaceTheme — per-planet visual identity for the battlefield.
 *
 * Map layouts (paths, sockets) still come from SECTOR_PRESETS; this module only
 * decides *colour and atmosphere*, keyed to the protected planet of the level.
 * Consecutive levels therefore always look different, and the map always
 * matches the planet the player is defending.
 *
 * Index order mirrors PLANET_THEMES in index.html:
 *   0 ocean · 1 volcanic · 2 ice · 3 bio · 4 gas giant · 5 quantum · 6 storm · 7 reactor
 */
(function (root) {
  "use strict";

  var PALETTES = Object.freeze([
    { kind: "ocean",
      sky: ["#020b1f", "#06244a", "#0c3a5e"], nebula: ["rgba(56,189,248,0.30)", "rgba(16,185,129,0.20)"], star: "224,242,254",
      ground: ["#0b3b55", "#04121f"], plateau: ["#0d2740", "#061524", "#2b6a8f"], grid: "rgba(56,189,248,0.18)",
      road: ["#04101d", "#0f2f4f"], accent: "#38bdf8", backdrop: ["#93c5fd", "#1e3a8a"] },
    { kind: "volcanic",
      sky: ["#140406", "#3a0d0a", "#5a1a0b"], nebula: ["rgba(249,115,22,0.32)", "rgba(220,38,38,0.22)"], star: "254,215,170",
      ground: ["#4a1a0c", "#160505"], plateau: ["#2a1410", "#140806", "#7c2d12"], grid: "rgba(251,146,60,0.17)",
      road: ["#120504", "#3b130b"], accent: "#fb923c", backdrop: ["#fdba74", "#7f1d1d"] },
    { kind: "ice",
      sky: ["#03101a", "#0b2f3d", "#1b4d5c"], nebula: ["rgba(103,232,249,0.30)", "rgba(165,180,252,0.20)"], star: "236,254,255",
      ground: ["#2c5866", "#0a1c25"], plateau: ["#14313d", "#0a1a22", "#5eb3c7"], grid: "rgba(165,243,252,0.20)",
      road: ["#06141b", "#1a4352"], accent: "#67e8f9", backdrop: ["#e0f2fe", "#155e75"] },
    { kind: "bio",
      sky: ["#02120a", "#073220", "#0f4a2c"], nebula: ["rgba(74,222,128,0.28)", "rgba(250,204,21,0.16)"], star: "220,252,231",
      ground: ["#1d4a2a", "#06150c"], plateau: ["#11291b", "#08160e", "#3f8f57"], grid: "rgba(74,222,128,0.17)",
      road: ["#05120a", "#16391f"], accent: "#4ade80", backdrop: ["#bbf7d0", "#14532d"] },
    { kind: "gas",
      sky: ["#140c02", "#3a2405", "#5a3a0a"], nebula: ["rgba(251,191,36,0.30)", "rgba(244,114,182,0.18)"], star: "254,243,199",
      ground: ["#5a3d12", "#1a1004"], plateau: ["#2d2210", "#171006", "#a16207"], grid: "rgba(253,224,71,0.16)",
      road: ["#130c03", "#3d2a0d"], accent: "#fbbf24", backdrop: ["#fde68a", "#92400e"] },
    { kind: "quantum",
      sky: ["#0c0418", "#2a0b45", "#3f1263"], nebula: ["rgba(192,132,252,0.34)", "rgba(236,72,153,0.22)"], star: "243,232,255",
      ground: ["#3b1458", "#10041c"], plateau: ["#22113a", "#12071f", "#7e22ce"], grid: "rgba(216,180,254,0.18)",
      road: ["#0d0518", "#2e1250"], accent: "#c084fc", backdrop: ["#f5d0fe", "#581c87"] },
    { kind: "storm",
      sky: ["#030818", "#0b1d4a", "#16306b"], nebula: ["rgba(96,165,250,0.32)", "rgba(165,180,252,0.22)"], star: "219,234,254",
      ground: ["#1c2f5e", "#060c1e"], plateau: ["#121e3d", "#080f22", "#3b5bb5"], grid: "rgba(147,197,253,0.18)",
      road: ["#050a1a", "#16295a"], accent: "#60a5fa", backdrop: ["#c7d2fe", "#1e3a8a"] },
    { kind: "reactor",
      sky: ["#12030a", "#3a0a1e", "#55102b"], nebula: ["rgba(251,113,133,0.32)", "rgba(168,85,247,0.20)"], star: "255,228,230",
      ground: ["#4c1028", "#16040b"], plateau: ["#2a0f1c", "#15060d", "#9f1239"], grid: "rgba(253,164,175,0.17)",
      road: ["#12040a", "#3b0f22"], accent: "#fb7185", backdrop: ["#fecdd3", "#881337"] }
  ]);

  function paletteIndexForLevel(level) {
    var lv = Math.max(1, Math.floor(Number(level) || 1));
    return (lv - 1) % PALETTES.length;
  }

  function paletteForLevel(level) { return PALETTES[paletteIndexForLevel(level)]; }

  /** Deterministic pseudo-random in [0,1) so each planet keeps a stable surface. */
  function seeded(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /**
   * Paint the surface details of a planet disc of radius r centred on (0,0).
   * Caller must already have clipped to the disc. `t` is animation time.
   */
  function drawPlanetSurface(ctx, kind, r, t, level, colors) {
    var rnd = seeded(level || 1);
    var spin = (t * 6) % (r * 4);
    ctx.save();
    switch (kind) {
      case "ocean":
      case "bio": {
        ctx.fillStyle = kind === "ocean" ? "rgba(34,197,94,0.55)" : "rgba(21,128,61,0.55)";
        for (var i = 0; i < 5; i++) {
          var cx = ((rnd() * r * 4 + spin) % (r * 4)) - r * 2;
          var cy = (rnd() - 0.5) * r * 1.4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * (0.22 + rnd() * 0.25), r * (0.12 + rnd() * 0.14), rnd() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        for (var c = 0; c < 3; c++) {
          ctx.beginPath();
          ctx.ellipse(((rnd() * r * 4 + spin * 1.6) % (r * 4)) - r * 2, (rnd() - 0.5) * r * 1.6, r * 0.4, r * 0.07, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "volcanic":
      case "reactor": {
        ctx.strokeStyle = kind === "volcanic" ? "rgba(253,186,116,0.85)" : "rgba(253,164,175,0.85)";
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.shadowColor = colors.glow; ctx.shadowBlur = 6;
        var pulse = 0.55 + Math.sin(t * 3) * 0.25;
        ctx.globalAlpha = pulse;
        for (var k = 0; k < 6; k++) {
          var x = (rnd() - 0.5) * r * 1.6, y = (rnd() - 0.5) * r * 1.6;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (var s = 0; s < 3; s++) { x += (rnd() - 0.5) * r * 0.6; y += (rnd() - 0.5) * r * 0.6; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        if (kind === "reactor") {
          ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2;
          ctx.fillStyle = colors.glow;
          ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case "ice": {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath(); ctx.ellipse(0, -r * 0.92, r * 0.75, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 0.6, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(207,250,254,0.6)"; ctx.lineWidth = 1;
        for (var f = 0; f < 5; f++) {
          ctx.beginPath(); ctx.moveTo((rnd() - 0.5) * r * 1.6, (rnd() - 0.5) * r); ctx.lineTo((rnd() - 0.5) * r * 1.6, (rnd() - 0.5) * r); ctx.stroke();
        }
        break;
      }
      case "gas":
      case "storm": {
        var bands = kind === "gas" ? ["rgba(146,64,14,0.45)", "rgba(254,243,199,0.35)", "rgba(217,119,6,0.45)"]
                                   : ["rgba(30,64,175,0.45)", "rgba(219,234,254,0.30)", "rgba(59,130,246,0.40)"];
        for (var b = -4; b <= 4; b++) {
          ctx.fillStyle = bands[(b + 9) % bands.length];
          var wob = Math.sin(t * 0.8 + b) * r * 0.05;
          ctx.fillRect(-r, b * r * 0.22 + wob, r * 2, r * 0.13);
        }
        var sx = ((r * 0.5 + spin * 0.6) % (r * 2.6)) - r * 1.3;
        ctx.fillStyle = kind === "gas" ? "rgba(185,28,28,0.55)" : "rgba(255,255,255,0.45)";
        ctx.beginPath(); ctx.ellipse(sx, r * 0.28, r * 0.24, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        if (kind === "storm" && Math.sin(t * 7) > 0.92) {
          ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.5); ctx.lineTo(0, -r * 0.15); ctx.lineTo(-r * 0.1, -r * 0.1); ctx.lineTo(r * 0.12, r * 0.3); ctx.stroke();
        }
        break;
      }
      case "quantum": {
        ctx.strokeStyle = "rgba(245,208,254,0.55)"; ctx.lineWidth = Math.max(1, r * 0.04);
        for (var q = 0; q < 3; q++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, r * (0.35 + q * 0.22), r * (0.12 + q * 0.08), t * (0.6 + q * 0.3) + q, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      default: break;
    }
    ctx.restore();

    // Day/night terminator: makes every planet read as a sphere.
    var shade = ctx.createRadialGradient(-r * 0.45, -r * 0.45, r * 0.2, 0, 0, r * 1.05);
    shade.addColorStop(0, "rgba(255,255,255,0.10)");
    shade.addColorStop(0.55, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(2,6,23,0.70)");
    ctx.fillStyle = shade;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }

  var api = Object.freeze({
    PALETTES: PALETTES,
    paletteIndexForLevel: paletteIndexForLevel,
    paletteForLevel: paletteForLevel,
    drawPlanetSurface: drawPlanetSurface
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.SpaceTheme = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null));

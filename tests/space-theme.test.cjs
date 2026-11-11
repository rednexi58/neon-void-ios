const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SpaceTheme = require('../www/space-theme.js');

test('one palette per planet theme, in the same order', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf8');
  const block = html.match(/const PLANET_THEMES = \[([\s\S]*?)\n      \];/)[1];
  const count = (block.match(/typeTr:/g) || []).length;
  assert.strictEqual(SpaceTheme.PALETTES.length, count);
});

test('consecutive levels never share a palette', () => {
  for (let lv = 1; lv < 200; lv++) {
    assert.notStrictEqual(SpaceTheme.paletteIndexForLevel(lv), SpaceTheme.paletteIndexForLevel(lv + 1));
  }
});

test('every palette defines all colour slots', () => {
  for (const p of SpaceTheme.PALETTES) {
    for (const k of ['sky', 'nebula', 'ground', 'plateau', 'road', 'backdrop']) assert.ok(Array.isArray(p[k]) && p[k].length >= 2, `${p.kind}.${k}`);
    for (const k of ['kind', 'star', 'grid', 'accent']) assert.strictEqual(typeof p[k], 'string');
  }
});

test('surface painter runs for every kind on a stub canvas', () => {
  const noop = () => {};
  const grad = { addColorStop: noop };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => grad : noop), set: (t, k, v) => { t[k] = v; return true; } });
  for (const p of SpaceTheme.PALETTES) SpaceTheme.drawPlanetSurface(ctx, p.kind, 37, 3.2, 7, { glow: '#fff' });
});

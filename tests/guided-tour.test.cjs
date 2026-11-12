const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../www/guided-tour.js');

test('tour card sits below the target when there is room, otherwise above, otherwise overlays', () => {
  const below = T.placeCard({ top: 100, left: 20, width: 60, height: 40 }, 180, 800, 390, 360);
  assert.equal(below.side, 'below');
  assert.ok(below.top >= 100 + 40);
  const above = T.placeCard({ top: 650, left: 20, width: 60, height: 60 }, 180, 760, 390, 360);
  assert.equal(above.side, 'above');
  assert.ok(above.top + 180 <= 650);
  const overlay = T.placeCard({ top: 60, left: 0, width: 390, height: 640 }, 200, 760, 390, 360);
  assert.equal(overlay.side, 'overlay');
  assert.ok(overlay.top + 200 <= 760);
  const center = T.placeCard(null, 200, 760, 390, 360);
  assert.equal(center.side, 'center');
});

test('tour card always stays inside narrow screens', () => {
  for (const vw of [320, 375, 393, 430]) {
    for (const x of [0, 150, vw - 40]) {
      const p = T.placeCard({ top: 300, left: x, width: 40, height: 40 }, 160, 700, vw, 360);
      assert.ok(p.left >= 12 && p.left + p.width <= vw - 12, `vw ${vw} x ${x}`);
    }
  }
});

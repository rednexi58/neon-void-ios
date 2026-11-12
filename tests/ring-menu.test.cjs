const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../www/ring-menu.js');

test('ring buttons never overlap and stay inside the battlefield', () => {
  for (const count of [2, 3, 4, 7]) {
    for (const [cx, cy] of [[20, 20], [195, 400], [380, 700], [200, 120]]) {
      const lay = R.layoutRing(cx, cy, count, 393, 760);
      const half = R.BTN / 2;
      lay.points.forEach(p => {
        assert.ok(p.x - half >= 0 && p.x + half <= 393, `x in bounds (${count} @ ${cx},${cy})`);
        assert.ok(p.y - half >= 0 && p.y + half <= 760, `y in bounds (${count} @ ${cx},${cy})`);
      });
      for (let i = 0; i < lay.points.length; i++) for (let j = i + 1; j < lay.points.length; j++) {
        const a = lay.points[i], b = lay.points[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= R.BTN + 4, `buttons ${i},${j} apart for ${count}`);
      }
    }
  }
});

test('ring stays centred on the plot when there is room', () => {
  const lay = R.layoutRing(200, 400, 7, 393, 760);
  assert.equal(lay.cx, 200);
  assert.equal(lay.cy, 400);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const WM = require('../www/world-map.js');

test('layout: 200 nodes, level 1 at the bottom, strictly climbing, inside the screen', () => {
  for (const w of [320, 375, 393, 430, 820]) {
    const map = WM.layout(w, 200);
    assert.equal(map.nodes.length, 200);
    assert.equal(map.sectors.length, 8);
    for (let i = 1; i < map.nodes.length; i++) assert.ok(map.nodes[i].y < map.nodes[i - 1].y, `level ${i + 1} above ${i}`);
    for (const nd of map.nodes) {
      assert.ok(nd.x - nd.r >= 8 && nd.x + nd.r <= map.width - 8, `node ${nd.level} fits width ${w}`);
      assert.ok(nd.y > 0 && nd.y < map.height);
    }
  }
});

test('layout: neighbouring nodes never overlap and boss nodes are every 10th level', () => {
  const map = WM.layout(375, 200);
  for (let i = 1; i < map.nodes.length; i++) {
    const a = map.nodes[i - 1], b = map.nodes[i];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r + 20);
  }
  assert.deepEqual(map.nodes.filter(n => n.boss).map(n => n.level), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]);
});

test('sector banners sit between sectors, not on top of nodes', () => {
  const map = WM.layout(393, 200);
  for (const sec of map.sectors) {
    for (const nd of map.nodes) assert.ok(Math.abs(nd.y - sec.bannerY) > nd.r + 24, `banner ${sec.index} clear of node ${nd.level}`);
  }
});

test('hitTest finds the tapped node with finger slop and ignores empty space', () => {
  const map = WM.layout(390, 200);
  const nd = map.nodes[41];
  assert.equal(WM.hitTest(map.nodes, nd.x + nd.r + 6, nd.y), 42);
  assert.equal(WM.hitTest(map.nodes, nd.x, nd.y - 2), 42);
  assert.equal(WM.hitTest(map.nodes, -50, -50), null);
});

test('scrollTopForLevel keeps the target on screen and clamps to the map', () => {
  const map = WM.layout(390, 200);
  const vh = 760;
  for (const lv of [1, 2, 57, 199, 200]) {
    const top = WM.scrollTopForLevel(map, lv, vh);
    assert.ok(top >= 0 && top <= map.height - vh);
    const y = map.nodes[lv - 1].y - top;
    assert.ok(y > 120 && y < vh - 120, `level ${lv} visible (y=${y})`);
  }
});

test('node status and sector stars follow saved progress', () => {
  const stars = { 1: 3, 2: 1, 3: 0 };
  assert.equal(WM.nodeStatus(1, 4, stars), 'done');
  assert.equal(WM.nodeStatus(4, 4, stars), 'current');
  assert.equal(WM.nodeStatus(5, 4, stars), 'locked');
  assert.equal(WM.nodeStatus(3, 4, stars), 'done');
  assert.deepEqual(WM.sectorStars(0, { 1: 3, 2: 2, 26: 3, 5: 9 }), { got: 8, max: 75 });
  assert.equal(WM.sectorForLevel(25), 0);
  assert.equal(WM.sectorForLevel(26), 1);
  assert.equal(WM.sectorForLevel(200), 7);
  assert.equal(WM.SECTORS.length, 8);
});

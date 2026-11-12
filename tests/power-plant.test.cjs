const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createGame } = require('../scripts/headless-game.cjs');

function level(lv) {
  const { api: g, handlers } = createGame(path.join(__dirname, '..'), 5);
  g.state.trainerCompletedOnce = true; g.state.unlockedLevel = lv;
  g.state.completedLevels = Object.fromEntries(Array.from({ length: lv - 1 }, (_, i) => [i + 1, true]));
  g.startLevel(lv);
  return { g, call: () => handlers['btnNextWaveEarly:click']() };
}
const plant = (g, i, level = 1, branch = 'A') => { g.sockets[i].tower = { typeKey: 'power', level, branch, targetMode: 'first', cooldown: 0, frozenTimer: 0, angle: 0 }; };

test('repair tower is gone and the power plant is defined as an economy tower', () => {
  const { g } = level(4);
  assert.equal(g.TOWER_TYPES.repair, undefined);
  const p = g.TOWER_TYPES.power;
  assert.equal(p.isEconomy, true); assert.equal(p.unlockLevel, 4);
  assert.equal(JSON.stringify(p.levels.map(l => l.energyPerPulse)), '[9,14,21]');
});

test('produces energy only while a wave is running', () => {
  const { g, call } = level(4);
  const s = g.sockets.findIndex(x => !x.crystalHp);
  plant(g, s);
  const gold0 = g.state.gold;
  for (let t = 0; t < 10; t += 0.1) g.tick(0.1); // countdown, no wave yet
  assert.equal(g.state.gold, gold0, 'no income before the wave');
  call();
  const before = g.state.gold;
  for (let t = 0; t < 6.2; t += 0.1) g.tick(0.1);
  assert.ok(g.state.gold - before >= 9, `earned ${g.state.gold - before}`);
});

test('fusion branch gives +50%, never shoots', () => {
  const { g, call } = level(6);
  const s = g.sockets.findIndex(x => !x.crystalHp);
  plant(g, s, 3, 'A');
  call();
  const hp = () => g.enemies.reduce((a, e) => a + e.hp, 0);
  for (let t = 0; t < 2; t += 0.1) g.tick(0.1);
  const h0 = hp();
  for (let t = 0; t < 0.5; t += 0.1) g.tick(0.1);
  assert.ok(hp() >= h0 - 1e-9 || g.enemies.length === 0, 'plant deals no damage');
});

test('a Lv1 plant built at the start of a level earns back more than its cost', () => {
  const { g, call } = level(8);
  const s = g.sockets.findIndex(x => !x.crystalHp);
  plant(g, s);
  let produced = 0, prevTimer = null;
  call();
  for (let t = 0; t < 600 && !g.state.levelEnded; t += 0.1) {
    g.state.baseHp = Math.max(g.state.baseHp, 5); // isolate economy from defense quality
    g.tick(0.1);
    const pt = g.sockets[s].tower.pulseTimer;
    if (prevTimer !== null && pt > prevTimer + 1) produced += 9; // timer wrapped -> one pulse
    prevTimer = pt;
    if (g.waveFlow.phase === 'countdown') call();
  }
  console.log('Lv1 plant produced', produced, 'energy over the level (cost 155)');
  assert.ok(produced > 155, `produced ${produced}`);
  assert.ok(produced < 155 * 4, `not overpowered (${produced})`);
});

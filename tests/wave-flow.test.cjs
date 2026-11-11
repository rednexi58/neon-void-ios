const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWaveFlow, DEFAULTS } = require('../www/wave-flow.js');

function run(flow, seconds, fieldClear) {
  let fired = 0;
  for (let t = 0; t < seconds; t += 0.05) if (flow.tick(0.05, fieldClear)) { fired++; flow.launch(); }
  return fired;
}

test('first wave starts by itself after 15 s; later waves 7 s after the field clears', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 3 });
  assert.equal(DEFAULTS.firstWaveDelay, 15); assert.equal(DEFAULTS.betweenWaveDelay, 7);
  assert.equal(run(f, 14.9, false), 0);
  assert.equal(run(f, 0.2, false), 1);
  assert.equal(f.launched, 1);
  assert.equal(run(f, 30, false), 0, 'no auto wave while enemies remain');
  f.tick(0.05, true);
  assert.equal(f.phase, 'countdown');
  assert.equal(run(f, 6.9, true), 0);
  assert.equal(run(f, 0.2, true), 1);
  assert.equal(f.launched, 2);
});

test('player can call waves at any time, including while enemies are on the field', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 3 });
  assert.equal(f.launch(), 0);
  assert.equal(f.phase, 'running');
  assert.equal(f.earlyBonus(), DEFAULTS.midWaveBonus);
  assert.equal(f.launch(), 1);
  assert.equal(f.launch(), 2);
  assert.equal(f.launch(), null);
  assert.equal(f.earlyBonus(), 0);
  assert.equal(f.hasMoreWaves(), false);
});

test('early bonus pays per skipped second, capped before the first wave', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 4 });
  assert.equal(f.earlyBonus(), DEFAULTS.firstWaveBonusCap);
  f.launch(); f.tick(0.05, true);
  assert.equal(f.earlyBonus(), 7 * DEFAULTS.bonusPerSecond);
  run(f, 4.5, true);
  assert.equal(f.earlyBonus(), 2 * DEFAULTS.bonusPerSecond);
});

test('tutorial holds the first wave until the player starts it', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 3, holdFirstWave: true });
  assert.equal(run(f, 120, true), 0);
  assert.equal(f.secondsLeft, null);
  assert.equal(f.earlyBonus(), 0);
  assert.equal(f.launch(), 0);
});

test('level completes only after every wave launched and the field is clear', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 2 });
  assert.equal(f.isComplete(true), false);
  f.launch(); assert.equal(f.isComplete(true), false);
  f.launch(); assert.equal(f.isComplete(false), false);
  assert.equal(f.isComplete(true), true);
});

test('endless mode never completes and always has another wave', () => {
  const f = createWaveFlow(); f.reset({ totalWaves: 0, endless: true });
  for (let i = 0; i < 50; i++) assert.equal(f.launch(), i);
  assert.equal(f.hasMoreWaves(), true);
  assert.equal(f.isComplete(true), false);
});

// Integration with the real game script through the headless harness.
const { createGame } = require('../scripts/headless-game.cjs');
const path = require('node:path');
function freshLevel(level) {
  const { api: g, handlers } = createGame(path.join(__dirname, '..'), 5);
  g.state.trainerCompletedOnce = true; g.state.unlockedLevel = level;
  g.state.completedLevels = Object.fromEntries(Array.from({ length: level - 1 }, (_, i) => [i + 1, true]));
  g.startLevel(level);
  return { g, call: () => handlers['btnNextWaveEarly:click']() };
}

test('game: first wave auto-starts after the 15 s countdown', () => {
  const { g } = freshLevel(4);
  for (let t = 0; t < 14.8; t += 0.05) g.tick(0.05);
  assert.equal(g.waveFlow.launched, 0);
  for (let t = 0; t < 0.4; t += 0.05) g.tick(0.05);
  assert.equal(g.waveFlow.launched, 1);
  assert.ok(g.queue.length > 0 || g.enemies.length > 0);
});

test('game: calling the next wave mid-fight overlaps waves, pays the bonus and tags enemies by wave', async () => {
  const { g, call } = freshLevel(4);
  const gold0 = g.state.gold;
  call(); await Promise.resolve();
  assert.equal(g.waveFlow.launched, 1);
  assert.equal(g.state.gold, gold0 + 10, 'first-wave early bonus is capped at 10');
  for (let t = 0; t < 1; t += 0.05) g.tick(0.05);
  const queued = g.queue.length;
  const gold1 = g.state.gold;
  call(); await Promise.resolve();
  assert.equal(g.waveFlow.launched, 2);
  assert.equal(g.state.gold, gold1 + 20, 'mid-wave call pays the mid-wave bonus');
  assert.ok(g.queue.length > queued, 'second wave appended while the first is still spawning');
  assert.ok(g.queue.some(q => q.wave === 0) && g.queue.some(q => q.wave === 1));
  assert.equal(g.state.waveIndex, 1);
});

test('game: a level still ends in victory once all waves are cleared', () => {
  const { g } = freshLevel(1);
  // Strong defence on every socket so the simulation clears waves quickly.
  for (const s of g.sockets) if (!(s.crystalHp > 0)) s.tower = { typeKey: 'rapid', level: 3, branch: 'A', targetMode: 'first', cooldown: 0, frozenTimer: 0, angle: 0 };
  g.beginWaveAfterInterstitial();
  for (let t = 0; t < 400 && !g.state.levelEnded; t += 0.05) g.tick(0.05);
  assert.equal(g.state.levelEnded, true);
  assert.ok(g.state.baseHp > 0);
  assert.equal(g.waveFlow.launched, g.state.totalWaves);
});

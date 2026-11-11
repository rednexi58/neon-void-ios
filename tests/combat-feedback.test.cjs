const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createGame } = require('../scripts/headless-game.cjs');

function fresh(level) {
  const { api: g, handlers } = createGame(path.join(__dirname, '..'), 5);
  g.state.trainerCompletedOnce = true; g.state.unlockedLevel = level;
  g.state.completedLevels = Object.fromEntries(Array.from({ length: level - 1 }, (_, i) => [i + 1, true]));
  g.startLevel(level);
  return { g, call: () => handlers['btnNextWaveEarly:click']() };
}

test('hits mark the enemy for a flash and kills leave a burst ring', () => {
  const { g, call } = fresh(4);
  call();
  for (let i = 0; i < 40 && g.enemies.length === 0; i++) g.tick(0.05);
  const e = g.enemies[0];
  assert.ok(e, 'an enemy spawned');
  g.applyDamageToEnemy(e, 1, 0, true);
  assert.ok(e.hitFlashUntil > 0, 'hit flash timestamp set');
  const before = g.shockwaves.length;
  g.applyDamageToEnemy(e, 1e9, 0, true);
  assert.ok(e.dead);
  assert.ok(g.shockwaves.length > before, 'death burst ring added');
});

test('an undefended leak pulses the base-damage vignette, which then fades', () => {
  const { g, call } = fresh(1);
  call();
  const hp0 = g.state.baseHp;
  let peak = 0;
  for (let t = 0; t < 120 && g.state.baseHp === hp0; t += 0.05) g.tick(0.05);
  assert.ok(g.state.baseHp < hp0, 'base took damage');
  peak = g.state.baseHitFlash;
  assert.ok(peak > 0.3, `flash raised (${peak})`);
  g.state.waveStartPending = false;
  for (let t = 0; t < 1.5; t += 0.05) { g.state.baseHitFlash = Math.min(g.state.baseHitFlash, peak); g.tick(0.05); if (g.state.baseHp < hp0 - 1) break; }
  assert.ok(g.state.baseHitFlash < peak || g.state.baseHp < hp0 - 1, 'flash decays');
});

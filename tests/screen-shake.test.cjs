const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('screenShake decays even when game is paused, levelEnded, or waveStartPending', () => {
  const html = fs.readFileSync('www/index.html', 'utf8');
  const startIdx = html.indexOf('      function updateSimulation(dt) {');
  const endIdx = html.indexOf('        // Kurtarılan gezegenlerden saniyelik pasif Gear vergisi birikimi');
  assert.ok(startIdx > 0 && endIdx > startIdx);
  const snippet = html.slice(startIdx, endIdx) + '\n      }';

  for (const mode of [
    { paused: true, levelEnded: false, waveStartPending: false },
    { paused: false, levelEnded: true, waveStartPending: false },
    { paused: false, levelEnded: false, waveStartPending: true }
  ]) {
    const state = {
      screenShake: 7.5,
      ...mode
    };
    const ctx = vm.createContext({ state, roadFlowOffset: 0, Math });
    vm.runInContext(snippet, ctx);
    for (let i = 0; i < 30; i++) {
      ctx.updateSimulation(0.05);
    }
    assert.equal(state.screenShake, 0, 'screenShake must decay to 0 even while paused/ended/pending');
  }
});

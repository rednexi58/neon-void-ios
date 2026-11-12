// Regression: after a native fullscreen ad iOS leaves the AudioContext "interrupted" and the game went silent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup({ resumeWorks }) {
  const contexts = [], timers = [], listeners = {};
  const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; }, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), connect() {}, disconnect() {} });
  class Context {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 1000; this.destination = {}; this.resumeCalls = 0; contexts.push(this); }
    resume() { this.resumeCalls++; if (resumeWorks) this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; }
    createGain() { return node(); } createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return Object.assign(node(), Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(k => [k, param()]))); }
    createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
    createOscillator() { return { ...node(), start() {}, stop() {} }; }
    createBufferSource() { return this.createOscillator(); }
  }
  const doc = { hidden: false, addEventListener: (k, fn) => { (listeners[k] ||= []).push(fn); } };
  const win = { AudioContext: Context, addEventListener: (k, fn) => { (listeners['win:' + k] ||= []).push(fn); } };
  const ctx = { window: win, document: doc, setInterval: () => 1, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, Math };
  vm.runInNewContext(fs.readFileSync(require.resolve('../www/game-audio.js'), 'utf8'), ctx);
  const a = win.GameAudio; a.init();
  return { a, contexts, timers, listeners, doc, runTimers: () => { while (timers.length) timers.shift()(); } };
}

test('ad dismissal resumes an interrupted context', () => {
  const t = setup({ resumeWorks: true });
  t.a.setAdMuted(true);
  t.contexts[0].state = 'interrupted';
  t.a.setAdMuted(false);
  assert.equal(t.contexts[0].resumeCalls >= 1, true);
  t.runTimers();
  assert.equal(t.contexts.length, 1, 'no rebuild needed when resume works');
  assert.equal(t.a.ctx.state, 'running');
  assert.equal(t.a.master.gain.value, 1, 'master unmuted');
});

test('a context stuck after the ad is replaced by a fresh one', () => {
  const t = setup({ resumeWorks: false });
  t.a.setAdMuted(true);
  t.contexts[0].state = 'interrupted';
  t.a.setAdMuted(false);
  t.runTimers();
  assert.equal(t.contexts.length, 2, 'rebuilt');
  assert.equal(t.contexts[0].state, 'closed');
  assert.equal(t.a.ctx, t.contexts[1]);
  assert.ok(t.a.master && t.a.sfxBus && t.a.musicBus, 'graph rebuilt');
  assert.equal(t.a.activeSoundCount, 0);
});

test('no recovery attempts while the ad is still showing or app is hidden', () => {
  const t = setup({ resumeWorks: false });
  t.a.setAdMuted(true);
  t.contexts[0].state = 'interrupted';
  t.a.recover();
  t.doc.hidden = true; t.a.adMuted = false; t.a.recover();
  t.runTimers();
  assert.equal(t.contexts.length, 1);
});

test('tap, focus and returning to the app all retry', () => {
  const t = setup({ resumeWorks: true });
  for (const key of ['pointerdown', 'touchend', 'visibilitychange', 'win:focus', 'win:pageshow']) {
    t.contexts[0].state = 'suspended';
    const before = t.contexts[0].resumeCalls;
    t.listeners[key].forEach(fn => fn());
    assert.ok(t.contexts[0].resumeCalls > before, key);
  }
});

test('first tap after an ad rebuilds even if the context claims to be running', () => {
  const t = setup({ resumeWorks: true });
  t.a.setAdMuted(true);
  t.a.setAdMuted(false); // context still says "running"
  t.runTimers();
  assert.equal(t.contexts.length, 1);
  t.listeners.pointerdown.forEach(fn => fn());
  assert.equal(t.contexts.length, 2, 'rebuilt inside the gesture');
  t.listeners.pointerdown.forEach(fn => fn());
  assert.equal(t.contexts.length, 2, 'only once per ad');
});

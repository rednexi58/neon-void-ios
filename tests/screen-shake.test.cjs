const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('www/index.html', 'utf8');
function fn(name) {
  const start = html.indexOf(`      function ${name}(`);
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf('\n      }', start) + 8);
}
function run(source, context = {}) {
  const sandbox = vm.createContext(context);
  vm.runInContext(source, sandbox);
  return sandbox;
}
function menuContext() {
  const nodes = new Map();
  const document = { hidden: false, getElementById(id) {
    if (!nodes.has(id)) {
      const classes = new Set(['hidden']);
      const handlers = {};
      nodes.set(id, { textContent: '', classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) }, addEventListener: (event, fn) => handlers[event] = fn, click: () => handlers.click?.() });
    }
    return nodes.get(id);
  }};
  return run(`${fn('hasBlockingModalOpen')}\n${fn('resumeIfNoModalOpen')}`, {
    document, state: { paused: false, levelEnded: false, waveStartPending: false, gameSpeed: 1, lang: 'tr' },
    performance: { now: () => 4000 }, lastTime: 0
  });
}

test('all inline game JavaScript parses', () => {
  for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
});

test('heavy and medium haptics never introduce camera movement', () => {
  const calls = [];
  const g = run(fn('triggerHaptic'), { state: { screenShake: 0 }, navigator: { vibrate: v => calls.push(v) } });
  for (const strength of ['light', 'medium', 'heavy']) g.triggerHaptic(strength);
  assert.equal(calls.length, 3);
  assert.equal(g.state.screenShake, 0);
});

test('world transform stays identical through repeated shop/pause/reward transitions', () => {
  const calls = [];
  const render = fn('renderScene');
  const prefix = render.slice(0, render.indexOf('        const preset')) + '\nctx.restore(); return nowAnim;\n}';
  const g = run(prefix, {
    applyCanvasResize() {}, performance: { now: () => 1000 }, sceneAnimationTime: 2,
    canvas: { parentElement: { getBoundingClientRect: () => ({width: 390, height: 600}) } },
    state: { paused: false, screenShake: 7.5 },
    viewTransform: { dpr: 3, cssW: 390, cssH: 600, offsetX: 2.25, offsetY: 19.5, scale: .8 },
    ctx: { save(){}, restore(){}, setTransform(){}, fillRect(){}, translate: (...v) => calls.push(v), scale(){} }
  });
  for (let i = 0; i < 120; i++) { g.state.paused = i % 2 === 0; g.renderScene(); }
  for (const call of calls) assert.deepEqual(call, [2.25, 19.5]);
});

test('paused lightning renders exactly the same geometry until animation time advances', () => {
  let points = [];
  const g = run(fn('drawLightningArc'), { sceneAnimationTime: 4 });
  const ctx = { save(){}, restore(){}, beginPath(){}, moveTo(){}, stroke(){}, lineTo: (...p) => points.push(p) };
  g.drawLightningArc(ctx, 10, 20, 300, 400, '#fff'); const first = points;
  points = []; g.drawLightningArc(ctx, 10, 20, 300, 400, '#fff'); assert.deepEqual(points, first);
  g.sceneAnimationTime += .016;
  points = []; g.drawLightningArc(ctx, 10, 20, 300, 400, '#fff'); assert.notDeepEqual(points, first);
});

test('every blocking overlay freezes simulation, including tower info and privacy', () => {
  const g = menuContext();
  const update = fn('updateSimulation');
  vm.runInContext(update.slice(0, update.indexOf('        // Kurtarılan')) + '\n}', g);
  g.roadFlowOffset = 0;
  const modals = [...html.matchAll(/id="(modal[^"]+)"/g)].map(m => m[1]);
  for (const id of modals) {
    g.document.getElementById(id).classList.remove('hidden');
    g.updateSimulation(.05);
    assert.equal(g.roadFlowOffset, 0, id);
    g.document.getElementById(id).classList.add('hidden');
  }
  g.updateSimulation(.05); assert.ok(g.roadFlowOffset > 0);
});

test('closing shop respects lobby origin and an underlying pause menu', () => {
  const g = menuContext();
  const openStart = html.indexOf('      let shopReturnToLobby = false;');
  const end = html.indexOf('      // ============================================================================', openStart);
  g.openStartLobby = () => { g.state.paused = true; g.document.getElementById('modalStartLobby').classList.remove('hidden'); };
  vm.runInContext(html.slice(openStart, end), g);
  for (let i = 0; i < 30; i++) {
    g.openShop(true); g.document.getElementById('btnCloseShop').click();
    assert.equal(g.state.paused, true);
    assert.equal(g.document.getElementById('modalStartLobby').classList.contains('hidden'), false);
  }
  g.document.getElementById('modalStartLobby').classList.add('hidden');
  g.document.getElementById('modalPauseMenu').classList.remove('hidden');
  g.openShop(); g.document.getElementById('btnCloseShop').click(); assert.equal(g.state.paused, true);
  g.document.getElementById('modalPauseMenu').classList.add('hidden');
  g.openShop(); g.document.getElementById('btnCloseShop').click(); assert.equal(g.state.paused, false);
  assert.equal(g.lastTime, 4000);
  g.state.levelEnded = true;
  g.openShop(); g.document.getElementById('btnCloseShop').click(); assert.equal(g.state.paused, true);
});

test('visual clock freezes in shop and resumes without accumulating the time spent there', () => {
  const g = menuContext();
  g.requestAnimationFrame = () => {};
  g.updateSimulation = () => {};
  g.renderScene = () => {};
  g.console = { error: e => { throw e; } };
  g.sceneAnimationTime = 0;
  vm.runInContext(fn('gameLoop'), g);
  g.gameLoop(16); const before = g.sceneAnimationTime;
  g.document.getElementById('modalShop').classList.remove('hidden');
  for (let now = 32; now <= 4016; now += 16) g.gameLoop(now);
  assert.equal(g.sceneAnimationTime, before);
  g.document.getElementById('modalShop').classList.add('hidden');
  g.gameLoop(4032);
  assert.ok(Math.abs(g.sceneAnimationTime - before - .016) < 1e-9);
});

function canvasContext() {
  let rect = { width: 390, height: 600.49, left: 0, top: 80 };
  let writes = 0, width = 0, height = 0;
  const canvas = { parentElement: { getBoundingClientRect: () => rect }, getBoundingClientRect: () => rect,
    get width(){ return width; }, set width(v){ writes++; width = v; },
    get height(){ return height; }, set height(v){ writes++; height = v; } };
  const source = html.slice(html.indexOf('      const viewTransform ='), html.indexOf('      function drawLightningArc'));
  const g = run(source + '\nthis.view = viewTransform;', { canvas, state: { qualityMode: 'high' }, window: { devicePixelRatio: 3, addEventListener(){} }, VIRTUAL_W: 480, VIRTUAL_H: 800 });
  return { g, canvas, setRect: next => rect = { ...rect, ...next }, writes: () => writes };
}

test('resize observer noise does not reset the bitmap or move the map; rotation and quality still work', () => {
  const { g, canvas, setRect, writes } = canvasContext();
  g.applyCanvasResize(); const initial = {...g.view}; const initialWrites = writes();
  for (let i = 0; i < 100; i++) {
    setRect({ height: i % 2 ? 600.49 : 600.51 });
    g.resizeCanvas(); assert.equal(writes(), initialWrites, 'resize callback must not clear the drawn canvas');
    g.applyCanvasResize(); assert.deepEqual({...g.view}, initial);
  }
  assert.equal(writes(), initialWrites);
  setRect({ width: 600, height: 320 }); g.resizeCanvas(); g.applyCanvasResize();
  assert.equal(canvas.width, 1800); assert.equal(canvas.height, 960);
  const expected = { vx: 120, vy: 300 };
  const result = g.clientToVirtualCoords(g.view.offsetX + expected.vx * g.view.scale, 80 + g.view.offsetY + expected.vy * g.view.scale);
  assert.ok(Math.abs(result.vx - expected.vx) < 1e-9); assert.ok(Math.abs(result.vy - expected.vy) < 1e-9);
  g.state.qualityMode = 'performance'; g.resizeCanvas(); g.applyCanvasResize();
  assert.equal(canvas.width, 600); assert.equal(canvas.height, 320);
  setRect({ width: 0, height: 0 }); g.resizeCanvas(); g.applyCanvasResize();
  assert.equal(canvas.width, 600); assert.equal(canvas.height, 320);
});

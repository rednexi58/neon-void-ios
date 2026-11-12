const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../www/battle-units.js');

function enemy(x, y, extra = {}) { return { x, y, hp: 100, dead: false, flying: false, blockedBy: null, ...extra }; }
function env(log = []) {
  return {
    damageEnemy: (e, dmg) => { e.hp -= dmg; if (e.hp <= 0) e.dead = true; log.push(['hit', dmg]); },
    enemyDps: () => 10,
    onDeath: (u) => log.push(['death', u.id]),
    onRespawn: (u) => log.push(['respawn', u.id]),
    onShot: () => log.push(['shot'])
  };
}

test('a soldier walks to a ground enemy in reach and blocks it', () => {
  const s = U.create({ x: 100, y: 100, hp: 80, dmg: 10, rate: 2, reach: 70 });
  const e = enemy(140, 100);
  for (let i = 0; i < 30; i++) U.step([s], [e], 0.05, env());
  assert.equal(e.blockedBy, s);
  assert.ok(U.isBlocked(e));
  assert.ok(e.hp < 100, 'soldier deals damage');
  assert.ok(s.hp < 80, 'enemy hits back');
});

test('flying and out-of-reach enemies are ignored', () => {
  const s = U.create({ x: 100, y: 100, hp: 80, dmg: 10, reach: 60 });
  const fly = enemy(110, 100, { flying: true });
  const far = enemy(300, 300);
  U.step([s], [fly, far], 0.1, env());
  assert.equal(s.target, null);
  assert.equal(fly.blockedBy, null);
});

test('two soldiers block two different enemies before ganging up', () => {
  const a = U.create({ x: 100, y: 100, hp: 80, dmg: 1, offsetX: -8 });
  const b = U.create({ x: 100, y: 100, hp: 80, dmg: 1, offsetX: 8 });
  const e1 = enemy(110, 100), e2 = enemy(120, 104);
  U.step([a, b], [e1, e2], 0.05, env());
  assert.notEqual(a.target, b.target);
  const lone = enemy(105, 100);
  const c = U.create({ x: 100, y: 100, hp: 80, dmg: 1 });
  const d = U.create({ x: 100, y: 100, hp: 80, dmg: 1, offsetX: 10 });
  U.step([c, d], [lone], 0.05, env());
  assert.equal(c.target, lone);
  assert.equal(d.target, lone, 'a spare soldier joins the fight');
  assert.equal(lone.blockedBy, c, 'only one holder');
});

test('a fallen soldier frees the enemy and respawns at home', () => {
  const log = [];
  const s = U.create({ x: 100, y: 100, hp: 5, dmg: 1, rate: 1, respawnTime: 2 });
  const e = enemy(102, 100, { hp: 1000 });
  for (let i = 0; i < 20 && !s.dead; i++) U.step([s], [e], 0.1, env(log));
  assert.ok(s.dead);
  assert.equal(e.blockedBy, null);
  assert.ok(!U.isBlocked(e));
  for (let i = 0; i < 25; i++) U.step([s], [], 0.1, env(log));
  assert.equal(s.dead, false);
  assert.equal(s.hp, s.maxHp);
  assert.ok(log.some(l => l[0] === 'respawn'));
});

test('idle units walk home and heal; dead targets are released', () => {
  const s = U.create({ x: 100, y: 100, hp: 100, dmg: 200, rate: 5 });
  const e = enemy(110, 100, { hp: 50 });
  for (let i = 0; i < 10; i++) U.step([s], [e], 0.05, env());
  assert.ok(e.dead);
  s.hp = 40;
  for (let i = 0; i < 80; i++) U.step([s], [e], 0.1, env());
  assert.equal(s.target, null);
  assert.ok(Math.hypot(s.x - 100, s.y - 100) < 1);
  assert.ok(s.hp > 40);
});

test('heroes shoot flyers at range', () => {
  const log = [];
  const h = U.create({ kind: 'hero', x: 100, y: 100, hp: 200, dmg: 10, ranged: { range: 120, dmg: 7, rate: 2 } });
  const fly = enemy(180, 120, { flying: true });
  U.step([h], [fly], 0.6, env(log));
  assert.ok(log.some(l => l[0] === 'shot'));
  assert.equal(fly.hp, 93);
});

test('nearestOnPaths snaps a tap to the road', () => {
  const p = U.nearestOnPaths(150, 230, [[{ x: 100, y: 200 }, { x: 300, y: 200 }]]);
  assert.equal(p.x, 150); assert.equal(p.y, 200); assert.equal(p.d, 30);
});

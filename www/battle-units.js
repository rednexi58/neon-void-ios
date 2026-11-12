/*
 * BattleUnits — ground units that hold the road, Kingdom Rush style:
 * Drone Hangar troops and the player's hero.
 *
 * A unit guards a point (its rally/home). When a ground enemy comes within
 * reach it walks over, *blocks* it (the enemy stops moving) and fights until
 * one of them falls. Flying enemies cannot be blocked. A fallen unit respawns
 * at home after a delay. Heroes can also shoot at range, flyers included.
 *
 * The module is pure game logic: no drawing, no DOM, no globals. The game
 * passes callbacks for damage and effects, so the rules are unit tested and
 * the renderer only reads unit fields.
 *
 * Enemy contract: { x, y, dead, flying, blockedBy } — the game maps its own
 * enemy objects onto this (flying = arch.isFlying).
 */
(function (root) {
  "use strict";

  var nextId = 1;

  function create(opts) {
    return {
      id: nextId++,
      kind: opts.kind || "soldier",
      owner: opts.owner || null,
      homeX: opts.x, homeY: opts.y,
      x: opts.x + (opts.offsetX || 0), y: opts.y + (opts.offsetY || 0),
      offsetX: opts.offsetX || 0, offsetY: opts.offsetY || 0,
      maxHp: opts.hp, hp: opts.hp,
      dmg: opts.dmg, rate: opts.rate || 1, cd: 0,
      reach: opts.reach || 70,          // how far from home it will go to engage
      contact: opts.contact || 14,      // melee distance
      speed: opts.speed || 70,
      regen: opts.regen == null ? 0.06 : opts.regen,   // fraction of max hp per second when idle
      respawnTime: opts.respawnTime || 9,
      ranged: opts.ranged || null,      // { range, dmg, rate } — heroes
      rangedCd: 0,
      blocks: opts.blocks !== false,
      target: null, dead: false, respawnT: 0,
      moving: false, facing: 1, swing: 0
    };
  }

  function alive(e) { return !!e && !e.dead && (e.hp === undefined || e.hp > 0); }

  function release(u) {
    if (u.target && u.target.blockedBy === u) u.target.blockedBy = null;
    u.target = null;
  }

  function moveToward(u, tx, ty, dt) {
    var dx = tx - u.x, dy = ty - u.y;
    var d = Math.hypot(dx, dy);
    var step = u.speed * dt;
    if (d <= step || d < 0.5) { u.x = tx; u.y = ty; u.moving = false; return true; }
    u.x += dx / d * step;
    u.y += dy / d * step;
    if (Math.abs(dx) > 0.5) u.facing = dx > 0 ? 1 : -1;
    u.moving = true;
    return false;
  }

  /** Pick the ground enemy this unit should engage, or null. */
  function pickTarget(u, enemies) {
    var free = null, freeD = Infinity, shared = null, sharedD = Infinity;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!alive(e) || e.flying) continue;
      var dHome = Math.hypot(e.x - u.homeX, e.y - u.homeY);
      if (dHome > u.reach) continue;
      var d = Math.hypot(e.x - u.x, e.y - u.y);
      var holder = e.blockedBy;
      if (!holder || holder.dead || holder.target !== e) {
        if (d < freeD) { free = e; freeD = d; }
      } else if (d < sharedD) {
        shared = e; sharedD = d;
      }
    }
    return free || shared;
  }

  /**
   * Advance every unit by dt.
   * env: {
   *   damageEnemy(enemy, amount, unit)   — apply melee/ranged damage
   *   enemyDps(enemy) -> number          — damage per second an enemy deals in melee
   *   onShot?(unit, enemy)               — ranged attack visual
   *   onDeath?(unit)                     — unit fell
   *   onRespawn?(unit)
   * }
   */
  function step(units, enemies, dt, env) {
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.dead) {
        u.respawnT -= dt;
        if (u.respawnT <= 0) {
          u.dead = false;
          u.hp = u.maxHp;
          u.x = u.homeX + u.offsetX;
          u.y = u.homeY + u.offsetY;
          if (env.onRespawn) env.onRespawn(u);
        }
        continue;
      }
      u.swing = Math.max(0, u.swing - dt * 4);
      if (u.target && (!alive(u.target) || u.target.flying || Math.hypot(u.target.x - u.homeX, u.target.y - u.homeY) > u.reach + 40)) release(u);
      if (!u.target && u.blocks) {
        var t = pickTarget(u, enemies);
        if (t) {
          u.target = t;
          if (!t.blockedBy || t.blockedBy.dead || t.blockedBy.target !== t) t.blockedBy = u;
        }
      }
      if (u.target) {
        var e = u.target;
        var side = e.blockedBy === u ? 0 : (u.offsetX >= 0 ? 1 : -1);
        var ax = e.x + side * (u.contact + 4), ay = e.y + (side ? 3 : 0);
        var arrived = moveToward(u, ax, ay, dt) || Math.hypot(e.x - u.x, e.y - u.y) <= u.contact + 6;
        if (arrived) {
          u.facing = e.x >= u.x ? 1 : -1;
          u.cd -= dt;
          if (u.cd <= 0) {
            u.cd = 1 / u.rate;
            u.swing = 1;
            env.damageEnemy(e, u.dmg, u);
          }
          if (e.blockedBy === u) {
            u.hp -= env.enemyDps(e) * dt;
            if (u.hp <= 0) {
              u.hp = 0;
              release(u);
              u.dead = true;
              u.respawnT = u.respawnTime;
              if (env.onDeath) env.onDeath(u);
              continue;
            }
          }
        }
      } else {
        moveToward(u, u.homeX + u.offsetX, u.homeY + u.offsetY, dt);
        if (!u.moving) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.regen * dt);
      }
      if (u.ranged) {
        u.rangedCd -= dt;
        if (u.rangedCd <= 0) {
          var best = null, bestD = u.ranged.range;
          for (var k = 0; k < enemies.length; k++) {
            var en = enemies[k];
            if (!alive(en)) continue;
            var dd = Math.hypot(en.x - u.x, en.y - u.y);
            if (dd <= bestD) { best = en; bestD = dd; }
          }
          if (best) {
            u.rangedCd = 1 / u.ranged.rate;
            if (env.onShot) env.onShot(u, best);
            env.damageEnemy(best, u.ranged.dmg, u);
          }
        }
      }
    }
  }

  /** Is this enemy currently held in place by a living unit? */
  function isBlocked(e) {
    var b = e.blockedBy;
    return !!(b && !b.dead && b.target === e);
  }

  /** Free every enemy a set of units was holding (e.g. tower sold). */
  function releaseAll(units) { units.forEach(release); }

  /** Closest point on any path to (x, y): { x, y, d }. */
  function nearestOnPaths(x, y, paths) {
    var best = { x: x, y: y, d: Infinity };
    for (var p = 0; p < paths.length; p++) {
      var path = paths[p];
      for (var i = 0; i < path.length - 1; i++) {
        var a = path[i], b = path[i + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var len2 = dx * dx + dy * dy;
        var t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)) : 0;
        var px = a.x + t * dx, py = a.y + t * dy;
        var d = Math.hypot(x - px, y - py);
        if (d < best.d) best = { x: px, y: py, d: d };
      }
    }
    return best;
  }

  var api = { create: create, step: step, isBlocked: isBlocked, releaseAll: releaseAll, release: release, nearestOnPaths: nearestOnPaths, pickTarget: pickTarget };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BattleUnits = api;
})(typeof window !== "undefined" ? window : globalThis);

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createGame}=require('../scripts/headless-game.cjs');
const {verify}=require('../scripts/verify-release.cjs');
test('shipped UI displays both prices and all four real buttons charge them without any completed level',()=>{
  for(const [skill,button] of [['dmgLv','btnUpSkillDmg'],['rateLv','btnUpSkillRate'],['hpLv','btnUpSkillHp'],['goldLv','btnUpSkillGold']]) {
    const {api:g,elements,handlers}=createGame();
    g.state.completedLevels={};g.state.gear=1000;g.state.cyberCore=100;
    g.renderHUD();assert.equal(elements.get(button).textContent,'Geliştir (65 ⚙ + 5 💎)');
    assert.equal(elements.get(button).disabled,false);
    handlers[button+':click']();
    assert.equal(g.state.skills[skill],2);assert.equal(g.state.gear,935);assert.equal(g.state.cyberCore,95);
    g.renderHUD();assert.equal(elements.get(button).textContent,'Geliştir (100 ⚙ + 9 💎)');
    handlers[button+':click']();assert.equal(g.state.gear,835);assert.equal(g.state.cyberCore,86);
    g.state.skills[skill]=50;g.renderHUD();assert.equal(elements.get(button).disabled,false);
  }
});
test('existing progress uses saved ranks; insufficient gems cannot buy a free upgrade',()=>{
  const {api:g,elements,handlers}=createGame();
  g.state.completedLevels={};g.state.skills.dmgLv=5;g.state.gear=1000;g.state.cyberCore=20;
  g.renderHUD();assert.equal(elements.get('btnUpSkillDmg').textContent,'Geliştir (205 ⚙ + 21 💎)');
  handlers['btnUpSkillDmg:click']();assert.equal(g.state.skills.dmgLv,5);assert.equal(g.state.gear,1000);assert.equal(g.state.cyberCore,20);
  g.state.cyberCore=21;handlers['btnUpSkillDmg:click']();assert.equal(g.state.skills.dmgLv,6);assert.equal(g.state.gear,795);assert.equal(g.state.cyberCore,0);
});
test('a stale balance file cannot silently ship with a new UI',()=>{
  assert.equal(verify().revision,'2026.10.25.4');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gk-release-'));
  try {
    fs.cpSync('www',dir,{recursive:true});
    fs.copyFileSync('www/game-balance.js',path.join(dir,'game-balance.js'));
    fs.appendFileSync(path.join(dir,'game-balance.js'),'\n// stale file');
    assert.throws(()=>verify(dir),/Mixed old\/new/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

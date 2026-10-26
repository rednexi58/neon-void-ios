const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../www/game-balance.js');
const {createGame}=require('../scripts/headless-game.cjs');
test('real drone button charges 500/100/110/121/134 and blocks the sixth purchase',()=>{
 const {api:g,handlers,elements}=createGame();g.state.cyberCore=2000;g.state.gear=100;
 for(const cost of [500,100,110,121,134]){
  g.renderHUD();assert(elements.get('btnUpSkillDrone').textContent.includes(cost+' 💎'));
  const before=g.state.cyberCore;handlers['btnUpSkillDrone:click']();assert.equal(before-g.state.cyberCore,cost);
 }
 g.renderHUD();assert.equal(elements.get('btnUpSkillDrone').disabled,true);assert.equal(g.drones.length,5);
 handlers['btnUpSkillDrone:click']();assert.equal(g.state.cyberCore,1035);assert.equal(g.state.skills.droneLv,5);assert.equal(g.state.gear,100);
});
test('insufficient drone unlock balance is never charged',()=>{const {api:g,handlers}=createGame();g.state.cyberCore=499;handlers['btnUpSkillDrone:click']();assert.equal(g.state.cyberCore,499);assert.equal(g.drones.length,0);});
test('saved 20-drone fleet migrates to five with a durable one-time refund',()=>{
 const {api:g,sandbox}=createGame();sandbox.localStorage.setItem('GezegeniKoru_Save_v4',JSON.stringify({skills:{droneLv:20},balanceRevision:2,cyberCore:80,gear:900,purchaseTransactions:{receipt:115}}));
 assert(g.loadProgress());g.saveProgress();assert.equal(g.state.cyberCore,4175);assert.equal(g.state.skills.droneLv,5);assert.equal(g.state.gear,900);
 assert(g.loadProgress());assert.equal(g.state.cyberCore,4175);assert.equal(g.state.purchaseTransactions.receipt,115);
});
test('all campaign and consolation Gear payouts are 60% of previous final rewards',()=>{
 const g=createGame().api;for(const level of [1,10,50,100,200])for(const bounty of [0,10]){
  g.state.skills.bountyLv=bounty;g.startLevel(level);const d=B.difficulty(level),before=g.state.gear;
  const previous=Math.round((d.gearReward+Math.round(d.gearReward*.2))*g.getBountyMultiplier());
  g.handleLevelVictory();assert.equal(g.state.gear-before,Math.round(previous*.6));assert.equal(g.state.lastEarnedGear,Math.round(previous*.6));
  g.startLevel(level);const start=g.state.gear;g.handleGameOver();assert.equal(g.state.gear-start,Math.round(Math.round(d.gearReward*.25)*.6));
 }
});
test('daily, mission and idle rates are reduced once; gem rewards stay unchanged',()=>{
 const g=createGame().api;assert.deepEqual(Array.from(g.DAILY_MISSIONS,m=>m.rewardGear),[42,36,54,60]);assert.deepEqual(Array.from(g.DAILY_REWARDS_TABLE,m=>m.gear),[30,0,54,0,90,0,180]);
 const gear=g.state.gear;g.grantDailyReward(2);assert.equal(g.state.gear-gear,60);g.grantDailyReward(2);assert.equal(g.state.gear-gear,60);
 g.startLevel(1);g.state.paused=false;const before=g.state.idleTaxAccumulated;g.tick(.1);assert(Math.abs(g.state.idleTaxAccumulated-before-.1*(.35+.12)*.6)<1e-9);
});
test('patrol uses varied distances, bounded speed, and never leaves the map on 200 maps',()=>{
 const g=createGame().api;
 for(let level=1;level<=200;level++){
  g.startLevel(level);const path=g.paths[0],nexus=path[path.length-1];
  const drones=Array.from({length:5},(_,index)=>({x:Math.max(24,Math.min(516,nexus.x)),y:Math.max(150,Math.min(776,nexus.y)),heading:0}));
  for(let frame=0;frame<180;frame++)for(let i=0;i<5;i++){
   const dr=drones[i],old={...dr};B.moveDrone(dr,i,nexus,[],1/30);
   assert(dr.x>=24&&dr.x<=516&&dr.y>=150&&dr.y<=776);assert(Math.hypot(dr.x-old.x,dr.y-old.y)<3.2);
  }
  assert(new Set(drones.map(d=>d.x.toFixed(1)+','+d.y.toFixed(1))).size>=4);
 }
 const dr={x:400,y:700},nexus={x:400,y:700},radii=[];for(let f=0;f<600;f++){B.moveDrone(dr,0,nexus,[],1/30);if(f>90)radii.push(Math.hypot(dr.x-400,dr.y-700));}assert(Math.max(...radii)-Math.min(...radii)>30);
});
test('drones intercept nearby living enemies and resume patrol after they leave',()=>{
 const dr={x:400,y:700},nexus={x:400,y:700},enemy={x:350,y:600,dead:false};
 for(let i=0;i<120;i++)B.moveDrone(dr,0,nexus,[enemy],1/60);
 assert(dr.engaging);assert(Math.hypot(dr.x-enemy.x,dr.y-enemy.y)<60);
 enemy.dead=true;B.moveDrone(dr,0,nexus,[enemy],1/60);assert.equal(dr.engaging,false);
});

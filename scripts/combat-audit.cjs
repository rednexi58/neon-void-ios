const {createGame}=require('./headless-game.cjs');
const path=require('node:path');
const coverageCache=new WeakMap();
function coverage(g,s,range){let cache=coverageCache.get(g);if(!cache){cache=new Map();coverageCache.set(g,cache);}const key=s.x+','+s.y+','+range;if(cache.has(key))return cache.get(key);let value=0;for(const p of g.paths){for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],len=Math.hypot(b.x-a.x,b.y-a.y);for(let d=0;d<len;d+=25){const t=d/len,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(Math.hypot(x-s.x,y-s.y)<=range)value+=25;}}}cache.set(key,value);return value;}
function shop(g) {
  const choices=[];const types=['emp','rapid','cryo','railgun','repair','plasma'];
  const count={};for(const s of g.sockets)if(s.tower)count[s.tower.typeKey]=(count[s.tower.typeKey]||0)+1;
  for(const s of g.sockets){
    if(s.crystalHp>0)continue;
    for(const key of s.tower?[s.tower.typeKey]:types){const def=g.TOWER_TYPES[key];if(def.unlockLevel>g.state.level)continue;
      const lv=s.tower?s.tower.level:0;if(lv>=3)continue;
      const next=def.levels[lv],prev=lv?def.levels[lv-1]:null,cost=next.cost;
      if(cost>g.state.gold)continue;
      const factor=key==='emp'?2.5:key==='cryo'?(count.cryo?1:6):key==='repair'?(count.repair?.6:4):key==='plasma'?1.9:1;
      const dps=next.damage*next.fireRate-(prev?prev.damage*prev.fireRate:0);
      const cov=coverage(g,s,next.range);
      const nearby=g.sockets.filter(other=>other.tower&&Math.hypot(other.x-s.x,other.y-s.y)<130).length;
      const score=dps*factor/cost*(cov/150)/(lv?1:1+nearby*.12);
      choices.push({s,key,lv,cost,score});
    }
  }
  choices.sort((a,b)=>b.score-a.score);
  const a=choices[0];if(!a)return false;
  g.state.gold-=a.cost;
  if(a.lv)a.s.tower.level++;else a.s.tower={typeKey:a.key,level:1,branch:'A',targetMode:'first',cooldown:0,frozenTimer:0,angle:0};
  return true;
}
function simulate(root,level,mode,seed) {
  const {api:g}=createGame(root,seed);g.state.qualityMode='performance';g.state.trainerCompletedOnce=true;
  g.state.unlockedLevel=level;g.state.completedLevels=Object.fromEntries(Array.from({length:level-1},(_,i)=>[i+1,true]));
  const balanceFile=path.join(root,'www/game-balance.js');const b=require('node:fs').existsSync(balanceFile)?require(balanceFile):null;
  if(mode==='paid'){
    if(b)for(const k of Object.keys(b.skills))g.state.skills[k]=b.limit(g.state,k);
    else Object.assign(g.state.skills,{dmgLv:21,rateLv:21,hpLv:11,goldLv:11,critLv:20,droneLv:6,bountyLv:10,orbitalLv:8});
  } else if(mode==='free'){
    // Estimated modest progression, no ads, no purchases, no emergency/orbital buttons.
    Object.assign(g.state.skills,{dmgLv:Math.min(21,1+Math.floor(level/8)),rateLv:Math.min(21,1+Math.floor(level/10)),hpLv:Math.min(11,1+Math.floor(level/18)),goldLv:Math.min(11,1+Math.floor(level/18)),critLv:Math.min(20,Math.floor(level/18)),droneLv:Math.min(6,Math.floor(level/30)),bountyLv:Math.min(10,Math.floor(level/25)),orbitalLv:0});
  }
  g.state.heroProgress.vega.lv=mode==='paid'?(b?b.heroLimit(g.state):10):Math.min(10,1+Math.floor(level/20));
  g.startLevel(level);while(shop(g)){};g.beginWaveAfterInterstitial();
  let t=0,nextBuy=0;
  for(;t<900&&!g.state.levelEnded;t+=.05){if(t>=nextBuy){while(shop(g)){};nextBuy=t+.5;}g.tick(.05);}
  return {level,mode,seed,win:g.state.levelEnded&&g.state.baseHp>0,seconds:Math.round(t),hp:g.state.baseHp,wave:g.state.waveIndex+1,towers:g.sockets.filter(s=>s.tower).length};
}
module.exports={simulate,shop,coverage};
if(require.main===module){const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));const levels=(process.argv[3]||'1,5,6,10,25,50,100,150,200').split(',').map(Number);for(const lv of levels)for(const mode of ['free','paid'])console.log(JSON.stringify(simulate(root,lv,mode,17)));}

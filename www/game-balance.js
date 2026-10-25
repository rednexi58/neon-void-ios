(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameBalance = api;
})(typeof window === 'object' ? window : globalThis, function() {
  'use strict';
  const skills = {
    dmgLv: {base:1,max:21,gear:60,step:25}, rateLv: {base:1,max:21,gear:60,step:25},
    hpLv: {base:1,max:11,gear:70,step:45}, goldLv: {base:1,max:11,gear:80,step:45},
    droneLv: {base:0,max:6,core:12,step:8}, critLv: {base:0,max:20,core:3,step:2},
    bountyLv: {base:0,max:10,core:6,step:3}, orbitalLv: {base:0,max:8,core:8,step:4}
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?Math.floor(+v):a));
  function cleared(state) {return Object.keys(state.completedLevels||{}).filter(k=>+k>=1&&+k<=200&&state.completedLevels[k]).length;}
  function level(state,key) {const s=skills[key];return clamp(state.skills[key],s.base,s.max);}
  function limit(state,key) {
    const s=skills[key], n=cleared(state);
    const steps= key==='droneLv' ? (n<5?0:1+Math.floor((n-5)/25))
      : key==='critLv'?1+Math.floor(n/8)
      : key==='orbitalLv'?1+Math.floor(n/20)
      : s.max-s.base===10?2+Math.floor(n/15):2+Math.floor(n/8);
    return Math.min(s.max,s.base+steps);
  }
  function cost(state,key) {const s=skills[key],n=level(state,key)-s.base;return s.base ? {gear:s.gear+n*s.step,core:0} : {gear:0,core:s.core+n*s.step};}
  function canUpgrade(state,key) {return !!skills[key]&&level(state,key)<limit(state,key);}
  function nextUnlock(state,key) {for(let n=cleared(state)+1;n<=200;n++){const copy={...state,completedLevels:Object.fromEntries(Array.from({length:n},(_,i)=>[i+1,true]))};if(limit(copy,key)>level(state,key))return n;}return null;}
  function heroLimit(state) {return Math.min(10,2+Math.floor(cleared(state)/20));}
  function heroCost(lv) {return 20+(clamp(lv,1,10)-1)*10;}
  function heroXp(lv) {return 6+(clamp(lv,1,10)-1)*2;}
  function difficulty(levelNum,waveIndex=0) {
    const lv=clamp(levelNum,1,200), boss=lv%10===0,mini=lv>5&&lv%5===0&&!boss;
    const waves=lv<=3?3:Math.min(8,4+Math.floor((lv-4)/35)+(boss?1:0));
    const t=Math.max(0,lv-5);
    const curve=lv<=5?.65+.11*(lv-1):1.09+.026*t+.000065*t*t;
    const hpMult=+(curve*(1+Math.min(30,waveIndex)*(lv<=5?.035:.04))).toFixed(2);
    const baseBudget=lv<=5?5.5+lv*1.35:12.25+Math.sqrt(t)*2.5+t*.16;
    const progress=Math.min(1,waveIndex/Math.max(1,waves-1));
    return {level:lv,totalWaves:waves,isBossLevel:boss,isMiniBossLevel:mini,hpMult,
      armorBonus:lv<=5?0:Math.min(.18,.012*Math.sqrt(t)),
      threatBudget:Math.round(baseBudget*(.84+.58*progress)),
      gearReward:Math.round(45+lv*4+Math.log2(lv+1)*10),coreReward:boss?5:mini?3:2,
      parTimeSeconds:Math.round(waves*(36+Math.min(10,lv*.05))+(boss?20:0))};
  }
  function campaignReward(state,diff) {const first=!state.completedLevels[state.level];return {core:first?diff.coreReward:1,first};}
  function cumulative(base,step,n) {return n*base+step*n*(n-1)/2;}
  function migrate(state) {
    if(state.balanceRevision>=1)return 0;
    let refund=0;
    for(const [key,s] of Object.entries(skills)) {
      const old=clamp(state.skills[key],s.base,10000),n=old-s.base,kept=Math.min(old,s.max)-s.base;
      const oldBase=s.base?5:key==='droneLv'?33:key==='bountyLv'?20:26;
      const oldStep=s.base?4:key==='droneLv'?20:13;
      const newSpent=s.base?0:cumulative(s.core,s.step,kept);
      refund+=Math.max(0,cumulative(oldBase,oldStep,n)-newSpent);
      state.skills[key]=Math.min(old,s.max);
    }
    state.cyberCore+=refund;
    state.balanceRevision=1;
    return refund;
  }
  function distanceToSegment(p,a,b) {const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function pathDistance(p,paths) {let best=Infinity;for(const path of paths)for(let i=1;i<path.length;i++)best=Math.min(best,distanceToSegment(p,path[i-1],path[i]));return best;}
  const socketCache = new Map();
  function placeSockets(original,paths) {
    const cacheKey = JSON.stringify([original,paths]);
    if (socketCache.has(cacheKey)) return socketCache.get(cacheKey).map(s=>({...s}));
    const result=[],ends=paths.flatMap(p=>[p[0],p[p.length-1]]);
    const gate=paths[2]?.[0];
    if(gate)ends.push({x:Math.max(72,Math.min(468,gate.x+(gate.x<270?54:-54))),y:Math.max(128,Math.min(700,gate.y+32))});
    for(const socket of original) {
      let best=null,score=Infinity;
      for(let y=150;y<=700;y+=8)for(let x=70;x<=470;x+=8) {
        const p={x,y},d=pathDistance(p,paths);
        if(d<42||d>86||result.some(s=>Math.hypot(x-s.x,y-s.y)<60)||ends.some(s=>Math.hypot(x-s.x,y-s.y)<58))continue;
        const s=Math.hypot(x-socket.x,y-socket.y)+Math.abs(d-62)*.4;
        if(s<score){best=p;score=s;}
      }
      if(!best)throw new Error('No safe tower position for socket '+socket.id);
      result.push({...socket,...best});
    }
    if (socketCache.size >= 24) socketCache.clear();
    socketCache.set(cacheKey,result.map(s=>({...s})));
    return result;
  }
  return {skills,cleared,level,limit,cost,canUpgrade,nextUnlock,heroLimit,heroCost,heroXp,difficulty,campaignReward,migrate,distanceToSegment,pathDistance,placeSockets};
});

const B=require('../www/game-balance.js');
// A reproducible estimate: first clears at two stars, no ads/dailies/replays/speed bonus.
function makeProfile(level,extraGems=0){
 const s={gear:35,cyberCore:5+extraGems,skills:Object.fromEntries(Object.entries(B.skills).map(([k,v])=>[k,v.base])),heroProgress:{vega:{lv:Math.min(10,1+Math.floor((level-1)/25)),xp:(level-1)%25}},completedLevels:{}};
 const initial={gear:s.gear,gems:s.cyberCore};
 const utility=k=>{const n=B.level(s,k)-B.skills[k].base;return k==='goldLv'?.075/(1+n*.06):k==='hpLv'?.035/(1+n*.1):k==='droneLv'?.11/(1+n*.11):k==='bountyLv'?.045/(1+n*.05):k==='critLv'?.00325/(1+n*.00325):.01/(1+n*.01);};
 function spend(){for(let purchases=0;purchases<5000;purchases++){
  const choices=['dmgLv','rateLv','hpLv','goldLv','droneLv','bountyLv','critLv'].filter(k=>B.canUpgrade(s,k)).map(k=>({k,c:B.cost(s,k)})).filter(x=>x.c.core<=s.cyberCore&&x.c.gear<=s.gear).map(x=>({...x,score:utility(x.k)/(x.c.core+x.c.gear/25)})).sort((a,b)=>b.score-a.score);
  const a=choices[0];if(!a)break;s.skills[a.k]++;s.gear-=a.c.gear;s.cyberCore-=a.c.core;
 }}
 spend();
 for(let lv=1;lv<level;lv++){const d=B.difficulty(lv);s.gear+=d.gearReward;s.cyberCore+=d.coreReward+2;initial.gear+=d.gearReward;initial.gems+=d.coreReward+2;s.completedLevels[lv]=true;spend();}
 return {...s,initial};
}
module.exports={makeProfile};

// Runs the shipped game logic in Node with UI/audio/native services stubbed.
// This is a deterministic combat model, not a browser or device test.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function createGame(root = path.resolve(__dirname, '..'), seed = 1) {
  const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
  const elements = new Map(), handlers = {};
  const noop = () => {};
  const drawing = new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(['hidden']);
      elements.set(id, {id, textContent:'', innerHTML:'', value:'1', style:{}, dataset:{}, children:[], checked:false,
        width:390,height:600,clientWidth:390,clientHeight:600,
        classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,v){v?classes.add(c):classes.delete(c);}},
        addEventListener:(e,fn)=>handlers[id+':'+e]=fn, appendChild:noop, remove:noop, setAttribute:noop,
        getAttribute:()=>null, querySelector:()=>element('child'), querySelectorAll:()=>[],
        getBoundingClientRect:()=>({width:390,height:600,left:0,top:0}),getContext:()=>drawing});
    }
    return elements.get(id);
  }
  element('gameCanvas').parentElement=element('canvasContainer');
  const storage = new Map();
  const random = Object.create(Math);
  random.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const sandbox = vm.createContext({console,Math:random, Date,JSON,Number,Array,Object,Set,Map,Promise,
    document:{hidden:false,getElementById:element,querySelectorAll:()=>[],querySelector:()=>element('query'),addEventListener:noop,createElement:()=>element('new'),createTreeWalker:()=>({nextNode:()=>null}),body:element('body')},
    NodeFilter:{SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1},Node:{TEXT_NODE:3},
    navigator:{onLine:true,vibrate:noop},performance:{now:()=>0},setInterval:()=>1,clearInterval:noop,setTimeout:()=>1,clearTimeout:noop,requestAnimationFrame:noop,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    window:{devicePixelRatio:1,addEventListener:noop,GameMonetization:{onVipChange:noop,onVipPrice:noop,onGemPrices:noop,onGemGranted:noop,onCatalogChange:noop,getDebugInfo:()=>({testAds:false}),configure:noop,onCatalog:noop,onDiagnostics:noop,subscribe:noop,preloadAds:noop,isInterstitialDue:()=>false,getDiagnostics:()=>({testAds:false})}}
  });
  for (const name of ['game-balance.js','game-audio.js']) {
    if(name==='game-balance.js' && html.includes('<!-- BALANCE START -->')) continue;
    const file=path.join(root,'www',name);if(fs.existsSync(file)) vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
  }
  let source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  source=source.replace(/\}\)\(\);\s*$/, `
    for(const k of Object.keys(SoundFX)) if(typeof SoundFX[k]==='function') SoundFX[k]=()=>{};
    const renderHUD=updateHUD;
    updateHUD=updateSocketInspector=updateWaveBannerUI=updateTrainerUI=updateTowerUnlockBadges=populatePlayerLevelDropdown=updateLobbyUI=renderMissionsAndHeroesModal=()=>{};
    showToast=spawnParticles=()=>{};
    progressHealthy=true;
    globalThis.game={state,SoundFX,renderHUD,TOWER_TYPES,ENEMY_ARCHETYPES,SECTOR_PRESETS,calculateDifficulty,getHeroInfo,getStartingGold,getMaxBaseHp,syncAutonomousDrones,getCritChance,getDmgMultiplier,getRateMultiplier,getBountyMultiplier,getBaseSkillCost,getEliteSkillCoreCost,tryUpgradeSkill,applyDamageToEnemy,startLevel,buildWaveQueue,beginWaveAfterInterstitial,updateSimulation,saveProgress,loadProgress,handleLevelVictory,handleGameOver,grantDailyReward,DAILY_MISSIONS,DAILY_REWARDS_TABLE,refreshDailyMissions,getTodayKey,drawCombatDrone,
      get sockets(){return SOCKETS;},get paths(){return ACTIVE_PATHS;},get enemies(){return activeEnemies;},get drones(){return autonomousDrones;},get texts(){return floatingTexts;},
      tick(dt){ updateSimulation(dt); floatingTexts=[]; particles=[]; },
      get waveActive(){return waveInProgress;},get queue(){return spawnQueue;}};
  })();`);
  vm.runInContext(source,sandbox);
  return { ...sandbox.game, api:sandbox.game, sandbox, elements, handlers };
}
module.exports={createGame};
if(require.main===module){const {api:g}=createGame(process.argv[2]);g.startLevel(1);console.log(g.calculateDifficulty(6),g.sockets.length);}

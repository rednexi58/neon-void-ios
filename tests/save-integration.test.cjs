const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {commitGrant}=require('../purchase-delivery.cjs');
const html=fs.readFileSync('www/index.html','utf8');
const source=html.slice(html.indexOf('      let progressHealthy = false;'),html.indexOf('      // KURAL: Siber Evrim'));
function game(storage) {
  const state={cyberCore:5,purchaseTransactions:{}, skills:{},heroProgress:{},stats:{},completedLevels:{},unlockedLevel:1};
  const ctx=vm.createContext({state,localStorage:storage,SoundFX:{},console:{error(){}}});
  vm.runInContext(source+'\nglobalThis.api={loadProgress,saveProgress};',ctx); return {state,...ctx.api};
}
test('actual game save atomically stores balance and ledger, survives legacy mirror failure',()=> {
  const data=new Map();
  const storage={getItem:k=>data.get(k)||null,setItem(k,v){if(k.endsWith('_v3')) throw new Error('mirror failed');data.set(k,v);}};
  const g=game(storage); assert.equal(g.loadProgress(),true);
  commitGrant(g.state,{transactionId:'apple-123',totalGems:7000},()=>g.saveProgress(true));
  const restored=game(storage);assert.equal(restored.loadProgress(),true);
  assert.equal(restored.state.cyberCore,7005);
  assert.equal(commitGrant(restored.state,{transactionId:'apple-123',totalGems:7000},()=>restored.saveProgress(true)),false);
  assert.equal(restored.state.cyberCore,7005);
});
test('corrupt save is preserved and blocks new writes',()=> {
  let writes=0;
  const g=game({getItem:()=>'{broken',setItem(){writes++;}});
  assert.equal(g.loadProgress(),false);assert.equal(g.saveProgress(),false);assert.equal(writes,0);
  assert.throws(()=>g.saveProgress(true));
});
test('canonical save failure rolls back actual purchase and keeps prior data',()=> {
  const g=game({getItem:()=>null,setItem(){throw new Error('quota');}});g.loadProgress();
  assert.throws(()=>commitGrant(g.state,{transactionId:'x',totalGems:50},()=>g.saveProgress(true)));
  assert.equal(g.state.cyberCore,5);assert.equal(Object.keys(g.state.purchaseTransactions).length,0);
});

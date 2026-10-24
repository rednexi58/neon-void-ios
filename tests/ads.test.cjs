const {test} = require('node:test');
const assert = require('node:assert/strict');
const {presentAd} = require('../ad-presentation.cjs');
const events = {Rewarded:'reward',Dismissed:'close',FailedToShow:'fail'};
async function scenario(run, rewarded=true) {
  const handlers = new Map();
  const sdk={addListener:async (name, handler)=> { handlers.set(name,handler); return {remove:async()=>handlers.delete(name)}; }};
  const result=await presentAd({sdk,events,rewarded,show:()=>run((name,value)=>handlers.get(name)?.(value))});
  assert.equal(handlers.size,0); return result;
}
test('closing an unrewarded video resumes game even if native promise never resolves', async()=> {
  assert.equal(await scenario(emit=> {emit('close');return new Promise(()=>{});}),false);
});
test('only earned reward followed by dismissal grants reward',async()=> {
  assert.equal(await scenario(emit=> {emit('reward',{amount:1});emit('close');return {amount:1};}),true);
});
test('presentation error returns false and removes listeners',async()=> {
  assert.equal(await scenario(()=>Promise.reject(new Error('unavailable'))),false);
  assert.equal(await scenario(emit=>{emit('fail');return new Promise(()=>{});}),false);
});
test('interstitial completes on dismissal',async()=> {
  assert.equal(await scenario(emit=>{emit('close');},false),true);
});

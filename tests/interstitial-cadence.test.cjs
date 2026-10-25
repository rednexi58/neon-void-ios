const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {isInterstitialDue}=require('../interstitial-cadence.cjs');
const state=overrides=>({removeAds:false,endlessMode:false,waveIndex:0,adClears:0,lastInterstitialClear:0,...overrides});
test('interstitial is due after three completed levels, then another three',()=>{
  for(const clears of [0,1,2]) assert.equal(isInterstitialDue(state({adClears:clears})),false);
  assert.equal(isInterstitialDue(state({adClears:3})),true);
  for(const clears of [3,4,5]) assert.equal(isInterstitialDue(state({adClears:clears,lastInterstitialClear:3})),false);
  assert.equal(isInterstitialDue(state({adClears:6,lastInterstitialClear:3})),true);
});
test('VIP, endless mode and later waves never trigger forced ads',()=>{
  for(const overrides of [{removeAds:true},{endlessMode:true},{waveIndex:1}]) assert.equal(isInterstitialDue(state({adClears:9,...overrides})),false);
});
function waveFixture() {
  const html=fs.readFileSync('www/index.html','utf8');
  const source=html.slice(html.indexOf('      async function spawnNextWave()'),html.indexOf('      function beginWaveAfterInterstitial()'));
  let resolveAd;const calls=[];
  const s=state({adClears:3,waveStartPending:false,levelRunId:1,levelEnded:false});
  const ctx=vm.createContext({state:s,waveInProgress:false,window:{GameMonetization:{isInterstitialDue,showInterstitial:()=>{calls.push('ad');return new Promise(resolve=>resolveAd=resolve);}}},saveProgress:()=>calls.push('save'),beginWaveAfterInterstitial:()=>calls.push('wave'),performance:{now:()=>123},lastTime:0,console});
  vm.runInContext(source,ctx);
  return {s,calls,start:()=>vm.runInContext('spawnNextWave()',ctx),finish:value=>resolveAd(value)};
}
test('first wave waits for dismissal, repeated taps cannot show two ads',async()=>{
  const f=waveFixture();const a=f.start();await f.start();assert.deepEqual(f.calls,['ad']);
  assert.equal(f.s.waveStartPending,true);f.finish(true);await a;
  assert.deepEqual(f.calls,['ad','save','wave']);assert.equal(f.s.lastInterstitialClear,3);assert.equal(f.s.waveStartPending,false);
});
test('unavailable ad continues immediately without consuming the interval',async()=>{
  const f=waveFixture();const a=f.start();f.finish(false);await a;
  assert.deepEqual(f.calls,['ad','wave']);assert.equal(f.s.lastInterstitialClear,0);
});
test('changing level during ad cannot start a stale wave',async()=>{
  const f=waveFixture();const a=f.start();f.s.levelRunId++;f.s.waveStartPending=false;f.finish(true);await a;
  assert.equal(f.calls.includes('wave'),false);
});

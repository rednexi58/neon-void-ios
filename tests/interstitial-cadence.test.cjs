const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {isInterstitialDue,LEVELS_PER_INTERSTITIAL}=require('../interstitial-cadence.cjs');
const state=overrides=>({removeAds:false,endlessMode:false,adClears:0,lastInterstitialClear:0,...overrides});

test('interstitial is due after every 2nd won level',()=>{
  assert.equal(LEVELS_PER_INTERSTITIAL,2);
  assert.equal(isInterstitialDue(state({adClears:1})),false);
  assert.equal(isInterstitialDue(state({adClears:2})),true);
  assert.equal(isInterstitialDue(state({adClears:3,lastInterstitialClear:2})),false);
  assert.equal(isInterstitialDue(state({adClears:4,lastInterstitialClear:2})),true);
});
test('VIP and endless mode never trigger forced ads',()=>{
  for(const overrides of [{removeAds:true},{endlessMode:true}]) assert.equal(isInterstitialDue(state({adClears:9,...overrides})),false);
});

function levelEndFixture(overrides={}) {
  const html=fs.readFileSync('www/index.html','utf8');
  const start=html.indexOf('      function spawnNextWave()');
  const source=html.slice(start,html.indexOf('      function beginWaveAfterInterstitial()'));
  let resolveAd;const calls=[];
  const s=state({adClears:2,waveStartPending:false,levelRunId:1,levelEnded:false,...overrides});
  const ctx=vm.createContext({state:s,waveFlow:{launched:0,hasMoreWaves:()=>true},
    window:{GameMonetization:{isInterstitialDue,showInterstitial:()=>{calls.push('ad');return new Promise(r=>resolveAd=r);}}},
    SoundFX:{setAdMuted:v=>calls.push(v?'mute':'unmute')},saveProgress:()=>calls.push('save'),
    beginWaveAfterInterstitial:()=>calls.push('wave'),performance:{now:()=>1},lastTime:0,console,setTimeout:fn=>fn()});
  vm.runInContext(source,ctx);
  return {s,calls,ctx,show:()=>vm.runInContext('showLevelEndInterstitial(0)',ctx),finish:v=>resolveAd(v)};
}

test('waves start instantly, no ad on wave start',()=>{
  const f=levelEndFixture();vm.runInContext('spawnNextWave()',f.ctx);
  assert.deepEqual(f.calls,['wave']);
});
test('level-end ad mutes, waits for dismissal, unmutes and consumes the interval',async()=>{
  const f=levelEndFixture();const p=f.show();await new Promise(r=>setImmediate(r));
  assert.deepEqual(f.calls,['mute','ad']);f.finish(true);assert.equal(await p,true);
  assert.deepEqual(f.calls,['mute','ad','save','unmute']);assert.equal(f.s.lastInterstitialClear,2);
});
test('unavailable ad does not consume the interval and still unmutes',async()=>{
  const f=levelEndFixture();const p=f.show();await new Promise(r=>setImmediate(r));f.finish(false);
  assert.equal(await p,false);assert.equal(f.s.lastInterstitialClear,0);assert.equal(f.calls.at(-1),'unmute');
});
test('odd victories show no ad',async()=>{
  const f=levelEndFixture({adClears:1});assert.equal(await f.show(),false);assert.deepEqual(f.calls,[]);
});
test('victory waits for the ad before showing the result screen',()=>{
  const html=fs.readFileSync('www/index.html','utf8');
  assert.match(html,/showLevelEndInterstitial\(\)\.catch\(\(\) => false\)\.then\(adShown => \{\s*if \(state\.levelRunId !== runId\) return;\s*showVictoryModal\(\);/);
});

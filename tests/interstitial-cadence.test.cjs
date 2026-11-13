const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {isInterstitialDue,FIRST_AD_LEVEL,LEVELS_PER_INTERSTITIAL,MIN_SECONDS_BETWEEN_ADS}=require('../interstitial-cadence.cjs');
const state=overrides=>({removeAds:false,endlessMode:false,level:10,adClears:0,lastInterstitialClear:0,lastInterstitialAt:0,...overrides});
const NOW=1_800_000_000_000;

test('pacing constants match the agreed rules',()=>{
  assert.equal(FIRST_AD_LEVEL,6);assert.equal(LEVELS_PER_INTERSTITIAL,3);assert.equal(MIN_SECONDS_BETWEEN_ADS,180);
});
test('no forced ads before level 6, even with many wins',()=>{
  for(let level=1;level<FIRST_AD_LEVEL;level++) assert.equal(isInterstitialDue(state({level,adClears:9}),NOW),false);
  assert.equal(isInterstitialDue(state({level:6,adClears:9}),NOW),true);
});
test('interstitial is due after every 3rd won level',()=>{
  assert.equal(isInterstitialDue(state({adClears:2}),NOW),false);
  assert.equal(isInterstitialDue(state({adClears:3}),NOW),true);
  assert.equal(isInterstitialDue(state({adClears:5,lastInterstitialClear:3}),NOW),false);
  assert.equal(isInterstitialDue(state({adClears:6,lastInterstitialClear:3}),NOW),true);
});
test('two forced ads are at least 3 minutes apart',()=>{
  const s=state({adClears:6,lastInterstitialClear:3,lastInterstitialAt:NOW-179_000});
  assert.equal(isInterstitialDue(s,NOW),false);
  assert.equal(isInterstitialDue({...s,lastInterstitialAt:NOW-180_000},NOW),true);
});
test('a device clock moved backwards does not block ads forever',()=>{
  assert.equal(isInterstitialDue(state({adClears:3,lastInterstitialAt:NOW+86_400_000}),NOW),true);
});
test('VIP and endless mode never trigger forced ads',()=>{
  for(const overrides of [{removeAds:true},{endlessMode:true}]) assert.equal(isInterstitialDue(state({adClears:9,...overrides}),NOW),false);
});

function levelEndFixture(overrides={}) {
  const html=fs.readFileSync('www/index.html','utf8');
  const start=html.indexOf('      function spawnNextWave()');
  const source=html.slice(start,html.indexOf('      function beginWaveAfterInterstitial()'));
  let resolveAd;const calls=[];
  const s=state({adClears:3,waveStartPending:false,levelRunId:1,levelEnded:false,...overrides});
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
  assert.deepEqual(f.calls,['mute','ad','save','unmute']);assert.equal(f.s.lastInterstitialClear,3);assert.ok(f.s.lastInterstitialAt>0);
});
test('unavailable ad does not consume the interval and still unmutes',async()=>{
  const f=levelEndFixture();const p=f.show();await new Promise(r=>setImmediate(r));f.finish(false);
  assert.equal(await p,false);assert.equal(f.s.lastInterstitialClear,0);assert.equal(f.s.lastInterstitialAt,0);assert.equal(f.calls.at(-1),'unmute');
});
test('wins between ads show no ad',async()=>{
  const f=levelEndFixture({adClears:2});assert.equal(await f.show(),false);assert.deepEqual(f.calls,[]);
});
test('victory waits for the ad before showing the result screen',()=>{
  const html=fs.readFileSync('www/index.html','utf8');
  assert.match(html,/showLevelEndInterstitial\(\)\.catch\(\(\) => false\)\.then\(adShown => \{\s*if \(state\.levelRunId !== runId\) return;\s*showVictoryModal\(\);/);
});

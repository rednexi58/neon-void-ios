const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {isInterstitialDue}=require('../interstitial-cadence.cjs');
const {commitGrant,createDelivery}=require('../purchase-delivery.cjs');
const {createTrackingGate}=require('../tracking-permission.cjs');
function bridge(fail=false, canRequestAds=true, consentThrows=false, att={status:'notDetermined',answer:'denied'}) {
  const hooks={}, calls=[], products={gems_100:{id:'gems_100',canPurchase:true,getOffer:()=>({pricingPhases:[{price:'€4,99'}],order:async()=>{calls.push('order');}})}};
  const chain={}; for(const name of ['productUpdated','receiptUpdated','approved','finished']) chain[name]=fn=>{hooks[name]=fn;return chain;};
  const store={register(){},when:()=>chain,error(){},initialize:async()=>{calls.push('initialize');return fail?[{message:'Store unavailable'}]:[];},
    update:async()=>{},get:id=>products[id],owned:()=>false,finish:async()=>calls.push('finish')};
  const cdv={store,ProductType:{CONSUMABLE:'consumable',NON_CONSUMABLE:'non-consumable'},Platform:{APPLE_APPSTORE:'ios'}};
  const ctx=vm.createContext({window:{CdvPurchase:cdv,dispatchEvent(){}},document:{addEventListener(){}},Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'},
    AdMob:{trackingAuthorizationStatus:async()=>{calls.push('att-status');return {status:att.status};},
      requestTrackingAuthorization:async()=>{calls.push('att-request');att.status=att.answer;return {status:att.answer};},
      initialize:async()=>{calls.push('ads-initialize');},requestConsentInfo:async()=>{if(consentThrows)throw new Error('consent offline');return {status:'UNKNOWN'};},prepareInterstitial:async()=>{calls.push('load-interstitial');},prepareRewardVideoAd:async()=>{},getConsentInfo:async()=>({canRequestAds,privacyOptionsRequired:false})},
    AdmobConsentStatus:{NOT_REQUIRED:'NOT_REQUIRED',OBTAINED:'OBTAINED',REQUIRED:'REQUIRED'},
    CdvPurchasePkg:cdv,commitGrant,createDelivery,createTrackingGate,isInterstitialDue,CustomEvent:class {},__GK_TEST_ADS__:true,console:{warn(){}},setTimeout:fn=>queueMicrotask(fn)});
  vm.runInContext(fs.readFileSync('monetization-setup.js','utf8').replace(/^import .*;\n/gm,''),ctx);
  return {api:ctx.window.GameMonetization,calls,hooks,ctx};
}
test('native bridge waits for save readiness and uses only loaded localized prices',async()=> {
  const b=bridge();let catalog;
  b.api.onCatalogChange(value=>catalog=value);
  assert.deepEqual(b.calls,[]);assert.equal(catalog.products.gems_100.available,false);
  b.api.start(true);await vm.runInContext('initializeIAP()',b.ctx);
  assert.equal(catalog.products.gems_100.price,'€4,99');assert.equal(catalog.products.gems_100.available,true);
  assert.equal(catalog.products.gems_10000.available,false);assert.equal(catalog.products.gems_10000.price,'');
  await assert.rejects(b.api.buyGemPack('gems_10000'));
  await b.api.buyGemPack('gems_100');assert.equal(b.calls.filter(x=>x==='order').length,1);
  b.api.onGemGranted(grant=>{assert.equal(grant.totalGems,115);b.calls.push('saved');return true;});
  b.hooks.approved({transactionId:'test-123',products:[{id:'gems_100'}]});
  await vm.runInContext('delivery.retry()',b.ctx);
  assert.deepEqual(b.calls.slice(-2),['saved','finish']);
});
test('native initialization error never enables purchases',async()=> {
  const b=bridge(true);let catalog;b.api.onCatalogChange(value=>catalog=value);
  b.api.start(true);await vm.runInContext('initializeIAP()',b.ctx);
  assert.equal(catalog.ready,false);assert.equal(catalog.products.gems_100.available,false);
  assert.match(catalog.error,/Store unavailable/);await assert.rejects(b.api.buyGemPack('gems_100'));
});

test('UMP canRequestAds allows UNKNOWN status when SDK permits ads',async()=> {
  const b=bridge(false,true);b.api.start(true);await vm.runInContext('initializeAds()',b.ctx);
  assert.equal(b.api.getDebugInfo().initializedAds,true);assert.ok(b.calls.includes('load-interstitial'));
});
test('UMP denial prevents ad requests even when store succeeds',async()=> {
  const b=bridge(false,false);b.api.start(true);await vm.runInContext('initializeAds()',b.ctx);
  assert.equal(b.api.getDebugInfo().initializedAds,false);assert.equal(b.calls.includes('load-interstitial'),false);
});
test('consent update error uses only SDK-authorized previous consent',async()=> {
  for(const allowed of [true,false]) {
    const b=bridge(false,allowed,true);b.api.start(true);await vm.runInContext('initializeAds()',b.ctx);
    assert.equal(b.api.getDebugInfo().initializedAds,allowed);
  }
});

test('ATT system prompt is requested at launch before the ad SDK starts',async()=> {
  const b=bridge();b.api.start(true);await vm.runInContext('initializeAds()',b.ctx);
  const request=b.calls.indexOf('att-request'), sdk=b.calls.indexOf('ads-initialize');
  assert.ok(request>=0,'ATT request missing');assert.ok(sdk>request,'ad SDK started before ATT answer');
  assert.equal(b.api.getDebugInfo().tracking,'denied');
});
test('ATT is not asked again once the user has answered',async()=> {
  const b=bridge(false,true,false,{status:'authorized',answer:'authorized'});
  b.api.start(true);await vm.runInContext('initializeAds()',b.ctx);
  assert.equal(b.calls.includes('att-request'),false);assert.ok(b.calls.includes('ads-initialize'));
});

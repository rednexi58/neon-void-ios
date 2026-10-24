const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {commitGrant,createDelivery}=require('../purchase-delivery.cjs');
function bridge(fail=false) {
  const hooks={}, calls=[], products={gems_100:{id:'gems_100',canPurchase:true,getOffer:()=>({pricingPhases:[{price:'€4,99'}],order:async()=>{calls.push('order');}})}};
  const chain={}; for(const name of ['productUpdated','receiptUpdated','approved','finished']) chain[name]=fn=>{hooks[name]=fn;return chain;};
  const store={register(){},when:()=>chain,error(){},initialize:async()=>{calls.push('initialize');return fail?[{message:'Store unavailable'}]:[];},
    update:async()=>{},get:id=>products[id],owned:()=>false,finish:async()=>calls.push('finish')};
  const cdv={store,ProductType:{CONSUMABLE:'consumable',NON_CONSUMABLE:'non-consumable'},Platform:{APPLE_APPSTORE:'ios'}};
  const ctx=vm.createContext({window:{CdvPurchase:cdv},document:{addEventListener(){}},Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'},
    AdMob:{initialize:async()=>{},requestConsentInfo:async()=>({status:'NOT_REQUIRED'}),prepareInterstitial:async()=>{},prepareRewardVideoAd:async()=>{}},
    AdmobConsentStatus:{NOT_REQUIRED:'NOT_REQUIRED',OBTAINED:'OBTAINED',REQUIRED:'REQUIRED'},
    CdvPurchasePkg:cdv,commitGrant,createDelivery,__GK_TEST_ADS__:true,console:{warn(){}},setTimeout:fn=>queueMicrotask(fn)});
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

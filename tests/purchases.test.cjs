const { test } = require('node:test');
const assert = require('node:assert/strict');
const { commitGrant, createDelivery } = require('../purchase-delivery.cjs');
const fs = require('node:fs');
const vm = require('node:vm');
const packs = { gems_100: { totalGems: 115 }, gems_50: { totalGems: 50 } };
function fixture() {
  let state = { cyberCore: 5, purchaseTransactions: {} }, saved, ready = true, failSave = false, failFinish = false;
  const events = [], errors = [];
  const delivery = createDelivery({ packs, vipId: 'vip_lifetime',
    grant: grant => {
      if (!ready) return false;
      commitGrant(state, grant, () => {
        if (failSave) throw new Error('disk full');
        saved = JSON.stringify(state); events.push('save'); return true;
      }); return true;
    }, unlockVip: () => { events.push('vip'); return true; },
    finish: async () => { events.push('finish'); if (failFinish) throw new Error('offline'); },
    onError: error => errors.push(error.message)
  });
  return { delivery, events, errors, get state() { return state; },
    set ready(value) { ready=value; }, set failSave(value) { failSave=value; }, set failFinish(value) { failFinish=value; },
    restart() { state = JSON.parse(saved); }
  };
}
const tx = (id='tx-1', quantity=1) => ({ transactionId: id, products: [{id:'gems_100'}], quantity });
test('bonus is durable before finish; replay after restart does not duplicate', async () => {
  const f=fixture(); await f.delivery.approve(tx());
  assert.equal(f.state.cyberCore,120); assert.deepEqual(f.events,['save','finish']);
  f.restart(); await f.delivery.approve(tx()); assert.equal(f.state.cyberCore,120);
  assert.deepEqual(f.events,['save','finish','finish']);
});
test('storage failure rolls back both balance and ledger and does not finish', async () => {
  const f=fixture(); f.failSave=true; await f.delivery.approve(tx());
  assert.equal(f.state.cyberCore,5); assert.deepEqual(f.state.purchaseTransactions,{}); assert.deepEqual(f.events,[]);
  f.failSave=false; await f.delivery.retry(); assert.equal(f.state.cyberCore,120); assert.equal(f.delivery.pendingCount,0);
});
test('finish failure is retryable without another grant', async () => {
  const f=fixture(); f.failFinish=true; await f.delivery.approve(tx());
  assert.equal(f.delivery.pendingCount,1); f.failFinish=false; await f.delivery.retry();
  assert.equal(f.state.cyberCore,120); assert.equal(f.events.filter(e=>e==='save').length,1);
});
test('early transaction waits until saved game is ready', async () => {
  const f=fixture(); f.ready=false; await f.delivery.approve(tx()); assert.deepEqual(f.events,[]);
  f.ready=true; await f.delivery.retry(); assert.equal(f.state.cyberCore,120);
});
test('concurrent repeated callbacks and distinct purchases grant each transaction once', async () => {
  const f=fixture(); await Promise.all([f.delivery.approve(tx()), f.delivery.approve(tx()), f.delivery.approve(tx('tx-2',2))]);
  assert.equal(f.state.cyberCore,350); assert.equal(f.events.filter(e=>e==='save').length,2);
});
test('pending, unknown product, invalid quantity and missing id never finish', async () => {
  for (const transaction of [{...tx(),isPending:true},{...tx(),products:[{id:'unknown'}]},tx('bad',0),{...tx(),transactionId:''}]) {
    const f=fixture(); await f.delivery.approve(transaction); assert.deepEqual(f.events,[]); assert.equal(f.state.cyberCore,5);
  }
});
test('VIP unlock precedes finish', async () => {
  const f=fixture(); await f.delivery.approve({...tx(),products:[{id:'vip_lifetime'}]}); assert.deepEqual(f.events,['vip','finish']);
});
test('all configured pack totals match requested catalog', () => {
  const source=fs.readFileSync('monetization-setup.js','utf8');
  const rows=[...source.matchAll(/id: '(gems_\d+)', baseGems: (\d+), bonusGems: (\d+), totalGems: (\d+)/g)];
  assert.deepEqual(rows.map(m=>[m[1],Number(m[4])]),[['gems_50',50],['gems_100',115],['gems_200',240],['gems_400',500],['gems_500',650],['gems_1000',1350],['gems_5000',7000],['gems_10000',15000]]);
  for(const m of rows) assert.equal(Number(m[2])+Number(m[3]),Number(m[4]));
});
test('game inline JavaScript parses and native bridge is compiled', () => {
  const html=fs.readFileSync('www/index.html','utf8');
  for (const [,attrs,code] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!attrs.includes('src=')) new vm.Script(code);
  }
  new vm.Script(fs.readFileSync('www/native-monetization.js','utf8'));
  assert.ok(!html.includes('cdn.tailwindcss.com'));
});

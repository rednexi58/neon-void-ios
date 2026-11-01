const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createTrackingGate,STATUS}=require('../tracking-permission.cjs');
function sdk({status='notDetermined',answer='authorized',requestReturns=true,statusThrows=false}={}) {
  const calls=[];
  return {calls,api:{
    async trackingAuthorizationStatus(){calls.push('status');if(statusThrows)throw new Error('bridge down');return {status};},
    async requestTrackingAuthorization(){calls.push('request');status=answer;return requestReturns?{status:answer}:undefined;}
  }};
}
test('asks once when undetermined and reports the user answer',async()=>{
  const s=sdk();const seen=[];
  const gate=createTrackingGate({sdk:s.api,isIOS:true,onStatus:x=>seen.push(x)});
  assert.equal(await gate.ensure(),STATUS.AUTHORIZED);
  assert.equal(await gate.ensure(),STATUS.AUTHORIZED);
  assert.deepEqual(s.calls,['status','request']);assert.deepEqual(seen,[STATUS.AUTHORIZED]);
  assert.equal(gate.status,STATUS.AUTHORIZED);
});
test('concurrent callers share a single system prompt',async()=>{
  const s=sdk({answer:'denied'});const gate=createTrackingGate({sdk:s.api,isIOS:true});
  const results=await Promise.all([gate.ensure(),gate.ensure(),gate.ensure()]);
  assert.deepEqual(results,['denied','denied','denied']);
  assert.equal(s.calls.filter(c=>c==='request').length,1);
});
test('never prompts when the user already decided or the device restricts tracking',async()=>{
  for(const status of ['authorized','denied','restricted']){
    const s=sdk({status});const gate=createTrackingGate({sdk:s.api,isIOS:true});
    assert.equal(await gate.ensure(),status);assert.deepEqual(s.calls,['status']);
  }
});
test('stock plugin without a returned status falls back to reading the status',async()=>{
  const s=sdk({answer:'denied',requestReturns:false});const gate=createTrackingGate({sdk:s.api,isIOS:true});
  assert.equal(await gate.ensure(),'denied');assert.deepEqual(s.calls,['status','request','status']);
});
test('a suppressed prompt stays retryable instead of being cached',async()=>{
  const s=sdk({answer:'notDetermined'});const gate=createTrackingGate({sdk:s.api,isIOS:true});
  assert.equal(await gate.ensure(),STATUS.NOT_DETERMINED);assert.equal(gate.status,null);
  await gate.ensure();assert.equal(s.calls.filter(c=>c==='request').length,2);
});
test('bridge errors never block the game and are reported',async()=>{
  const errors=[];const s=sdk({statusThrows:true});
  const gate=createTrackingGate({sdk:s.api,isIOS:true,onError:e=>errors.push(e.message)});
  assert.equal(await gate.ensure(),STATUS.UNAVAILABLE);assert.deepEqual(errors,['bridge down']);
});
test('web and Android builds never touch the ATT bridge',async()=>{
  const s=sdk();const gate=createTrackingGate({sdk:s.api,isIOS:false});
  assert.equal(await gate.ensure(),STATUS.UNAVAILABLE);assert.deepEqual(s.calls,[]);
});

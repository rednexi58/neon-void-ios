const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pinPodfile}=require('../ios_config/prepare-native.cjs');
test('native hook pins UMP and iOS before first sync, repeatable on existing Podfiles',()=> {
  const original="platform :ios, '13.0'\ndef capacitor_pods\n  pod 'Capacitor'\nend\ntarget 'App' do\n  capacitor_pods\nend\n";
  const patched=pinPodfile(original);
  assert.ok(patched.includes("platform :ios, '15.0'"));
  assert.ok(patched.includes("pod 'GoogleUserMessagingPlatform', '2.7.0'"));
  assert.ok(patched.includes("pod 'Capacitor'"));
  assert.equal(pinPodfile(patched).match(/pod 'GoogleUserMessagingPlatform'/g).length,1);
});

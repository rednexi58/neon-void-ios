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

const {extendPlugin,patchTrackingRequest}=require('../ios_config/patch-admob.cjs');
test('UMP extension is idempotent and fails on incompatible plugin layout',()=> {
  const base='import GoogleMobileAds\n        CAPPluginMethod(name: "resetConsentInfo", returnType: CAPPluginReturnPromise),\n    var testingDevices: [String] = []';
  const patched=extendPlugin(base);assert.ok(patched.includes('info.canRequestAds'));assert.ok(patched.includes('presentPrivacyOptionsForm'));
  assert.equal(extendPlugin(patched),patched);assert.throws(()=>extendPlugin('unknown'));
});

test('ATT patch replaces the stock off-main-thread request with an active-state request',()=> {
  const stock='    }\n\n    @objc func requestTrackingAuthorization(_ call: CAPPluginCall) {\n        if #available(iOS 14, *) {\n            #if canImport(AppTrackingTransparency)\n            ATTrackingManager.requestTrackingAuthorization(completionHandler: { _ in\n                call.resolve([:])\n            })\n            #else\n            call.resolve([:])\n            #endif\n        } else {\n            call.resolve([:])\n        }\n    }\n\n    @objc func setApplicationMuted(_ call: CAPPluginCall) {';
  const patched=patchTrackingRequest(stock);
  assert.ok(patched.includes('UIApplication.didBecomeActiveNotification'));
  assert.ok(patched.includes('applicationState == .active'));
  assert.ok(patched.includes('"status": self.gkTrackingStatusName()'));
  assert.ok(patched.includes('@objc func setApplicationMuted'));
  assert.equal(patched.match(/@objc func requestTrackingAuthorization/g).length,1);
  assert.equal(patchTrackingRequest(patched),patched);
  assert.throws(()=>patchTrackingRequest('unknown layout'));
});

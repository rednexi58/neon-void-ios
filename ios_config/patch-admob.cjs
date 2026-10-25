// Minimal compatibility extension for locked @capacitor-community/admob 6.2.0 / UMP 2.7.
// UMP canRequestAds is authoritative, including when consentStatus remains UNKNOWN.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../node_modules/@capacitor-community/admob');
function extendPlugin(source) {
  if (source.includes('// GK UMP API extension')) return source;
  const anchor = '        CAPPluginMethod(name: "resetConsentInfo", returnType: CAPPluginReturnPromise),';
  if (!source.includes(anchor) || !source.includes('    var testingDevices:')) throw new Error('AdMob plugin layout changed');
  source = source.replace('import GoogleMobileAds', 'import GoogleMobileAds\nimport UserMessagingPlatform');
  source = source.replace(anchor, anchor + '\n        CAPPluginMethod(name: "getConsentInfo", returnType: CAPPluginReturnPromise),\n        CAPPluginMethod(name: "showPrivacyOptionsForm", returnType: CAPPluginReturnPromise),');
  return source.replace('    var testingDevices:', `    // GK UMP API extension
    @objc func getConsentInfo(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let info = UMPConsentInformation.sharedInstance
            call.resolve([
                "canRequestAds": info.canRequestAds,
                "privacyOptionsRequired": info.privacyOptionsRequirementStatus == .required
            ])
        }
    }
    @objc func showPrivacyOptionsForm(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UMPConsentForm.presentPrivacyOptionsForm(from: self.getRootVC()) { error in
                if let error = error { call.reject(error.localizedDescription); return }
                call.resolve([:])
            }
        }
    }

    var testingDevices:`);
}
function patch() {
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'),'utf8')).version;
  if (version !== '6.2.0') throw new Error('Review UMP patch before changing AdMob version: ' + version);
  const file = path.join(root,'ios/Sources/AdMobPlugin/AdMobPlugin.swift');
  fs.writeFileSync(file, extendPlugin(fs.readFileSync(file,'utf8')));
  const consent = path.join(root,'ios/Sources/AdMobPlugin/Consent/ConsentExecutor.swift');
  const source = fs.readFileSync(consent,'utf8').replace('call.reject("Request consent info failed")', 'call.reject(error?.localizedDescription ?? "Request consent info failed")');
  fs.writeFileSync(consent,source);
  console.log('AdMob UMP canRequestAds and privacy options extension applied.');
}
if (require.main === module) patch();
module.exports = {extendPlugin, patch};

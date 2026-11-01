// Compatibility extensions for the locked @capacitor-community/admob 6.2.0 / UMP 2.7 plugin.
// 1. UMP: canRequestAds is authoritative, including when consentStatus remains UNKNOWN.
// 2. ATT: the stock requestTrackingAuthorization runs off the main thread and ignores the
//    application state. iOS/iPadOS 17.4+ silently skips the system prompt in that case, which
//    is why App Review could not find the permission request. The replacement waits until the
//    app is active, asks on the main thread and returns the resulting status.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../node_modules/@capacitor-community/admob');
const PLUGIN_VERSION = '6.2.0';

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

const TRACKING_MARKER = '// GK ATT active-state request';
const STOCK_TRACKING_METHOD = /    @objc func requestTrackingAuthorization\(_ call: CAPPluginCall\) \{\n[\s\S]*?\n    \}\n(?=\n)/;
const TRACKING_METHOD = `    ${TRACKING_MARKER}
    @objc func requestTrackingAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            #if canImport(AppTrackingTransparency)
            if #available(iOS 14, *) {
                self.gkRequestTrackingWhenActive(call)
                return
            }
            #endif
            call.resolve(["status": AuthorizationStatusEnum.Authorized.rawValue])
        }
    }

    #if canImport(AppTrackingTransparency)
    @available(iOS 14, *)
    private func gkTrackingStatusName() -> String {
        switch ATTrackingManager.trackingAuthorizationStatus {
        case .authorized: return AuthorizationStatusEnum.Authorized.rawValue
        case .denied: return AuthorizationStatusEnum.Denied.rawValue
        case .restricted: return AuthorizationStatusEnum.Restricted.rawValue
        case .notDetermined: return AuthorizationStatusEnum.NotDetermined.rawValue
        @unknown default: return AuthorizationStatusEnum.NotDetermined.rawValue
        }
    }

    // Must be called on the main thread. The prompt is only shown while the app is active;
    // a short settle delay after activation avoids the iOS 17.4+ suppressed-prompt race.
    @available(iOS 14, *)
    private func gkRequestTrackingWhenActive(_ call: CAPPluginCall) {
        if ATTrackingManager.trackingAuthorizationStatus != .notDetermined {
            call.resolve(["status": gkTrackingStatusName()])
            return
        }
        guard UIApplication.shared.applicationState == .active else {
            var observer: NSObjectProtocol?
            observer = NotificationCenter.default.addObserver(
                forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
            ) { [weak self] _ in
                if let token = observer { NotificationCenter.default.removeObserver(token) }
                observer = nil
                guard let self = self else {
                    call.resolve(["status": AuthorizationStatusEnum.NotDetermined.rawValue])
                    return
                }
                self.gkRequestTrackingWhenActive(call)
            }
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            guard UIApplication.shared.applicationState == .active else {
                self.gkRequestTrackingWhenActive(call)
                return
            }
            ATTrackingManager.requestTrackingAuthorization { _ in
                DispatchQueue.main.async {
                    call.resolve(["status": self.gkTrackingStatusName()])
                }
            }
        }
    }
    #endif
`;

function patchTrackingRequest(source) {
  if (source.includes(TRACKING_MARKER)) return source;
  if (!STOCK_TRACKING_METHOD.test(source)) throw new Error('AdMob ATT method layout changed');
  return source.replace(STOCK_TRACKING_METHOD, TRACKING_METHOD);
}

function patch() {
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (version !== PLUGIN_VERSION) throw new Error('Review AdMob patches before changing AdMob version: ' + version);
  const file = path.join(root, 'ios/Sources/AdMobPlugin/AdMobPlugin.swift');
  fs.writeFileSync(file, patchTrackingRequest(extendPlugin(fs.readFileSync(file, 'utf8'))));
  const consent = path.join(root, 'ios/Sources/AdMobPlugin/Consent/ConsentExecutor.swift');
  const source = fs.readFileSync(consent, 'utf8').replace('call.reject("Request consent info failed")', 'call.reject(error?.localizedDescription ?? "Request consent info failed")');
  fs.writeFileSync(consent, source);
  console.log('AdMob UMP extension and active-state ATT request applied.');
}
if (require.main === module) patch();
module.exports = { extendPlugin, patchTrackingRequest, patch };

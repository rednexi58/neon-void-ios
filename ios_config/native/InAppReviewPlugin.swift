import Capacitor
import StoreKit
import UIKit

/// Asks iOS to show the system "Rate this app" sheet.
/// Apple decides whether the sheet actually appears (at most 3 times per 365 days per user),
/// so the call always resolves and never reports whether the user rated.
@objc(InAppReviewPlugin)
public class InAppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppReviewPlugin"
    public let jsName = "InAppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let scene = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
            if let scene = scene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["requested": scene != nil])
        }
    }
}

/// Root view controller (wired in Main.storyboard by apply_ios_settings.sh) that registers
/// app-local plugins, the pattern Capacitor documents for custom native code.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InAppReviewPlugin())
    }
}

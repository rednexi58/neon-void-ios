#!/bin/bash
# Runs on macOS Codemagic after 'cap add ios' / 'cap sync ios'.
set -euo pipefail
PLIST='ios/App/App/Info.plist'
PROJECT='ios/App/App.xcodeproj/project.pbxproj'
PODFILE='ios/App/Podfile'

plset() {
  local key="$1" type="$2" value="$3"
  /usr/libexec/PlistBuddy -c "Set :${key} ${value}" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :${key} ${type} ${value}" "$PLIST"
}
# Store version (CFBundleShortVersionString) comes from ios_config/APP_VERSION — the single source of truth.
APP_VERSION="$(tr -d '[:space:]' < ios_config/APP_VERSION)"
[[ "$APP_VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]] || { echo "Invalid APP_VERSION: $APP_VERSION"; exit 1; }
sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${APP_VERSION};/g" "$PROJECT"
plset CFBundleShortVersionString string "$APP_VERSION"
echo "App version: $APP_VERSION"
plset CFBundleDisplayName string 'Gezegeni Koru'
plset CFBundleName string 'Gezegeni Koru'
plset GADApplicationIdentifier string 'ca-app-pub-6370997467091906~2944398467'
plset NSUserTrackingUsageDescription string 'Reklam kimliğiniz yalnızca size daha alakalı reklamlar göstermek ve reklam ölçümü için kullanılır. / Your advertising identifier is used only to show you more relevant ads and to measure ad performance.'
/usr/libexec/PlistBuddy -c 'Set :ITSAppUsesNonExemptEncryption false' "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c 'Add :ITSAppUsesNonExemptEncryption bool false' "$PLIST"
/usr/libexec/PlistBuddy -c 'Add :SKAdNetworkItems array' "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c 'Add :SKAdNetworkItems:0 dict' "$PLIST" 2>/dev/null || true
plset 'SKAdNetworkItems:0:SKAdNetworkIdentifier' string 'cstr6suwn9.skadnetwork'
# StoreKit 2 purchase plugin requires iOS 15+. Capacitor project may start with 13.0.
if [ -f "$PROJECT" ]; then
  sed -i '' -E 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PROJECT"
fi
if [ -f "$PODFILE" ]; then
  sed -i '' -E "s/platform :ios, '[0-9.]+'/platform :ios, '15.0'/g" "$PODFILE"
fi
# Use the same bundle id and App Store Connect app record as the existing TestFlight app.
echo 'iOS display name, AdMob app ID and StoreKit 2 deployment target configured.'

const fs = require('node:fs');
const {execFileSync} = require('node:child_process');

function pinPodfile(source) {
  source = source.replace(/platform :ios, '[0-9.]+'/g, "platform :ios, '15.0'");
  source = source.replace(/^\s*pod ['"]GoogleUserMessagingPlatform['"].*\n/gm, '\n');
  if (!source.includes("target 'App' do")) throw new Error('Missing App target in Podfile');
  return source.replace("target 'App' do", "target 'App' do\n  pod 'GoogleUserMessagingPlatform', '2.7.0'");
}
if (require.main === module) {
  // This hook runs even inside `cap add ios`, before its first pod install.
  if (process.platform === 'darwin' && fs.existsSync('ios/App/Podfile')) {
    execFileSync('bash', ['ios_config/apply_ios_settings.sh'], {stdio:'inherit'});
    fs.writeFileSync('ios/App/Podfile', pinPodfile(fs.readFileSync('ios/App/Podfile','utf8')));
    const lock = 'ios/App/Podfile.lock';
    if (fs.existsSync(lock) && !/GoogleUserMessagingPlatform \(2\.7\.0\)/.test(fs.readFileSync(lock,'utf8'))) {
      fs.unlinkSync(lock);
    }
    console.log('iOS 15 and UMP 2.7.0 configured before CocoaPods.');
  }
}
module.exports = {pinPodfile};

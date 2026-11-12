const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('store version is 1.2 and is applied by the iOS settings script', () => {
  const v = fs.readFileSync('ios_config/APP_VERSION', 'utf8').trim();
  assert.match(v, /^\d+\.\d+(\.\d+)?$/);
  assert.equal(v, '1.2');
  const sh = fs.readFileSync('ios_config/apply_ios_settings.sh', 'utf8');
  assert.match(sh, /MARKETING_VERSION/);
  assert.match(sh, /CFBundleShortVersionString/);
});
test('app-ads.txt lists the AdMob publisher', () => {
  assert.match(fs.readFileSync('docs/app-ads.txt', 'utf8'), /^google\.com, pub-6370997467091906, DIRECT, f08c47fec0942fa0$/m);
});
test('ASO metadata fits App Store limits', () => {
  const m = require('../store_assets/metadata/aso.json');
  for (const o of Object.values(m)) {
    assert.ok([...o.name].length <= 30 && [...o.subtitle].length <= 30);
    assert.ok(Buffer.byteLength(o.keywords) <= 100);
    assert.ok([...o.promotionalText].length <= 170);
  }
});

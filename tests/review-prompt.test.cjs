const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const R = require('../www/review-prompt.js');
const DAY = 864e5;
const base = { level: 3, stars: 3, adShown: false, now: 100 * DAY, asked: 0, lastAskedAt: 0 };

test('asks at milestones 3, 10, 25 after a happy win', () => {
  assert.equal(R.shouldAsk(base), true);
  assert.equal(R.shouldAsk({ ...base, level: 2 }), false);
  assert.equal(R.shouldAsk({ ...base, asked: 1, level: 9, lastAskedAt: 1 }), false);
  assert.equal(R.shouldAsk({ ...base, asked: 1, level: 10, lastAskedAt: 1 }), true);
  assert.equal(R.shouldAsk({ ...base, asked: 2, level: 25, lastAskedAt: 1 }), true);
  assert.equal(R.shouldAsk({ ...base, asked: 3, level: 99, lastAskedAt: 1 }), false, 'never more than 3');
});
test('never with 1 star, after an ad, or within 4 days of the last ask', () => {
  assert.equal(R.shouldAsk({ ...base, stars: 1 }), false);
  assert.equal(R.shouldAsk({ ...base, adShown: true }), false);
  assert.equal(R.shouldAsk({ ...base, asked: 1, level: 12, lastAskedAt: base.now - 3 * DAY }), false);
  assert.equal(R.shouldAsk({ ...base, asked: 1, level: 12, lastAskedAt: base.now - 5 * DAY }), true);
});
test('victory flow asks after the result screen, counts and persists the ask', () => {
  const html = fs.readFileSync('www/index.html', 'utf8');
  const src = html.slice(html.indexOf('      function maybeAskForReview('), html.indexOf('      function handleGameOver()'));
  const calls = []; const state = { level: 3, reviewPromptsAsked: 0, reviewPromptLastAt: 0 };
  const ctx = vm.createContext({ state, Date, window: { ReviewPrompt: R, GameMonetization: { isIOS: true, requestReview: () => calls.push('review') } },
    saveProgress: () => calls.push('save'), setTimeout: fn => fn() });
  vm.runInContext(src, ctx);
  assert.equal(vm.runInContext('maybeAskForReview(3, false)', ctx), true);
  assert.deepEqual(calls, ['save', 'review']);
  assert.equal(state.reviewPromptsAsked, 1);
  assert.equal(vm.runInContext('maybeAskForReview(3, false)', ctx), false, 'same level does not ask twice');
  assert.match(html, /showVictoryModal\(\);\s*\n\s*maybeAskForReview\(stars, adShown\);/);
});
test('bridge exposes requestReview and stays safe without the native plugin', () => {
  const src = fs.readFileSync('monetization-setup.js', 'utf8');
  assert.match(src, /registerPlugin\('InAppReview'\)/);
  assert.match(src, /async requestReview\(\)/);
});
test('iOS setup registers languages, the Swift plugin and the storyboard class', () => {
  const sh = fs.readFileSync('ios_config/apply_ios_settings.sh', 'utf8');
  for (const needle of ['CFBundleLocalizations:0 string tr', 'CFBundleLocalizations:1 string en', 'ruby ios_config/add_native_sources.rb', 'customClass="MainViewController" customModule="App"']) assert.ok(sh.includes(needle), needle);
  const swift = fs.readFileSync('ios_config/native/InAppReviewPlugin.swift', 'utf8');
  assert.match(swift, /jsName = "InAppReview"/); assert.match(swift, /registerPluginInstance\(InAppReviewPlugin\(\)\)/);
  for (const l of ['tr', 'en']) assert.match(fs.readFileSync(`ios_config/native/${l}.lproj/InfoPlist.strings`, 'utf8'), /"NSUserTrackingUsageDescription" = ".+";/);
});

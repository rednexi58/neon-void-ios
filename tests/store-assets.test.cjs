// Store listing files must pass the same checks the Codemagic sync runs before uploading.
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('store screenshots and texts are valid for App Store upload', () => {
  const out = execFileSync('python3', [path.join(__dirname, '..', 'scripts', 'asc_store_sync.py'), '--dry-run'], { encoding: 'utf8' });
  assert.match(out, /Local files OK: 3 languages, 28 screenshots/);
});

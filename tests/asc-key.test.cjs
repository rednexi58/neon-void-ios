// The store sync must read the App Store Connect key in every shape CI systems use.
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('App Store Connect key is accepted in all CI formats', (t) => {
  const r = spawnSync('python3', [path.join(__dirname, 'py', 'check_asc_key.py')], { encoding: 'utf8' });
  if (r.status === 3) return t.skip('PyJWT/cryptography not installed');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

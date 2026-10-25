// Verify the source actually shipped in Capacitor, not just the working tree.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const revision = '2026.10.25.3';
const basic = ['dmgLv','rateLv','hpLv','goldLv'];
const packs = ['gems_50','gems_100','gems_200','gems_400','gems_500','gems_1000','gems_5000','gems_10000'];
function verify(dir = path.join(root, 'www')) {
  const html = fs.readFileSync(path.join(dir, 'index.html'),'utf8');
  const balance = fs.readFileSync(path.join(dir, 'game-balance.js'),'utf8');
  const embedded = html.match(/<!-- BALANCE START -->\s*<script>\n([\s\S]*?)<\/script>\s*<!-- BALANCE END -->/);
  assert(embedded, 'Missing embedded economy: upload the complete new ZIP contents.');
  assert.equal(embedded[1].trim(), balance.trim(), 'Mixed old/new economy files.');
  assert(html.includes(`İçerik / Content: ${revision}`), 'Old index.html detected.');
  assert(!html.includes('game-balance.js"></script>'), 'External stale balance script detected.');
  assert(!/farklı bölüm tamamla|different levels to unlock|Clear .*different levels/.test(html), 'Old evolution locks remain.');
  assert.equal((html.match(/data-gem-pack="/g)||[]).length, 8);
  for(const id of packs) assert(html.includes(`data-gem-pack="${id}"`), `Missing pack ${id}`);
  const context = {window:{}};
  require('node:vm').runInNewContext(balance, context);
  const B=context.window.GameBalance;
  assert.equal(B.revision, revision);
  const s={skills:Object.fromEntries(Object.entries(B.skills).map(([k,v])=>[k,v.base])),completedLevels:{}};
  for(const key of basic) {
    assert.equal(B.cost(s,key).gear,65);assert.equal(B.cost(s,key).core,5);
    assert(B.canUpgrade(s,key));s.skills[key]=2;
    assert.equal(B.cost(s,key).gear,100);assert.equal(B.cost(s,key).core,9);
    s.skills[key]=100;assert(B.canUpgrade(s,key));
  }
  s.skills.droneLv=1000;assert(B.canUpgrade(s,'droneLv'));
  return {revision, files:Object.fromEntries(['index.html','game-balance.js','game-audio.js','native-monetization.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex')]))};
}
if(require.main===module) {
  const source=verify();
  if(process.argv[2]) {
    const target=verify(path.resolve(process.argv[2]));
    assert.deepEqual(target,source,'Packaged native assets differ from www.');
  }
  fs.mkdirSync(path.join(root,'build'),{recursive:true});
  fs.writeFileSync(path.join(root,'build/release-verification.json'),JSON.stringify({...source,commit:process.env.CM_COMMIT||null},null,2));
  console.log(`Verified ${revision}: 8 gem packs, Gear + gems, no completed-level locks${process.argv[2]?' (native bundle matches)':''}.`);
}
module.exports={verify};

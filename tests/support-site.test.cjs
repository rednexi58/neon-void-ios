const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { markdownToHtml, render, TARGET } = require('../scripts/build-privacy-page.cjs');

const docs = path.join(__dirname, '..', 'docs');

test('published privacy page matches PRIVACY_POLICY.md', () => {
  assert.equal(fs.readFileSync(TARGET, 'utf8'), render(), 'Run: node scripts/build-privacy-page.cjs');
});

test('markdown subset converts headings, lists and https links, and escapes HTML', () => {
  const html = markdownToHtml('# Title\n\nA <b> & "x"\n\n- [Google](https://policies.google.com/privacy)\n- plain');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<p>A &lt;b&gt; &amp; &quot;x&quot;<\/p>/);
  assert.match(html, /<li><a href="https:\/\/policies\.google\.com\/privacy">Google<\/a><\/li><li>plain<\/li>/);
  assert.doesNotMatch(markdownToHtml('[x](javascript:alert(1))'), /href=/);
});

test('support page offers a working contact route and links the privacy policy in both languages', () => {
  const page = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
  for (const lang of ['tr', 'en']) assert.match(page, new RegExp(`data-lang-block="${lang}"`));
  assert.equal((page.match(/href="mailto:iskenderbedirhanyilmaz@gmail\.com/g) || []).length, 4);
  assert.equal((page.match(/href="privacy\.html"/g) || []).length, 2);
  for (const asset of ['site.css', 'lang.js']) assert.ok(fs.existsSync(path.join(docs, asset)), asset);
  assert.doesNotMatch(page, /<script[^>]+src="https?:/, 'no third-party scripts');
});

#!/usr/bin/env node
// Builds docs/privacy.html from PRIVACY_POLICY.md so the public web page and the policy in the
// repository can never drift apart. Supports the subset of Markdown the policy uses:
// "#"/"##" headings, paragraphs (source line breaks kept), "- " list items and [text](https://url) links.
// Usage: node scripts/build-privacy-page.cjs   (also run by tests to check the page is current)
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'PRIVACY_POLICY.md');
const TARGET = path.join(ROOT, 'docs', 'privacy.html');

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function inline(text) {
  return escapeHtml(text).replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (_, label, url) => `<a href="${url}">${label}</a>`);
}

function markdownToHtml(markdown) {
  const out = [];
  let list = null;
  let paragraph = [];
  const flushParagraph = () => { if (paragraph.length) { out.push(`<p>${paragraph.map(inline).join('<br>\n')}</p>`); paragraph = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`); list = null; } };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (heading) { flushParagraph(); flushList(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (line.startsWith('- ')) { flushParagraph(); (list = list || []).push(line.slice(2)); continue; }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}

function buildPage(markdown) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gezegeni Koru — Gizlilik Politikası / Privacy Policy</title>
  <link rel="stylesheet" href="site.css">
</head>
<body>
  <header class="top">
    <div class="wrap top-row">
      <a class="brand" href="./"><span class="brand-mark" aria-hidden="true"></span>Gezegeni Koru</a>
      <a href="./">Destek / Support</a>
    </div>
  </header>
  <main class="wrap policy">
<!-- Generated from PRIVACY_POLICY.md by scripts/build-privacy-page.cjs. Do not edit by hand. -->
${markdownToHtml(markdown)}
  </main>
  <footer class="wrap foot">
    <p>© 2026 İskender Bedirhan Yılmaz · Gezegeni Koru</p>
  </footer>
</body>
</html>
`;
}

function render() {
  return buildPage(fs.readFileSync(SOURCE, 'utf8'));
}

if (require.main === module) {
  fs.writeFileSync(TARGET, render());
  console.log('docs/privacy.html built from PRIVACY_POLICY.md');
}

module.exports = { markdownToHtml, render, TARGET };

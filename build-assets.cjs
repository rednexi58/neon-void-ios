const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');

async function buildAssets() {
  const output = 'www/assets';
  fs.mkdirSync(`${output}/files`, { recursive: true });
  const css = await postcss([tailwind({
    content: ['./www/index.html'],
    // Preserve color classes assembled by game UI templates at runtime.
    safelist: [{ pattern: /^(bg|text|border)-(slate|gray|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|red|orange|amber|yellow|lime|green|emerald|teal)-(100|200|300|400|500|600|700|800|900|950)(\/\d+)?$/ }],
    theme: { extend: {} }, plugins: []
  })]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined });
  fs.writeFileSync(`${output}/game.css`, css.css);
  let fonts = '';
  for (const [font, weights] of [['inter', [400,500,600,700,800]], ['orbitron', [600,700,800,900]]]) {
    for (const weight of weights) {
      const source = fs.readFileSync(`node_modules/@fontsource/${font}/${weight}.css`, 'utf8');
      for (const block of source.matchAll(/\/\*[^*]*-latin(?:-ext)?-[^*]*\*\/\s*@font-face\s*\{[^}]+\}/g)) {
        const text = block[0].replace(/, url\([^)]*\.woff\) format\('woff'\)/g, '');
        fonts += text + '\n';
        for (const match of text.matchAll(/url\(\.\/files\/([^)]*)\)/g)) {
          fs.copyFileSync(`node_modules/@fontsource/${font}/files/${match[1]}`, path.join(output, 'files', match[1]));
        }
      }
    }
    fs.copyFileSync(`node_modules/@fontsource/${font}/LICENSE`, `${output}/${font}-LICENSE.txt`);
  }
  fs.writeFileSync(`${output}/fonts.css`, fonts);
  console.log('Local styles and Turkish/Latin fonts built.');
}
buildAssets().catch(error => { console.error(error); process.exitCode = 1; });

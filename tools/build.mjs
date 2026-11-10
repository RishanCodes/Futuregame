// Builds single-file versions of SHATTERPOINT from index.html + src/.
//   dist/index.html        standalone page (open directly in a browser)
//   dist/shatterpoint.html artifact body (no <html>/<head>/<body> wrapper)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/css/style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="(src\/js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
const js = scripts.map((s) => `/* ---- ${s} ---- */\n` + readFileSync(join(root, s), 'utf8')).join('\n');
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap">';
const three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>SHATTERPOINT</title>
${fonts}
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
${three}
<script>
${safeJs}
</script>
</body>
</html>
`;

const artifact = `<title>SHATTERPOINT</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
<div id="app"></div>
${three}
<script>
${safeJs}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), standalone);
writeFileSync(join(root, 'dist/shatterpoint.html'), artifact);
console.log('built', (standalone.length / 1024).toFixed(1) + ' KB', scripts.length, 'scripts');

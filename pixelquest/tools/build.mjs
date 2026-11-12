// Builds PIXEL QUEST into a single self-contained HTML file.
//   dist/pixelquest.html          standalone page
//   dist/pixelquest-artifact.html artifact body (no html/head/body wrapper)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['core', 'font', 'art', 'sprites', 'data', 'fx', 'world', 'render', 'entities', 'systems', 'game', 'audio', 'input', 'hud', 'ui', 'main'];
const js = ORDER.map((n) => `/* ===== ${n}.js ===== */\n` + readFileSync(join(root, 'src', n + '.js'), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
const head = `<title>Pixel Quest</title>\n<meta name="description" content="PIXEL QUEST: ULTIMATE RPG - a 2D pixel-art open-world adventure RPG.">`;
const body = `<style>\n${css}\n</style>\n<div id="app"></div>\n<script>\n${js}\n</script>\n`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/pixelquest.html'), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n${head}\n</head>\n<body>\n${body}</body>\n</html>\n`);
writeFileSync(join(root, 'dist/pixelquest-artifact.html'), `${head}\n${body}`);
console.log('built', Math.round((css.length + js.length) / 1024) + ' KB');

// Builds FORGEBORN into single self-contained HTML files.
//   dist/forgeborn.html           standalone page, React bundled in, works offline
//   dist/forgeborn-artifact.html  artifact body (no html/head/body wrapper), React from cdnjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');

// Maps `import React from 'react'` to the UMD globals for the artifact build.
const globalsPlugin = {
  name: 'react-globals',
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, (a) => ({ path: a.path, namespace: 'g' }));
    b.onLoad({ filter: /.*/, namespace: 'g' }, (a) => ({
      contents: a.path.startsWith('react-dom') ? 'module.exports = window.ReactDOM' : 'module.exports = window.React',
      loader: 'js',
    }));
  },
};

async function bundle(external) {
  const r = await esbuild.build({
    entryPoints: [join(root, 'src/main.jsx')],
    bundle: true, minify: true, write: false, format: 'iife', target: 'es2019',
    jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: external ? [globalsPlugin] : [],
    logLevel: 'warning',
  });
  return r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

const head = `<title>Forgeborn</title>\n<meta name="description" content="FORGEBORN: Legacy of the Forge - an incremental blacksmith RPG with skill-based forging, mining and turn-based battles.">\n<meta name="claude:viewport-fit-sides" content="cover">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@500&display=swap">`;
const cdn = `<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>`;

const jsExt = await bundle(true);
const jsFull = await bundle(false);
mkdirSync(join(root, 'dist'), { recursive: true });
const artifact = `${head}\n<style>\n${css}\n</style>\n<div id="root"></div>\n${cdn}\n<script>\n${jsExt}\n</script>\n`;
const page = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n<style>\n${css}\n</style>\n</head>\n<body>\n<div id="root"></div>\n<script>\n${jsFull}\n</script>\n</body>\n</html>\n`;
writeFileSync(join(root, 'dist/forgeborn-artifact.html'), artifact);
writeFileSync(join(root, 'dist/forgeborn.html'), page);
console.log('built artifact', Math.round(artifact.length / 1024) + ' KB', '| standalone', Math.round(page.length / 1024) + ' KB');

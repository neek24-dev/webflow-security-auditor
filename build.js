// build.js
const esbuild = require('esbuild');
const fs = require('fs').promises;
const { minify } = require('html-minifier-terser');

esbuild.build({
  entryPoints: ['src/scripts/main.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'iife',
  globalName: 'app',
  minify: true,
  tsconfig: 'tsconfig.json',
}).then(async () => {
  console.log('JavaScript/TypeScript bundled successfully.');

  const jsContent = await fs.readFile('dist/bundle.js', 'utf8');
  let htmlContent = await fs.readFile('src/index.html', 'utf8');
  htmlContent = htmlContent.replace(
    /<script type="module">[\s\S]*?<\/script>/,
    `<script>${jsContent}</script>`
  );

  const minifiedHtml = await minify(htmlContent, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
  });

  await fs.writeFile('dist/index.html', minifiedHtml);
  console.log('Built dist/index.html successfully.');
}).catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
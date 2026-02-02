/**
 * Re-apply patch to microbundle so nodeResolve tries .ts/.tsx extensions.
 * Run after npm install so the build can resolve alias targets like ../utils/float32-decoder.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'node_modules', 'microbundle');
const target = "['.mjs', '.js', '.jsx', '.json', '.node']";
const replacement = "['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json', '.node']";

for (const file of ['dist/microbundle.js', 'dist/cli.js', 'src/index.js']) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  let code = fs.readFileSync(p, 'utf8');
  if (code.includes(target) && !code.includes("'.ts', '.tsx'")) {
    code = code.replace(target, replacement);
    fs.writeFileSync(p, code);
    console.log('patch-microbundle-resolve: patched', file);
  }
}

/**
 * 小程序构建：先打 heavy 包，再打入口（入口 require heavy，不打包进去），不用 eval、满足 500KB 限制。
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const cwd = __dirname;
const pkgPath = path.join(cwd, 'package.json');
const alias = 'index=../index,types=../types/index.ts,types/*=../types/*,utils/float32-decoder=../utils/float32-decoder,modules/ResourceManager=../modules/ResourceManager';
const common = `--format cjs --no-compress --tsconfig tsconfig.microbundle.json --define ENV=production,VERSION=0.1.0-beta.1 --alias ${alias}`;

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const origSource = pkg.source;

try {
  // 1. 打 heavy（拆成多 chunk，每个 <500KB）
  execSync('node build-heavy-rollup.js', { cwd, stdio: 'inherit' });

  // 2. 打入口（external heavy）
  pkg.source = 'src/single-entry.ts';
  pkg.main = 'dist/xmov-avatar-mp.js';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  // external 会转成正则 ^(pattern1|pattern2)($|/)，id 为解析后的绝对路径，需匹配路径末尾
  execSync(
    `npx microbundle --output dist/xmov-avatar-mp.js --external "wx,.+xmov-avatar-mp\\.heavy\\.js" ${common}`,
    { cwd, stdio: 'inherit' }
  );
} finally {
  pkg.source = origSource;
  pkg.main = 'dist/xmov-avatar-mp.js';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

// 3. postbuild-patch（入口 + heavy）
execSync('node postbuild-patch.js', { cwd, stdio: 'inherit' });

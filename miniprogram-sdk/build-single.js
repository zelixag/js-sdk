/**
 * 单文件打包：像 Web SDK 一样打成一个 JS，小程序侧只需引入一个文件
 * 输出：dist/xmov-avatar-mp.js
 */

const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const originalSrc = path.resolve(rootDir, '..', 'src'); // 原 SDK 源码

if (!fs.existsSync(originalSrc)) {
  console.error('未找到原 SDK 目录:', originalSrc);
  process.exit(1);
}

// 把 ../../../src、../../src 解析到原 SDK 目录
function resolveOriginalSdkPlugin() {
  return {
    name: 'resolve-original-sdk',
    setup(build) {
      build.onResolve({ filter: /^(\.\.\/)+src\// }, (args) => {
        const sub = args.path.replace(/^(\.\.\/)+src\/?/, '').replace(/\/$/, '');
        const base = path.join(originalSrc, sub);
        const exts = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of exts) {
          const p = base + (path.extname(base) ? '' : ext);
          if (fs.existsSync(p)) return { path: path.resolve(p) };
        }
        return { path: path.resolve(base + '.ts') };
      });
      build.onResolve({ filter: /^socket\.io-client$/ }, () => ({
        path: path.resolve(rootDir, 'src', 'utils', 'socket-io-adapter.ts'),
      }));
    },
  };
}

function runBuild() {
  const esbuild = require('esbuild');
  const outfile = path.join(rootDir, 'dist', 'xmov-avatar-mp.js');
  const entry = path.join(rootDir, 'src', 'single-entry.ts');

  esbuild
    .build({
      entryPoints: [entry],
      bundle: true,
      format: 'cjs',
      outfile,
      platform: 'neutral',
      target: 'es2020',
      sourcemap: false,
      minify: false,
      plugins: [resolveOriginalSdkPlugin()],
      external: ['wx'],
      logLevel: 'info',
    })
    .then(() => {
      console.log('单文件打包完成:', outfile);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

runBuild();

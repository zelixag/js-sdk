/**
 * 使用 Rollup 打 heavy 包并拆成多个 <500KB 的 chunk，满足小程序单文件 500KB 限制。
 * 产出：dist/xmov-avatar-mp.heavy.js（入口）+ dist/xmov-avatar-mp.heavy.[name].js（chunks）
 */
const path = require('path');
const fs = require('fs');
const { rollup } = require('rollup');

const cwd = __dirname;

function parseAlias(str) {
  if (!str) return [];
  return str.split(',').map((part) => {
    const eq = part.indexOf('=');
    const find = part.slice(0, eq).trim();
    let replacement = part.slice(eq + 1).trim();
    if (!replacement.includes('*') && !path.isAbsolute(replacement)) {
      replacement = path.resolve(cwd, replacement);
    } else if (replacement.includes('*') && !path.isAbsolute(replacement)) {
      replacement = path.resolve(cwd, replacement);
    }
    return { find, replacement };
  });
}

const aliasStr =
  'index=../src/index,types=../src/types/index,types/*=../src/types/*,utils/float32-decoder=../src/utils/float32-decoder,modules/ResourceManager=../src/modules/ResourceManager,protobufjs/minimal=node_modules/protobufjs/minimal.js';

async function build() {
  const alias = parseAlias(aliasStr);
  const rpAlias = require('@rollup/plugin-alias');
  const rpNodeResolve = require('@rollup/plugin-node-resolve').default;
  const rpCommonjs = require('@rollup/plugin-commonjs');
  const rpTypescript = require('rollup-plugin-typescript2');

  const input = path.join(cwd, 'src', 'heavy-entry.ts');
  const outDir = path.join(cwd, 'dist');

  const cwdNorm = cwd.replace(/\\/g, '/');
  const manualChunks = (id) => {
    const n = id.replace(/\\/g, '/');
    if (n.includes('/node_modules/')) return 'vendor';
    if (n.startsWith(cwdNorm) || n.includes('/miniprogram-sdk/')) {
      if (n.includes('/core/') || n.includes('/adapters/')) return 'core';
      return undefined;
    }
    if (
      n.includes('/baseRender/') ||
      n.includes('/control/') ||
      n.includes('/modules/') ||
      n.includes('/decoder')
    ) {
      return 'offline1';
    }
    if (
      n.includes('/utils/') ||
      n.includes('/types/') ||
      n.includes('/view/') ||
      n.includes('/worker/') ||
      n.includes('/proto/')
    ) {
      return 'offline2';
    }
    return 'offline';
  };

  const bundle = await rollup({
    input,
    external: (id) => id === 'wx' || /^wx[/\\]/.test(id),
    treeshake: { propertyReadSideEffects: false },
    plugins: [
      rpAlias({ entries: alias }),
      rpNodeResolve({
        mainFields: ['module', 'jsnext', 'main'],
        browser: true,
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json', '.node'],
        preferBuiltins: false,
      }),
      rpCommonjs({
        include: /\/node_modules\/|[\/\\]proto[\/\\]|[\/\\]src[\/\\].*\.js$/,
        requireReturnsDefault: 'namespace',
      }),
      {
        name: 'replace-env',
        transform(code, id) {
          if (!/\.(ts|tsx|js|jsx)$/.test(id)) return null;
          let out = code
            .replace(/\bENV\b/g, JSON.stringify('production'))
            .replace(/\bVERSION\b/g, JSON.stringify('0.1.0-beta.1'));
          out = out.replace(
            /return\s+DefineENV\s*===\s*["']development["']/g,
            'return false'
          );
          return { code: out, map: null };
        },
      },
      rpTypescript({
        cwd,
        tsconfig: path.join(cwd, 'tsconfig.microbundle.json'),
        useTsconfigDeclarationDir: false,
        tsconfigOverride: {
          compilerOptions: {
            module: 'ESNext',
            target: 'esnext',
            declaration: false,
            strict: false,
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
        },
      }),
    ],
  });

  await bundle.write({
    dir: outDir,
    format: 'cjs',
    entryFileNames: 'xmov-avatar-mp.heavy.js',
    chunkFileNames: 'xmov-avatar-mp.heavy.[name].js',
    sourcemap: true,
    manualChunks,
    exports: 'auto',
  });

  await bundle.close();

  const limit = 500 * 1024;
  const files = fs.readdirSync(outDir).filter((f) => f.startsWith('xmov-avatar-mp.heavy'));
  for (const f of files) {
    const fp = path.join(outDir, f);
    const stat = fs.statSync(fp);
    const kb = (stat.size / 1024).toFixed(1);
    if (stat.size > limit) {
      console.warn(`[build-heavy-rollup] ${f} 超过 500KB: ${kb} KB`);
    } else {
      console.log(`[build-heavy-rollup] ${f}: ${kb} KB`);
    }
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

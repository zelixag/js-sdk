/**
 * 构建后补丁：把原 SDK 里的 window.performanceTracker 改为兼容无 window 环境
 * 小程序没有 window，直接写 (typeof window !== 'undefined' ? window : globalThis).performanceTracker
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'dist', 'xmov-avatar-mp.js');
if (!fs.existsSync(file)) {
  console.warn('postbuild-patch: dist/xmov-avatar-mp.js 不存在，跳过');
  process.exit(0);
}

let code = fs.readFileSync(file, 'utf8');

// window.performanceTracker = ... -> (typeof window !== 'undefined' ? window : globalThis).performanceTracker = ...
code = code.replace(
  /\bwindow\.performanceTracker\b/g,
  '(typeof window !== "undefined" ? window : globalThis).performanceTracker'
);

// 统一改为调用入口里挂的 __createObjectURL/__revokeObjectURL（接受任意类型），避免环境自带 URL 只认 Blob 报 "Overload resolution failed"
var urlGetter = '\\(globalThis\\.URL\\|\\|\\(typeof global!=="undefined"&&global\\.URL\\)\\|\\(typeof window!=="undefined"&&window\\.URL\\)\\)';
code = code.replace(new RegExp(urlGetter + '\\.createObjectURL\\s*\\(', 'g'), '__createObjectURL(');
code = code.replace(new RegExp(urlGetter + '\\.revokeObjectURL\\s*\\(', 'g'), '__revokeObjectURL(');
code = code.replace(/\bwindow\.URL\.createObjectURL\s*\(/g, '__createObjectURL(');
code = code.replace(/\bwindow\.URL\.revokeObjectURL\s*\(/g, '__revokeObjectURL(');
code = code.replace(/\bURL\.createObjectURL\s*\(/g, '__createObjectURL(');
code = code.replace(/\bURL\.revokeObjectURL\s*\(/g, '__revokeObjectURL(');
code = code.replace(/\b!window\.URL\s*\|\|\s*!URL\.createObjectURL\b/g, "typeof __createObjectURL !== 'function'");

// 禁止产物里残留 require('@msgpack/msgpack')，否则小程序会报 module not defined
if (/require\s*\(\s*['"]@msgpack\/msgpack['"]\s*\)/.test(code)) {
  console.error("postbuild-patch: 产物中仍存在 require('@msgpack/msgpack')，小程序无法加载。");
  console.error("  请确保 package.json 里 @msgpack/msgpack 在 dependencies，且不在 peerDependencies。");
  process.exit(1);
}

fs.writeFileSync(file, code);
console.log('postbuild-patch: 已替换 window.performanceTracker 为兼容写法');

// 若有 heavy 包（含拆包后的 chunk）也打补丁
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  const heavyFiles = fs.readdirSync(distDir).filter((n) => n.startsWith('xmov-avatar-mp.heavy') && n.endsWith('.js') && !n.endsWith('.map'));
  for (const name of heavyFiles) {
    const heavyFile = path.join(distDir, name);
    let heavyCode = fs.readFileSync(heavyFile, 'utf8');
    heavyCode = heavyCode.replace(/\bwindow\.performanceTracker\b/g, '(typeof window !== "undefined" ? window : globalThis).performanceTracker');
    heavyCode = heavyCode.replace(new RegExp(urlGetter + '\\.createObjectURL\\s*\\(', 'g'), '__createObjectURL(');
    heavyCode = heavyCode.replace(new RegExp(urlGetter + '\\.revokeObjectURL\\s*\\(', 'g'), '__revokeObjectURL(');
    heavyCode = heavyCode.replace(/\bwindow\.URL\.createObjectURL\s*\(/g, '__createObjectURL(');
    heavyCode = heavyCode.replace(/\bwindow\.URL\.revokeObjectURL\s*\(/g, '__revokeObjectURL(');
    heavyCode = heavyCode.replace(/\bURL\.createObjectURL\s*\(/g, '__createObjectURL(');
    heavyCode = heavyCode.replace(/\bURL\.revokeObjectURL\s*\(/g, '__revokeObjectURL(');
    heavyCode = heavyCode.replace(/\b!window\.URL\s*\|\|\s*!URL\.createObjectURL\b/g, "typeof __createObjectURL !== 'function'");
    // protobufjs 循环依赖导致 require$$4.LongBits 可能尚未赋值，回退到同 chunk 内的 longbits（replace 里 $$ 表示一个 $，故用 $$$$ 输出 $$）
    if (name === 'xmov-avatar-mp.heavy.vendor.js') {
      heavyCode = heavyCode.replace(/\brequire\$\$4\.LongBits\b/g, '(require$$$$4 && require$$$$4.LongBits) || longbits');
    }
    fs.writeFileSync(heavyFile, heavyCode);
  }
  if (heavyFiles.length) console.log('postbuild-patch: 已处理', heavyFiles.length, '个 heavy 文件');
}

// 构建后自动复制到 use-bundle 示例，避免忘记复制导致示例仍用旧包
const copyScript = path.join(__dirname, 'examples', 'use-bundle', 'copy-bundle.cjs');
if (fs.existsSync(copyScript)) {
  require('child_process').execSync('node "' + copyScript + '"', { stdio: 'inherit', cwd: __dirname });
}

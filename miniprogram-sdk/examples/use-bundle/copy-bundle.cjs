/**
 * 复制 SDK 到示例项目（单文件或拆包后的入口 + part 文件）
 */

const fs = require('fs');
const path = require('path');

const currentDir = __dirname;
const distDir = path.resolve(currentDir, '../../dist');
const targetSdkDir = path.resolve(currentDir, 'sdk');

if (!fs.existsSync(path.join(distDir, 'xmov-avatar-mp.js'))) {
  console.error('❌ 未找到 dist/xmov-avatar-mp.js。请先在 miniprogram-sdk 根目录执行：npm run build');
  process.exit(1);
}

if (!fs.existsSync(targetSdkDir)) {
  fs.mkdirSync(targetSdkDir, { recursive: true });
}

// 复制入口
fs.copyFileSync(path.join(distDir, 'xmov-avatar-mp.js'), path.join(targetSdkDir, 'xmov-avatar-mp.js'));

// 复制 heavy 包及所有 chunk（xmov-avatar-mp.heavy*.js，不含 .map）
const distFiles = fs.readdirSync(distDir);
distFiles.forEach((name) => {
  if (/^xmov-avatar-mp\.heavy[\w.-]*\.js$/.test(name) && !name.endsWith('.map')) {
    fs.copyFileSync(path.join(distDir, name), path.join(targetSdkDir, name));
  }
});

console.log('✅ 已复制 SDK 到 sdk/');
console.log('   页面用法：require.async("../../sdk/xmov-avatar-mp") 或 require("../../sdk/xmov-avatar-mp")');

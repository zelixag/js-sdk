/**
 * 复制 SDK dist 目录到测试目录
 * 在小程序中，require 无法解析 ../../ 这样的路径
 * 所以需要将 dist 目录复制到测试目录中
 * 
 * 注意：由于 package.json 中设置了 "type": "module"，
 * 这个文件需要使用 ES 模块语法，或者重命名为 .cjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前脚本所在目录（ES 模块方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取当前脚本所在目录
const currentDir = __dirname;
// dist 目录在 examples/test-adapter 的上级目录的上级目录
const distPath = path.resolve(currentDir, '../../dist');
const targetPath = path.resolve(currentDir, 'sdk');

console.log('当前目录:', currentDir);

console.log('复制 SDK 文件...');
console.log('源目录:', distPath);
console.log('目标目录:', targetPath);

// 删除旧的 sdk 目录
if (fs.existsSync(targetPath)) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log('已删除旧的 sdk 目录');
}

// 复制 dist 目录
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDir(distPath, targetPath);
  console.log('✅ SDK 文件复制成功！');
  console.log('现在可以在测试页面中使用 require("./sdk/utils/env.js")');
} catch (err) {
  console.error('❌ 复制失败:', err);
  process.exit(1);
}

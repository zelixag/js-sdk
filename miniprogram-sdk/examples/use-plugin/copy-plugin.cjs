/**
 * 复制插件到示例项目
 */

const fs = require('fs');
const path = require('path');

const currentDir = __dirname;
const pluginSourcePath = path.resolve(currentDir, '../../dist/plugin/plugin');
const pluginTargetPath = path.resolve(currentDir, 'plugin');

console.log('源目录:', pluginSourcePath);
console.log('目标目录:', pluginTargetPath);

if (!fs.existsSync(pluginSourcePath)) {
  console.error('❌ 插件目录不存在，请先运行: npm run build:plugin');
  process.exit(1);
}

// 删除旧的 plugin 目录
if (fs.existsSync(pluginTargetPath)) {
  fs.rmSync(pluginTargetPath, { recursive: true, force: true });
  console.log('已删除旧的 plugin 目录');
}

// 复制函数
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
  copyDir(pluginSourcePath, pluginTargetPath);
  console.log('✅ 插件复制成功！');
  console.log('现在可以在 app.json 中配置插件');
} catch (err) {
  console.error('❌ 复制失败:', err);
  process.exit(1);
}

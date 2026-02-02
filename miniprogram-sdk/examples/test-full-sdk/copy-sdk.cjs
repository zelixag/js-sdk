/**
 * 复制 SDK dist 目录到测试目录
 * 使用 CommonJS 格式，因为小程序环境不支持 ES 模块
 */

const fs = require('fs');
const path = require('path');

// 获取当前脚本所在目录
const currentDir = __dirname;
// dist 目录在 test-full-sdk 的上级目录的上级目录
const distPath = path.resolve(currentDir, '../../dist');
const targetPath = path.resolve(currentDir, 'sdk');

console.log('当前目录:', currentDir);
console.log('源目录:', distPath);
console.log('目标目录:', targetPath);

// 检查源目录是否存在
if (!fs.existsSync(distPath)) {
  console.error('❌ 源目录不存在:', distPath);
  console.error('请先运行: cd ../../ && npm run build');
  process.exit(1);
}

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
  // 1. 复制 miniprogram-sdk/src 目录下的所有文件
  const miniprogramSrcPath = path.join(distPath, 'miniprogram-sdk', 'src');
  if (fs.existsSync(miniprogramSrcPath)) {
    console.log('复制小程序 SDK 文件...');
    copyDir(miniprogramSrcPath, targetPath);
    console.log('✅ 小程序 SDK 文件复制完成');
  } else {
    console.warn('⚠️ 未找到 miniprogram-sdk/src 目录');
  }

  // 2. 复制原 SDK 的编译后文件（dist/src 目录）
  // 这些文件被 XmovAvatarMP 等模块引用（如 ../../../src/types/index）
  const originalSrcPath = path.join(distPath, 'src');
  const targetSrcPath = path.join(targetPath, 'src');
  
  if (fs.existsSync(originalSrcPath)) {
    console.log('复制原 SDK 文件到 sdk/src...');
    copyDir(originalSrcPath, targetSrcPath);
    console.log('✅ 原 SDK 文件复制完成');
  } else {
    console.warn('⚠️ 未找到 dist/src 目录，尝试从源码目录复制...');
    
    // 如果 dist/src 不存在，尝试从源码目录复制
    const sourceSrcPath = path.resolve(currentDir, '../../../src');
    if (fs.existsSync(sourceSrcPath)) {
      console.log('从源码目录复制原 SDK 文件...');
      // 只复制需要的目录
      const neededDirs = ['types', 'utils', 'modules', 'control', 'baseRender', 'view', 'proto'];
      
      for (const dir of neededDirs) {
        const srcDir = path.join(sourceSrcPath, dir);
        const destDir = path.join(targetSrcPath, dir);
        if (fs.existsSync(srcDir)) {
          copyDir(srcDir, destDir);
          console.log(`  ✅ 已复制 ${dir}/`);
        }
      }
      console.log('✅ 原 SDK 源码文件复制完成');
    } else {
      console.warn('⚠️ 未找到源码目录，某些功能可能无法正常工作');
    }
  }

  // 3. 修复导入路径：将 ../../../src/ 替换为 ../src/
  // 因为在小程序环境中，文件在 sdk/ 目录下，路径应该是相对于 sdk 的
  console.log('修复导入路径...');
  function fixImportPaths(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        fixImportPaths(fullPath);
      } else if (entry.name.endsWith('.js')) {
        // 读取文件内容
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;
        
        // 替换 import 路径
        // 将 ../../../src/ 替换为 ../src/
        // 将 ../../src/ 替换为 ../src/
        // 将 ../../../src 替换为 ../src
        const replacements = [
          [/from\s+['"]\.\.\/\.\.\/\.\.\/src\//g, "from '../src/"],
          [/from\s+['"]\.\.\/\.\.\/src\//g, "from '../src/"],
          [/require\(['"]\.\.\/\.\.\/\.\.\/src\//g, "require('../src/"],
          [/require\(['"]\.\.\/\.\.\/src\//g, "require('../src/"],
        ];
        
        for (const [pattern, replacement] of replacements) {
          if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            modified = true;
          }
        }
        
        // 如果文件被修改，写回
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf-8');
          console.log(`  ✅ 已修复: ${path.relative(targetPath, fullPath)}`);
        }
      }
    }
  }
  
  fixImportPaths(targetPath);
  console.log('✅ 导入路径修复完成');

  console.log('\n✅ 所有 SDK 文件复制成功！');
  console.log('文件结构:');
  console.log('  sdk/ - 小程序 SDK 文件');
  console.log('  sdk/src/ - 原 SDK 文件（types, utils, modules 等）');
  console.log('\n现在可以在测试页面中使用 require("./sdk/utils/env.js")');
  
} catch (err) {
  console.error('❌ 复制失败:', err);
  process.exit(1);
}

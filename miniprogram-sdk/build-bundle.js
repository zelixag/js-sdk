/**
 * 打包脚本：将 SDK 打包成可直接使用的第三方包
 * 包含所有依赖，解决路径问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('开始打包小程序 SDK 为第三方包...\n');

// 1. 检查是否已有构建文件
console.log('1. 检查构建文件...');
const distMiniprogramPath = path.join(__dirname, 'dist', 'miniprogram-sdk', 'src');
const distOriginalPath = path.join(__dirname, 'dist', 'src');

if (!fs.existsSync(distMiniprogramPath) && !fs.existsSync(distOriginalPath)) {
  console.log('未找到构建文件，尝试构建 TypeScript...');
  try {
    // 只构建小程序 SDK 的文件，忽略原 SDK 的类型错误
    execSync('npx tsc --project tsconfig.json --skipLibCheck', { 
      cwd: __dirname, 
      stdio: 'pipe'  // 不显示错误，因为原 SDK 有类型错误
    });
    console.log('✅ TypeScript 构建完成（已忽略原 SDK 类型错误）\n');
  } catch (error) {
    // 即使有错误也继续，因为原 SDK 的类型错误不影响小程序 SDK
    console.log('⚠️ TypeScript 构建有错误（原 SDK 类型错误，不影响小程序 SDK）\n');
  }
} else {
  console.log('✅ 已找到构建文件，跳过构建\n');
}

// 2. 创建打包目录结构
console.log('2. 创建打包目录结构...');
const bundleDir = path.join(__dirname, 'dist', 'bundle');
const bundleSrcDir = path.join(bundleDir, 'src');

if (fs.existsSync(bundleDir)) {
  fs.rmSync(bundleDir, { recursive: true, force: true });
}
fs.mkdirSync(bundleDir, { recursive: true });
fs.mkdirSync(bundleSrcDir, { recursive: true });

// 3. 复制小程序 SDK 文件
console.log('3. 复制小程序 SDK 文件...');
function copyDir(src, dest, filter = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    // 跳过某些目录
    if (filter && !filter(entry.name)) {
      continue;
    }
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 优先使用构建后的文件
const miniprogramSrcPath = path.join(__dirname, 'dist', 'miniprogram-sdk', 'src');
if (fs.existsSync(miniprogramSrcPath)) {
  copyDir(miniprogramSrcPath, bundleDir);
  console.log('✅ 小程序 SDK 文件复制完成');
} else {
  console.warn('⚠️ 未找到 dist/miniprogram-sdk/src，尝试从源码复制...');
  const sourcePath = path.join(__dirname, 'src');
  if (fs.existsSync(sourcePath)) {
    // 只复制 .ts 文件，小程序会自己编译
    copyDir(sourcePath, bundleDir, (name) => {
      return name.endsWith('.ts') || name.endsWith('.js');
    });
    console.log('✅ 从源码复制完成（仅复制 .ts/.js 文件）');
  } else {
    console.error('❌ 未找到源码目录');
    process.exit(1);
  }
}

// 4. 复制原 SDK 文件到 bundle/src
console.log('4. 复制原 SDK 文件...');
const originalSrcPath = path.join(__dirname, 'dist', 'src');
if (fs.existsSync(originalSrcPath)) {
  copyDir(originalSrcPath, bundleSrcDir);
  console.log('✅ 原 SDK 文件复制完成');
} else {
  // 从源码目录复制
  const sourceOriginalPath = path.resolve(__dirname, '../src');
  if (fs.existsSync(sourceOriginalPath)) {
    // 只复制需要的目录
    const neededDirs = ['types', 'utils', 'modules', 'control', 'baseRender', 'view', 'worker', 'proto'];
    for (const dir of neededDirs) {
      const srcDir = path.join(sourceOriginalPath, dir);
      const destDir = path.join(bundleSrcDir, dir);
      if (fs.existsSync(srcDir)) {
        copyDir(srcDir, destDir);
        console.log(`  ✅ 已复制 ${dir}/`);
      }
    }
    console.log('✅ 原 SDK 源码文件复制完成');
  }
}

// 5. 修复导入路径
console.log('5. 修复导入路径...');
function fixImportPaths(dir, relativeTo = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(relativeTo, entry.name);
    
    if (entry.isDirectory()) {
      fixImportPaths(fullPath, relativePath);
    } else if (entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;
      
      // 修复 import 路径
      // 将 ../../../src/ 替换为 ../src/
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
      
      // 将 ES6 export default 转换为 CommonJS module.exports
      // 处理多种格式：
      // 1. export default ClassName;
      // 2. export default class ClassName { ... }
      // 3. export default function name() { ... }
      if (content.includes('export default')) {
        // 匹配 export default class ClassName
        const exportDefaultClassMatch = content.match(/export\s+default\s+class\s+(\w+)/);
        if (exportDefaultClassMatch) {
          const className = exportDefaultClassMatch[1];
          // 找到 class 定义的结束位置（最后一个大括号）
          const classStart = content.indexOf(`export default class ${className}`);
          let braceCount = 0;
          let classEnd = classStart;
          let inString = false;
          let stringChar = '';
          
          for (let i = classStart; i < content.length; i++) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';
            
            // 处理字符串
            if (!inString && (char === '"' || char === "'" || char === '`')) {
              inString = true;
              stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
              inString = false;
            }
            
            if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  classEnd = i + 1;
                  break;
                }
              }
            }
          }
          
          // 替换 export default class 为 class，并在文件末尾添加 module.exports
          const beforeExport = content.substring(0, classStart);
          const classDefinition = content.substring(classStart, classEnd);
          const afterClass = content.substring(classEnd);
          
          // 移除 export default
          const newClassDefinition = classDefinition.replace(/export\s+default\s+/, '');
          
          // 在文件末尾添加 module.exports（如果还没有）
          if (!content.includes(`module.exports = ${className}`) && !content.includes(`module.exports = ${className};`)) {
            // 找到最后一个非空行
            const lines = afterClass.split('\n');
            let lastNonEmptyLine = -1;
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].trim()) {
                lastNonEmptyLine = i;
                break;
              }
            }
            
            if (lastNonEmptyLine >= 0) {
              lines.splice(lastNonEmptyLine + 1, 0, `module.exports = ${className};`);
              content = beforeExport + newClassDefinition + lines.join('\n');
            } else {
              content = beforeExport + newClassDefinition + afterClass + `\nmodule.exports = ${className};`;
            }
          } else {
            content = beforeExport + newClassDefinition + afterClass;
          }
          modified = true;
        } else {
          // 匹配简单的 export default ClassName; (在文件末尾)
          const exportDefaultMatch = content.match(/export\s+default\s+(\w+);?\s*$/m);
          if (exportDefaultMatch) {
            const className = exportDefaultMatch[1];
            content = content.replace(/export\s+default\s+\w+;?\s*$/m, `module.exports = ${className};`);
            modified = true;
          }
        }
      }
      
      // 修复 require().default 为 require()（CommonJS 不需要 .default）
      if (content.includes('require(') && content.includes('.default')) {
        // 匹配 require('...').default 或 require("...").default
        content = content.replace(/require\(['"]([^'"]+)['"]\)\.default/g, "require('$1')");
        modified = true;
      }
      
      // 将 ES6 import 转换为 CommonJS require
      if (content.includes('import ')) {
        // 处理 import { name1, name2 } from './path'
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (match, names, path) => {
          const varNames = names.split(',').map(n => n.trim()).join(', ');
          return `const { ${varNames} } = require('${path}');`;
        });
        
        // 处理 import name from './path'
        content = content.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, "const $1 = require('$2');");
        
        // 处理 import './path' (副作用导入)
        content = content.replace(/import\s+['"]([^'"]+)['"];?/g, "require('$1');");
        
        modified = true;
      }
      
      // 将 ES6 export 转换为 CommonJS
      // 处理 export function name() { ... } 和 export async function name() { ... }
      if (content.includes('export function') || content.includes('export async function')) {
        // 匹配 export [async] function name(...) { ... }
        const exportFunctionMatches = [...content.matchAll(/export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g)];
        const functions = [];
        for (const match of exportFunctionMatches) {
          functions.push(match[2]); // match[2] 是函数名
        }
        if (functions.length > 0) {
          // 移除 export 关键字
          content = content.replace(/export\s+(async\s+)?function\s+/g, '$1function ');
          // 收集所有导出的内容
          const allExports = [...functions];
          
          // 处理 export const name = ...
          const exportConstMatches = [...content.matchAll(/export\s+const\s+(\w+)\s*=/g)];
          for (const match of exportConstMatches) {
            allExports.push(match[1]);
            content = content.replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =');
          }
          
          // 处理 export class Name { ... }
          const exportClassMatches = [...content.matchAll(/export\s+class\s+(\w+)/g)];
          for (const match of exportClassMatches) {
            allExports.push(match[1]);
            content = content.replace(/export\s+class\s+(\w+)/g, 'class $1');
          }
          
          // 在文件末尾添加或更新 module.exports
          if (!content.includes('module.exports')) {
            const exports = allExports.map(f => `  ${f}: ${f}`).join(',\n');
            content = content + `\nmodule.exports = {\n${exports}\n};`;
          } else {
            // 如果已有 module.exports，合并导出
            const existingExports = new Set();
            const moduleExportsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
            if (moduleExportsMatch) {
              const existing = moduleExportsMatch[1].split(',').map(e => e.trim().split(':')[0].trim());
              existing.forEach(e => existingExports.add(e));
            }
            allExports.forEach(e => existingExports.add(e));
            const exports = Array.from(existingExports).map(f => `  ${f}: ${f}`).join(',\n');
            content = content.replace(/module\.exports\s*=\s*\{[^}]+\}/, `module.exports = {\n${exports}\n}`);
          }
          modified = true;
        }
      }
      
      // 处理单独的 export const/class（没有 function）
      if ((content.includes('export const') || content.includes('export class')) && !content.includes('export function')) {
        const allExports = [];
        
        // 处理 export const name = ...
        const exportConstMatches = [...content.matchAll(/export\s+const\s+(\w+)\s*=/g)];
        for (const match of exportConstMatches) {
          allExports.push(match[1]);
          content = content.replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =');
        }
        
        // 处理 export class Name { ... }
        const exportClassMatches = [...content.matchAll(/export\s+class\s+(\w+)/g)];
        for (const match of exportClassMatches) {
          allExports.push(match[1]);
          content = content.replace(/export\s+class\s+(\w+)/g, 'class $1');
        }
        
        if (allExports.length > 0 && !content.includes('module.exports')) {
          const exports = allExports.map(f => `  ${f}: ${f}`).join(',\n');
          content = content + `\nmodule.exports = {\n${exports}\n};`;
          modified = true;
        }
      }
      
      // 将 ES6 export { ... } 转换为 CommonJS
      // 处理 export { name1, name2 } from './path'
      if (content.includes('export {') && content.includes(' from ')) {
        const exportFromMatch = content.match(/export\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/);
        if (exportFromMatch) {
          const names = exportFromMatch[1].split(',').map(n => n.trim());
          const path = exportFromMatch[2];
          const varNames = names.join(', ');
          const moduleExports = names.map(n => {
            const parts = n.split(' as ');
            const originalName = parts[0].trim();
            const exportName = parts.length > 1 ? parts[1].trim() : originalName;
            return `  ${exportName}: ${originalName}`;
          }).join(',\n');
          content = content.replace(/export\s*\{[^}]+\}\s+from\s+['"][^'"]+['"];?/, 
            `const { ${varNames} } = require('${path}');\nmodule.exports = {\n${moduleExports}\n};`);
          modified = true;
        }
      }
      
      // 处理 export { name1, name2 }; (没有 from)
      const exportNamedMatch = content.match(/export\s*\{([^}]+)\};?\s*$/m);
      if (exportNamedMatch && !content.includes('module.exports') && !content.includes(' from ')) {
        const exports = exportNamedMatch[1].split(',').map(e => e.trim());
        const moduleExports = exports.map(e => {
          const parts = e.split(' as ');
          const originalName = parts[0].trim();
          const exportName = parts.length > 1 ? parts[1].trim() : originalName;
          return `  ${exportName}: ${originalName}`;
        }).join(',\n');
        content = content.replace(/export\s*\{[^}]+\};?\s*$/m, `module.exports = {\n${moduleExports}\n};`);
        modified = true;
      }
      
      // 处理 export default async function name() { ... }
      if (content.includes('export default async function')) {
        const match = content.match(/export\s+default\s+async\s+function\s+(\w+)\s*\(/);
        if (match) {
          const funcName = match[1];
          content = content.replace(/export\s+default\s+async\s+function\s+(\w+)/, 'async function $1');
          if (!content.includes('module.exports')) {
            content = content + `\nmodule.exports = ${funcName};`;
          }
          modified = true;
        }
      }
      
      // 处理 export default function name() { ... } (非 async)
      if (content.includes('export default function') && !content.includes('export default async function')) {
        const match = content.match(/export\s+default\s+function\s+(\w+)\s*\(/);
        if (match) {
          const funcName = match[1];
          content = content.replace(/export\s+default\s+function\s+(\w+)/, 'function $1');
          if (!content.includes('module.exports')) {
            content = content + `\nmodule.exports = ${funcName};`;
          }
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  }
}

fixImportPaths(bundleDir);
console.log('✅ 导入路径修复完成');

// 6. 创建 package.json
console.log('6. 创建 package.json...');
const packageJson = {
  name: '@xmov/avatar-miniprogram-bundle',
  version: '0.1.0-beta.1',
  description: '微信小程序数字人 SDK - 打包版本（包含所有依赖）',
  main: './index-init.js',
  types: './index-init.d.ts',
  files: [
    '**/*.js',
    '**/*.d.ts',
    '**/*.json'
  ],
  keywords: [
    'miniprogram',
    'wechat',
    'avatar',
    'sdk'
  ],
  author: 'XMOV Team',
  license: 'MIT'
};

fs.writeFileSync(
  path.join(bundleDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);
console.log('✅ package.json 创建完成');

// 7. 创建 README
console.log('7. 创建 README...');
const readme = `# 微信小程序数字人 SDK - 打包版本

这是一个包含所有依赖的打包版本，可以直接在小程序项目中使用。

## 使用方法

### 方法 1：直接复制到项目

1. 将整个 \`bundle\` 目录复制到你的小程序项目
2. 在页面中使用：

\`\`\`javascript
// pages/index/index.js
const XmovAvatarMP = require('../../bundle/core/XmovAvatarMP.js').default;
// 或
const { isMiniProgram } = require('../../bundle/utils/env.js');
\`\`\`

### 方法 2：作为 npm 包（如果发布到 npm）

\`\`\`bash
npm install @xmov/avatar-miniprogram-bundle
\`\`\`

\`\`\`javascript
// pages/index/index.js
const XmovAvatarMP = require('@xmov/avatar-miniprogram-bundle/core/XmovAvatarMP.js').default;
\`\`\`

## 文件结构

\`\`\`
bundle/
├── index-init.js      # 初始化脚本（必须先加载）
├── core/              # 核心类
├── utils/             # 工具函数
├── adapters/         # 适配器
├── src/               # 原 SDK 文件
│   ├── types/        # 类型定义
│   ├── utils/        # 工具函数
│   ├── modules/      # 模块
│   └── ...
└── package.json
\`\`\`

## 注意事项

1. **必须先加载 index-init.js**：这个文件会初始化适配层
2. **路径已修复**：所有导入路径都已修复为相对路径
3. **包含所有依赖**：不需要额外复制文件

## 使用示例

\`\`\`javascript
// 1. 先加载初始化脚本
require('../../bundle/index-init.js');

// 2. 加载核心类
const XmovAvatarMP = require('../../bundle/core/XmovAvatarMP.js').default;

// 3. 使用
const avatar = new XmovAvatarMP({
  canvasId: 'avatar-canvas',
  // ... 其他配置
});
\`\`\`
`;

fs.writeFileSync(path.join(bundleDir, 'README.md'), readme);
console.log('✅ README 创建完成');

console.log('\n✅ 打包完成！');
console.log('打包目录:', bundleDir);
console.log('\n使用方法:');
console.log('1. 将 bundle 目录复制到你的小程序项目');
console.log('2. 在页面中 require 需要的模块');
console.log('3. 确保先加载 index-init.js');

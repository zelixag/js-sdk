/**
 * 简单测试：验证删除重复文件后的功能
 */

const fs = require('fs');
const path = require('path');

console.log('=== 删除重复文件后的功能验证 ===\n');

// 测试 1: 检查重复文件是否已删除
console.log('1. 重复文件删除验证');
const duplicateFiles = [
  path.resolve(__dirname, '../src/modules/ResourceManager.ts'),
  path.resolve(__dirname, '../src/baseRender/AvatarRenderer.ts'),
  path.resolve(__dirname, '../src/control/RenderScheduler.ts'),
  path.resolve(__dirname, '../src/control/ttsa.ts'),
];

let allDeleted = true;
for (const filePath of duplicateFiles) {
  const exists = fs.existsSync(filePath);
  const fileName = path.basename(filePath);
  console.log(`   ${fileName}:`, exists ? '❌ 仍存在' : '✅ 已删除');
  if (exists) {
    allDeleted = false;
  }
}

if (allDeleted) {
  console.log('   ✅ 所有重复文件已删除\n');
} else {
  console.log('   ❌ 仍有重复文件存在\n');
}

// 测试 2: 检查原 SDK 模块是否存在
console.log('2. 原 SDK 模块路径检查');
const originalModules = [
  { name: 'ResourceManager', path: path.resolve(__dirname, '../../src/modules/ResourceManager.ts') },
  { name: 'RenderScheduler', path: path.resolve(__dirname, '../../src/control/RenderScheduler.ts') },
  { name: 'Ttsa', path: path.resolve(__dirname, '../../src/control/ttsa.ts') },
  { name: 'AvatarRenderer', path: path.resolve(__dirname, '../../src/baseRender/AvatarRenderer.ts') },
];

let allExist = true;
for (const { name, path: filePath } of originalModules) {
  const exists = fs.existsSync(filePath);
  console.log(`   ${name}:`, exists ? '✅' : '❌');
  if (!exists) {
    allExist = false;
  }
}

if (allExist) {
  console.log('   ✅ 原 SDK 模块路径检查通过\n');
} else {
  console.log('   ❌ 部分原 SDK 模块不存在\n');
}

// 测试 3: 检查 XmovAvatarMP 中的方法
console.log('3. XmovAvatarMP 方法检查');
const xmovAvatarMPPath = path.resolve(__dirname, '../src/core/XmovAvatarMP.ts');
if (fs.existsSync(xmovAvatarMPPath)) {
  const content = fs.readFileSync(xmovAvatarMPPath, 'utf-8');
  
  const methods = [
    'createResourceManager',
    'createRenderScheduler',
    'connectTtsa',
    'handleMessage',
    'handleAAFrame',
    'runStartFrameIndex',
    'ttsaStateChangeHandle',
  ];
  
  let allMethodsExist = true;
  for (const method of methods) {
    const exists = content.includes(method);
    console.log(`   ${method}:`, exists ? '✅' : '❌');
    if (!exists) {
      allMethodsExist = false;
    }
  }
  
  // 检查是否使用原 SDK 模块
  const usesOriginalSDK = content.includes('require(\'../../../src/modules/ResourceManager\')') ||
                         content.includes('require(\'../../../src/control/RenderScheduler\')') ||
                         content.includes('require(\'../../../src/control/ttsa\')');
  
  console.log(`   使用原 SDK 模块:`, usesOriginalSDK ? '✅' : '❌');
  
  if (allMethodsExist && usesOriginalSDK) {
    console.log('   ✅ XmovAvatarMP 方法检查通过\n');
  } else {
    console.log('   ⚠️ 部分方法缺失或未使用原 SDK 模块\n');
  }
} else {
  console.log('   ❌ XmovAvatarMP.ts 文件不存在\n');
}

// 测试 4: 检查适配层文件
console.log('4. 适配层文件检查');
const adapterFiles = [
  { name: 'api-polyfill.ts', path: path.resolve(__dirname, '../src/utils/api-polyfill.ts') },
  { name: 'module-polyfill.ts', path: path.resolve(__dirname, '../src/utils/module-polyfill.ts') },
  { name: 'socket-io-adapter.ts', path: path.resolve(__dirname, '../src/utils/socket-io-adapter.ts') },
  { name: 'canvas-replacement.ts', path: path.resolve(__dirname, '../src/utils/canvas-replacement.ts') },
  { name: 'index-init.ts', path: path.resolve(__dirname, '../src/index-init.ts') },
];

let allAdapterFilesExist = true;
for (const { name, path: filePath } of adapterFiles) {
  const exists = fs.existsSync(filePath);
  console.log(`   ${name}:`, exists ? '✅' : '❌');
  if (!exists) {
    allAdapterFilesExist = false;
  }
}

if (allAdapterFilesExist) {
  console.log('   ✅ 所有适配层文件存在\n');
} else {
  console.log('   ❌ 部分适配层文件缺失\n');
}

console.log('=== 测试完成 ===');
console.log('\n总结：');
if (allDeleted && allExist && allAdapterFilesExist) {
  console.log('✅ 所有检查通过！删除重复文件后的适配方案正确。');
} else {
  console.log('⚠️ 部分检查未通过，请检查相应的文件或配置。');
}

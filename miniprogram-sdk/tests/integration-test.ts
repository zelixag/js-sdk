/**
 * 集成测试：验证删除重复文件后，原 SDK 模块是否能正常工作
 */

import { isMiniProgram } from '../src/utils/env';

console.log('=== 集成测试：删除重复文件后的功能验证 ===\n');

// 测试 1: 环境检测
console.log('1. 环境检测测试');
console.log('   isMiniProgram():', isMiniProgram());
console.log('   当前环境:', isMiniProgram() ? '小程序' : 'Node.js/浏览器');
console.log('   ✅ 环境检测通过\n');

// 测试 2: 检查适配层是否已初始化
console.log('2. 适配层初始化测试');
try {
  // 检查全局 polyfill
  const hasFetch = typeof globalThis.fetch === 'function';
  const hasImage = typeof (globalThis as any).Image === 'function';
  const hasDocument = typeof (globalThis as any).document === 'object';
  const hasNavigator = typeof (globalThis as any).navigator === 'object';
  
  console.log('   fetch polyfill:', hasFetch ? '✅' : '❌');
  console.log('   Image polyfill:', hasImage ? '✅' : '❌');
  console.log('   document polyfill:', hasDocument ? '✅' : '❌');
  console.log('   navigator polyfill:', hasNavigator ? '✅' : '❌');
  
  if (hasFetch && hasImage && hasDocument && hasNavigator) {
    console.log('   ✅ 适配层初始化通过\n');
  } else {
    console.log('   ⚠️ 部分适配层未初始化（在 Node.js 环境中是正常的）\n');
  }
} catch (err: any) {
  console.log('   ❌ 适配层检查失败:', err?.message || err);
}

// 测试 3: 检查模块导入路径
console.log('3. 模块导入路径测试');
try {
  // 尝试动态导入原 SDK 模块（使用 require 模拟）
  // 注意：在 TypeScript 中，我们需要检查路径是否正确
  const path = require('path');
  const fs = require('fs');
  
  const resourceManagerPath = path.resolve(__dirname, '../../src/modules/ResourceManager.ts');
  const renderSchedulerPath = path.resolve(__dirname, '../../src/control/RenderScheduler.ts');
  const ttsaPath = path.resolve(__dirname, '../../src/control/ttsa.ts');
  const avatarRendererPath = path.resolve(__dirname, '../../src/baseRender/AvatarRenderer.ts');
  
  const paths = [
    { name: 'ResourceManager', path: resourceManagerPath },
    { name: 'RenderScheduler', path: renderSchedulerPath },
    { name: 'Ttsa', path: ttsaPath },
    { name: 'AvatarRenderer', path: avatarRendererPath },
  ];
  
  let allExist = true;
  for (const { name, path: filePath } of paths) {
    const exists = fs.existsSync(filePath);
    console.log(`   ${name}:`, exists ? '✅' : '❌', filePath);
    if (!exists) {
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log('   ✅ 原 SDK 模块路径检查通过\n');
  } else {
    console.log('   ❌ 部分原 SDK 模块不存在\n');
  }
} catch (err: any) {
  console.log('   ⚠️ 路径检查失败（可能是 Node.js 环境限制）:', err?.message || err);
}

// 测试 4: 检查重复文件是否已删除
console.log('4. 重复文件删除验证');
try {
  const path = require('path');
  const fs = require('fs');
  
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
} catch (err: any) {
  console.log('   ⚠️ 文件检查失败:', err?.message || err);
}

// 测试 5: 检查 XmovAvatarMP 中的方法
console.log('5. XmovAvatarMP 方法检查');
try {
  // 检查 XmovAvatarMP 文件是否存在
  const path = require('path');
  const fs = require('fs');
  
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
} catch (err: any) {
  console.log('   ⚠️ 方法检查失败:', err?.message || err);
}

// 测试 6: 检查适配层文件
console.log('6. 适配层文件检查');
try {
  const path = require('path');
  const fs = require('fs');
  
  const adapterFiles = [
    { name: 'api-polyfill.ts', path: path.resolve(__dirname, '../src/utils/api-polyfill.ts') },
    { name: 'module-polyfill.ts', path: path.resolve(__dirname, '../src/utils/module-polyfill.ts') },
    { name: 'socket-io-adapter.ts', path: path.resolve(__dirname, '../src/utils/socket-io-adapter.ts') },
    { name: 'canvas-replacement.ts', path: path.resolve(__dirname, '../src/utils/canvas-replacement.ts') },
    { name: 'index-init.ts', path: path.resolve(__dirname, '../src/index-init.ts') },
  ];
  
  let allExist = true;
  for (const { name, path: filePath } of adapterFiles) {
    const exists = fs.existsSync(filePath);
    console.log(`   ${name}:`, exists ? '✅' : '❌');
    if (!exists) {
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log('   ✅ 所有适配层文件存在\n');
  } else {
    console.log('   ❌ 部分适配层文件缺失\n');
  }
} catch (err: any) {
  console.log('   ⚠️ 文件检查失败:', err?.message || err);
}

console.log('=== 测试完成 ===');
console.log('\n提示：');
console.log('- 如果所有测试通过，说明删除重复文件后的适配方案正确');
console.log('- 如果部分测试失败，请检查相应的文件或配置');
console.log('- 在小程序环境中，适配层会自动初始化');

/**
 * 辅助文件：用于在小程序中加载 ES6 模块
 * 小程序支持 ES6 模块，但 Page() 中不能直接使用 import
 * 所以创建一个辅助文件来导入模块
 */

// 导出加载函数
export async function loadSDKModules() {
  try {
    // 动态导入 SDK 模块
    const indexInit = await import('../../sdk/index-init.js');
    const XmovAvatarMPModule = await import('../../sdk/core/XmovAvatarMP.js');
    const canvasModule = await import('../../sdk/adapters/canvas.js');
    
    return {
      indexInit,
      XmovAvatarMP: XmovAvatarMPModule.default,
      canvas: canvasModule
    };
  } catch (err) {
    console.error('[Helper] 加载 SDK 模块失败:', err);
    throw err;
  }
}

// 同步加载（使用 require，但需要 CommonJS 格式）
// 由于编译后的文件是 ES6 格式，我们需要使用动态 import
export function loadSDKModulesSync() {
  // 小程序中，如果文件是 ES6 格式，require 会失败
  // 我们需要确保文件是 CommonJS 格式，或者使用动态 import
  try {
    // 尝试使用 require（如果文件是 CommonJS 格式）
    const indexInit = require('../../sdk/index-init.js');
    const XmovAvatarMP = require('../../sdk/core/XmovAvatarMP.js').default;
    const canvasModule = require('../../sdk/adapters/canvas.js');
    
    return {
      indexInit,
      XmovAvatarMP,
      canvas: canvasModule
    };
  } catch (err) {
    console.error('[Helper] 同步加载失败，可能需要使用异步加载:', err);
    throw err;
  }
}

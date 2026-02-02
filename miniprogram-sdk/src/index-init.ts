/**
 * SDK 初始化脚本
 * 在导入 SDK 之前运行，设置适配层
 * 
 * 重要：这个文件必须在导入原 SDK 模块之前执行
 */

import './utils/window-polyfill'; // 最先执行，避免原 SDK 里 window.performanceTracker 报错
import './utils/blob-polyfill'; // 小程序无 Blob/URL.createObjectURL，避免 ReferenceError
import { isMiniProgram } from './utils/env';
import { initDOMAdapter } from './utils/dom-adapter';
import './utils/logger-adapter';
import './utils/api-polyfill';
import './utils/module-polyfill';

// 在小程序环境中初始化适配层
if (isMiniProgram()) {
  console.log('[XmovAvatar] 初始化小程序适配层...');
  
  // 初始化 DOM 适配
  initDOMAdapter();
  
  // API polyfill 已经在 api-polyfill.ts 中自动执行
  // 模块 polyfill 已经在 module-polyfill.ts 中自动执行
  
  console.log('[XmovAvatar] 小程序适配层初始化完成');
}

// 导出环境信息
export { isMiniProgram, getPlatform } from './utils/env';

/**
 * 日志适配器 - 统一浏览器和小程序的日志输出
 */

import { isMiniProgram } from './env';

let isLoggingEnabled = false;

function executeLog(consoleMethod: Function, ...args: any[]) {
  if (!isLoggingEnabled || typeof consoleMethod !== 'function') {
    return;
  }
  consoleMethod(...args);
}

const sdkLog = {
  log: (...args: any[]) => executeLog(console.log, ...args),
  info: (...args: any[]) => executeLog(console.info, ...args),
  warn: (...args: any[]) => executeLog(console.warn, ...args),
  error: (...args: any[]) => executeLog(console.error, ...args)
};

export function setLoggingEnabled(enabled: boolean) {
  isLoggingEnabled = enabled;
  if (!enabled) {
    console.log('[AVATAR SDK] 日志已禁用');
  } else {
    console.log('[AVATAR SDK] 日志已启用');
  }
}

// 创建全局日志对象（兼容原 SDK）
const logger = {
  ...sdkLog,
  setEnabled: setLoggingEnabled
};

// 在小程序环境中，挂载到全局对象
const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                 (typeof window !== 'undefined' ? window : {});
if (isMiniProgram()) {
  // 小程序环境
  (globalObj as any).avatarSDKLogger = logger;
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  (window as any).avatarSDKLogger = logger;
}

export default logger;

/**
 * 日志适配器 - 统一浏览器和小程序的日志输出
 */
import { isMiniProgram } from './env';
let isLoggingEnabled = false;
function executeLog(consoleMethod, ...args) {
    if (!isLoggingEnabled || typeof consoleMethod !== 'function') {
        return;
    }
    consoleMethod(...args);
}
const sdkLog = {
    log: (...args) => executeLog(console.log, ...args),
    info: (...args) => executeLog(console.info, ...args),
    warn: (...args) => executeLog(console.warn, ...args),
    error: (...args) => executeLog(console.error, ...args)
};
export function setLoggingEnabled(enabled) {
    isLoggingEnabled = enabled;
    if (!enabled) {
        console.log('[AVATAR SDK] 日志已禁用');
    }
    else {
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
    globalObj.avatarSDKLogger = logger;
}
else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.avatarSDKLogger = logger;
}
export default logger;

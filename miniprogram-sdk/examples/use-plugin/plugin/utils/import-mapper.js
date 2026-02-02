/**
 * 导入路径映射工具
 * 用于将原 SDK 的导入路径替换为适配层路径
 */
/**
 * 需要替换的导入路径映射
 */
export const IMPORT_MAPPINGS = {
    // 网络请求
    '../utils/request': '../utils/request-adapter-wrapper',
    './utils/request': './utils/request-adapter-wrapper',
    'utils/request': 'utils/request-adapter-wrapper',
    // WebSocket (socket.io-client)
    'socket.io-client': '../adapters/websocket',
    // Canvas/DOM
    // document.createElement 会在运行时通过 polyfill 处理
    // Canvas 相关需要通过适配层函数替换
    // Worker
    // new Worker() 需要通过适配层函数替换
    // Audio
    // Audio 相关需要通过适配层替换
};
/**
 * 需要全局替换的 API
 */
export const GLOBAL_API_REPLACEMENTS = {
    'document.createElement': 'getDocument().createElement',
    'navigator.onLine': 'navigator.onLine', // 已通过 polyfill 处理
    'window.fetch': 'fetch', // 已通过 polyfill 处理
    'new Worker': 'createWorker', // 需要通过适配层函数
    'new Audio': 'new MiniProgramAudioPlayer', // 需要通过适配层
};
/**
 * 检查并替换导入路径
 */
export function mapImportPath(originalPath) {
    // 检查是否有映射
    if (IMPORT_MAPPINGS[originalPath]) {
        return IMPORT_MAPPINGS[originalPath];
    }
    // 检查是否匹配模式
    for (const [pattern, replacement] of Object.entries(IMPORT_MAPPINGS)) {
        if (originalPath.includes(pattern)) {
            return originalPath.replace(pattern, replacement);
        }
    }
    return originalPath;
}

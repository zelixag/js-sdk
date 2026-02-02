/**
 * Request 模块替换
 * 这个文件用于替换原 SDK 的 request.ts
 * 通过 webpack/rollup 的 resolve.alias 或模块替换机制来使用
 */

// 重新导出适配版本的 request
export { default } from './request-adapter-wrapper';
export { XMLRequest } from './request-adapter-wrapper';

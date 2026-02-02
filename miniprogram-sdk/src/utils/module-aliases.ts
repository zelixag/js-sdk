/**
 * 模块导入别名映射
 * 用于将原 SDK 的导入路径映射到适配层
 */

// 在导入原 SDK 模块之前，设置模块别名
// 这样原 SDK 的代码就可以使用适配层

// 注意：这个文件需要在所有其他模块导入之前执行
import './api-polyfill';

// 导出适配层模块，供原 SDK 使用
export { default as request } from './request-adapter-wrapper';
export { XMLRequest } from './request-adapter-wrapper';
export { createWebSocket, MiniProgramWebSocket } from '../adapters/websocket';
export { getCanvasNode, createWebGLContext, setCanvasSize, createImage } from '../adapters/canvas';
export { createWorker } from '../adapters/worker';
export { MiniProgramAudioPlayer, MiniProgramPCMPlayer } from '../adapters/audio';
export { getDocument } from './dom-adapter';
export { isMiniProgram, onNetworkStatusChange } from './env';
export { NetworkMonitor } from './network-adapter';

// 导出全局对象适配
export { default as fetch } from './request-adapter-wrapper';

/**
 * 模块导入别名映射
 * 用于将原 SDK 的导入路径映射到适配层
 */
import './api-polyfill';
export { default as request } from './request-adapter-wrapper';
export { XMLRequest } from './request-adapter-wrapper';
export { createWebSocket, MiniProgramWebSocket } from '../adapters/websocket';
export { getCanvasNode, createWebGLContext, setCanvasSize, createImage } from '../adapters/canvas';
export { createWorker } from '../adapters/worker';
export { MiniProgramAudioPlayer, MiniProgramPCMPlayer } from '../adapters/audio';
export { getDocument } from './dom-adapter';
export { isMiniProgram, onNetworkStatusChange } from './env';
export { NetworkMonitor } from './network-adapter';
export { default as fetch } from './request-adapter-wrapper';

/**
 * 微信小程序 SDK 主入口
 * 适配小程序环境的数字人 SDK
 */
import './utils/logger-adapter';
import SimpleAvatar from './simple-avatar';
export { request, downloadFile, readFileAsArrayBuffer } from './adapters/network';
export { createWebSocket, MiniProgramWebSocket } from './adapters/websocket';
export { getCanvasNode, createWebGLContext, setCanvasSize, createImage } from './adapters/canvas';
export { MiniProgramAudioPlayer, MiniProgramPCMPlayer } from './adapters/audio';
export { NetworkMonitor } from './utils/network-adapter';
export { EErrorCode, AvatarStatus, IAvatarOptions, IInitParams } from './simple-avatar';
export default SimpleAvatar;
export { SimpleAvatar };

/**
 * 微信小程序 SDK 主入口
 * 适配小程序环境的数字人 SDK
 */

// 首先初始化适配层
import './utils/logger-adapter';
import { isMiniProgram } from './utils/env';
import SimpleAvatar from './simple-avatar';

// 导出适配器（供外部使用）
export { request, downloadFile, readFileAsArrayBuffer } from './adapters/network';
export { createWebSocket, MiniProgramWebSocket } from './adapters/websocket';
export { getCanvasNode, createWebGLContext, setCanvasSize, createImage } from './adapters/canvas';
export { MiniProgramAudioPlayer, MiniProgramPCMPlayer } from './adapters/audio';
export { NetworkMonitor } from './utils/network-adapter';

// 导出类型
export { EErrorCode, AvatarStatus, IAvatarOptions, IInitParams } from './simple-avatar';

// 根据环境导出相应的类
if (isMiniProgram()) {
  console.log('[XmovAvatar] 小程序环境，使用适配版本');
}

// 默认导出
export default SimpleAvatar;

// 保持向后兼容的命名导出
export { SimpleAvatar };

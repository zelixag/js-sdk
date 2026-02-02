/**
 * socket.io-client 适配器
 * 用于替换原 SDK 中的 socket.io-client 导入
 */
import { io as createWebSocket } from '../adapters/websocket';
// 导出兼容 socket.io-client 的 API
export const io = createWebSocket;
// 默认导出
export default io;

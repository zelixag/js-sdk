/**
 * socket.io-client 适配器
 * 用于替换原 SDK 中的 socket.io-client 导入
 */
import { io as createWebSocket, MiniProgramWebSocket } from '../adapters/websocket';
export declare const io: typeof createWebSocket;
export type Socket = MiniProgramWebSocket;
export default io;

/**
 * WebSocket 适配层 - 小程序版本
 * 使用 wx.connectSocket 替代 socket.io-client
 */
export interface WebSocketOptions {
    url: string;
    protocols?: string[];
    header?: Record<string, string>;
    timeout?: number;
    query?: Record<string, string>;
    transports?: string[];
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
}
export interface WebSocketMessage {
    type: string;
    data: any;
}
/**
 * 小程序 WebSocket 封装
 * 兼容 socket.io 的部分 API
 */
export declare class MiniProgramWebSocket {
    private socketTask;
    private url;
    private protocols?;
    private header?;
    private timeout?;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private reconnectDelayMax;
    private randomizationFactor;
    private reconnectTimer;
    private isManualClose;
    private listeners;
    private anyListeners;
    private messageQueue;
    private query?;
    connected: boolean;
    disconnected: boolean;
    id: string | null;
    constructor(options: WebSocketOptions);
    /**
     * 连接 WebSocket
     */
    connect(): void;
    private _connect;
    /**
     * 重连处理
     */
    private _handleReconnect;
    /**
     * 发送消息
     */
    send(data: any): void;
    /**
     * 发送事件（兼容 socket.io）
     */
    emit(event: string, data?: any): void;
    /**
     * 监听事件
     */
    on(event: string, callback: Function): void;
    /**
     * 移除监听
     */
    off(event: string, callback?: Function): void;
    /**
     * 触发事件（内部方法）
     */
    private _emit;
    /**
     * 监听所有事件（socket.io 兼容）
     */
    onAny(callback: (event: string, ...args: any[]) => void): void;
    /**
     * 移除 onAny 监听器
     */
    offAny(callback?: Function): void;
    /**
     * 断开连接
     */
    disconnect(): void;
    /**
     * 关闭连接（别名）
     */
    close(): void;
}
/**
 * 创建 WebSocket 连接（兼容 socket.io 的 io() 函数）
 */
export declare function createWebSocket(url: string, options?: Partial<WebSocketOptions>): MiniProgramWebSocket;
/**
 * socket.io 兼容的 io 函数
 */
export declare function io(url: string, options?: Partial<WebSocketOptions>): MiniProgramWebSocket;

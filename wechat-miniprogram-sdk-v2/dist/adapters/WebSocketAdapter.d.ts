import { NetworkConfig } from '@/types';
import EventEmitter from 'eventemitter3';
/**
 * WebSocket连接状态
 */
declare enum WSState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3
}
/**
 * WebSocket适配器
 * 封装小程序WebSocket API，提供自动重连和消息队列功能
 */
export declare class WebSocketAdapter extends EventEmitter {
    private url;
    private config;
    private socket;
    private state;
    private reconnectTimer;
    private heartbeatTimer;
    private reconnectAttempts;
    private messageQueue;
    private isManualClose;
    constructor(url: string, config?: NetworkConfig);
    /**
     * 连接WebSocket
     */
    connect(): Promise<void>;
    /**
     * 设置Socket事件监听
     */
    private setupSocketListeners;
    /**
     * 发送消息
     */
    send(data: any): void;
    /**
     * 关闭连接
     */
    close(code?: number, reason?: string): void;
    /**
     * 发送队列中的消息
     */
    private flushMessageQueue;
    /**
     * 启动心跳
     */
    private startHeartbeat;
    /**
     * 停止心跳
     */
    private stopHeartbeat;
    /**
     * 安排重连
     */
    private scheduleReconnect;
    /**
     * 停止重连
     */
    private stopReconnect;
    /**
     * 获取连接状态
     */
    getState(): WSState;
    /**
     * 是否已连接
     */
    isConnected(): boolean;
    /**
     * 销毁适配器
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=WebSocketAdapter.d.ts.map
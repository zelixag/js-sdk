import { SDKConfig, SDKState, ConnectionStatus, EventType, SpeakOptions, AnimationOptions, Plugin } from '@/types';
import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
import { LifecycleManager } from './LifecycleManager';
/**
 * 微信小程序数字人SDK主入口类
 */
export declare class AvatarSDK {
    private config;
    private eventBus;
    private stateManager;
    private lifecycleManager;
    private modules;
    private plugins;
    private webSocket;
    private sessionId;
    private canvas;
    private gl;
    constructor(config: SDKConfig);
    /**
     * 初始化SDK
     */
    init(): Promise<void>;
    /**
     * 初始化Canvas
     */
    private initCanvas;
    /**
     * 初始化WebGL
     */
    private initWebGL;
    /**
     * 连接WebSocket
     */
    private connectWebSocket;
    /**
     * 构建WebSocket URL
     */
    private buildWebSocketUrl;
    /**
     * 发送初始化消息
     */
    private sendInitMessage;
    /**
     * 处理WebSocket消息
     */
    private handleWebSocketMessage;
    /**
     * 启动SDK
     */
    start(): Promise<void>;
    /**
     * 暂停SDK
     */
    pause(): Promise<void>;
    /**
     * 恢复SDK
     */
    resume(): Promise<void>;
    /**
     * 销毁SDK
     */
    destroy(): Promise<void>;
    /**
     * 语音播报
     */
    speak(text: string, options?: SpeakOptions): Promise<void>;
    /**
     * 播放动画
     */
    playAnimation(name: string, options?: AnimationOptions): Promise<void>;
    /**
     * 停止动画
     */
    stopAnimation(): Promise<void>;
    /**
     * 获取当前状态
     */
    getState(): SDKState;
    /**
     * 获取连接状态
     */
    getStatus(): ConnectionStatus;
    /**
     * 监听事件
     */
    on(event: EventType | string, handler: (...args: any[]) => void): void;
    /**
     * 监听一次事件
     */
    once(event: EventType | string, handler: (...args: any[]) => void): void;
    /**
     * 移除事件监听
     */
    off(event: EventType | string, handler?: (...args: any[]) => void): void;
    /**
     * 使用插件
     */
    use(plugin: Plugin): void;
    /**
     * 注册模块
     */
    registerModule(name: string, module: any): void;
    /**
     * 获取模块
     */
    getModule<T = any>(name: string): T | undefined;
    /**
     * 获取配置
     */
    getConfig(): SDKConfig;
    /**
     * 获取事件总线
     */
    getEventBus(): EventBus;
    /**
     * 获取状态管理器
     */
    getStateManager(): StateManager;
    /**
     * 获取生命周期管理器
     */
    getLifecycleManager(): LifecycleManager;
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 合并默认配置
     */
    private mergeDefaultConfig;
    /**
     * 处理错误
     */
    private handleError;
}
//# sourceMappingURL=AvatarSDK.d.ts.map
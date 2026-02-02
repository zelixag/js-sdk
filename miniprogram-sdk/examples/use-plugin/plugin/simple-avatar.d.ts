/**
 * 微信小程序数字人 SDK - 简化版
 * 专为小程序环境设计的核心功能
 */
export declare enum EErrorCode {
    NETWORK_DOWN = 1000,
    NETWORK_UP = 1001,
    NETWORK_RETRY = 1002,
    NETWORK_BREAK = 1003,
    CONTAINER_NOT_FOUND = 2001,
    CANVAS_INIT_FAILED = 2002,
    INIT_FAILED = 2003,
    RENDER_BODY_ERROR = 3001,
    RENDER_FACE_ERROR = 3002,
    BODY_DATA_EXPIRED = 3003,
    WEBSOCKET_CONNECT_ERROR = 4001,
    WEBSOCKET_DISCONNECTED = 4002,
    RESOURCE_LOAD_FAILED = 5001,
    AUDIO_PLAYBACK_ERROR = 6001,
    WEBGL_CONTEXT_LOST = 7001
}
export declare enum AvatarStatus {
    close = 0,
    online = 1,
    offline = 2,
    invisible = 3,
    visible = 4
}
export declare enum EventType {
    CONNECT = "connect",
    DISCONNECT = "disconnect",
    MESSAGE = "message",
    ERROR = "error",
    STATUS_CHANGE = "status_change",
    VOICE_STATE_CHANGE = "voice_state_change",
    NETWORK_INFO = "network_info",
    RENDER_CHANGE = "render_change",
    SESSION_START = "session_start",
    SESSION_END = "session_end",
    RESOURCE_LOADED = "resource_loaded",
    ANIMATION_START = "animation_start",
    ANIMATION_END = "animation_end"
}
export interface ResourceItem {
    url: string;
    type: 'model' | 'texture' | 'audio' | 'animation' | 'other';
    loaded: boolean;
    size?: number;
}
export interface AnimationConfig {
    name: string;
    duration: number;
    loop: boolean;
    speed: number;
}
export interface IAvatarOptions {
    containerId: string;
    appId: string;
    appSecret: string;
    gatewayServer: string;
    cacheServer?: string;
    config?: any;
    env?: string;
    enableLogger?: boolean;
    enableDebugger?: boolean;
    hardwareAcceleration?: 'default' | 'on' | 'off';
    enableClientInterrupt?: boolean;
    headers?: Record<string, string>;
    tag?: string;
    onMessage?: (error: any) => void;
    onStateChange?: (state: string) => void;
    onStatusChange?: (status: AvatarStatus) => void;
    onRenderChange?: (state: any) => void;
    onVoiceStateChange?: (state: string, duration?: number) => void;
    onWalkStateChange?: (state: string) => void;
    onNetworkInfo?: (networkInfo: any) => void;
    onStartSessionWarning?: (message: any) => void;
    onStateRenderChange?: (state: string) => void;
    onAAFrameHandle?: (data: any) => void;
    onWidgetEvent?: (widget: any) => void;
    proxyWidget?: any;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onResourceLoaded?: (resource: string) => void;
    onAnimationStart?: (animationName: string) => void;
    onAnimationEnd?: (animationName: string) => void;
}
export interface IInitParams {
    onDownloadProgress?: (progress: number) => void;
    initModel?: any;
    resources?: string[];
    [key: string]: any;
}
/**
 * 微信小程序数字人 SDK 核心类
 */
export default class SimpleAvatar {
    private options;
    private canvasId;
    private canvas;
    private gl;
    private TAG;
    private status;
    private sessionId;
    private networkMonitor;
    private webSocket;
    private isInitialized;
    private isDestroyed;
    private eventHandlers;
    private resources;
    private resourceLoadQueue;
    private activeAnimations;
    onStateChange: (state: string) => void;
    onStatusChange: (status: AvatarStatus) => void;
    onMessage: (error: any) => void;
    onDownloadProgress: (progress: number) => void;
    constructor(options: IAvatarOptions);
    /**
     * 设置事件处理器
     */
    private setupEventHandlers;
    /**
     * 事件系统 - 监听事件
     */
    on(event: EventType, handler: Function): void;
    /**
     * 事件系统 - 移除事件监听
     */
    off(event: EventType, handler?: Function): void;
    /**
     * 事件系统 - 触发事件
     */
    protected emit(event: EventType, ...args: any[]): void;
    /**
     * 处理网络状态变化
     */
    private handleNetworkChange;
    /**
     * 获取当前状态
     */
    getStatus(): AvatarStatus;
    /**
     * 获取会话ID
     */
    getSessionId(): string;
    /**
     * 连接 WebSocket 服务
     */
    private connectWebSocket;
    /**
     * 计划重连
     */
    private scheduleReconnect;
    /**
     * 生成会话ID
     */
    private generateSessionId;
    /**
     * 发送初始化消息
     */
    private sendInitMessage;
    /**
     * 处理 WebSocket 消息
     */
    private handleWebSocketMessage;
    /**
     * 处理渲染数据
     */
    private handleRenderData;
    /**
     * 处理语音状态
     */
    private handleVoiceStatus;
    /**
     * 处理错误
     */
    private handleError;
    /**
     * 初始化 SDK
     */
    init(params: IInitParams): Promise<void>;
    /**
     * 预加载资源
     */
    private preloadResources;
    /**
     * 内部加载单个资源
     */
    private internalLoadResource;
    /**
     * 根据URL判断资源类型
     */
    private getResourceType;
    /**
     * 启动会话
     */
    start(): void;
    /**
     * 让数字人说话
     */
    speak(text: string, isStart?: boolean, isEnd?: boolean, extra?: any): void;
    /**
     * 停止会话
     */
    stop(): void;
    /**
     * 设置音量
     */
    setVolume(volume: number): void;
    /**
     * 更改布局
     */
    changeLayout(layout: any): void;
    /**
     * 设置隐身模式
     */
    setInvisibleMode(): void;
    /**
     * 退出隐身模式
     */
    exitInvisibleMode(): void;
    /**
     * 播放动画
     */
    playAnimation(animationName: string, config?: Partial<AnimationConfig>): void;
    /**
     * 停止动画
     */
    stopAnimation(animationName: string): void;
    /**
     * 获取所有活动的动画
     */
    getActiveAnimations(): Map<string, AnimationConfig>;
    /**
     * 暂停所有动画
     */
    pauseAllAnimations(): void;
    /**
     * 恢复所有动画
     */
    resumeAllAnimations(): void;
    /**
     * 加载额外资源
     */
    loadResource(url: string, type?: 'model' | 'texture' | 'audio' | 'animation' | 'other'): Promise<boolean>;
    /**
     * 获取已加载的资源
     */
    getResources(): Map<string, ResourceItem>;
    /**
     * 检查资源是否已加载
     */
    isResourceLoaded(url: string): boolean;
    /**
     * 销毁 SDK
     */
    destroy(): Promise<void>;
}

/**
 * SDK配置类型定义
 */
export interface SDKConfig {
    /** 应用ID */
    appId: string;
    /** 应用密钥 */
    appSecret: string;
    /** 服务器地址 */
    serverUrl: string;
    /** Canvas配置 */
    canvas: CanvasConfig;
    /** 渲染配置 */
    render?: RenderConfig;
    /** 音频配置 */
    audio?: AudioConfig;
    /** 网络配置 */
    network?: NetworkConfig;
    /** 缓存配置 */
    cache?: CacheConfig;
    /** 日志配置 */
    logger?: LoggerConfig;
    /** 事件回调 */
    onReady?: () => void;
    onError?: (error: SDKError) => void;
    onStateChange?: (state: SDKState) => void;
}
/**
 * Canvas配置
 */
export interface CanvasConfig {
    /** Canvas ID */
    id: string;
    /** 宽度 */
    width?: number;
    /** 高度 */
    height?: number;
    /** 像素比 */
    pixelRatio?: number;
    /** 是否使用2D Canvas */
    type?: 'webgl' | '2d';
}
/**
 * 渲染配置
 */
export interface RenderConfig {
    /** 渲染质量 */
    quality?: 'low' | 'medium' | 'high' | 'auto';
    /** 目标帧率 */
    fps?: number;
    /** 启用优化 */
    enableOptimization?: boolean;
    /** 背景颜色 */
    backgroundColor?: string;
    /** 抗锯齿 */
    antialias?: boolean;
}
/**
 * 音频配置
 */
export interface AudioConfig {
    /** 是否启用音频 */
    enabled?: boolean;
    /** 音量 (0-1) */
    volume?: number;
    /** 自动播放 */
    autoPlay?: boolean;
    /** 音频格式 */
    format?: 'mp3' | 'pcm' | 'aac';
}
/**
 * 网络配置
 */
export interface NetworkConfig {
    /** 请求超时时间(ms) */
    timeout?: number;
    /** 重试次数 */
    retryTimes?: number;
    /** 心跳间隔(ms) */
    heartbeatInterval?: number;
    /** 自动重连 */
    autoReconnect?: boolean;
    /** 重连延迟(ms) */
    reconnectDelay?: number;
}
/**
 * 缓存配置
 */
export interface CacheConfig {
    /** 是否启用缓存 */
    enabled?: boolean;
    /** 最大缓存大小(MB) */
    maxSize?: number;
    /** 缓存过期时间(ms) */
    ttl?: number;
    /** 缓存策略 */
    strategy?: 'memory' | 'storage' | 'hybrid';
}
/**
 * 日志配置
 */
export interface LoggerConfig {
    /** 日志级别 */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** 是否上报日志 */
    upload?: boolean;
    /** 上报地址 */
    uploadUrl?: string;
    /** 是否在控制台输出 */
    console?: boolean;
}
/**
 * SDK状态
 */
export declare enum SDKState {
    /** 未初始化 */
    UNINITIALIZED = "uninitialized",
    /** 初始化中 */
    INITIALIZING = "initializing",
    /** 已初始化 */
    INITIALIZED = "initialized",
    /** 连接中 */
    CONNECTING = "connecting",
    /** 已连接 */
    CONNECTED = "connected",
    /** 运行中 */
    RUNNING = "running",
    /** 已暂停 */
    PAUSED = "paused",
    /** 断开连接 */
    DISCONNECTED = "disconnected",
    /** 已销毁 */
    DESTROYED = "destroyed",
    /** 错误 */
    ERROR = "error"
}
/**
 * 连接状态
 */
export declare enum ConnectionStatus {
    /** 断开 */
    DISCONNECTED = "disconnected",
    /** 连接中 */
    CONNECTING = "connecting",
    /** 已连接 */
    CONNECTED = "connected",
    /** 重连中 */
    RECONNECTING = "reconnecting",
    /** 连接失败 */
    FAILED = "failed"
}
/**
 * 错误码
 */
export declare enum ErrorCode {
    INIT_FAILED = 1000,
    CONFIG_INVALID = 1001,
    CANVAS_NOT_FOUND = 1002,
    WEBGL_NOT_SUPPORT = 1003,
    CONNECT_FAILED = 2000,
    CONNECT_TIMEOUT = 2001,
    DISCONNECT = 2002,
    RECONNECT_FAILED = 2003,
    RENDER_FAILED = 3000,
    CONTEXT_LOST = 3001,
    FRAME_DROP = 3002,
    AUDIO_FAILED = 4000,
    AUDIO_NOT_SUPPORT = 4001,
    AUDIO_DECODE_ERROR = 4002,
    RESOURCE_LOAD_FAILED = 5000,
    RESOURCE_NOT_FOUND = 5001,
    RESOURCE_TIMEOUT = 5002,
    RESOURCE_PARSE_ERROR = 5003,
    NETWORK_ERROR = 6000,
    REQUEST_TIMEOUT = 6001,
    REQUEST_FAILED = 6002,
    WEBSOCKET_ERROR = 6003,
    AUTHENTICATION_FAILED = 7000,
    PERMISSION_DENIED = 7001,
    QUOTA_EXCEEDED = 7002,
    UNKNOWN_ERROR = 9999
}
/**
 * SDK错误
 */
export declare class SDKError extends Error {
    code: ErrorCode;
    details?: any;
    timestamp: number;
    constructor(code: ErrorCode, message: string, details?: any);
}
/**
 * 资源类型
 */
export declare enum ResourceType {
    MODEL = "model",
    TEXTURE = "texture",
    AUDIO = "audio",
    ANIMATION = "animation",
    CONFIG = "config",
    OTHER = "other"
}
/**
 * 资源项
 */
export interface ResourceItem {
    /** 资源URL */
    url: string;
    /** 资源类型 */
    type: ResourceType;
    /** 是否已加载 */
    loaded: boolean;
    /** 资源大小(字节) */
    size?: number;
    /** 资源数据 */
    data?: any;
    /** 加载进度(0-1) */
    progress?: number;
}
/**
 * 动画配置
 */
export interface AnimationConfig {
    /** 动画名称 */
    name: string;
    /** 持续时间(ms) */
    duration: number;
    /** 是否循环 */
    loop: boolean;
    /** 播放速度 */
    speed: number;
    /** 延迟播放(ms) */
    delay?: number;
}
/**
 * 动画选项
 */
export interface AnimationOptions {
    /** 是否循环 */
    loop?: boolean;
    /** 播放速度 */
    speed?: number;
    /** 延迟播放(ms) */
    delay?: number;
    /** 过渡时间(ms) */
    transition?: number;
}
/**
 * 说话选项
 */
export interface SpeakOptions {
    /** 语音文本 */
    text: string;
    /** 语音速度 */
    speed?: number;
    /** 音量 */
    volume?: number;
    /** 音调 */
    pitch?: number;
    /** 语音人 */
    voice?: string;
    /** 是否打断当前语音 */
    interrupt?: boolean;
}
/**
 * 帧数据
 */
export interface FrameData {
    /** 时间戳 */
    timestamp: number;
    /** 视频数据 */
    video?: ArrayBuffer;
    /** 音频数据 */
    audio?: ArrayBuffer;
    /** 表情数据 */
    expression?: any;
    /** 姿态数据 */
    pose?: any;
}
/**
 * 性能指标
 */
export interface PerformanceMetrics {
    /** 帧率 */
    fps: number;
    /** 渲染时间(ms) */
    renderTime: number;
    /** 内存使用(MB) */
    memory: number;
    /** 网络延迟(ms) */
    latency: number;
    /** 丢帧数 */
    droppedFrames: number;
}
/**
 * 进度处理器
 */
export type ProgressHandler = (progress: number, total: number) => void;
/**
 * 事件类型
 */
export declare enum EventType {
    READY = "ready",
    DESTROY = "destroy",
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    RECONNECTING = "reconnecting",
    RENDER_START = "render-start",
    RENDER_END = "render-end",
    RENDER_ERROR = "render-error",
    AUDIO_START = "audio-start",
    AUDIO_END = "audio-end",
    AUDIO_ERROR = "audio-error",
    ANIMATION_START = "animation-start",
    ANIMATION_END = "animation-end",
    ANIMATION_LOOP = "animation-loop",
    RESOURCE_LOADING = "resource-loading",
    RESOURCE_LOADED = "resource-loaded",
    RESOURCE_ERROR = "resource-error",
    STATE_CHANGE = "state-change",
    PERFORMANCE = "performance",
    ERROR = "error"
}
/**
 * 插件接口
 */
export interface Plugin {
    /** 插件名称 */
    name: string;
    /** 插件版本 */
    version: string;
    /** 安装插件 */
    install(sdk: any): void;
    /** 卸载插件 */
    uninstall?(): void;
}
/**
 * 质量级别
 */
export type QualityLevel = 'low' | 'medium' | 'high' | 'auto';
/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
//# sourceMappingURL=index.d.ts.map
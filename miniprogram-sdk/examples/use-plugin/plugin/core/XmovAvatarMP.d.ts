/**
 * 微信小程序版数字人 SDK 核心类
 * 基于原版 SDK 进行适配改造
 */
import { AvatarStatus, RenderState, IAvatarOptions, IInitParams, Layout, WalkConfig } from "../../../src/types/index";
import { TDownloadProgress } from "../../../src/modules/ResourceManager";
import { IBRAnimationGeneratorCharInfo_NN, unpackIBRAnimation, formatMJT } from '../../../src/utils/DataInterface';
import { getVertices, getWavefrontObjFromVertices, getPCATextures } from '../../../src/utils/GLPipelineDebugTools';
import { GLDevice } from '../../../src/utils/GLDevice';
import { GLPipeline } from '../../../src/utils/GLPipeline';
/**
 * 小程序版数字人 SDK 核心类
 */
export default class XmovAvatarMP {
    private options;
    private canvasId;
    private canvas;
    private gl;
    private TAG;
    private status;
    private resourceManager;
    private renderScheduler;
    private networkMonitor;
    private ttsa;
    private debugOverlay;
    private _offlineTimer;
    private readonly _offlineInterval;
    private _env;
    private avatarCanvasVisible;
    private pendingInvisibleMode;
    private isInitialized;
    onStateChange: (state: string) => void;
    onDownloadProgress: TDownloadProgress | null;
    static IBRAnimationGeneratorCharInfo_NN: typeof IBRAnimationGeneratorCharInfo_NN;
    static unpackIBRAnimation: typeof unpackIBRAnimation;
    static formatMJT: typeof formatMJT;
    static getVertices: typeof getVertices;
    static getPCATextures: typeof getPCATextures;
    static getWavefrontObjFromVertices: typeof getWavefrontObjFromVertices;
    static GLDevice: typeof GLDevice;
    static GLPipeline: typeof GLPipeline;
    private boundVisibilityChange;
    private replayData;
    private startConnectTime;
    private connectSuccessTime;
    private enableClientInterrupt;
    private retryCount;
    private retryTimer;
    private maxRetryCount;
    private retryRound;
    private maxRetryRound;
    private isRetrying;
    private isStartRetry;
    private destroyed;
    private reconnectDebounceTimer;
    constructor(options: IAvatarOptions);
    /**
     * 获取当前状态
     */
    getStatus(): -1 | AvatarStatus;
    /**
     * 获取标签
     */
    getTag(): string | undefined;
    /**
     * 获取业务环境
     */
    get businessENV(): string;
    /**
     * 获取唯一说话ID
     */
    getUniqueSpeakId(): any;
    /**
     * 初始化 SDK
     */
    private initializeSDK;
    /**
     * 创建资源管理器（小程序适配）
     */
    private createResourceManager;
    /**
     * 创建渲染调度器（小程序适配）
     */
    private createRenderScheduler;
    /**
     * 渲染帧回调
     */
    private renderFrameCallback;
    /**
     * 初始化会话
     */
    init(params: IInitParams): Promise<void>;
    /**
     * 页面可见性变化处理
     */
    visibilitychange(): void;
    /**
     * 设置回放数据
     */
    setReplayData(data: any): void;
    /**
     * 处理回放发送
     */
    handleReplaySend(frame: number): void;
    /**
     * 连接 Ttsa（WebSocket）
     */
    private connectTtsa;
    /**
     * 启动会话
     */
    start(): void;
    /**
     * 重新加载
     */
    private _reload;
    /**
     * 重载成功回调
     */
    reloadSuccess(): void;
    /**
     * 处理 TTSA 消息
     */
    private handleMessage;
    /**
     * 处理 AA 帧数据
     */
    private handleAAFrame;
    /**
     * 运行起始帧索引
     */
    private runStartFrameIndex;
    /**
     * TTSA 状态变化处理
     */
    private ttsaStateChangeHandle;
    /**
     * 停止会话
     */
    stop(): Promise<void>;
    /**
     * 销毁客户端
     */
    destroyClient(): Promise<void>;
    /**
     * 完全销毁 SDK
     */
    destroy(stop_reason?: string): Promise<void>;
    /**
     * 空闲状态
     */
    idle(): void;
    /**
     * 监听状态
     */
    listen(): void;
    /**
     * 思考状态
     */
    think(): void;
    /**
     * 交互空闲状态
     */
    interactiveidle(): void;
    /**
     * 说话
     */
    speak(ssml: string, is_start?: boolean, is_end?: boolean, extra?: {}): void;
    /**
     * 设置音量
     */
    setVolume(volume: number): void;
    /**
     * 获取会话ID
     */
    getSessionId(): any;
    /**
     * 显示调试信息
     */
    showDebugInfo(): void;
    /**
     * 隐藏调试信息
     */
    hideDebugInfo(): void;
    /**
     * 更改头像可见性
     */
    changeAvatarVisible(visible: boolean): void;
    /**
     * 清理初始化前的资源
     */
    private cleanupBeforeInitComplete;
    /**
     * 离线处理
     */
    private offlineHandle;
    /**
     * Socket 会话停止
     */
    stopSessionFromSocket(reason: string): void;
    /**
     * 离线模式
     */
    offlineMode(): void;
    /**
     * 在线模式
     */
    onlineMode(): void;
    /**
     * 错误处理
     */
    onMessage(params: any): void;
    /**
     * 状态变更
     */
    onStatusChange(status: AvatarStatus): void;
    /**
     * 切换隐身模式
     */
    switchInvisibleMode(): void;
    /**
     * 设置隐身模式
     */
    private setInvisibleMode;
    /**
     * 获取隐身模式状态
     */
    getPendingInvisibleMode(): boolean;
    /**
     * 获取渲染状态
     */
    getRenderState(): RenderState;
    /**
     * 更改布局
     */
    changeLayout(layout: Layout): void;
    /**
     * 更改行走配置
     */
    changeWalkConfig(walkConfig: WalkConfig): void;
    /**
     * 中断
     */
    interrupt(type: string): void;
    /**
     * 触发重连
     */
    private triggerReconnect;
    /**
     * 重新开始会话
     */
    reStartSession(): void;
    /**
     * 重试实现
     */
    private _retryImpl;
    /**
     * 清除所有重试定时器
     */
    private clearAllRetryTimers;
    /**
     * 重置重试状态
     */
    private resetRetryState;
}

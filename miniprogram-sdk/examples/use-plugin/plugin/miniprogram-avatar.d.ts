/**
 * 微信小程序数字人 SDK
 * 专为微信小程序环境设计
 */
import { IAvatarOptions, IInitParams, AvatarStatus } from './types';
/**
 * 微信小程序数字人 SDK 核心类
 */
export default class MiniProgramAvatar {
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
    onStateChange: (state: string) => void;
    onStatusChange: (status: AvatarStatus) => void;
    onMessage: (error: any) => void;
    onDownloadProgress: (progress: number) => void;
    constructor(options: IAvatarOptions);
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
     * 初始化 SDK
     */
    init(params: IInitParams): Promise<void>;
    /**
     * 连接服务器
     */
    private connectToServer;
    /**
     * 处理服务器消息
     */
    private handleServerMessage;
    /**
     * 渲染帧
     */
    private renderFrame;
    /**
     * 生成认证令牌
     */
    private generateToken;
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
     * 销毁 SDK
     */
    destroy(): Promise<void>;
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
}

/**
 * 微信小程序数字人 SDK
 * 专为微信小程序环境设计
 */
import { getCanvasNode, createWebGLContext } from "./adapters/canvas";
import { createWebSocket } from "./adapters/websocket";
import { NetworkMonitor } from './utils/network-adapter';
import { AvatarStatus, EErrorCode } from './types';
/**
 * 微信小程序数字人 SDK 核心类
 */
export default class MiniProgramAvatar {
    constructor(options) {
        this.canvas = null;
        this.gl = null;
        this.TAG = "[MINIPROGRAM AVATAR]";
        this.status = -1; // -1 表示未初始化
        this.sessionId = '';
        this.webSocket = null;
        // 控制变量
        this.isInitialized = false;
        this.isDestroyed = false;
        // 回调函数
        this.onStateChange = () => { };
        this.onStatusChange = () => { };
        this.onMessage = () => { };
        this.onDownloadProgress = () => { };
        this.options = options;
        // 在小程序中，containerId 是 canvas-id
        this.canvasId = options.containerId.replace(/^#/, '');
        // 初始化网络监控
        this.networkMonitor = new NetworkMonitor({
            offlineCallback: (message) => {
                this.handleNetworkChange(false, message);
            },
            onlineCallback: (message) => {
                this.handleNetworkChange(true, message);
            }
        });
        console.log(this.TAG, 'SDK 初始化完成');
    }
    /**
     * 处理网络状态变化
     */
    handleNetworkChange(isOnline, message) {
        if (isOnline) {
            console.log(this.TAG, '网络已恢复:', message);
            // 可以在此处添加重连逻辑
        }
        else {
            console.log(this.TAG, '网络已断开:', message);
            // 可以在此处添加断线处理逻辑
        }
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return this.status;
    }
    /**
     * 获取会话ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * 初始化 SDK
     */
    async init(params) {
        console.log(this.TAG, '开始初始化 SDK');
        if (this.isDestroyed) {
            throw new Error('SDK 已被销毁，无法初始化');
        }
        try {
            // 获取 Canvas 节点
            this.canvas = await getCanvasNode(this.canvasId);
            console.log(this.TAG, 'Canvas 节点获取成功');
            // 创建 WebGL 上下文
            this.gl = createWebGLContext(this.canvas, {
                antialias: true,
                preserveDrawingBuffer: true
            });
            if (!this.gl) {
                throw new Error('WebGL 上下文创建失败');
            }
            console.log(this.TAG, 'WebGL 上下文创建成功');
            // 更新状态
            this.status = AvatarStatus.online;
            this.onStatusChange(this.status);
            // 执行下载进度回调
            if (params.onDownloadProgress) {
                params.onDownloadProgress(100); // 模拟完成
                this.onDownloadProgress(100);
            }
            this.isInitialized = true;
            console.log(this.TAG, 'SDK 初始化成功');
        }
        catch (error) {
            console.error(this.TAG, 'SDK 初始化失败:', error);
            const sdkError = {
                code: EErrorCode.CANVAS_INIT_FAILED,
                message: `初始化失败: ${error.message}`,
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
            throw error;
        }
    }
    /**
     * 连接服务器
     */
    connectToServer() {
        if (!this.options.gatewayServer) {
            throw new Error('缺少 gatewayServer 配置');
        }
        const socketUrl = this.options.gatewayServer.replace('http', 'ws');
        console.log(this.TAG, '连接到服务器:', socketUrl);
        this.webSocket = createWebSocket(socketUrl, {
            header: {
                'Authorization': `Bearer ${this.generateToken()}`
            }
        });
        // 设置事件监听
        this.webSocket.on('connect', () => {
            console.log(this.TAG, 'WebSocket 连接成功');
            this.sessionId = `session_${Date.now()}`;
        });
        this.webSocket.on('message', (data) => {
            console.log(this.TAG, '收到服务器消息:', data);
            // 处理来自服务器的数据
            this.handleServerMessage(data);
        });
        this.webSocket.on('disconnect', (res) => {
            console.log(this.TAG, 'WebSocket 连接断开:', res);
            this.status = AvatarStatus.offline;
            this.onStatusChange(this.status);
        });
        this.webSocket.on('error', (error) => {
            console.error(this.TAG, 'WebSocket 错误:', error);
            const sdkError = {
                code: EErrorCode.WEBSOCKET_CONNECT_ERROR,
                message: `WebSocket 错误: ${JSON.stringify(error)}`,
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
        });
    }
    /**
     * 处理服务器消息
     */
    handleServerMessage(data) {
        // 根据消息类型进行处理
        if (data.type === 'frame_data') {
            // 处理帧数据
            this.renderFrame(data.payload);
        }
        else if (data.type === 'state_change') {
            // 处理状态变更
            this.onStateChange(data.payload.state);
        }
    }
    /**
     * 渲染帧
     */
    renderFrame(payload) {
        if (!this.gl) {
            return;
        }
        // 使用 WebGL 渲染帧数据
        try {
            // 清除画布
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            // 这里应该是实际的渲染逻辑
            // 由于是示例，我们只打印信息
            console.log(this.TAG, '渲染帧数据');
        }
        catch (error) {
            console.error(this.TAG, '渲染错误:', error);
        }
    }
    /**
     * 生成认证令牌
     */
    generateToken() {
        // 这里应该实现实际的令牌生成逻辑
        // 基于 appId 和 appSecret
        const payload = {
            appId: this.options.appId,
            timestamp: Date.now(),
            exp: Date.now() + 3600000 // 1小时后过期
        };
        // 实际实现中应使用加密算法
        return btoa(JSON.stringify(payload));
    }
    /**
     * 启动会话
     */
    start() {
        if (!this.isInitialized) {
            console.error(this.TAG, 'SDK 未初始化，无法启动');
            return;
        }
        console.log(this.TAG, '启动会话');
        // 连接到服务器
        this.connectToServer();
        // 更新状态
        this.status = AvatarStatus.online;
        this.onStatusChange(this.status);
    }
    /**
     * 让数字人说话
     */
    speak(text, isStart = true, isEnd = true, extra = {}) {
        if (!this.webSocket || !this.webSocket.connected) {
            console.error(this.TAG, 'WebSocket 未连接，无法发送说话指令');
            return;
        }
        console.log(this.TAG, '发送说话指令:', text);
        // 发送说话指令到服务器
        this.webSocket.emit('speak', {
            text,
            isStart,
            isEnd,
            extra,
            sessionId: this.sessionId
        });
    }
    /**
     * 停止会话
     */
    stop() {
        console.log(this.TAG, '停止会话');
        if (this.webSocket) {
            this.webSocket.emit('stop', { sessionId: this.sessionId });
            this.webSocket.disconnect();
            this.webSocket = null;
        }
        this.status = AvatarStatus.close;
        this.onStatusChange(this.status);
    }
    /**
     * 设置音量
     */
    setVolume(volume) {
        console.log(this.TAG, '设置音量:', volume);
        if (this.webSocket) {
            this.webSocket.emit('set_volume', {
                volume: Math.max(0, Math.min(1, volume)), // 限制在 0-1 范围内
                sessionId: this.sessionId
            });
        }
    }
    /**
     * 销毁 SDK
     */
    async destroy() {
        console.log(this.TAG, '销毁 SDK');
        this.isDestroyed = true;
        // 停止会话
        this.stop();
        // 断开网络监控
        this.networkMonitor.destroy();
        // 清理 WebGL 资源
        if (this.gl) {
            this.gl.getExtension('WEBGL_lose_context')?.loseContext();
            this.gl = null;
        }
        // 清理 Canvas
        this.canvas = null;
        console.log(this.TAG, 'SDK 销毁完成');
    }
    /**
     * 更改布局
     */
    changeLayout(layout) {
        console.log(this.TAG, '更改布局:', layout);
        if (this.webSocket) {
            this.webSocket.emit('change_layout', {
                layout,
                sessionId: this.sessionId
            });
        }
    }
    /**
     * 设置隐身模式
     */
    setInvisibleMode() {
        console.log(this.TAG, '设置隐身模式');
        if (this.webSocket) {
            this.webSocket.emit('set_invisible', {
                sessionId: this.sessionId
            });
        }
        this.status = AvatarStatus.invisible;
        this.onStatusChange(this.status);
    }
    /**
     * 退出隐身模式
     */
    exitInvisibleMode() {
        console.log(this.TAG, '退出隐身模式');
        if (this.webSocket) {
            this.webSocket.emit('exit_invisible', {
                sessionId: this.sessionId
            });
        }
        this.status = AvatarStatus.online;
        this.onStatusChange(this.status);
    }
}

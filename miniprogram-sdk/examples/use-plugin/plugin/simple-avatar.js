/**
 * 微信小程序数字人 SDK - 简化版
 * 专为小程序环境设计的核心功能
 */
import { getCanvasNode, createWebGLContext } from "./adapters/canvas";
import { createWebSocket } from "./adapters/websocket";
import { NetworkMonitor } from './utils/network-adapter';
// 本地定义所需类型
export var EErrorCode;
(function (EErrorCode) {
    EErrorCode[EErrorCode["NETWORK_DOWN"] = 1000] = "NETWORK_DOWN";
    EErrorCode[EErrorCode["NETWORK_UP"] = 1001] = "NETWORK_UP";
    EErrorCode[EErrorCode["NETWORK_RETRY"] = 1002] = "NETWORK_RETRY";
    EErrorCode[EErrorCode["NETWORK_BREAK"] = 1003] = "NETWORK_BREAK";
    EErrorCode[EErrorCode["CONTAINER_NOT_FOUND"] = 2001] = "CONTAINER_NOT_FOUND";
    EErrorCode[EErrorCode["CANVAS_INIT_FAILED"] = 2002] = "CANVAS_INIT_FAILED";
    EErrorCode[EErrorCode["INIT_FAILED"] = 2003] = "INIT_FAILED";
    EErrorCode[EErrorCode["RENDER_BODY_ERROR"] = 3001] = "RENDER_BODY_ERROR";
    EErrorCode[EErrorCode["RENDER_FACE_ERROR"] = 3002] = "RENDER_FACE_ERROR";
    EErrorCode[EErrorCode["BODY_DATA_EXPIRED"] = 3003] = "BODY_DATA_EXPIRED";
    EErrorCode[EErrorCode["WEBSOCKET_CONNECT_ERROR"] = 4001] = "WEBSOCKET_CONNECT_ERROR";
    EErrorCode[EErrorCode["WEBSOCKET_DISCONNECTED"] = 4002] = "WEBSOCKET_DISCONNECTED";
    EErrorCode[EErrorCode["RESOURCE_LOAD_FAILED"] = 5001] = "RESOURCE_LOAD_FAILED";
    EErrorCode[EErrorCode["AUDIO_PLAYBACK_ERROR"] = 6001] = "AUDIO_PLAYBACK_ERROR";
    EErrorCode[EErrorCode["WEBGL_CONTEXT_LOST"] = 7001] = "WEBGL_CONTEXT_LOST";
})(EErrorCode || (EErrorCode = {}));
export var AvatarStatus;
(function (AvatarStatus) {
    AvatarStatus[AvatarStatus["close"] = 0] = "close";
    AvatarStatus[AvatarStatus["online"] = 1] = "online";
    AvatarStatus[AvatarStatus["offline"] = 2] = "offline";
    AvatarStatus[AvatarStatus["invisible"] = 3] = "invisible";
    AvatarStatus[AvatarStatus["visible"] = 4] = "visible";
})(AvatarStatus || (AvatarStatus = {}));
// 事件类型定义
export var EventType;
(function (EventType) {
    EventType["CONNECT"] = "connect";
    EventType["DISCONNECT"] = "disconnect";
    EventType["MESSAGE"] = "message";
    EventType["ERROR"] = "error";
    EventType["STATUS_CHANGE"] = "status_change";
    EventType["VOICE_STATE_CHANGE"] = "voice_state_change";
    EventType["NETWORK_INFO"] = "network_info";
    EventType["RENDER_CHANGE"] = "render_change";
    EventType["SESSION_START"] = "session_start";
    EventType["SESSION_END"] = "session_end";
    EventType["RESOURCE_LOADED"] = "resource_loaded";
    EventType["ANIMATION_START"] = "animation_start";
    EventType["ANIMATION_END"] = "animation_end";
})(EventType || (EventType = {}));
/**
 * 微信小程序数字人 SDK 核心类
 */
export default class SimpleAvatar {
    constructor(options) {
        this.canvas = null;
        this.gl = null;
        this.TAG = "[SIMPLE MINIPROGRAM AVATAR]";
        this.status = AvatarStatus.close;
        this.sessionId = '';
        this.webSocket = null;
        // 控制变量
        this.isInitialized = false;
        this.isDestroyed = false;
        // 事件系统
        this.eventHandlers = new Map();
        // 资源管理
        this.resources = new Map();
        this.resourceLoadQueue = [];
        // 动画管理
        this.activeAnimations = new Map();
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
        // 设置回调函数
        if (options.onStateChange)
            this.onStateChange = options.onStateChange;
        if (options.onStatusChange)
            this.onStatusChange = options.onStatusChange;
        if (options.onMessage)
            this.onMessage = options.onMessage;
        // 注册内部事件处理器
        this.setupEventHandlers();
        console.log(this.TAG, 'SDK 初始化完成');
    }
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 连接事件
        this.on(EventType.CONNECT, () => {
            if (this.options.onConnect) {
                this.options.onConnect();
            }
        });
        // 断开连接事件
        this.on(EventType.DISCONNECT, () => {
            if (this.options.onDisconnect) {
                this.options.onDisconnect();
            }
        });
        // 资源加载事件
        this.on(EventType.RESOURCE_LOADED, (resource) => {
            if (this.options.onResourceLoaded) {
                this.options.onResourceLoaded(resource);
            }
        });
        // 动画事件
        this.on(EventType.ANIMATION_START, (animationName) => {
            if (this.options.onAnimationStart) {
                this.options.onAnimationStart(animationName);
            }
        });
        this.on(EventType.ANIMATION_END, (animationName) => {
            if (this.options.onAnimationEnd) {
                this.options.onAnimationEnd(animationName);
            }
        });
    }
    /**
     * 事件系统 - 监听事件
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    /**
     * 事件系统 - 移除事件监听
     */
    off(event, handler) {
        if (!this.eventHandlers.has(event)) {
            return;
        }
        if (handler) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
        else {
            this.eventHandlers.delete(event);
        }
    }
    /**
     * 事件系统 - 触发事件
     */
    emit(event, ...args) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                }
                catch (error) {
                    console.error(`Event handler error for ${event}:`, error);
                }
            });
        }
    }
    /**
     * 处理网络状态变化
     */
    handleNetworkChange(isOnline, message) {
        if (isOnline) {
            console.log(this.TAG, '网络已恢复:', message);
            // 尝试重连 WebSocket
            if (!this.webSocket?.connected && !this.isDestroyed) {
                setTimeout(() => {
                    this.connectWebSocket().catch(err => {
                        console.error(this.TAG, '网络恢复后重连失败:', err);
                    });
                }, 1000);
            }
        }
        else {
            console.log(this.TAG, '网络已断开:', message);
        }
        // 调用网络信息回调
        if (this.options.onNetworkInfo) {
            this.options.onNetworkInfo({
                isOnline,
                message,
                timestamp: Date.now()
            });
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
     * 连接 WebSocket 服务
     */
    async connectWebSocket() {
        try {
            console.log(this.TAG, '正在连接 WebSocket 服务...');
            // 准备查询参数
            const queryParams = {
                appId: this.options.appId,
                appSecret: this.options.appSecret,
                sdkVersion: 'miniprogram-0.1.0'
            };
            // 如果网关服务器URL中已有查询参数，需要合并
            const separator = this.options.gatewayServer.includes('?') ? '&' : '?';
            const fullUrl = `${this.options.gatewayServer}${separator}${new URLSearchParams(queryParams).toString()}`;
            // 创建 WebSocket 连接
            this.webSocket = createWebSocket(fullUrl);
            // 设置事件监听器
            this.webSocket.on('connect', () => {
                console.log(this.TAG, 'WebSocket 连接成功');
                this.sessionId = this.generateSessionId();
                this.status = AvatarStatus.online;
                this.onStatusChange(AvatarStatus.online); // 修正：使用AvatarStatus枚举
                // 发送初始化消息
                this.sendInitMessage();
                // 触发连接事件
                this.emit(EventType.CONNECT);
            });
            this.webSocket.on('message', (data) => {
                this.handleWebSocketMessage(data);
            });
            this.webSocket.on('error', (error) => {
                console.error(this.TAG, 'WebSocket 连接错误:', error);
                const sdkError = {
                    code: EErrorCode.WEBSOCKET_CONNECT_ERROR,
                    message: `WebSocket 连接错误: ${error}`,
                    timestamp: Date.now()
                };
                this.onMessage(sdkError);
            });
            this.webSocket.on('disconnect', (reason) => {
                console.log(this.TAG, 'WebSocket 连接断开:', reason);
                this.status = AvatarStatus.offline;
                this.onStatusChange(AvatarStatus.offline); // 修正：使用AvatarStatus枚举
                // 触发断开连接事件
                this.emit(EventType.DISCONNECT);
                // 尝试重连（除非是手动断开）
                if (!this.isDestroyed) {
                    this.scheduleReconnect();
                }
            });
            // 等待连接建立
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket 连接超时'));
                }, 10000); // 10秒超时
                // 监听连接状态
                const checkConnection = setInterval(() => {
                    if (this.webSocket?.connected) {
                        clearTimeout(timeout);
                        clearInterval(checkConnection);
                        resolve(true);
                    }
                }, 100);
            });
            console.log(this.TAG, 'WebSocket 连接建立成功');
        }
        catch (error) {
            console.error(this.TAG, 'WebSocket 连接失败:', error);
            const sdkError = {
                code: EErrorCode.WEBSOCKET_CONNECT_ERROR,
                message: `WebSocket 连接失败: ${error.message}`,
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
            throw error;
        }
    }
    /**
     * 计划重连
     */
    scheduleReconnect() {
        if (this.isDestroyed) {
            return; // 如果已销毁则不再重连
        }
        console.log(this.TAG, '计划在5秒后重连...');
        // 使用setTimeout而不是setInterval，以便在连接成功后停止重试
        setTimeout(async () => {
            if (this.isDestroyed) {
                return; // 如果在此期间被销毁则不再重连
            }
            try {
                console.log(this.TAG, '尝试重连...');
                await this.connectWebSocket();
                console.log(this.TAG, '重连成功');
            }
            catch (error) {
                console.error(this.TAG, '重连失败，将继续尝试...', error);
                // 递归重连，直到成功或被销毁
                this.scheduleReconnect();
            }
        }, 5000); // 5秒后重连
    }
    /**
     * 生成会话ID
     */
    generateSessionId() {
        return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    /**
     * 发送初始化消息
     */
    sendInitMessage() {
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('init_session', {
                sessionId: this.sessionId,
                canvasInfo: {
                    width: this.canvas?.width || 0,
                    height: this.canvas?.height || 0
                },
                userAgent: 'miniprogram',
                sdkVersion: '0.1.0'
            });
        }
    }
    /**
     * 处理 WebSocket 消息
     */
    handleWebSocketMessage(data) {
        try {
            let message;
            if (typeof data === 'string') {
                message = JSON.parse(data);
            }
            else {
                message = data;
            }
            console.log(this.TAG, '收到 WebSocket 消息:', message.type);
            switch (message.type) {
                case 'session_started':
                    this.onStateChange('session_started');
                    break;
                case 'render_data':
                    this.handleRenderData(message.payload);
                    break;
                case 'voice_status':
                    this.handleVoiceStatus(message.payload);
                    break;
                case 'error':
                    this.handleError(message.payload);
                    break;
                case 'ping':
                    // 回复心跳
                    this.webSocket?.emit('pong', { sessionId: this.sessionId });
                    break;
                default:
                    console.log(this.TAG, '未知消息类型:', message.type);
            }
        }
        catch (error) {
            console.error(this.TAG, '处理 WebSocket 消息失败:', error);
        }
    }
    /**
     * 处理渲染数据
     */
    handleRenderData(payload) {
        // 这里可以处理来自服务器的渲染数据
        // 在小程序中，通常由 WebGL 渲染器处理
        console.log(this.TAG, '处理渲染数据');
        this.onStateChange('render_data_received');
    }
    /**
     * 处理语音状态
     */
    handleVoiceStatus(payload) {
        const state = payload.state || 'unknown';
        const duration = payload.duration;
        console.log(this.TAG, '语音状态:', state, '持续时间:', duration);
        // 调用语音状态回调
        if (this.options.onVoiceStateChange) {
            this.options.onVoiceStateChange(state, duration);
        }
    }
    /**
     * 处理错误
     */
    handleError(payload) {
        const sdkError = {
            code: payload.code || EErrorCode.INIT_FAILED,
            message: payload.message || '未知错误',
            timestamp: Date.now()
        };
        this.onMessage(sdkError);
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
            }); // 类型断言
            if (!this.gl) {
                throw new Error('WebGL 上下文创建失败');
            }
            console.log(this.TAG, 'WebGL 上下文创建成功');
            // 连接 WebSocket 服务
            await this.connectWebSocket();
            // 预加载资源
            if (params.resources && params.resources.length > 0) {
                await this.preloadResources(params.resources, params.onDownloadProgress);
            }
            else {
                // 模拟资源加载进度
                if (params.onDownloadProgress) {
                    for (let i = 0; i <= 100; i += 10) {
                        await new Promise(resolve => setTimeout(resolve, 20)); // 模拟加载延迟
                        params.onDownloadProgress(i);
                        this.onDownloadProgress(i);
                    }
                }
            }
            // 更新状态
            this.status = AvatarStatus.online;
            this.onStatusChange(this.status);
            this.isInitialized = true;
            console.log(this.TAG, 'SDK 初始化成功');
        }
        catch (error) {
            console.error(this.TAG, 'SDK 初始化失败:', error);
            const sdkError = {
                code: EErrorCode.INIT_FAILED,
                message: `初始化失败: ${error.message}`,
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
            throw error;
        }
    }
    /**
     * 预加载资源
     */
    async preloadResources(resources, onProgress) {
        console.log(this.TAG, '开始预加载资源:', resources);
        const totalResources = resources.length;
        let loadedCount = 0;
        for (const resourceUrl of resources) {
            try {
                // 创建资源项
                const resourceItem = {
                    url: resourceUrl,
                    type: this.getResourceType(resourceUrl),
                    loaded: false
                };
                // 模拟资源加载
                await this.internalLoadResource(resourceUrl, resourceItem.type);
                // 标记为已加载
                resourceItem.loaded = true;
                this.resources.set(resourceUrl, resourceItem);
                // 触发资源加载事件
                this.emit(EventType.RESOURCE_LOADED, resourceUrl);
                loadedCount++;
                // 更新进度
                if (onProgress) {
                    const progress = Math.round((loadedCount / totalResources) * 100);
                    onProgress(progress);
                    this.onDownloadProgress(progress);
                }
                console.log(this.TAG, `资源加载成功: ${resourceUrl}`);
            }
            catch (error) {
                console.error(this.TAG, `资源加载失败: ${resourceUrl}`, error);
                // 即使某个资源加载失败，也要继续加载其他资源
            }
        }
        console.log(this.TAG, `资源预加载完成: ${loadedCount}/${totalResources}`);
    }
    /**
     * 内部加载单个资源
     */
    async internalLoadResource(url, type) {
        // 在小程序环境中，我们使用不同的方法加载不同类型的资源
        return new Promise((resolve, reject) => {
            // 模拟资源加载过程
            setTimeout(() => {
                // 模拟成功加载
                resolve({ url, loaded: true });
            }, 100 + Math.random() * 200); // 随机延迟，模拟网络请求
        });
    }
    /**
     * 根据URL判断资源类型
     */
    getResourceType(url) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith('.glb') || lowerUrl.endsWith('.gltf') || lowerUrl.endsWith('.fbx')) {
            return 'model';
        }
        else if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp')) {
            return 'texture';
        }
        else if (lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.aac')) {
            return 'audio';
        }
        else if (lowerUrl.endsWith('.anim') || lowerUrl.endsWith('.motion')) {
            return 'animation';
        }
        else {
            return 'other';
        }
    }
    /**
     * 启动会话
     */
    start() {
        if (!this.isInitialized) {
            console.error(this.TAG, 'SDK 未初始化，无法启动');
            const sdkError = {
                code: EErrorCode.INIT_FAILED,
                message: 'SDK 未初始化，无法启动',
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
            return;
        }
        if (!this.webSocket || !this.webSocket.connected) {
            console.error(this.TAG, 'WebSocket 未连接，无法启动会话');
            const sdkError = {
                code: EErrorCode.WEBSOCKET_CONNECT_ERROR,
                message: 'WebSocket 未连接，无法启动会话',
                timestamp: Date.now()
            };
            this.onMessage(sdkError);
            return;
        }
        console.log(this.TAG, '启动会话，会话ID:', this.sessionId);
        // 发送启动消息到服务器
        this.webSocket.emit('start_session', {
            sessionId: this.sessionId,
            timestamp: Date.now()
        });
        // 更新状态
        this.status = AvatarStatus.online;
        this.onStatusChange(this.status);
        this.onStateChange('session_started');
    }
    /**
     * 让数字人说话
     */
    speak(text, isStart = true, isEnd = true, extra = {}) {
        console.log(this.TAG, '发送说话指令:', text);
        // 如果有WebSocket连接，则发送消息
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('speak', {
                text,
                isStart,
                isEnd,
                extra,
                sessionId: this.sessionId
            });
        }
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
    /**
     * 播放动画
     */
    playAnimation(animationName, config) {
        console.log(this.TAG, '播放动画:', animationName, config);
        const finalConfig = {
            name: animationName,
            duration: config?.duration || 3000, // 默认3秒
            loop: config?.loop || false,
            speed: config?.speed || 1.0,
        };
        // 添加到活动动画列表
        this.activeAnimations.set(animationName, finalConfig);
        // 发送到服务器
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('play_animation', {
                animation: finalConfig,
                sessionId: this.sessionId
            });
        }
        // 触发动画开始事件
        this.emit(EventType.ANIMATION_START, animationName);
    }
    /**
     * 停止动画
     */
    stopAnimation(animationName) {
        console.log(this.TAG, '停止动画:', animationName);
        // 从活动动画列表中移除
        this.activeAnimations.delete(animationName);
        // 发送到服务器
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('stop_animation', {
                animationName,
                sessionId: this.sessionId
            });
        }
        // 触发动画结束事件
        this.emit(EventType.ANIMATION_END, animationName);
    }
    /**
     * 获取所有活动的动画
     */
    getActiveAnimations() {
        return new Map(this.activeAnimations);
    }
    /**
     * 暂停所有动画
     */
    pauseAllAnimations() {
        console.log(this.TAG, '暂停所有动画');
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('pause_all_animations', {
                sessionId: this.sessionId
            });
        }
        // 暂停本地动画状态，但保留配置
        // (在实际实现中，这里可能会有更复杂的逻辑)
    }
    /**
     * 恢复所有动画
     */
    resumeAllAnimations() {
        console.log(this.TAG, '恢复所有动画');
        if (this.webSocket && this.webSocket.connected) {
            this.webSocket.emit('resume_all_animations', {
                sessionId: this.sessionId
            });
        }
    }
    /**
     * 加载额外资源
     */
    async loadResource(url, type) {
        console.log(this.TAG, '加载资源:', url);
        try {
            const resourceType = type || this.getResourceType(url);
            const resourceItem = {
                url,
                type: resourceType,
                loaded: false
            };
            // 模拟资源加载（使用现有的internalLoadResource方法，但避免冲突）
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    // 模拟成功加载
                    resolve({ url, loaded: true });
                }, 100 + Math.random() * 200); // 随机延迟，模拟网络请求
            });
            // 标记为已加载
            resourceItem.loaded = true;
            this.resources.set(url, resourceItem);
            // 触发资源加载事件
            this.emit(EventType.RESOURCE_LOADED, url);
            console.log(this.TAG, '资源加载成功:', url);
            return true;
        }
        catch (error) {
            console.error(this.TAG, '资源加载失败:', url, error);
            return false;
        }
    }
    /**
     * 获取已加载的资源
     */
    getResources() {
        return new Map(this.resources);
    }
    /**
     * 检查资源是否已加载
     */
    isResourceLoaded(url) {
        const resource = this.resources.get(url);
        return !!resource && resource.loaded;
    }
    /**
     * 销毁 SDK
     */
    async destroy() {
        console.log(this.TAG, '销毁 SDK');
        this.isDestroyed = true;
        // 停止所有动画
        for (const animationName of this.activeAnimations.keys()) {
            this.stopAnimation(animationName);
        }
        // 停止会话
        this.stop();
        // 断开网络监控
        this.networkMonitor.destroy();
        // 清理 WebGL 资源
        if (this.gl) {
            const ext = this.gl.getExtension('WEBGL_lose_context');
            if (ext) {
                ext.loseContext();
            }
            this.gl = null;
        }
        // 清理 Canvas
        this.canvas = null;
        // 清理事件处理器
        this.eventHandlers.clear();
        console.log(this.TAG, 'SDK 销毁完成');
    }
}

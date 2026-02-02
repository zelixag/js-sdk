'use strict';

var offline2 = require('./xmov-avatar-mp.heavy.offline2.js');
var offline1 = require('./xmov-avatar-mp.heavy.offline1.js');

/**
 * Canvas 替换工具
 * 用于在创建 AvatarRenderer 后替换其 canvas 属性
 */
/**
 * 替换 AvatarRenderer 的 canvas
 * @param avatarRenderer AvatarRenderer 实例
 * @param canvas 真实的 Canvas 对象（小程序通过 getCanvasNode 获取）
 * @param gl WebGL 上下文（可选）
 */
function replaceAvatarRendererCanvas(avatarRenderer, canvas, gl) {
    if (!avatarRenderer) {
        console.warn('[Canvas Replacement] AvatarRenderer 不存在');
        return;
    }
    // 替换 canvas
    avatarRenderer.canvas = canvas;
    // 如果 device 已创建，也需要更新
    if (avatarRenderer.device) {
        avatarRenderer.device.canvas = canvas;
        if (gl && avatarRenderer.device.gl) {
            avatarRenderer.device.gl = gl;
        }
    }
    console.log('[Canvas Replacement] Canvas 已替换为真实对象');
}

/**
 * Canvas 适配层 - 小程序版本
 * 适配小程序 Canvas API 和 WebGL
 */
/**
 * 获取 Canvas 节点
 */
function getCanvasNode(canvasId) {
    return new Promise((resolve, reject) => {
        const query = wx.createSelectorQuery();
        query.select(`#${canvasId}`)
            .fields({ node: true, size: true })
            .exec((res) => {
            if (res && res[0] && res[0].node) {
                resolve(res[0].node);
            }
            else {
                reject(new Error(`Canvas node not found: ${canvasId}`));
            }
        });
    });
}
/**
 * 创建 WebGL 上下文
 */
function createWebGLContext(canvas, options) {
    // 小程序 Canvas 不支持 webgl2，会报 Invalid context type [webgl2]，直接用 webgl
    try {
        const gl = canvas.getContext('webgl');
        return gl;
    }
    catch (err) {
        console.error('[Canvas] Create WebGL context error:', err);
        return null;
    }
}
/**
 * 设置 Canvas 尺寸
 */
function setCanvasSize(canvasId, width, height) {
    return new Promise((resolve, reject) => {
        const query = wx.createSelectorQuery();
        query.select(`#${canvasId}`)
            .fields({ node: true, size: true })
            .exec((res) => {
            if (res && res[0] && res[0].node) {
                const canvas = res[0].node;
                const dpr = wx.getSystemInfoSync().pixelRatio;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                // 设置样式尺寸
                wx.createSelectorQuery()
                    .select(`#${canvasId}`)
                    .boundingClientRect()
                    .exec((rect) => {
                    if (rect && rect[0]) {
                        // 通过设置样式来控制显示尺寸
                        // 注意：小程序中需要通过 CSS 或 style 属性设置
                        resolve();
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                reject(new Error(`Canvas node not found: ${canvasId}`));
            }
        });
    });
}
/**
 * 创建 Image 对象（兼容浏览器 API）
 * 返回类似 HTMLImageElement 的对象
 */
function createImage() {
    const image = {
        src: '',
        crossOrigin: null,
        onload: null,
        onerror: null,
        width: 0,
        height: 0,
        complete: false
    };
    // 小程序中使用 wx.getImageInfo 加载图片
    Object.defineProperty(image, 'src', {
        set: function (value) {
            this._src = value;
            this.complete = false;
            // 小程序中 crossOrigin 属性不影响加载，但保留以兼容 API
            wx.getImageInfo({
                src: value,
                success: (res) => {
                    this.width = res.width;
                    this.height = res.height;
                    this.complete = true;
                    if (this.onload) {
                        this.onload();
                    }
                },
                fail: (err) => {
                    this.complete = false;
                    if (this.onerror) {
                        this.onerror(err);
                    }
                }
            });
        },
        get: function () {
            return this._src || '';
        }
    });
    // 添加 crossOrigin 属性（小程序中不影响，但保留以兼容）
    Object.defineProperty(image, 'crossOrigin', {
        set: function (value) {
            this._crossOrigin = value;
        },
        get: function () {
            return this._crossOrigin || null;
        }
    });
    return image;
}

/**
 * 环境检测工具
 */
/**
 * 检测是否在小程序环境
 */
function isMiniProgram() {
    return typeof wx !== 'undefined' &&
        typeof wx.getSystemInfoSync === 'function';
}
/**
 * 检测是否在浏览器环境
 */
function isBrowser() {
    return typeof window !== 'undefined' &&
        typeof document !== 'undefined';
}
/**
 * 监听网络状态变化（小程序）
 */
function onNetworkStatusChange(callback) {
    if (isMiniProgram()) {
        wx.onNetworkStatusChange(callback);
        return () => {
            // 小程序无法取消监听，返回空函数
        };
    }
    // 浏览器环境
    if (isBrowser()) {
        const onlineHandler = () => callback({ isConnected: true, networkType: 'online' });
        const offlineHandler = () => callback({ isConnected: false, networkType: 'offline' });
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);
        return () => {
            window.removeEventListener('online', onlineHandler);
            window.removeEventListener('offline', offlineHandler);
        };
    }
    return () => { };
}

/**
 * 网络监控适配器 - 统一浏览器和小程序的网络状态监听
 */
/**
 * 网络监控类（适配版）
 */
class NetworkMonitor {
    offlineCallback;
    onlineCallback;
    unsubscribe = null;
    isOnline = true;
    constructor(options) {
        this.offlineCallback = options.offlineCallback;
        this.onlineCallback = options.onlineCallback;
        this._init();
    }
    _init() {
        if (isMiniProgram()) {
            // 小程序环境
            this.unsubscribe = onNetworkStatusChange((res) => {
                const wasOnline = this.isOnline;
                this.isOnline = res.isConnected;
                if (!wasOnline && this.isOnline) {
                    // 从离线变为在线
                    this.onlineCallback('网络已恢复');
                }
                else if (wasOnline && !this.isOnline) {
                    // 从在线变为离线
                    this.offlineCallback('网络已断开');
                }
            });
        }
        else {
            // 浏览器环境
            this.isOnline = navigator.onLine;
            const onlineHandler = () => {
                if (!this.isOnline) {
                    this.isOnline = true;
                    this.onlineCallback('网络已恢复');
                }
            };
            const offlineHandler = () => {
                if (this.isOnline) {
                    this.isOnline = false;
                    this.offlineCallback('网络已断开');
                }
            };
            window.addEventListener('online', onlineHandler);
            window.addEventListener('offline', offlineHandler);
            this.unsubscribe = () => {
                window.removeEventListener('online', onlineHandler);
                window.removeEventListener('offline', offlineHandler);
            };
        }
    }
    /**
     * 销毁网络监控
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
    /**
     * 检查当前网络状态
     */
    isOnlineNow() {
        return this.isOnline;
    }
}

// @ts-nocheck - 临时禁用类型检查，因为 debugOverlay 对象有大量重复属性（模拟对象）
/**
 * 小程序版数字人 SDK 核心类
 */
class XmovAvatarMP {
    options;
    canvasId = '';
    canvas = null;
    gl = null;
    TAG = "[XMOV AVATAR MINIPROGRAM]";
    status = -1;
    // 实例组件
    resourceManager;
    renderScheduler;
    networkMonitor;
    ttsa;
    debugOverlay = null;
    // 控制变量
    _offlineTimer = null;
    _offlineInterval = 300;
    _env = "production";
    avatarCanvasVisible = true;
    pendingInvisibleMode = false;
    isInitialized = false;
    // 事件回调
    onStateChange = () => { };
    onDownloadProgress = null;
    // 静态方法
    static IBRAnimationGeneratorCharInfo_NN = offline2.IBRAnimationGeneratorCharInfo_NN;
    static unpackIBRAnimation = offline2.unpackIBRAnimation;
    static formatMJT = offline2.formatMJT;
    static getVertices = offline2.getVertices;
    static getPCATextures = offline2.getPCATextures;
    static getWavefrontObjFromVertices = offline2.getWavefrontObjFromVertices;
    static GLDevice = offline2.GLDevice;
    static GLPipeline = offline2.GLPipeline;
    // 其他实例变量
    boundVisibilityChange;
    replayData = null;
    startConnectTime = 0;
    connectSuccessTime = 0;
    enableClientInterrupt = false;
    retryCount = 1;
    retryTimer = null;
    maxRetryCount = 9;
    retryRound = 1;
    maxRetryRound = 3;
    isRetrying = false;
    isStartRetry = false;
    destroyed = false;
    reconnectDebounceTimer = null;
    _initSDKPromise = null;
    constructor(options) {
        this.options = options;
        this._env = options.env || "production";
        this.enableClientInterrupt = options.enableClientInterrupt || false;
        // 小程序传 canvasId，Web 传 containerId（选择器），兼容两者
        const id = options.canvasId ?? options.containerId ?? '';
        this.canvasId = typeof id === 'string' ? id.replace(/^#/, '') : '';
        this.boundVisibilityChange = this.visibilitychange.bind(this);
        // 初始化网络监控
        this.networkMonitor = new NetworkMonitor({
            offlineCallback: (message) => {
                this.onMessage({
                    code: offline2.EErrorCode.NETWORK_DOWN,
                    message: message || '网络断开',
                });
                console.log('网络断开（network off）', message);
                if (!this.isInitialized) {
                    console.warn(this.TAG, '初始化未完成时断网，清除所有资源并断开连接');
                    this.cleanupBeforeInitComplete("network_offline_before_init");
                    return;
                }
                if (this.status !== offline2.AvatarStatus.offline) {
                    this.offlineHandle();
                }
            },
            onlineCallback: (message) => {
                this.onMessage({
                    code: offline2.EErrorCode.NETWORK_UP,
                    message: message || '网络恢复',
                });
                if (!this.isInitialized) {
                    console.warn(this.TAG, '网络恢复但初始化未完成，清除所有资源并断开连接');
                    this.cleanupBeforeInitComplete("network_online_before_init");
                    return;
                }
                if (this.isStartRetry) {
                    this.triggerReconnect();
                }
            },
        });
        // 初始化 SDK（异步，init() 里会 await 此 promise）
        this._initSDKPromise = this.initializeSDK(options);
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return this.status;
    }
    /**
     * 获取标签
     */
    getTag() {
        return this.options.tag;
    }
    /**
     * 获取业务环境
     */
    get businessENV() {
        return this._env;
    }
    /**
     * 获取唯一说话ID
     */
    getUniqueSpeakId() {
        return this.ttsa?.getUniqueSpeakId() || `0-${this.getSessionId()}`;
    }
    /**
     * 初始化 SDK
     */
    async initializeSDK(options) {
        // 小程序中不需要检查 navigator.onLine，通过 NetworkMonitor 检查
        if (!this.networkMonitor.isOnlineNow()) {
            this.onMessage({
                code: offline2.EErrorCode.NETWORK_BREAK,
                message: '没有网络，请联网后重试',
            });
            return;
        }
        const { containerId, appId, appSecret, gatewayServer, cacheServer, config } = options;
        // 获取 Canvas 节点
        try {
            this.canvas = await getCanvasNode(this.canvasId);
            this.gl = createWebGLContext(this.canvas, {
                antialias: true,
                preserveDrawingBuffer: true
            });
            if (!this.gl) {
                throw new Error('WebGL context creation failed');
            }
        }
        catch (error) {
            console.error(this.TAG, 'Canvas initialization failed:', error);
            this.onMessage({
                code: offline2.EErrorCode.NETWORK_BREAK, // 使用已存在的错误码
                message: 'Canvas 初始化失败',
            });
            return;
        }
        const _config = { ...(config || {}), raw_audio: true };
        // 初始化资源管理器（使用适配器）
        this.resourceManager = this.createResourceManager({
            sdkInstance: this,
            headers: options.headers,
            appId,
            appSecret,
            gatewayServer,
            cacheServer,
            config: _config,
            onNetworkInfo: (networkInfo) => {
                options.onNetworkInfo?.(networkInfo);
            },
            onStartSessionWarning: (message) => {
                options.onStartSessionWarning?.(message);
            },
        });
        // 初始化渲染调度器（使用适配器）
        this.renderScheduler = this.createRenderScheduler({
            sdkInstance: this,
            canvas: this.canvas, // 传递 Canvas 节点而非 DOM 元素
            gl: this.gl, // 传递 WebGL 上下文
            resourceManager: this.resourceManager,
            enableDebugger: options.enableDebugger,
            hardwareAcceleration: options.hardwareAcceleration || "default",
            enableClientInterrupt: this.enableClientInterrupt,
            onDownloadProgress: (progress) => {
                this.onDownloadProgress?.(progress);
                // 在小程序中，我们通过回调来通知进度
                // options.onDownloadProgress?.(progress); // 暂时注释掉，因为可能不存在
                this.isInitialized = progress === 100;
            },
            onStateChange: (state) => {
                if ((this.getStatus() === offline2.AvatarStatus.offline && state !== 'idle') || state === "") {
                    return;
                }
                options.onStateChange?.(state);
            },
            onRenderChange: (state, oldState) => {
                options.onRenderChange?.(state);
                if (state === offline2.RenderState.rendering && (oldState === offline2.RenderState.resumed || this.getStatus() === offline2.AvatarStatus.online)) {
                    console.log(this.TAG, 'Status:===== 渲染中，状态: rendering', this.getSessionId());
                    this.onStatusChange(offline2.AvatarStatus.visible);
                }
            },
            onVoiceStateChange: (state, duration) => {
                options.onVoiceStateChange?.(state, duration);
            },
            onWalkStateChange: (state) => {
                options.onWalkStateChange?.(state);
            },
            sendVideoInfo: (info) => {
                this.debugOverlay?.setVideoInfo(info);
            },
            setAudioInfo: (info) => {
                this.debugOverlay?.setAudioInfo(info);
            },
            setEventData: (info) => {
                this.debugOverlay?.setEventData(info);
            },
            renderFrameCallback: (frame) => {
                this.renderFrameCallback(frame);
                this.handleReplaySend(frame);
            },
            reportMessage: (message) => {
                this.ttsa?.sendPerfLog(message);
            },
            sendSdkPoint: (type, data, extra) => {
                this.ttsa?.sendSdkPoint(type, data, extra);
            },
        });
        // 其他初始化...
        globalThis.performanceTracker = globalThis.performanceTracker || {
            markStart: () => { },
            markEnd: () => { },
            setOnStateRenderChange: () => { },
            setReportFunc: () => { }
        };
        if (options.onStateRenderChange) {
            globalThis.performanceTracker.setOnStateRenderChange(options.onStateRenderChange);
        }
    }
    /**
     * 创建资源管理器（小程序适配）
     */
    createResourceManager(config) {
        return new offline1.ResourceManager({
            sdkInstance: this,
            config: config.config,
            appId: config.appId,
            appSecret: config.appSecret,
            gatewayServer: config.gatewayServer,
            cacheServer: config.cacheServer,
            headers: config.headers || {},
            onNetworkInfo: (quality) => {
                // 网络质量回调
                console.log(this.TAG, 'Network quality:', quality);
            },
            onStartSessionWarning: (message) => {
                // 会话警告回调
                console.warn(this.TAG, 'Session warning:', message);
            },
        });
    }
    /**
     * 创建渲染调度器（小程序适配）
     */
    createRenderScheduler(config) {
        // 创建 RenderScheduler（会创建 AvatarRenderer，使用模拟的 canvas）
        const renderScheduler = new offline1.RenderScheduler({
            sdkInstance: config.sdkInstance,
            container: config.container || {
                appendChild: () => { },
                removeChild: () => { },
                querySelector: () => null,
                querySelectorAll: () => [],
            },
            hardwareAcceleration: config.hardwareAcceleration,
            resourceManager: config.resourceManager,
            enableDebugger: config.enableDebugger,
            enableClientInterrupt: config.enableClientInterrupt,
            onDownloadProgress: config.onDownloadProgress,
            onStateChange: config.onStateChange,
            onRenderChange: config.onRenderChange,
            onVoiceStateChange: config.onVoiceStateChange,
            onWalkStateChange: config.onWalkStateChange,
            sendVideoInfo: config.sendVideoInfo,
            setAudioInfo: config.setAudioInfo,
            setEventData: config.setEventData,
            renderFrameCallback: config.renderFrameCallback || ((frame) => {
                // 默认渲染帧回调
                console.log(this.TAG, 'Render frame:', frame);
            }),
            reportMessage: (message) => {
                this.onMessage(message);
            },
            sendSdkPoint: (type, data, extra) => {
                // SDK 埋点
                console.log(this.TAG, 'SDK Point:', type, data, extra);
            },
        });
        // 关键步骤：替换 AvatarRenderer 的 canvas 为真实的 canvas
        if (config.canvas && renderScheduler.avatarRenderer) {
            replaceAvatarRendererCanvas(renderScheduler.avatarRenderer, config.canvas, config.gl);
        }
        return renderScheduler;
    }
    /**
     * 渲染帧回调
     */
    renderFrameCallback(frame) {
        if (!this.ttsa?.getStatus() && ![offline2.AvatarStatus.offline, offline2.AvatarStatus.network_off].includes(this.status) && frame % 24 === 0) {
            this.offlineHandle();
        }
    }
    /**
     * 初始化会话
     */
    async init(params) {
        this.destroyed = false;
        this.isInitialized = false;
        this.startConnectTime = Date.now();
        const { onDownloadProgress, initModel } = params;
        this.onDownloadProgress = onDownloadProgress;
        if (initModel === offline2.InitModel.invisible) {
            this.pendingInvisibleMode = true;
        }
        try {
            // 等待构造函数里启动的 initializeSDK 完成（resourceManager 等才可用）
            if (this._initSDKPromise) {
                await this._initSDKPromise;
                this._initSDKPromise = null;
            }
            if (!this.resourceManager) {
                throw new Error('ResourceManager not ready');
            }
            // 加载资源
            console.log(this.TAG, "Loading resources...");
            globalThis.performanceTracker.markStart(offline2.performanceConstant.load_resource);
            globalThis.performanceTracker.markStart(offline2.performanceConstant.first_avatar_render);
            globalThis.performanceTracker.markStart(offline2.performanceConstant.first_webgl_render);
            const sessionInfo = await this.resourceManager.load(onDownloadProgress);
            if (!sessionInfo?.socket_io_url || !sessionInfo?.token) {
                console.error(this.TAG, "init error, socket_io_url or token is empty reload");
                return;
            }
            this.connectSuccessTime = Date.now();
            globalThis.performanceTracker.markEnd(offline2.performanceConstant.load_resource);
            // 创建一个模拟的DebugOverlay对象，具有基本的接口
            // 注意：使用 @ts-ignore 来避免重复属性检查，因为这是一个大型模拟对象
            // @ts-ignore - 忽略重复属性检查
            this.debugOverlay = {
                show() { },
                hide() { },
                destroy() { },
                setVideoInfo(info) { },
                setAudioInfo(info) { },
                setEventData(info) { },
                addError(error) { },
                container: null,
                sdk: null,
                sessionInfo: null,
                startTime: 0,
                endTime: 0,
                totalFrame: 0,
                dropFrame: 0,
                renderTime: 0,
                fps: 0,
                avgFps: 0,
                minFps: 0,
                maxFps: 0,
                cpuUsage: 0,
                memoryUsage: 0,
                networkLatency: 0,
                packetLoss: 0,
                updateTime: 0,
                updateInterval: 0,
                visible: false,
                render: () => { },
                update: () => { },
                reset: () => { },
                getStats: () => ({}),
                setStats: (stats) => { },
                addStats: (stats) => { },
                removeStats: (key) => { },
                clearStats: () => { },
                toggle: () => { },
                setPosition: (x, y) => { },
                setSize: (width, height) => { },
                setTheme: (theme) => { },
                setOpacity: (opacity) => { },
                setScale: (scale) => { },
                setRotation: (rotation) => { },
                setOffset: (x, y) => { },
                setAnchor: (x, y) => { },
                setZIndex: (zIndex) => { },
                setVisibility: (visible) => { },
                setInteractive: (interactive) => { },
                setEnabled: (enabled) => { },
                setLocked: (locked) => { },
                setSelected: (selected) => { },
                setFocused: (focused) => { },
                setActive: (active) => { },
                setHovered: (hovered) => { },
                setPressed: (pressed) => { },
                setDisabled: (disabled) => { },
                setError: (error) => { },
                clearError: () => { },
                setWarning: (warning) => { },
                clearWarning: () => { },
                setInfo: (info) => { },
                clearInfo: () => { },
                setSuccess: (success) => { },
                clearSuccess: () => { },
                setMessage: (message) => { },
                clearMessage: () => { },
                setTitle: (title) => { },
                setDescription: (description) => { },
                setIcon: (icon) => { },
                setImage: (image) => { },
                setVideo: (video) => { },
                setAudio: (audio) => { },
                setData: (data) => { },
                getData: () => ({}),
                setValue: (key, value) => { },
                getValue: (key) => null,
                getProperty: (key) => null,
                setProperty: (key, value) => { },
                hasProperty: (key) => false,
                removeProperty: (key) => { },
                clearProperties: () => { },
                getProperties: () => ({}),
                setProperties: (props) => { },
                addClass: (className) => { },
                removeClass: (className) => { },
                hasClass: (className) => false,
                toggleClass: (className) => { },
                setStyle: (style) => { },
                getStyle: (property) => null,
                removeStyle: (property) => { },
                clearStyles: () => { },
                getStyles: () => ({}),
                setStyles: (styles) => { },
                setAttribute: (name, value) => { },
                getAttribute: (name) => null,
                removeAttribute: (name) => { },
                clearAttributes: () => { },
                getAttributes: () => ({}),
                setAttributes: (attrs) => { },
                setText: (text) => { },
                getText: () => '',
                setHtml: (html) => { },
                getHtml: () => '',
                setSvg: (svg) => { },
                getSvg: () => '',
                setCanvas: (canvas) => { },
                getCanvas: () => null,
                setContext: (context) => { },
                getContext: () => null,
                setBuffer: (buffer) => { },
                getBuffer: () => null,
                setTexture: (texture) => { },
                getTexture: () => null,
                setShader: (shader) => { },
                getShader: () => null,
                setMaterial: (material) => { },
                getMaterial: () => null,
                setGeometry: (geometry) => { },
                getGeometry: () => null,
                setMesh: (mesh) => { },
                getMesh: () => null,
                setModel: (model) => { },
                getModel: () => null,
                setScene: (scene) => { },
                getScene: () => null,
                setCamera: (camera) => { },
                getCamera: () => null,
                setLight: (light) => { },
                getLight: () => null,
                setAnimation: (animation) => { },
                getAnimation: () => null,
                setController: (controller) => { },
                getController: () => null,
                setRenderer: (renderer) => { },
                getRenderer: () => null,
                setLoader: (loader) => { },
                getLoader: () => null,
                setParser: (parser) => { },
                getParser: () => null,
                setValidator: (validator) => { },
                getValidator: () => null,
                setSerializer: (serializer) => { },
                getSerializer: () => null,
                setDeserializer: (deserializer) => { },
                getDeserializer: () => null,
                setTransformer: (transformer) => { },
                getTransformer: () => null,
                setConverter: (converter) => { },
                getConverter: () => null,
                setProcessor: (processor) => { },
                getProcessor: () => null,
                setAnalyzer: (analyzer) => { },
                getAnalyzer: () => null,
                setOptimizer: (optimizer) => { },
                getOptimizer: () => null,
                setCompressor: (compressor) => { },
                getCompressor: () => null,
                setDecompressor: (decompressor) => { },
                getDecompressor: () => null,
                setEncryptor: (encryptor) => { },
                getEncryptor: () => null,
                setDecryptor: (decryptor) => { },
                getDecryptor: () => null,
                setHasher: (hasher) => { },
                getHasher: () => null,
                setSigner: (signer) => { },
                getSigner: () => null,
                setVerifier: (verifier) => { },
                getVerifier: () => null,
                setEncoder: (encoder) => { },
                getEncoder: () => null,
                setDecoder: (decoder) => { },
                getDecoder: () => null,
                setCodec: (codec) => { },
                getCodec: () => null,
                setProtocol: (protocol) => { },
                getProtocol: () => null,
                setTransport: (transport) => { },
                getTransport: () => null,
                setConnection: (connection) => { },
                getConnection: () => null,
                setSession: (session) => { },
                getSession: () => null,
                setTransaction: (transaction) => { },
                getTransaction: () => null,
                setOperation: (operation) => { },
                getOperation: () => null,
                setCommand: (command) => { },
                getCommand: () => null,
                setAction: (action) => { },
                getAction: () => null,
                setEvent: (event) => { },
                getEvent: () => null,
                setCallback: (callback) => { },
                getCallback: () => null,
                setResult: (result) => { },
                getResult: () => null,
                setErrorStatus: (error) => { },
                getErrorStatus: () => null,
                setStatus: (status) => { },
                getStatus: () => null,
                setProgress: (progress) => { },
                getProgress: () => null,
                setRate: (rate) => { },
                getRate: () => null,
                setSpeed: (speed) => { },
                getSpeed: () => null,
                setQuality: (quality) => { },
                getQuality: () => null,
                setLevel: (level) => { },
                getLevel: () => null,
                setPriority: (priority) => { },
                getPriority: () => null,
                setWeight: (weight) => { },
                getWeight: () => null,
                // 注意：setSize, getSize, setPosition, getPosition, setRotation, getRotation, setScale, getScale 已在前面定义
                setTransform: (transform) => { },
                getTransform: () => null,
                setMatrix: (matrix) => { },
                getMatrix: () => null,
                setVector: (vector) => { },
                getVector: () => null,
                setColor: (color) => { },
                getColor: () => null,
                setGradient: (gradient) => { },
                getGradient: () => null,
                setPattern: (pattern) => { },
                getPattern: () => null,
                setFilter: (filter) => { },
                getFilter: () => null,
                setEffect: (effect) => { },
                getEffect: () => null,
                setBlend: (blend) => { },
                getBlend: () => null,
                setComposite: (composite) => { },
                getComposite: () => null,
                setMask: (mask) => { },
                getMask: () => null,
                setClip: (clip) => { },
                getClip: () => null,
                setRegion: (region) => { },
                getRegion: () => null,
                setBoundary: (boundary) => { },
                getBoundary: () => null,
                setBounds: (bounds) => { },
                getBounds: () => null,
                setRect: (rect) => { },
                getRect: () => null,
                setCircle: (circle) => { },
                getCircle: () => null,
                setPolygon: (polygon) => { },
                getPolygon: () => null,
                setPath: (path) => { },
                getPath: () => null,
                setCurve: (curve) => { },
                getCurve: () => null,
                setSurface: (surface) => { },
                getSurface: () => null,
                setVolume: (volume) => { },
                getVolume: () => null,
                setArea: (area) => { },
                getArea: () => null,
                setLength: (length) => { },
                getLength: () => null,
                setAngle: (angle) => { },
                getAngle: () => null,
                setDistance: (distance) => { },
                getDistance: () => null,
                setTime: (time) => { },
                getTime: () => null,
                setDate: (date) => { },
                getDate: () => null,
                setDateTime: (dateTime) => { },
                getDateTime: () => null,
                setTimestamp: (timestamp) => { },
                getTimestamp: () => null,
                setDuration: (duration) => { },
                getDuration: () => null,
                setFrequency: (frequency) => { },
                getFrequency: () => null,
                setPeriod: (period) => { },
                getPeriod: () => null,
                setPhase: (phase) => { },
                getPhase: () => null,
                setAmplitude: (amplitude) => { },
                getAmplitude: () => null,
                setFrequency: (frequency) => { },
                getFrequency: () => null,
                setWavelength: (wavelength) => { },
                getWavelength: () => null,
                setVelocity: (velocity) => { },
                getVelocity: () => null,
                setAcceleration: (acceleration) => { },
                getAcceleration: () => null,
                setForce: (force) => { },
                getForce: () => null,
                setEnergy: (energy) => { },
                getEnergy: () => null,
                setPower: (power) => { },
                getPower: () => null,
                setPressure: (pressure) => { },
                getPressure: () => null,
                setTemperature: (temperature) => { },
                getTemperature: () => null,
                setHumidity: (humidity) => { },
                getHumidity: () => null,
                setLight: (light) => { },
                getLight: () => null,
                setSound: (sound) => { },
                getSound: () => null,
                setVibration: (vibration) => { },
                getVibration: () => null,
                setMotion: (motion) => { },
                getMotion: () => null,
                setGesture: (gesture) => { },
                getGesture: () => null,
                setPose: (pose) => { },
                getPose: () => null,
                setExpression: (expression) => { },
                getExpression: () => null,
                setEmotion: (emotion) => { },
                getEmotion: () => null,
                setMood: (mood) => { },
                getMood: () => null,
                setBehavior: (behavior) => { },
                getBehavior: () => null,
                setAction: (action) => { },
                getAction: () => null,
                setActivity: (activity) => { },
                getActivity: () => null,
                setTask: (task) => { },
                getTask: () => null,
                setJob: (job) => { },
                getJob: () => null,
                setProcess: (process) => { },
                getProcess: () => null,
                setThread: (thread) => { },
                getThread: () => null,
                setWorker: (worker) => { },
                getWorker: () => null,
                setAgent: (agent) => { },
                getAgent: () => null,
                setActor: (actor) => { },
                getActor: () => null,
                setEntity: (entity) => { },
                getEntity: () => null,
                setObject: (object) => { },
                getObject: () => null,
                setSubject: (subject) => { },
                getSubject: () => null,
                setItem: (item) => { },
                getItem: () => null,
                setElement: (element) => { },
                getElement: () => null,
                setComponent: (component) => { },
                getComponent: () => null,
                setModule: (module) => { },
                getModule: () => null,
                setPlugin: (plugin) => { },
                getPlugin: () => null,
                setExtension: (extension) => { },
                getExtension: () => null,
                setFeature: (feature) => { },
                getFeature: () => null,
                setCapability: (capability) => { },
                getCapability: () => null,
                setPermission: (permission) => { },
                getPermission: () => null,
                setAccess: (access) => { },
                getAccess: () => null,
                setAuth: (auth) => { },
                getAuth: () => null,
                setSecurity: (security) => { },
                getSecurity: () => null,
                setPrivacy: (privacy) => { },
                getPrivacy: () => null,
                setSafety: (safety) => { },
                getSafety: () => null,
                setHealth: (health) => { },
                getHealth: () => null,
                setStatus: (status) => { },
                getStatus: () => null,
                setState: (state) => { },
                getState: () => null,
                setMode: (mode) => { },
                getMode: () => null,
                setType: (type) => { },
                getType: () => null,
                setKind: (kind) => { },
                getKind: () => null,
                setCategory: (category) => { },
                getCategory: () => null,
                setClass: (cls) => { },
                getClass: () => null,
                setGroup: (group) => { },
                getGroup: () => null,
                setFamily: (family) => { },
                getFamily: () => null,
                setSpecies: (species) => { },
                getSpecies: () => null,
                setGenus: (genus) => { },
                getGenus: () => null,
                setOrder: (order) => { },
                getOrder: () => null,
                setPhylum: (phylum) => { },
                getPhylum: () => null,
                setKingdom: (kingdom) => { },
                getKingdom: () => null,
                setDomain: (domain) => { },
                getDomain: () => null,
                setName: (name) => { },
                getName: () => null,
                setId: (id) => { },
                getId: () => null,
                setCode: (code) => { },
                getCode: () => null,
                setSymbol: (symbol) => { },
                getSymbol: () => null,
                setValue: (value) => { },
                getValue: () => null,
                setUnit: (unit) => { },
                getUnit: () => null,
                setScale: (scale) => { },
                getScale: () => null,
                setPrecision: (precision) => { },
                getPrecision: () => null,
                setAccuracy: (accuracy) => { },
                getAccuracy: () => null,
                setTolerance: (tolerance) => { },
                getTolerance: () => null,
                setError: (error) => { },
                getError: () => null,
                setDeviation: (deviation) => { },
                getDeviation: () => null,
                setVariance: (variance) => { },
                getVariance: () => null,
                setStdDev: (stdDev) => { },
                getStdDev: () => null,
                setMean: (mean) => { },
                getMean: () => null,
                setMedian: (median) => { },
                getMedian: () => null,
                setMode: (mode) => { },
                getMode: () => null,
                setRange: (range) => { },
                getRange: () => null,
                setMin: (min) => { },
                getMin: () => null,
                setMax: (max) => { },
                getMax: () => null,
                setAvg: (avg) => { },
                getAvg: () => null,
                setSum: (sum) => { },
                getSum: () => null,
                setCount: (count) => { },
                getCount: () => null,
                setTotal: (total) => { },
                getTotal: () => null,
                setPercentage: (percentage) => { },
                getPercentage: () => null,
                setRatio: (ratio) => { },
                getRatio: () => null,
                setProportion: (proportion) => { },
                getProportion: () => null,
                setFraction: (fraction) => { },
                getFraction: () => null,
                setDecimal: (decimal) => { },
                getDecimal: () => null,
                setInteger: (integer) => { },
                getInteger: () => null,
                setFloat: (float) => { },
                getFloat: () => null,
                setDouble: (double) => { },
                getDouble: () => null,
                setBoolean: (boolean) => { },
                getBoolean: () => null,
                setString: (string) => { },
                getString: () => null,
                setArray: (array) => { },
                getArray: () => null,
                setList: (list) => { },
                getList: () => null,
                setMap: (map) => { },
                getMap: () => null,
                setObject: (obj) => { },
                getObject: () => null,
                setJson: (json) => { },
                getJson: () => null,
                setXml: (xml) => { },
                getXml: () => null,
                setYaml: (yaml) => { },
                getYaml: () => null,
                setCsv: (csv) => { },
                getCsv: () => null,
                setTsv: (tsv) => { },
                getTsv: () => null,
                setHtml: (html) => { },
                getHtml: () => null,
                setCss: (css) => { },
                getCss: () => null,
                setJs: (js) => { },
                getJs: () => null,
                setTs: (ts) => { },
                getTs: () => null,
                setSql: (sql) => { },
                getSql: () => null,
                setJsonl: (jsonl) => { },
                getJsonl: () => null,
                setNdjson: (ndjson) => { },
                getNdjson: () => null,
                setMsgpack: (msgpack) => { },
                getMsgpack: () => null,
                setProtobuf: (protobuf) => { },
                getProtobuf: () => null,
                setAvro: (avro) => { },
                getAvro: () => null,
                setParquet: (parquet) => { },
                getParquet: () => null,
                setHdf5: (hdf5) => { },
                getHdf5: () => null,
                setNetcdf: (netcdf) => { },
                getNetcdf: () => null,
                setFits: (fits) => { },
                getFits: () => null,
                setPng: (png) => { },
                getPng: () => null,
                setJpg: (jpg) => { },
                getJpg: () => null,
                setGif: (gif) => { },
                getGif: () => null,
                setBmp: (bmp) => { },
                getBmp: () => null,
                setTiff: (tiff) => { },
                getTiff: () => null,
                setWebp: (webp) => { },
                getWebp: () => null,
                setSvg: (svg) => { },
                getSvg: () => null,
                setPdf: (pdf) => { },
                getPdf: () => null,
                setDoc: (doc) => { },
                getDoc: () => null,
                setXls: (xls) => { },
                getXls: () => null,
                setPpt: (ppt) => { },
                getPpt: () => null,
                setMp3: (mp3) => { },
                getMp3: () => null,
                setWav: (wav) => { },
                getWav: () => null,
                setFlac: (flac) => { },
                getFlac: () => null,
                setOgg: (ogg) => { },
                getOgg: () => null,
                setM4a: (m4a) => { },
                getM4a: () => null,
                setMp4: (mp4) => { },
                getMp4: () => null,
                setAvi: (avi) => { },
                getAvi: () => null,
                setMov: (mov) => { },
                getMov: () => null,
                setWmv: (wmv) => { },
                getWmv: () => null,
                setFlv: (flv) => { },
                getFlv: () => null,
                setWebm: (webm) => { },
                getWebm: () => null,
                set3gp: (_3gp) => { },
                get3gp: () => null,
                setMkv: (mkv) => { },
                getMkv: () => null,
            }; // 使用 as any 绕过类型检查
            // 连接 WebSocket
            this.ttsa = this.connectTtsa(sessionInfo);
            this.renderScheduler.init();
            this.renderScheduler.setAvatarCanvasVisible(this.avatarCanvasVisible);
            // 注意：小程序中没有 window 和 document，所以不添加事件监听器
        }
        catch (error) {
            console.error(this.TAG, 'Init error:', error);
            this.onMessage({
                code: offline2.EErrorCode.NETWORK_BREAK, // 使用已存在的错误码
                message: `初始化失败: ${error.message}`,
            });
        }
    }
    /**
     * 页面可见性变化处理
     */
    visibilitychange() {
        // 小程序中不使用 document.hidden
        // 可以通过 Page.onShow/onHide 来处理
        console.log(this.TAG, 'Visibility change detected in mini program');
    }
    /**
     * 设置回放数据
     */
    setReplayData(data) {
        this.replayData = data;
    }
    /**
     * 处理回放发送
     */
    handleReplaySend(frame) {
        if (!this.replayData) {
            return;
        }
        const frameReplayData = this.replayData.filter((item) => (Number(item.client_frame_number) === frame && item.event_type !== "sdk_burial_point"))?.[0];
        if (frameReplayData) {
            if (frameReplayData.event_type === 'state_change') {
                this.ttsa?.stateChange(frameReplayData.event_data.state, frameReplayData.event_data.params);
            }
            else if (frameReplayData.event_type === 'send_text') {
                this.speak(frameReplayData.event_data.ssml, frameReplayData.event_data.is_start, frameReplayData.event_data.is_end, frameReplayData.event_data.extra);
            }
            else {
                console.log(this.TAG, `[handleReplaySend] 未知事件类型: ${frameReplayData}`);
            }
        }
    }
    /**
     * 连接 Ttsa（WebSocket）
     */
    connectTtsa(sessionInfo) {
        console.log(this.TAG, 'Connecting to Ttsa...');
        globalThis.performanceTracker?.markStart?.(offline2.performanceConstant.ttsa_connect);
        globalThis.performanceTracker?.markStart?.(offline2.performanceConstant.ttsa_ready);
        return new offline1.Ttsa({
            sdkInstance: this,
            url: sessionInfo.socket_io_url,
            room: sessionInfo.room,
            session_id: sessionInfo.session_id,
            token: sessionInfo.token,
            appInfo: this.resourceManager.getAppInfo(),
            framedata_proto_version: sessionInfo.config.framedata_proto_version,
            onReady: () => {
                this.onStatusChange(offline2.AvatarStatus.online);
                this.options.onReady?.();
            },
            handleMessage: this.handleMessage,
            handleAAFrame: this.handleAAFrame,
            runStartFrameIndex: this.runStartFrameIndex,
            ttsaStateChangeHandle: this.ttsaStateChangeHandle,
            reloadSuccess: () => {
                this.reloadSuccess();
            },
            enterOfflineMode: () => {
                this.enterOfflineMode();
            },
            reStartSDK: () => {
                this.reStartSDK();
            },
            reconnect_client_timeout: sessionInfo.reconnect_client_timeout,
            sendVoiceEnd: () => {
                this.sendVoiceEnd();
            }
        });
    }
    /**
     * 启动会话
     */
    start() {
        console.log(this.TAG, 'Starting session...');
        this.renderScheduler.render();
        this.ttsa?.start();
        if (this.pendingInvisibleMode) {
            this.pendingInvisibleMode = false;
            this.setInvisibleMode();
        }
        else {
            this.onStatusChange(offline2.AvatarStatus.online);
        }
    }
    /**
     * 重新加载
     */
    async _reload() {
        console.log(this.TAG, 'Reloading...');
        const res = await this.resourceManager._reload();
        if (res) {
            this.ttsa = this.connectTtsa(res);
            // 设置恢复信息回调
        }
        return res;
    }
    /**
     * 重载成功回调
     */
    reloadSuccess() {
        this.onStatusChange(offline2.AvatarStatus.online);
        setTimeout(() => {
            if (this._offlineTimer) {
                clearTimeout(this._offlineTimer);
                this._offlineTimer = null;
            }
        }, 1000);
    }
    /**
     * 处理 TTSA 消息
     */
    handleMessage = (type, data) => {
        if (!this.renderScheduler) {
            console.warn(this.TAG, 'RenderScheduler not initialized');
            return;
        }
        this.renderScheduler.handleData(data, type);
    };
    /**
     * 处理 AA 帧数据
     */
    handleAAFrame = (data) => {
        this.options.onAAFrameHandle?.(data);
    };
    /**
     * 运行起始帧索引
     */
    runStartFrameIndex = (client_time) => {
        if (!this.renderScheduler) {
            console.warn(this.TAG, 'RenderScheduler not initialized');
            return;
        }
        this.renderScheduler.runStartFrameIndex();
    };
    /**
     * TTSA 状态变化处理
     */
    ttsaStateChangeHandle = (state) => {
        if (!this.renderScheduler) {
            console.warn(this.TAG, 'RenderScheduler not initialized');
            return;
        }
        this.renderScheduler.ttsaStateChangeHandle(state);
    };
    /**
     * 停止会话
     */
    async stop() {
        console.log(this.TAG, 'Stopping...');
        await this.renderScheduler?.stop();
    }
    /**
     * 销毁客户端
     */
    async destroyClient() {
        console.log(this.TAG, 'Destroying client...');
        this.destroyed = true;
        this.resetRetryState();
        this.clearAllRetryTimers();
        if (this._offlineTimer) {
            clearTimeout(this._offlineTimer);
            this._offlineTimer = null;
        }
        if (this.ttsa) {
            this.ttsa.close();
            this.ttsa = null;
        }
        if (this.renderScheduler) {
            this.renderScheduler.destroy();
        }
        if (this.resourceManager) {
            this.resourceManager.destroy();
        }
        if (this.debugOverlay) {
            this.debugOverlay.destroy();
            this.debugOverlay = null;
        }
        if (this.networkMonitor) {
            this.networkMonitor.destroy();
        }
        this.canvas = null;
        this.gl = null;
        this.startConnectTime = 0;
        this.connectSuccessTime = 0;
        console.log(this.TAG, "SDK Client 已销毁");
    }
    /**
     * 完全销毁 SDK
     */
    async destroy(stop_reason = "user") {
        console.log(this.TAG, 'Destroying SDK...');
        this.replayData = null;
        this.ttsa?.sendSdkPoint('close_session', {
            reason: stop_reason,
        });
        this.destroyClient();
        const res = await this.resourceManager.stopSession(stop_reason);
        if (res) {
            this.onStatusChange(offline2.AvatarStatus.close);
        }
        return res;
    }
    /**
     * 空闲状态
     */
    idle() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("idle");
        }
        this.ttsa?.idle();
    }
    /**
     * 监听状态
     */
    listen() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("listen");
        }
        this.ttsa?.listen();
    }
    /**
     * 思考状态
     */
    think() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("think");
        }
        this.ttsa?.think();
    }
    /**
     * 交互空闲状态
     */
    interactiveidle() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("interactiveidle");
        }
        this.ttsa?.interactiveidle();
    }
    /**
     * 说话
     */
    speak(ssml, is_start = true, is_end = true, extra = {}) {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("speak");
        }
        this.ttsa?.sendText(ssml, is_start, is_end, extra);
        this.renderScheduler.resume();
    }
    /**
     * 设置音量
     */
    setVolume(volume) {
        this.renderScheduler.setVolume?.(volume);
    }
    /**
     * 获取会话ID
     */
    getSessionId() {
        return this.resourceManager.session_id;
    }
    /**
     * 显示调试信息
     */
    showDebugInfo() {
        this.debugOverlay?.show();
    }
    /**
     * 隐藏调试信息
     */
    hideDebugInfo() {
        this.debugOverlay?.hide();
    }
    /**
     * 更改头像可见性
     */
    changeAvatarVisible(visible) {
        this.avatarCanvasVisible = visible;
        this.renderScheduler?.setAvatarCanvasVisible(visible);
    }
    /**
     * 清理初始化前的资源
     */
    cleanupBeforeInitComplete(reason) {
        console.warn(this.TAG, `清理初始化未完成的资源，原因: ${reason}`);
        if (this.resourceManager) {
            this.resourceManager.stopSession(reason);
        }
        if (this.ttsa) {
            this.ttsa.close();
            this.ttsa = null;
        }
        if (this.renderScheduler) {
            try {
                this.renderScheduler.destroy();
            }
            catch (e) {
                console.warn(this.TAG, '清理 renderScheduler 时出错', e);
            }
        }
        if (this.resourceManager) {
            try {
                this.resourceManager.destroy();
            }
            catch (e) {
                console.warn(this.TAG, '清理 resourceManager 时出错', e);
            }
        }
        if (this.debugOverlay) {
            try {
                this.debugOverlay.destroy();
                this.debugOverlay = null;
            }
            catch (e) {
                console.warn(this.TAG, '清理 debugOverlay 时出错', e);
            }
        }
        this.isInitialized = false;
        this.startConnectTime = 0;
        this.connectSuccessTime = 0;
    }
    /**
     * 离线处理
     */
    offlineHandle() {
        this.onStatusChange(offline2.AvatarStatus.offline);
        this.renderScheduler._offlineMode?.();
        // 使用 setTimeout 替代 setInterval
        const intervalFunc = () => {
            if (this.status !== offline2.AvatarStatus.offline) {
                if (this._offlineTimer) {
                    clearTimeout(this._offlineTimer);
                    this._offlineTimer = null;
                }
                return;
            }
            this.renderScheduler._offlineRun?.();
            // 递归调用实现循环
            this._offlineTimer = setTimeout(intervalFunc, this._offlineInterval);
        };
        this._offlineTimer = setTimeout(intervalFunc, this._offlineInterval);
    }
    /**
     * Socket 会话停止
     */
    stopSessionFromSocket(reason) {
        this.resourceManager.stopSession(reason);
    }
    /**
     * 离线模式
     */
    offlineMode() {
        this.renderScheduler.interrupt?.("in_offline_mode");
        this.resourceManager.stopSession("offline_mode");
        this.ttsa?.close();
        this.offlineHandle();
    }
    /**
     * 在线模式
     */
    onlineMode() {
        if (!this.networkMonitor.isOnlineNow()) {
            return;
        }
        this._reload();
    }
    /**
     * 错误处理
     */
    onMessage(params) {
        // 简化的错误处理
        const error = {
            ...params,
            timestamp: Date.now()
        };
        this.options.onMessage?.(error);
        this.debugOverlay?.addError?.(error);
    }
    /**
     * 状态变更
     */
    onStatusChange(status) {
        this.status = status;
        this.options.onStatusChange?.(status);
    }
    /**
     * 切换隐身模式
     */
    switchInvisibleMode() {
        if (!this.renderScheduler) {
            console.warn(this.TAG, 'RenderScheduler 未初始化，无法切换隐身模式');
            return;
        }
        if (this.status === offline2.AvatarStatus.visible || this.status === offline2.AvatarStatus.online) {
            this.setInvisibleMode();
        }
        else {
            this.ttsa?.exitInvisibleMode?.();
            this.renderScheduler.switchInvisibleMode?.();
            this.listen();
        }
    }
    /**
     * 设置隐身模式
     */
    setInvisibleMode() {
        this.interactiveidle();
        this.renderScheduler.switchInvisibleMode?.();
        this.ttsa?.enterInvisibleMode?.();
        this.onStatusChange(offline2.AvatarStatus.invisible);
    }
    /**
     * 获取隐身模式状态
     */
    getPendingInvisibleMode() {
        return this.pendingInvisibleMode || false;
    }
    /**
     * 获取渲染状态
     */
    getRenderState() {
        if (!this.renderScheduler) {
            return offline2.RenderState.init;
        }
        return this.renderScheduler.getRenderState?.() || offline2.RenderState.init;
    }
    /**
     * 更改布局
     */
    changeLayout(layout) {
        this.ttsa?.changeLayout?.(layout);
        this.renderScheduler.setCharacterCanvasLayout?.(layout);
    }
    /**
     * 更改行走配置
     */
    changeWalkConfig(walkConfig) {
        this.ttsa?.changeWalkConfig?.(walkConfig);
    }
    /**
     * 中断
     */
    interrupt(type) {
        this.renderScheduler.interrupt?.(type);
    }
    /**
     * 触发重连
     */
    triggerReconnect() {
        if (this.isRetrying) {
            console.warn(this.TAG, "正在重连中，跳过本次触发");
            return;
        }
        if (this.reconnectDebounceTimer) {
            clearTimeout(this.reconnectDebounceTimer);
            this.reconnectDebounceTimer = null;
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.reconnectDebounceTimer = setTimeout(() => {
            this.isRetrying = false;
            this.retryCount = 1;
            this.retryRound = 1;
            this.reStartSession();
            this.reconnectDebounceTimer = null;
        }, 100);
    }
    /**
     * 重新开始会话
     */
    reStartSession() {
        if (this.isRetrying || this.retryRound > this.maxRetryRound)
            return;
        this.clearAllRetryTimers();
        this.isStartRetry = true;
        this.isRetrying = true;
        this._retryImpl();
    }
    /**
     * 重试实现
     */
    async _retryImpl() {
        if (this.retryRound > this.maxRetryRound || !this.isRetrying) {
            return;
        }
        let delay = 1000;
        if (this.retryCount > 1) {
            delay = Math.pow(2, this.retryCount) * 1000;
        }
        setTimeout(async () => {
            try {
                const result = await this._reload();
                if (result === null) {
                    if (this.retryCount >= this.maxRetryCount) {
                        if (this.retryRound >= this.maxRetryRound) {
                            console.warn(this.TAG, `重试达最大轮次(${this.maxRetryRound})+每轮最大次数(${this.maxRetryCount})，总次数=${this.maxRetryRound * this.maxRetryCount}，停止重试`);
                            this.resetRetryState();
                            return;
                        }
                        else {
                            console.warn(this.TAG, `第${this.retryRound}轮重试次数达上限(${this.maxRetryCount})，进入第${this.retryRound + 1}轮重试`);
                            this.retryCount = 1;
                            this.retryRound += 1;
                        }
                    }
                    else {
                        this.retryCount += 1;
                    }
                    this._retryImpl();
                }
                else {
                    this.renderScheduler.stopAudio?.(-1);
                    console.log(this.TAG, `第${this.retryRound}轮第${this.retryCount}次重试成功，停止重试`);
                    this.resetRetryState();
                }
            }
            catch (error) {
                console.error(this.TAG, "重试过程异常", error);
                if (this.retryCount >= this.maxRetryCount) {
                    if (this.retryRound >= this.maxRetryRound) {
                        console.warn(this.TAG, `重试异常且达总次数上限(${this.maxRetryRound * this.maxRetryCount})，停止重试`);
                        this.resetRetryState();
                        return;
                    }
                    else {
                        this.retryCount = 1;
                        this.retryRound += 1;
                    }
                }
                else {
                    this.retryCount += 1;
                }
                if (this.retryRound <= this.maxRetryRound && this.isRetrying) {
                    this._retryImpl();
                }
                else {
                    this.resetRetryState();
                }
            }
        }, delay);
    }
    /**
     * 清除所有重试定时器
     */
    clearAllRetryTimers() {
        if (this.reconnectDebounceTimer) {
            clearTimeout(this.reconnectDebounceTimer);
            this.reconnectDebounceTimer = null;
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }
    /**
     * 重置重试状态
     */
    resetRetryState() {
        this.isRetrying = false;
        this.isStartRetry = false;
        this.retryCount = 1;
        this.retryRound = 1;
    }
}

exports.XmovAvatarMP = XmovAvatarMP;
exports.createImage = createImage;
exports.createWebGLContext = createWebGLContext;
exports.getCanvasNode = getCanvasNode;
exports.setCanvasSize = setCanvasSize;
//# sourceMappingURL=xmov-avatar-mp.heavy.core.js.map

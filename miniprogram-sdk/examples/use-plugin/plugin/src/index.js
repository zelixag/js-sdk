import { AvatarStatus, RenderState, InitModel } from "./types/index";
import { EErrorCode } from "./types/error";
import RenderScheduler from "./control/RenderScheduler";
import ResourceManager from "./modules/ResourceManager";
import WidgetDefaultRender from "./modules/TrackRenderer/render-implements";
import Ttsa from "./control/ttsa";
import { DebugOverlay } from "./view/DebugOverlay";
import NetworkMonitor from './modules/network';
import Errors from './modules/error-handle';
import { performanceConstant } from "./utils/perfermance";
import './utils/logger.js';
import { IBRAnimationGeneratorCharInfo_NN, unpackIBRAnimation, formatMJT } from './utils/DataInterface';
import { getVertices, getWavefrontObjFromVertices, getPCATextures } from './utils/GLPipelineDebugTools';
import { GLDevice } from './utils/GLDevice';
import { GLPipeline } from './utils/GLPipeline';
import { isSupportMES } from "./utils";
class XmovAvatar {
    constructor(options) {
        this.TAG = "[XMOV AVATAR]";
        this.el = null;
        // 实例状态，每个 XmovAvatar 实例都有自己独立的状态
        this.status = -1;
        this.ttsa = null;
        this.debugOverlay = null;
        this._offlineTimer = -1;
        this._offlineInterval = 300;
        this._env = "production";
        // 可以与隐身模式做联动，
        this.avatarCanvasVisible = true; // 数字人canvas显隐状态，默认为true
        this.pendingInvisibleMode = false; // 待处理的隐身模式（在init时设置，在start时应用）
        this.isInitialized = false; // 初始化是否完成（progress === 100）
        // public onError: (error: SDKError) => void = (error) => {};
        this.onStateChange = () => { };
        // public onClose: () => void = () => {};
        // private stream: MediaStream | null = null;
        this.onDownloadProgress = null;
        this.replayData = null;
        this.startConnectTime = 0;
        this.connectSuccessTime = 0;
        this.enableClientInterrupt = false; // 是否开启客户端打断
        this.retryCount = 1;
        this.retryTimer = -1;
        this.maxRetryCount = 9;
        this.retryRound = 1; // 重试轮次
        this.maxRetryRound = 3; // 最大轮次
        this.isRetrying = false; // 重试中锁，避免并发调用
        this.isStartRetry = false;
        this.destroyed = false;
        this.reconnectDebounceTimer = -1; // 重连防抖定时器
        this.handleBeforeUnload = () => {
            this.destroy("beforeunload");
        };
        window.avatarSDKLogger.setEnabled(options.enableLogger);
        this.options = options;
        this._env = options.env || "production";
        this.enableClientInterrupt = options.enableClientInterrupt || false;
        this.initializeSDK(options);
        this.boundVisibilityChange = this.visibilitychange.bind(this);
        this.networkMonitor = new NetworkMonitor({
            offlineCallback: (message) => {
                this.onMessage({
                    code: EErrorCode.NETWORK_DOWN,
                    message: message || '网络断开',
                });
                console.log('网络断开（network off）', message);
                // 如果初始化未完成（progress < 100），清除所有已初始化的资源并断开连接
                if (!this.isInitialized) {
                    window.avatarSDKLogger.warn(this.TAG, '初始化未完成时断网，清除所有资源并断开连接');
                    this.cleanupBeforeInitComplete("network_offline_before_init");
                    return;
                }
                if (this.status !== AvatarStatus.offline) {
                    // 无网断开则进入离线模式
                    this.offlineHandle();
                }
            },
            onlineCallback: (message) => {
                this.onMessage({
                    code: EErrorCode.NETWORK_UP,
                    message: message || '网络恢复',
                });
                // 如果初始化未完成（progress < 100），清除所有已初始化的资源并断开连接
                if (!this.isInitialized) {
                    window.avatarSDKLogger.warn(this.TAG, '网络恢复但初始化未完成，清除所有资源并断开连接');
                    this.cleanupBeforeInitComplete("network_online_before_init");
                    return;
                }
                // 网络恢复时，取消WebSocket的reconnectTimer，避免与网络恢复的重连逻辑冲突
                this.ttsa?.clearReconnectTimer();
                if (this.isStartRetry) {
                    this.triggerReconnect();
                }
                // this.onStatusChange(AvatarStatus.network_on)
                // this._reload()
                // this.ttsa?.connect()
            },
            // retryCallback: (count: number) => {
            //   this.onMessage({
            //     code: EErrorCode.NETWORK_RETRY,
            //     message: '网络重试中',
            //   });
            //   this.ttsa?.connect();
            // return this.resourceManager._startSession();
            // },
        });
    }
    getStatus() {
        return this.status;
    }
    getTag() {
        return this.options.tag;
    }
    get businessENV() {
        return this._env;
    }
    getUniqueSpeakId() {
        return this.ttsa?.getUniqueSpeakId() || `0-${this.getSessionId()}`;
    }
    async initializeSDK(options) {
        if (!navigator.onLine) {
            this.onMessage({
                code: EErrorCode.NETWORK_BREAK,
                message: '没有网络，请联网后重试',
            });
            return;
        }
        const { containerId, appId, appSecret, gatewayServer, cacheServer, config } = options;
        const _config = { ...(config || {}), raw_audio: !isSupportMES() };
        const el = document.querySelector(containerId);
        if (!el) {
            this.onMessage({
                code: EErrorCode.CONTAINER_NOT_FOUND,
                message: `containerId: ${containerId} 不存在`,
            });
            return;
        }
        this.el = el;
        const bgContainer = document.createElement("div");
        bgContainer.setAttribute("id", "avatar-bg-container");
        bgContainer.setAttribute("style", "position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;opacity:0;");
        this.el.appendChild(bgContainer);
        const style = this.el.getAttribute("style");
        if (style) {
            this.el.setAttribute("style", `position:relative;overflow:hidden;${style}`);
        }
        else {
            this.el.setAttribute("style", `position:relative;overflow:hidden;`);
        }
        this.resourceManager = new ResourceManager({
            sdkInstance: this,
            headers: options.headers,
            appId,
            appSecret,
            gatewayServer,
            cacheServer,
            config: _config,
            onNetworkInfo(networkInfo) {
                options.onNetworkInfo?.(networkInfo);
            },
            onStartSessionWarning: (message) => {
                this.options.onStartSessionWarning?.(message);
            },
        });
        this.renderScheduler = new RenderScheduler({
            sdkInstance: this,
            container: this.el,
            resourceManager: this.resourceManager,
            enableDebugger: options.enableDebugger,
            hardwareAcceleration: options.hardwareAcceleration || "default",
            enableClientInterrupt: this.enableClientInterrupt,
            onDownloadProgress: (progress) => {
                this.onDownloadProgress?.(progress);
                this.el?.setAttribute("style", this.el?.style.cssText + `opacity:${progress === 100 ? '1' : '0'};`);
                // 标记初始化完成
                this.isInitialized = progress === 100;
            },
            onStateChange: (state) => {
                if ((this.getStatus() === AvatarStatus.offline && state !== 'idle') || state === "") {
                    return;
                }
                options.onStateChange?.(state);
            },
            onRenderChange: (state, oldState) => {
                options.onRenderChange?.(state);
                // 在如果数字人在恢复渲染态一会和数字人在线态的时候，数字人进入渲染中了，都应该认为是可见状态
                if (state === RenderState.rendering && (oldState === RenderState.resumed || this.getStatus() === AvatarStatus.online)) {
                    window.avatarSDKLogger.log(this.TAG, 'Status:===== 渲染中，状态: rendering', this.getSessionId());
                    this.onStatusChange(AvatarStatus.visible);
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
        options.onStateRenderChange && window.performanceTracker.setOnStateRenderChange(options.onStateRenderChange);
        WidgetDefaultRender.CUSTOM_WIDGET = options.onWidgetEvent;
        WidgetDefaultRender.PROXY_WIDGET = options.proxyWidget || {};
    }
    // async preCache() {
    //   return this.resourceManager.preCache(this.options.appId, this.options.appSecret);
    // }
    renderFrameCallback(frame) {
        // 间隔24帧执行一次
        if (!this.ttsa?.getStatus() && ![AvatarStatus.offline, AvatarStatus.network_off].includes(this.status) && frame % 24 === 0) {
            this.offlineHandle();
        }
    }
    async init(params) {
        this.destroyed = false;
        this.isInitialized = false; // 重置初始化状态
        this.startConnectTime = Date.now();
        const { onDownloadProgress, initModel } = params;
        this.onDownloadProgress = onDownloadProgress;
        // 如果初始化时指定了隐身模式，先标记待处理，等start时再真正应用
        if (initModel === InitModel.invisible) {
            this.pendingInvisibleMode = true;
        }
        // 加载资源
        window.performanceTracker.markStart(performanceConstant.load_resource);
        window.performanceTracker.markStart(performanceConstant.first_avatar_render);
        window.performanceTracker.markStart(performanceConstant.first_webgl_render);
        const sessionInfo = await this.resourceManager.load(onDownloadProgress);
        if (!sessionInfo?.socket_io_url || !sessionInfo?.token) {
            window.avatarSDKLogger.error(this.TAG, "init error, socket_io_url or token is empty reload");
            return;
        }
        ;
        this.connectSuccessTime = Date.now();
        window.performanceTracker.markEnd(performanceConstant.load_resource);
        this.debugOverlay = new DebugOverlay(this, sessionInfo);
        this.ttsa = this.connectTtsa(sessionInfo);
        this.renderScheduler.init();
        // 同步初始canvas显隐状态
        this.renderScheduler.setAvatarCanvasVisible(this.avatarCanvasVisible);
        // 设置上报使用ttsa
        window.performanceTracker.setReportFunc(this.ttsa);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        document.addEventListener('visibilitychange', this.boundVisibilityChange);
    }
    visibilitychange() {
        if (document.hidden) {
            // this.offlineMode()
            // tab 回来时，强制同步解帧队列
            // this.renderScheduler.forceSyncDecoder();
        }
        else {
            if (this.ttsa?.getStatus()) {
                this.renderScheduler.forceSyncDecoder();
            }
        }
    }
    setReplayData(data) {
        this.replayData = data;
    }
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
                window.avatarSDKLogger.log(this.TAG, `[handleReplaySend] 未知事件类型: ${frameReplayData}`);
            }
        }
    }
    // 初始化 ttsa
    connectTtsa(sessionInfo) {
        window.performanceTracker.markStart(performanceConstant.ttsa_connect);
        window.performanceTracker.markStart(performanceConstant.ttsa_ready);
        return new Ttsa({
            sdkInstance: this,
            url: sessionInfo.socket_io_url,
            room: sessionInfo.room,
            session_id: sessionInfo.session_id,
            token: sessionInfo.token,
            framedata_proto_version: this.resourceManager.getConfig().framedata_proto_version,
            reconnect_client_timeout: sessionInfo?.reconnect_client_timeout || 0,
            appInfo: {
                ...this.resourceManager.getAppInfo(),
                env: this._env
            },
            onReady: () => {
                this.ttsa?.sendSdkPoint('connect_sdk', {
                    timestamp: this.startConnectTime,
                });
                this.ttsa?.sendSdkPoint('connect_sdk_success', {
                    timestamp: this.connectSuccessTime,
                });
                this.start();
            },
            handleMessage: (type, data) => {
                // 处理下行数据
                this.renderScheduler.handleData(data, type);
            },
            handleAAFrame: (data) => {
                this.options.onAAFrameHandle?.(data);
            },
            runStartFrameIndex: (client_time) => {
                this.renderScheduler.runStartFrameIndex();
            },
            ttsaStateChangeHandle: (state) => {
                this.renderScheduler.ttsaStateChangeHandle(state);
            },
            reloadSuccess: () => {
                this.reloadSuccess();
            },
            enterOfflineMode: () => {
                this.offlineHandle();
            },
            reStartSDK: () => {
                this.reStartSession();
            },
            sendVoiceEnd: () => {
                this.renderScheduler?.sendVoiceEnd();
            }
        });
    }
    start() {
        this.renderScheduler.render();
        this.ttsa?.start();
        // 如果初始化时设置了隐身模式，则立即进入隐身状态
        if (this.pendingInvisibleMode) {
            this.pendingInvisibleMode = false;
            this.setInvisibleMode();
        }
        else {
            this.onStatusChange(AvatarStatus.online);
        }
    }
    async _reload() {
        const res = await this.resourceManager._reload();
        if (res) {
            this.ttsa = this.connectTtsa(res);
            this.ttsa._setResumeInfoCallback(this.resourceManager._getSessionId(), this.renderScheduler._getResumeInfo.bind(this.renderScheduler));
        }
        return res;
    }
    reloadSuccess() {
        this.onStatusChange(AvatarStatus.online);
        setTimeout(() => {
            window.clearInterval(this._offlineTimer);
        }, 1000);
    }
    async stop() {
        await this.renderScheduler.stop();
    }
    isDestroyed() {
        return this.destroyed;
    }
    async destroyClient() {
        this.destroyed = true;
        this.resetRetryState();
        // 清理重试定时器
        this.clearAllRetryTimers();
        // 清理离线模式定时器
        if (this._offlineTimer !== -1) {
            clearInterval(this._offlineTimer);
            this._offlineTimer = -1;
        }
        // 停止TTSA连接
        if (this.ttsa) {
            this.ttsa.close();
            this.ttsa = null;
        }
        // 停止渲染调度器
        if (this.renderScheduler) {
            this.renderScheduler.destroy();
        }
        // 清理资源管理器（包括缓存）
        if (this.resourceManager) {
            this.resourceManager.destroy();
        }
        // 清理调试浮层
        if (this.debugOverlay) {
            this.debugOverlay.destroy();
            this.debugOverlay = null;
        }
        // 主动断开需要销毁网络监听相关事件
        if (this.networkMonitor) {
            this.networkMonitor.destroy();
        }
        // 清理DOM元素
        this.el = null;
        this.startConnectTime = 0;
        this.connectSuccessTime = 0;
        window.removeEventListener("beforeunload", this.handleBeforeUnload);
        document.removeEventListener("visibilitychange", this.boundVisibilityChange);
        window.avatarSDKLogger.log(this.TAG, "SDK 已销毁");
    }
    async destroy(stop_reason = "user") {
        this.replayData = null;
        this.ttsa?.sendSdkPoint('close_session', {
            reason: stop_reason,
        });
        this.destroyClient();
        const res = await this.resourceManager.stopSession(stop_reason);
        if (res) {
            this.onStatusChange(AvatarStatus.close);
        }
        return res;
    }
    idle() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("idle");
        }
        this.ttsa?.idle();
    }
    listen() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("listen");
        }
        this.ttsa?.listen();
    }
    think() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("think");
        }
        this.ttsa?.think();
    }
    interactiveidle() {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("interactiveidle");
        }
        this.ttsa?.interactiveidle();
    }
    speak(ssml, is_start = true, is_end = true, extra = {}) {
        if (this.enableClientInterrupt) {
            this.renderScheduler.interrupt("speak");
        }
        this.ttsa?.sendText(ssml, is_start, is_end, extra);
        this.renderScheduler.resume();
    }
    /**
       * 通知后端进入隐身模式
       */
    notifyEnterInvisibleMode() {
        this.ttsa?.enterInvisibleMode();
    }
    /**
     * 通知后端退出隐身模式
     */
    notifyExitInvisibleMode() {
        this.ttsa?.exitInvisibleMode();
    }
    setVolume(volume) {
        this.renderScheduler.setVolume(volume);
    }
    getSessionId() {
        return this.resourceManager.session_id;
    }
    // 显示调试浮层
    showDebugInfo() {
        if (!this.debugOverlay) {
            return;
        }
        this.debugOverlay?.show();
    }
    // 隐藏调试浮层
    hideDebugInfo() {
        this.debugOverlay?.hide();
    }
    // 改变数字人canvas的显隐状态
    changeAvatarVisible(visible) {
        this.avatarCanvasVisible = visible;
        this.renderScheduler?.setAvatarCanvasVisible(visible);
    }
    /**
     * 在初始化未完成时清理所有已初始化的资源
     * @param reason 清理原因
     */
    cleanupBeforeInitComplete(reason) {
        window.avatarSDKLogger.warn(this.TAG, `清理初始化未完成的资源，原因: ${reason}`);
        // 1. 停止会话
        if (this.resourceManager) {
            this.resourceManager.stopSession(reason);
        }
        // 2. 断开 WebSocket 连接
        if (this.ttsa) {
            this.ttsa.close();
            this.ttsa = null;
        }
        // 3. 清理渲染调度器（如果已初始化）
        if (this.renderScheduler) {
            try {
                this.renderScheduler.destroy();
            }
            catch (e) {
                window.avatarSDKLogger.warn(this.TAG, '清理 renderScheduler 时出错', e);
            }
        }
        // 4. 清理资源管理器（如果已初始化）
        if (this.resourceManager) {
            try {
                this.resourceManager.destroy();
            }
            catch (e) {
                window.avatarSDKLogger.warn(this.TAG, '清理 resourceManager 时出错', e);
            }
        }
        // 5. 清理调试浮层（如果已创建）
        if (this.debugOverlay) {
            try {
                this.debugOverlay.destroy();
                this.debugOverlay = null;
            }
            catch (e) {
                window.avatarSDKLogger.warn(this.TAG, '清理 debugOverlay 时出错', e);
            }
        }
        // 6. 重置状态
        this.isInitialized = false;
        this.startConnectTime = 0;
        this.connectSuccessTime = 0;
    }
    offlineHandle() {
        this.onStatusChange(AvatarStatus.offline);
        this.renderScheduler._offlineMode();
        this._offlineTimer = window.setInterval(() => {
            if (this.status !== AvatarStatus.offline) {
                clearInterval(this._offlineTimer);
                this._offlineTimer = -1;
                return;
            }
            this.renderScheduler._offlineRun();
        }, this._offlineInterval);
    }
    stopSessionFromSocket(reason) {
        this.resourceManager.stopSession(reason);
    }
    offlineMode() {
        // this.networkMonitor.setState(false)
        this.renderScheduler.interrupt("in_offline_mode");
        this.resourceManager.stopSession("offline_mode");
        this.ttsa?.close();
        this.offlineHandle();
    }
    onlineMode() {
        if (!NetworkMonitor.ONLINE) {
            return;
        }
        // this.networkMonitor.setState(true)
        this._reload();
    }
    onMessage(params) {
        const e = Errors(params);
        if (params.code !== EErrorCode.RENDER_BODY_ERROR && params.code !== EErrorCode.RENDER_FACE_ERROR && params.code !== EErrorCode.BODY_DATA_EXPIRED) {
            this.options.onMessage(e);
        }
        this.debugOverlay?.addError(e);
    }
    onStatusChange(status) {
        this.status = status;
        this.options.onStatusChange?.(status);
    }
    /**
     * 切换隐身模式（暂停/恢复音视频实时渲染）
     */
    switchInvisibleMode() {
        if (!this.renderScheduler) {
            window.avatarSDKLogger?.warn(this.TAG, 'RenderScheduler 未初始化，无法切换隐身模式');
            return;
        }
        // 如果当前数字人状态是在线 或者 visible，切换到暂停时
        if (this.status === AvatarStatus.visible || this.status === AvatarStatus.online) {
            this.setInvisibleMode();
        }
        else {
            this.notifyExitInvisibleMode();
            this.renderScheduler.switchInvisibleMode();
            this.listen();
        }
    }
    setInvisibleMode() {
        // 先调用 interactiveidle()
        this.interactiveidle();
        this.renderScheduler.switchInvisibleMode();
        this.notifyEnterInvisibleMode();
        this.onStatusChange(AvatarStatus.invisible);
    }
    getPendingInvisibleMode() {
        return this.pendingInvisibleMode || false;
    }
    /**
     * 获取当前渲染状态
     */
    getRenderState() {
        if (!this.renderScheduler) {
            return RenderState.init;
        }
        return this.renderScheduler.getRenderState();
    }
    changeLayout(layout) {
        this.ttsa?.changeLayout(layout);
        this.renderScheduler.setCharacterCanvasLayout(layout);
    }
    changeWalkConfig(walkConfig) {
        this.ttsa?.changeWalkConfig(walkConfig);
    }
    interrupt(type) {
        this.renderScheduler.interrupt(type);
    }
    triggerReconnect() {
        // 如果已经在重连中，直接返回，避免重复触发
        if (this.isRetrying) {
            window.avatarSDKLogger.warn(this.TAG, "正在重连中，跳过本次触发");
            return;
        }
        if (this.reconnectDebounceTimer !== -1) {
            clearTimeout(this.reconnectDebounceTimer);
            this.reconnectDebounceTimer = -1;
        }
        if (this.retryTimer !== -1) {
            clearTimeout(this.retryTimer);
            this.retryTimer = -1;
        }
        this.reconnectDebounceTimer = window.setTimeout(() => {
            this.isRetrying = false;
            this.retryCount = 1;
            this.retryRound = 1;
            this.reStartSession();
            this.reconnectDebounceTimer = -1;
        }, 100);
    }
    reStartSession() {
        if (this.isRetrying || this.retryRound > this.maxRetryRound)
            return;
        this.clearAllRetryTimers();
        // 标记重试状态
        this.isStartRetry = true;
        this.isRetrying = true;
        // 使用非递归方式实现重试逻辑
        this._retryImpl();
    }
    async _retryImpl() {
        if (this.retryRound > this.maxRetryRound || !this.isRetrying) {
            return;
        }
        let delay = 1000;
        if (this.retryCount > 1) {
            delay = Math.pow(2, this.retryCount) * 1000;
        }
        // 使用setTimeout代替递归，避免调用栈溢出
        setTimeout(async () => {
            try {
                const result = await this._reload();
                if (result === null) {
                    // 重试失败：判断本轮是否达上限
                    if (this.retryCount >= this.maxRetryCount) {
                        // 本轮次数用尽，判断是否达最大轮次
                        if (this.retryRound >= this.maxRetryRound) {
                            // 总次数用尽（3*9=27次），停止重试
                            window.avatarSDKLogger.warn(this.TAG, `重试达最大轮次(${this.maxRetryRound})+每轮最大次数(${this.maxRetryCount})，总次数=${this.maxRetryRound * this.maxRetryCount}，停止重试`);
                            this.resetRetryState(); // 完全重置状态
                            return;
                        }
                        else {
                            // 未达最大轮次：重置本轮计数，轮次+1
                            window.avatarSDKLogger.warn(this.TAG, `第${this.retryRound}轮重试次数达上限(${this.maxRetryCount})，进入第${this.retryRound + 1}轮重试`);
                            this.retryCount = 1; // 重置本轮计数
                            this.retryRound += 1; // 轮次+1
                        }
                    }
                    else {
                        // 本轮未达上限：计数+1
                        this.retryCount += 1;
                    }
                    // 继续重试
                    this._retryImpl();
                }
                else {
                    // 重试成功：完全重置所有状态
                    this.renderScheduler.stopAudio(-1);
                    window.avatarSDKLogger.log(this.TAG, `第${this.retryRound}轮第${this.retryCount}次重试成功，停止重试`);
                    this.resetRetryState();
                }
            }
            catch (error) {
                // 异常处理：逻辑同失败场景
                window.avatarSDKLogger.error(this.TAG, "重试过程异常", error);
                if (this.retryCount >= this.maxRetryCount) {
                    if (this.retryRound >= this.maxRetryRound) {
                        window.avatarSDKLogger.warn(this.TAG, `重试异常且达总次数上限(${this.maxRetryRound * this.maxRetryCount})，停止重试`);
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
                // 仅当未达最大轮次时，继续重试
                if (this.retryRound <= this.maxRetryRound && this.isRetrying) {
                    this._retryImpl();
                }
                else {
                    this.resetRetryState();
                }
            }
        }, delay);
    }
    clearAllRetryTimers() {
        // 清理重连防抖定时器
        if (this.reconnectDebounceTimer !== -1) {
            clearTimeout(this.reconnectDebounceTimer);
            this.reconnectDebounceTimer = -1;
        }
        // 清理重试定时器
        if (this.retryTimer !== -1) {
            clearTimeout(this.retryTimer);
            this.retryTimer = -1;
        }
    }
    // 统一重置重试状态
    resetRetryState() {
        this.isRetrying = false;
        this.isStartRetry = false;
        this.retryCount = 1; // 重置每轮计数
        this.retryRound = 1; // 重置轮次（关键）
    }
}
XmovAvatar.IBRAnimationGeneratorCharInfo_NN = IBRAnimationGeneratorCharInfo_NN;
XmovAvatar.unpackIBRAnimation = unpackIBRAnimation;
XmovAvatar.formatMJT = formatMJT;
XmovAvatar.getVertices = getVertices;
XmovAvatar.getPCATextures = getPCATextures;
XmovAvatar.getWavefrontObjFromVertices = getWavefrontObjFromVertices;
XmovAvatar.GLDevice = GLDevice;
XmovAvatar.GLPipeline = GLPipeline;
export default XmovAvatar;

'use strict';

var vendor = require('./xmov-avatar-mp.heavy.vendor.js');
var offline2 = require('./xmov-avatar-mp.heavy.offline2.js');

class CacheManager {
    cacheServer;
    constructor(cacheServer) {
        this.cacheServer = cacheServer;
    }
    // preCache(appId: string, appSecret: string): Promise<void> {
    //   return fetch(`${this.cacheServer}/precache?appId=${appId}&appSecret=${appSecret}`).then(res => res.json())
    // }
    getVideo(url) {
        return `${this.cacheServer}/get_video?url=${encodeURIComponent(url)}`;
    }
}

class ResourceManager {
    TAG = "[ResourceManager]";
    options;
    sdk;
    session_id;
    mouthShapeLib;
    offlineIdle = [];
    offlineCache = new Map();
    networkInfos = [];
    bg = null;
    resource_pack;
    progress = 0; // start session 以后之后资源下载进度
    config;
    // 视频缓存相关
    videoCache = new Map();
    maxCacheSize = 10 * 1024 * 1024; // 5MB 默认缓存大小
    maxCacheEntries = 20; // 最大缓存条目数
    cacheCleanupInterval = null;
    isProcessingVideo = false; // 防止在视频处理过程中清理缓存
    cacheServer;
    // 新增：正在下载的视频跟踪
    downloadingVideos = new Map();
    first_load = true;
    constructor(options) {
        this.options = options;
        this.sdk = options.sdkInstance;
        this.mouthShapeLib = {
            char_info: null,
        };
        this.config = options.config || {};
        this.resource_pack = {
            body_data_dir: "",
            face_ani_char_data: "",
            face_ani_preload_data: "",
            interpolate_joints: [[4, 3]]
        };
        if (options.cacheServer) {
            this.cacheServer = new CacheManager(options.cacheServer);
        }
        // 启动缓存清理定时器
        this.startCacheCleanup();
    }
    getAppInfo() {
        return {
            appId: this.options.appId,
            appSecret: this.options.appSecret,
        };
    }
    // preCache(appId: string, appSecret: string) {
    //   if (this.cacheServer) {
    //     return this.cacheServer.preCache(appId, appSecret)
    //   }
    //   return Promise.reject('缓存服务器未配置')
    // }
    /**
     * 加载背景图片
     * @returns Promise<void>
     */
    getBackgroundImage() {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                // 设置跨域属性
                img.crossOrigin = "anonymous";
                img.src = this.config?.background_img || "";
                if (!this.config?.background_img)
                    return;
                img.onload = () => {
                    this.bg = img;
                    resolve();
                };
                img.onerror = (error) => {
                    this.sdk.onMessage({
                        code: offline2.EErrorCode.BACKGROUND_IMAGE_LOAD_ERROR,
                        message: `Error: 背景图片加载失败`,
                        e: JSON.stringify({ error, img }),
                    });
                    this.bg = null;
                    resolve();
                };
            }
            catch (error) {
            }
        });
    }
    /**
     * 获取背景图片
     * @returns HTMLImageElement | null
     */
    getBackgroundImageElement() {
        return this.bg;
    }
    getConfig() {
        return this.config;
    }
    async load(onDownloadProgress) {
        onDownloadProgress?.(this.progress);
        // http 请求算 10 进度
        const result = await this.startSession();
        if (!result) {
            // 接口请求失败时已经提示了错误，这里不需要再提示
            // this.sdk.onMessage({
            //   code: EErrorCode.START_SESSION_ERROR,
            //   message: `${this.TAG} Error: startSession请求失败`,
            //   e: JSON.stringify({ error: 'startSession请求失败' }),
            // });
            return null;
        }
        this.progress += 10;
        onDownloadProgress?.(this.progress);
        const res = result;
        this.session_id = res?.session_id;
        this.resource_pack = res.resource_pack;
        this.config = res.config;
        this.offlineIdle = res.resource_pack?.offline_idle || [];
        this._setOfflineCache();
        if (this.resource_pack) {
            await this.loadMouthShapeLib(onDownloadProgress);
            this.getBackgroundImage();
        }
        return res;
    }
    async startSession() {
        try {
            const result = await this._startSession();
            if (result?.verify_res) {
                this.options.onStartSessionWarning?.(result.verify_res);
            }
            return result;
        }
        catch (error) {
            return null;
        }
    }
    _startSession() {
        if (!navigator.onLine) {
            this.sdk.onMessage({
                code: offline2.EErrorCode.NETWORK_BREAK,
                message: '没有网络，请联网后重试~',
            });
            return null;
        }
        const url = `${this.options.gatewayServer}`;
        // 如果用户传入特定房间tag则透传给后端
        const tagObj = this.sdk.getTag() ? { tag: this.sdk.getTag() } : {};
        const data = {
            ...tagObj,
            config: {
                ...this.config,
                framedata_proto_version: 2
            }
        };
        const { headers, data: signedData } = offline2.headersNeedSign(this.options.appId, this.options.appSecret, "POST", url, data);
        return offline2.request(url, { method: "POST", data: signedData, headers: { ...headers, ...this.options.headers } })
            .then(response => response.json())
            .then(res => {
            if (!res?.data?.resource_pack) {
                this.sdk.onMessage({
                    code: res?.error_code,
                    message: `Error: ${res?.error_code}, ${res?.error_reason}`,
                });
                return null;
            }
            return res?.data;
        });
    }
    async stopSession(stop_reason) {
        try {
            const url = `${this.options.gatewayServer}`;
            if (!this.session_id) {
                return;
            }
            const data = {
                session_id: this.session_id,
                stop_reason,
            };
            const { headers, data: signedData } = offline2.headersNeedSign(this.options.appId, this.options.appSecret, "DELETE", url, data);
            const response = await offline2.request(url, { method: "DELETE", data: signedData, headers: { ...headers, ...this.options.headers } });
            return await response.json();
        }
        catch (error) {
            this.sdk.onMessage({
                code: offline2.EErrorCode.STOP_SESSION_ERROR,
                message: `Error: 停止会话失败`,
                e: JSON.stringify({ error }),
            });
        }
    }
    /**
     * 加载表情数据
     */
    async loadMouthShapeLib(onDownloadProgress) {
        try {
            if (!this.resource_pack.face_ani_char_data) {
                this.progress += 60;
                onDownloadProgress?.(this.progress);
                return;
            }
            // 优先加载 .gz，失败则回退 bin
            let char_data = null;
            let gzError = null;
            try {
                // 先尝试加载 .gz
                const gzUrl = `${this.resource_pack.face_ani_char_data}.gz`;
                const [, gz_data] = await offline2.XMLRequest({
                    url: gzUrl,
                    onProgress: (progress) => {
                        onDownloadProgress?.(this.progress + progress * 0.3);
                    },
                });
                try {
                    // pako 解压
                    const decompressed = vendor.pako.ungzip(new Uint8Array(gz_data));
                    // 兼容性处理，确保为ArrayBuffer
                    if (decompressed instanceof Uint8Array) {
                        // slice 可能返回 SharedArrayBuffer，这里用拷贝确保是 ArrayBuffer
                        const ab = new ArrayBuffer(decompressed.byteLength);
                        new Uint8Array(ab).set(decompressed);
                        char_data = ab;
                    }
                    else {
                        char_data = decompressed;
                    }
                }
                catch (e) {
                    gzError = e;
                    char_data = null;
                }
            }
            catch (e) {
                gzError = e;
                char_data = null;
            }
            if (!char_data) {
                // .gz 获取或解压失败，回退 bin
                try {
                    const [, bin_data] = await offline2.XMLRequest({
                        url: this.resource_pack.face_ani_char_data,
                        // url: "https://media.youyan.xyz/youling-lite-sdk/example_char_data.bin",
                        onProgress: (progress) => {
                            onDownloadProgress?.(this.progress + progress * 0.3);
                        },
                    });
                    char_data = bin_data;
                }
                catch (e) {
                    if (this.first_load) {
                        this.first_load = false;
                        this.stopSession("char_bin_load_error");
                    }
                    this.sdk.onMessage({
                        code: offline2.EErrorCode.FACE_BIN_LOAD_ERROR,
                        message: `Error: 表情数据加载失败 (.gz和bin都失败)`,
                        e: JSON.stringify({ gzError, binError: e }),
                    });
                    return;
                }
            }
            const char_info = new offline2.IBRAnimationGeneratorCharInfo_NN(char_data, {
                blendshapeMap: this.resource_pack?.blendshape_map || [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235], [], [], []],
            });
            this.progress += 60;
            this.mouthShapeLib = { char_info };
        }
        catch (error) {
            if (this.first_load) {
                this.first_load = false;
                this.stopSession("char_bin_load_error");
            }
            this.sdk.onMessage({
                code: offline2.EErrorCode.FACE_BIN_LOAD_ERROR,
                message: `Error: 表情数据加载失败，请检查charbin文件内容是否正确`,
                e: JSON.stringify({ error }),
            });
        }
    }
    getMouthShapeLib() {
        return this.mouthShapeLib;
    }
    getVideoUrl(name) {
        if (!this.resource_pack.body_data_dir) {
            return "";
        }
        if (!name) {
            if (this.first_load) {
                this.first_load = false;
                this.stopSession("no_video_name_error");
            }
            this.sdk.onMessage({
                code: offline2.EErrorCode.INVALID_BODY_NAME,
                message: `Error: 视频地址获取失败`,
                e: JSON.stringify({ name }),
            });
            return "";
        }
        const url = `${this.resource_pack.body_data_dir}${name}.mp4`;
        if (this.cacheServer) {
            return this.cacheServer?.getVideo(url);
        }
        return url;
    }
    /**
     * 预加载视频
     * @param name 视频名称
     * @returns Promise<ArrayBuffer>
     */
    async preloadVideo(name) {
        if (this.videoCache.has(name))
            return;
        return this.loadVideo(name);
    }
    /**
     * 加载视频
     * @param name 视频名称
     * @returns Promise<ArrayBuffer>
     */
    async loadVideo(name) {
        // 检查缓存
        const cacheEntry = this.videoCache.get(name) || this.offlineCache.get(name);
        if (cacheEntry) {
            if (cacheEntry.data) {
                this.updateCacheAccess(name);
                return cacheEntry.data;
            }
            else {
                // 缓存条目存在但数据为空，删除这个无效条目
                window.avatarSDKLogger.warn(this.TAG, `发现无效缓存条目: ${name}，正在删除`);
                this.videoCache.delete(name);
            }
        }
        // 检查是否正在下载
        if (this.downloadingVideos.has(name)) {
            try {
                const result = await this.downloadingVideos.get(name);
                return result;
            }
            catch (error) {
                // 如果下载失败，从下载列表中移除
                this.downloadingVideos.delete(name);
                window.avatarSDKLogger.warn(this.TAG, `${name} 视频下载失败，从下载列表移除`);
                throw error;
            }
        }
        // 开始下载
        this.isProcessingVideo = true;
        const downloadPromise = this.downloadVideo(name);
        this.downloadingVideos.set(name, downloadPromise);
        try {
            const result = await downloadPromise;
            return result;
        }
        finally {
            // 下载完成后从下载列表中移除
            this.downloadingVideos.delete(name);
            this.isProcessingVideo = false;
        }
    }
    /**
     * 实际下载视频的方法
     * @param name 视频名称
     * @returns Promise<ArrayBuffer>
     */
    async downloadVideo(name) {
        const url = this.getVideoUrl(name);
        if (!url) {
            return;
        }
        try {
            const { response, arrayBuffer } = await this._fetchVideo(url);
            if (!response.ok) {
                if (this.first_load) {
                    this.first_load = false;
                    this.stopSession("load_video_error");
                }
                this.sdk.onMessage({
                    code: offline2.EErrorCode.VIDEO_DOWNLOAD_ERROR,
                    message: `Error: ${name} 视频下载失败`,
                    e: JSON.stringify({ name, url, res: response }),
                });
                return;
            }
            // 将下载的数据添加到缓存
            this.addToCache(name, arrayBuffer);
            return arrayBuffer;
        }
        catch (error) {
            this.sdk.onMessage({
                code: offline2.EErrorCode.VIDEO_DOWNLOAD_ERROR,
                message: `Error: ${name} 视频下载失败`,
                e: JSON.stringify({ name, url, error }),
            });
            return;
        }
    }
    async _fetchVideo(url) {
        if (this.networkInfos.length >= 4) {
            const avgRtt = this.networkInfos.reduce((sum, curr) => sum + curr.rtt, 0) / this.networkInfos.length;
            const avgDownlink = this.networkInfos.reduce((sum, curr) => sum + curr.downlink, 0) / this.networkInfos.length;
            this.options.onNetworkInfo?.({
                rtt: avgRtt,
                downlink: avgDownlink,
            });
            this.networkInfos.length = 0;
        }
        const startTime = performance.now();
        const response = await fetch(url);
        const totalSize = parseFloat(response.headers.get('Content-Length') || '0');
        const endTime = performance.now();
        const arrayBuffer = await response.arrayBuffer();
        const rtt = endTime - startTime; // 毫秒
        const downlink = (totalSize * 8) / (rtt / 1000 * 1000000); // Mbps
        const networkInfo = {
            rtt,
            downlink,
        };
        this.networkInfos.push(networkInfo);
        return {
            response,
            arrayBuffer,
        };
    }
    /**
     * 添加数据到缓存
     */
    addToCache(key, data) {
        const now = Date.now();
        // 检查缓存大小限制
        let totalSize = 0;
        for (const value of this.videoCache.values()) {
            totalSize += value.data.byteLength;
        }
        // 如果添加这个数据会超过限制，先清理一些缓存
        if (totalSize + data.byteLength > this.maxCacheSize || this.videoCache.size >= this.maxCacheEntries) {
            this.cleanupCache();
            // 重新计算大小
            totalSize = 0;
            for (const value of this.videoCache.values()) {
                totalSize += value.data.byteLength;
            }
            // 如果仍然超过限制，且单个文件太大，不缓存这个数据
            if (totalSize + data.byteLength > this.maxCacheSize && data.byteLength > this.maxCacheSize * 0.5) {
                window.avatarSDKLogger.warn(this.TAG, `视频文件过大(${(data.byteLength / 1024 / 1024).toFixed(2)}MB)，跳过缓存: ${key}`);
                return;
            }
            // 如果缓存空间仍然不足，清理更多缓存
            if (totalSize + data.byteLength > this.maxCacheSize) {
                // 强制清理到50%容量
                const targetSize = this.maxCacheSize * 0.5;
                const sortedEntries = Array.from(this.videoCache.entries())
                    .sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);
                for (const [cacheKey, cacheValue] of sortedEntries) {
                    if (totalSize <= targetSize)
                        break;
                    this.videoCache.delete(cacheKey);
                    totalSize -= cacheValue.data.byteLength;
                }
            }
        }
        // 添加到缓存
        this.videoCache.set(key, {
            data: data,
            lastAccessTime: now,
            accessCount: 1
        });
    }
    /**
     * 启动缓存清理定时器
     */
    startCacheCleanup() {
        // 每5分钟清理一次缓存
        this.cacheCleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 5 * 60 * 1000);
    }
    /**
     * 清理缓存
     */
    cleanupCache() {
        // 如果正在处理视频，跳过清理
        if (this.isProcessingVideo) {
            return;
        }
        const now = Date.now();
        const inactiveThreshold = 10 * 60 * 1000; // 10分钟不活跃的缓存将被清理
        // 按最后访问时间排序
        const sortedEntries = Array.from(this.videoCache.entries())
            .sort((a, b) => a[1].lastAccessTime - b[1].lastAccessTime);
        let totalSize = 0;
        const entriesToRemove = [];
        // 计算当前缓存总大小
        for (const [_, value] of this.videoCache.entries()) {
            totalSize += value.data.byteLength;
        }
        // 清理不活跃的缓存（但保留最近访问的）
        for (const [key, value] of sortedEntries) {
            if (now - value.lastAccessTime > inactiveThreshold) {
                entriesToRemove.push(key);
                totalSize -= value.data.byteLength;
            }
        }
        // 如果缓存仍然过大，清理最旧的条目（但至少保留2个条目）
        if (totalSize > this.maxCacheSize || this.videoCache.size > this.maxCacheEntries) {
            for (const [key, value] of sortedEntries) {
                if (!entriesToRemove.includes(key)) {
                    entriesToRemove.push(key);
                    totalSize -= value.data.byteLength;
                    // 确保至少保留2个缓存条目，防止完全清空
                    if ((this.videoCache.size - entriesToRemove.length <= 2) ||
                        (totalSize <= this.maxCacheSize * 0.8 && this.videoCache.size - entriesToRemove.length <= this.maxCacheEntries * 0.8)) {
                        break;
                    }
                }
            }
        }
        // 执行清理
        for (const key of entriesToRemove) {
            this.videoCache.delete(key);
        }
    }
    /**
     * 更新缓存访问信息
     */
    updateCacheAccess(key) {
        const cacheEntry = this.videoCache.get(key);
        if (cacheEntry) {
            cacheEntry.lastAccessTime = Date.now();
            cacheEntry.accessCount++;
        }
    }
    /**
     * 清空所有缓存
     */
    clearAllCache() {
        this.videoCache.clear();
    }
    /** 获取离线 idle */
    _getOfflineIdle() {
        return this.offlineIdle;
    }
    /** 获取上一次 session_id */
    _getSessionId() {
        return this.session_id || '';
    }
    /** 离线重连 */
    async _reload() {
        const result = await this.startSession();
        if (!result) {
            return null;
        }
        const res = result;
        this.session_id = res?.session_id;
        this.resource_pack = res.resource_pack;
        this.config = res.config;
        this.offlineIdle = res.resource_pack?.offline_idle || [];
        this._setOfflineCache();
        if (this.resource_pack) {
            this.getBackgroundImage();
        }
        return res;
    }
    async _setOfflineCache() {
        if (!this.offlineIdle || this.offlineIdle.length === 0) {
            return;
        }
        this.offlineCache.clear();
        const names = this.offlineIdle.map($i => $i.n);
        for (const name of names) {
            try {
                await this._runOfflineCache(name);
            }
            catch (error) {
            }
        }
    }
    async _runOfflineCache(name) {
        const url = this.getVideoUrl(name);
        if (!url) {
            return;
        }
        return this._fetchVideo(url)
            .then(({ arrayBuffer }) => {
            this.offlineCache.set(name, {
                data: arrayBuffer,
            });
        });
    }
    /**
     * 销毁资源管理器
     */
    destroy() {
        // 清理定时器
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        // 清理缓存
        this.clearAllCache();
        // 清理下载跟踪
        this.downloadingVideos.clear();
        // 清理背景图片
        if (this.bg) {
            this.bg = null;
        }
        this.progress = 0;
    }
}

class DataCacheQueue {
    TAG = "[DataCacheQueue]";
    // body视频抽帧副本，使用 Map 优化查找和删除性能
    _bodyQueue = new Map();
    // 表情match信息列表
    _facialQueue = [];
    // 原始表情数据
    _realFacialQueue = [];
    // 音频队列
    audioQueue = [];
    // UI事件队列
    eventQueue = [];
    // 当前处理好的视频id组
    videoIdList = [];
    // 当前状态
    _currentPlayState = "idle";
    // 当前ttsa状态
    _currentTtsaState = null;
    constructor() {
        // @ts-ignore
        window["__dev_event_queue__"] = this.eventQueue;
    }
    set currentPlayState(state) {
        this._currentPlayState = state;
    }
    get currentPlayState() {
        return this._currentPlayState;
    }
    set currentTtsaState(state) {
        this._currentTtsaState = state;
    }
    get currentTtsaState() {
        return this._currentTtsaState;
    }
    get bodyQueue() {
        return Array.from(this._bodyQueue.values());
    }
    // 更新body视频抽帧副本
    _updateBodyImageBitmap(data) {
        const old = this._bodyQueue.get(data.frameIndex);
        if (old && old.frame && typeof old.frame.close === "function") {
            old.frame.close();
        }
        // 清理过期帧，根据data.body_id,删除所有小于的帧
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curFrame.body_id < data.body_id && curFrame.frameIndex >= data.frameIndex) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
        this._bodyQueue.set(data.frameIndex, data);
    }
    clearOldFrames(sf) {
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curIndex >= sf) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
    }
    setVideoIdList(videoId) {
        if (!this.videoIdList.includes(videoId)) {
            this.videoIdList.push(videoId);
        }
    }
    getVideoIdList() {
        return this.videoIdList;
    }
    /**
     * 获取指定帧并从Map中删除
     * @param frameIndex 要获取的帧索引
     * @returns 找到的帧数据（未找到则返回undefined）
     */
    _getBodyImageBitmap(frameIndex) {
        const frame = this._bodyQueue.get(frameIndex);
        // 清理过期帧
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curIndex < frameIndex) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
        if (frame) {
            return frame;
        }
        return undefined;
    }
    // 获取body内的视频名称list
    getBodyVideoNameListLength() {
        const list = [];
        this.bodyQueue.forEach((item) => {
            if (!list.includes(item.name)) {
                list.push(item.name);
            }
        });
        return list.length;
    }
    _getFaceImageBitmap(frameIndex, body_id) {
        // 找出face中frameIndex和body_id相同的帧
        let targetItem = null;
        for (let i = this._facialQueue.length - 1; i >= 0; i--) {
            const item = this._facialQueue[i];
            if (item.frameIndex === frameIndex && item.body_id === body_id) {
                targetItem = item;
                break; // 找到后立即退出循环
            }
        }
        // 删除所有小于frameIndex的帧
        this._facialQueue = this._facialQueue.filter((item) => item.frameIndex >= frameIndex);
        return targetItem;
    }
    // 更新表情队列
    _updateFacial(data) {
        this._facialQueue.push(...data);
    }
    get facialQueue() {
        return this._facialQueue;
    }
    _getRealFaceImageBitmap(frameIndex, body_id) {
        // 找出face中frameIndex和body_id相同的帧
        let targetItem = null;
        for (let i = this._realFacialQueue.length - 1; i >= 0; i--) {
            const item = this._realFacialQueue[i];
            if (item?.frameIndex === frameIndex && item?.body_id === body_id) {
                targetItem = item;
                break; // 找到后立即退出循环
            }
        }
        // 删除所有小于frameIndex的帧
        this._realFacialQueue = this._realFacialQueue.filter((item) => item?.frameIndex >= frameIndex);
        return targetItem;
    }
    _updateRealFacial(data) {
        this._realFacialQueue.push(...data);
    }
    get realFacialQueue() {
        return this._realFacialQueue;
    }
    /**
     * 清空所有表情数据（用于切换隐身模式时）
     */
    clearAllFaceData() {
        this._facialQueue = [];
        this._realFacialQueue = [];
        window.avatarSDKLogger?.log(this.TAG, "已清空所有表情数据");
    }
    _updateAudio(data) {
        this.audioQueue.push(...data);
    }
    _clearAudio(speech_id) {
        if (speech_id !== -1) {
            this.audioQueue = this.audioQueue.filter(item => item.sid !== speech_id);
        }
        else {
            this.audioQueue = [];
        }
    }
    _getAudio(frameIndex) {
        const targetIndex = this.audioQueue.findIndex((item) => item.sf === frameIndex);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.audioQueue.splice(targetIndex, 1);
        return targetItem;
    }
    _getAudioInterval(startFrame, endFrame) {
        const audioList = this.audioQueue.filter((item) => item.sf >= startFrame && item.sf <= endFrame);
        if (audioList.length === 0) {
            return;
        }
        const audio = audioList[audioList.length - 1];
        const index = this.audioQueue.findIndex((item) => item.id === audio.id);
        this.audioQueue.splice(index, 1);
        return audio;
    }
    _updateUiEvent(data) {
        this.eventQueue.push(...data);
    }
    clearSubtitleOn(speech_id) {
        this.eventQueue = this.eventQueue.map(item => ({
            ...item,
            e: item.e.filter((subItem) => subItem.speech_id != speech_id)
        }));
    }
    _getEvent(frame) {
        const targetIndex = this.eventQueue.findIndex((item) => item.sf === frame);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.eventQueue.splice(targetIndex, 1);
        return targetItem;
    }
    _getEventInterval(startFrame, endFrame) {
        const targetIndex = this.eventQueue.findIndex((item) => item.sf >= startFrame && item.sf <= endFrame);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.eventQueue.splice(targetIndex, 1);
        return targetItem;
    }
    /**
     * 检查数据是否因seek等原因失效，并清理缓存。
     * @param data 新的数据帧数组
     * @param type 数据类型
     */
    checkValidData(data, type) {
        switch (type) {
            case offline2.EFrameDataType.BODY:
                break;
            case offline2.EFrameDataType.FACE: {
                // 根据bodyId获取face，暂时去掉过滤
                // if (this._facialQueue.length === 0 || data.length === 0) {
                //   return;
                // }
                // const isDiscontinuous =
                //   this._facialQueue[this._facialQueue.length - 1]?.ef >= data[0].sf ||
                //   data[0].sf <= this._facialQueue[0]?.sf;
                // if (isDiscontinuous) {
                //   const facialIndex = this._facialQueue.findIndex(
                //     (item) => item.sf >= data[0].sf
                //   );
                //   if (facialIndex !== -1) {
                //     this._facialQueue.length = facialIndex;
                //   }
                // }
                break;
            }
            case offline2.EFrameDataType.AUDIO: {
                if (this.audioQueue.length === 0 || data.length === 0) {
                    return;
                }
                const isDiscontinuous = this.audioQueue[this.audioQueue.length - 1]?.ef < data[0].sf ||
                    data[0].sf < this.audioQueue[0]?.sf;
                if (isDiscontinuous) {
                    const audioIndex = this.audioQueue.findIndex((item) => item.sf >= data[0].sf);
                    if (audioIndex !== -1) {
                        this.audioQueue.length = audioIndex;
                    }
                }
                break;
            }
        }
    }
    destroy() {
        this._bodyQueue.forEach((item) => {
            if (item.frame && typeof item.frame.close === "function") {
                item.frame.close();
            }
        });
        this._bodyQueue.clear();
        this._facialQueue = [];
        this.audioQueue = [];
        this.eventQueue = [];
    }
}

// 用于跟踪已创建的widget，键格式为"type-axisId"
// 使用容器元素的ID作为key（固定字符串），避免WeakMap对象引用问题
const containerWidgetMaps = new Map();
let containerIdCounter = 0;
// 获取容器元素
function getContainerElement(instance) {
    if (!instance)
        return null;
    // 优先从 instance.el 获取容器元素
    if (instance.el && instance.el instanceof HTMLElement) {
        return instance.el;
    }
    return null;
}
// 获取或生成容器的唯一ID
function getContainerId(container) {
    // 如果容器已有ID，直接使用
    if (container.id) {
        return container.id;
    }
    // 如果容器有 data-widget-container-id 属性，使用它
    const existingId = container.getAttribute('data-widget-container-id');
    if (existingId) {
        return existingId;
    }
    // 生成新的唯一ID并设置
    const newId = `widget-container-${++containerIdCounter}`;
    container.setAttribute('data-widget-container-id', newId);
    return newId;
}
// 获取或创建容器元素的 widget Map（使用容器ID作为key）
function getContainerWidgetMap(container) {
    const containerId = getContainerId(container);
    if (!containerWidgetMaps.has(containerId)) {
        containerWidgetMaps.set(containerId, new Map());
    }
    return containerWidgetMaps.get(containerId);
}
const subtitleStyle = `bottom: 50px;
left: 50%;
transform: translateX(-50%);
background: rgba(0, 0, 0, 0.8);
color: white;
padding: 12px 20px;
border-radius: 8px;
font-size: 16px;
font-weight: 500;
z-index: 1000;
max-width: 80%;
min-width: 200px;
word-break: break-word;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
text-align: center;`;
const WidgetDefaultRenderer = {
    /**
     * 生成基础容器元素
     * @param axis_id 用于设置z-index的层级ID
     */
    _el(data) {
        const { axis_id, x_location, y_location, width, height } = data;
        const _div = document.createElement('div');
        _div.setAttribute('class', 'avatar-sdk-widget-container');
        let style = 'position:absolute;';
        style += axis_id !== undefined ? `z-index:${axis_id};` : 'z-index:1;';
        if (x_location !== undefined && y_location !== undefined) {
            style += `top:${y_location * 100}%;left:${x_location * 100}%;`;
        }
        if (width !== undefined && height !== undefined) {
            style += `width:${width * 100}%;height:${height * 100}%;`;
        }
        _div.setAttribute('style', style);
        return _div;
    },
    /**
     * 生成widget的唯一标识键
     * @param type widget类型
     * @param axisId 层级ID
     * @returns 唯一标识字符串
     */
    _getWidgetKey(type, axisId) {
        // 使用默认值确保即使没有axisId也能正常工作
        const id = axisId ?? 'default';
        return `${type}-${id}`;
    },
    /**
     * 替换相同类型和层级的widget
     * @param type widget类型
     * @param axisId 层级ID
     * @param newElement 新的widget元素
     * @param instance 实例引用（用于区分不同数字人实例）
     */
    _replaceWidget(type, axisId, newElement, instance) {
        const key = this._getWidgetKey(type, axisId);
        const actualInstance = instance || this._currentInstance;
        const container = getContainerElement(actualInstance);
        if (!container) {
            return;
        }
        const widgetMap = getContainerWidgetMap(container);
        if (widgetMap.has(key)) {
            const oldElement = widgetMap.get(key);
            if (oldElement && oldElement.parentNode) {
                oldElement.remove();
            }
        }
        widgetMap.set(key, newElement);
    },
    /**
     * 渲染图片widget
     */
    WIDGET_PIC(data, instance) {
        const div = this._el(data);
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.setAttribute('style', 'width:100%;height:100%;');
        img.src = data.image;
        div.appendChild(img);
        this._replaceWidget('WIDGET_PIC', data.axis_id, div, instance);
        return div;
    },
    /**
     * 渲染幻灯片widget
     */
    // WIDGET_SLIDESHOW(data: IWidgetSlideshow): HTMLDivElement {
    //   const div = this._el(data.axis_id);
    //   const img = document.createElement('img');
    //   img.src = data.images[0];
    //   div.appendChild(img);
    //   this._replaceWidget('WIDGET_SLIDESHOW', data.axis_id, div);
    //   return div;
    // },
    /**
     * 渲染字幕widget
     */
    WIDGET_SUBTITLE(data, instance) {
        const { type, text, axis_id } = data;
        const actualInstance = instance || this._currentInstance;
        const container = getContainerElement(actualInstance);
        if (type === 'subtitle_off') {
            // 移除对应的div
            if (container) {
                const widgetMap = getContainerWidgetMap(container);
                const key = this._getWidgetKey('WIDGET_SUBTITLE', axis_id);
                if (widgetMap.has(key)) {
                    const oldElement = widgetMap.get(key);
                    if (oldElement && oldElement.parentNode) {
                        oldElement.remove();
                    }
                    widgetMap.delete(key);
                }
            }
            return null;
        }
        const div = this._el(data);
        div.innerHTML = text;
        div.setAttribute('style', div.style.cssText + subtitleStyle);
        this._replaceWidget('WIDGET_SUBTITLE', axis_id, div, instance);
        return div;
    },
    /**
     * 渲染文本widget
     */
    // WIDGET_TEXT(data: IWidgetText): HTMLDivElement {
    //   const div = this._el(data.axis_id);
    //   div.innerHTML = data.text_content;
    //   this._replaceWidget('WIDGET_TEXT', data.axis_id, div);
    //   return div;
    // },
    /**
     * 渲染视频widget
     */
    // WIDGET_VIDEO(data: IWidgetVideo): HTMLDivElement {
    //   const div = this._el(data.axis_id);
    //   const video = document.createElement('video');
    //   video.setAttribute('style', 'width:100%;height:100%;object-fit:cover;');
    //   video.src = data.video;
    //   video.autoplay = true;
    //   video.loop = true;
    //   video.muted = true;
    //   div.appendChild(video);
    //   this._replaceWidget('WIDGET_VIDEO', data.axis_id, div);
    //   return div;
    // },
    /**
     * 销毁指定实例的widget
     * @param instance 实例引用（用于区分不同数字人实例）
     */
    destroy(instance) {
        // 使用与 _replaceWidget 相同的逻辑，通过容器元素来查找和清理
        const actualInstance = instance || this._currentInstance;
        const container = getContainerElement(actualInstance);
        if (container) {
            const containerId = getContainerId(container);
            // 检查 Map 中是否存在该容器
            if (containerWidgetMaps.has(containerId)) {
                // 从容器对应的 widgetMap 中清理
                const widgetMap = containerWidgetMaps.get(containerId);
                widgetMap.forEach((element, key) => {
                    if (key.startsWith('WIDGET_SUBTITLE') || key.startsWith('WIDGET_PIC')) {
                        // 使用 remove() 方法更可靠，会自动检查元素是否在 DOM 中
                        if (element && element.parentNode) {
                            element.remove();
                        }
                    }
                });
                widgetMap.clear();
                containerWidgetMaps.delete(containerId);
            }
            else {
                // 备用清理方法：从容器 DOM 中查找并删除所有 widget 元素
                const widgets = container.querySelectorAll('.avatar-sdk-widget-container');
                widgets.forEach((widget) => {
                    widget.remove();
                });
            }
        }
    }
};

class AvatarRender {
    TAG = "[AvatarRender]";
    options;
    canvas = document.createElement("canvas");
    device;
    pipeline;
    currentBodyFrame = null;
    lastFaceFrame = null;
    isInit = false;
    isFirstRender = false;
    lastFrameState = "";
    lastRenderState = offline2.RenderState.init;
    onDownloadProgress;
    onStateChange = () => { };
    onRenderChange = () => { };
    sendVideoInfo = () => { };
    lostHandler = () => { };
    restoreHandler = () => { };
    avatarCanvasVisible = true;
    lastRealFaceFrameData = null; // 上一帧渲染的实时数据
    lastRealFaceFrame = -1; // 上一次实时表情数据帧号
    lastWeight = 0.0;
    lastFrameIndex = -1;
    saveAndDownload;
    canvasOffsetX = -1;
    pendingCharData = null; // 待设置的字符数据
    interrupt = false; // 是否中断speak
    constructor(options) {
        this.options = options;
        this.onDownloadProgress = options.onDownloadProgress;
        this.onStateChange = options.onStateChange;
        this.onRenderChange = options.onRenderChange;
        this.sendVideoInfo = options.sendVideoInfo;
        this.saveAndDownload = options.saveAndDownload;
        this.lostHandler = this._lostHandler.bind(this);
        this.restoreHandler = this._restoreHandler.bind(this);
        this.setCanvasVisibility(this.avatarCanvasVisible);
        // 延迟创建 GLDevice 和 GLPipeline，避免与视频解码器竞争 GPU 资源
        // 将在 init 方法中首次创建
        this.device = null;
        this.pipeline = null;
    }
    /**
     * 重置表情相关状态（用于从隐身模式恢复渲染时）
     */
    resetFaceFrameState() {
        this.lastRealFaceFrame = -1;
        this.lastRealFaceFrameData = null;
        this.lastWeight = 0.0;
        window.avatarSDKLogger?.log(this.TAG, "重置表情状态（从隐身模式恢复）");
    }
    /**
     * 创建 pipeline 并设置字符数据
     */
    _createPipeline() {
        if (this.pipeline || !this.device) {
            return;
        }
        this.pipeline = new offline2.GLPipeline(this.device);
        // 如果有待设置的字符数据，立即设置
        if (this.pendingCharData) {
            this.pipeline.setCharData(this.pendingCharData);
            this.pipeline.setSyncMedia();
            this.pendingCharData = null;
        }
    }
    _lostHandler(event) {
        event.preventDefault();
        console.error("Context lost.", event);
    }
    _restoreHandler(event) {
        if (!this.device) {
            console.error("_restoreHandle device is null");
            this.device = new offline2.GLDevice(this.canvas);
            this.device.canvas.addEventListener("webglcontextlost", this.lostHandler, false);
            this.device.canvas.addEventListener("webglcontextrestored", this.restoreHandler, false);
        }
        this.isInit = false;
        // 把已经掉线的context拉起来
        if (this.pipeline) {
            this.pipeline.reinitialize();
            this.pipeline.setSyncMedia();
        }
    }
    init(data) {
        // this.style(this.options.resourceManager.getConfig()?.resolution?.width ?? 1080, this.options.resourceManager.getConfig()?.resolution?.height ?? 1920)
        let charInitData = data;
        // if (!this.device) {
        //   return;
        // }
        this.style(this.options.resourceManager.getConfig()?.resolution?.width ?? 1080, this.options.resourceManager.getConfig()?.resolution?.height ?? 1920);
        this.setCharacterCanvasAnchor();
        if (!charInitData?.char) {
            const charInfo = this.options.resourceManager.getMouthShapeLib().char_info;
            charInitData = {
                char: charInfo,
                LUT: null,
                transform: {
                    offsetX: 0.0,
                    offsetY: 0.0,
                    scaleX: 1.0,
                    scaleY: 1.0
                },
                multisample: null
            };
        }
        // 保存字符数据，但不创建 pipeline
        // pipeline 将在切换到在线模式时（resumeRender）才创建，避免在隐身模式时创建 pipeline 导致的 GPU 资源竞争
        this.pendingCharData = charInitData;
        this.isInit = true;
        // 注意：这里不创建 pipeline，将在切换到在线模式时通过 initPipeline() 方法创建
    }
    /**
     * 初始化 pipeline（在从隐身模式切换到在线模式时调用）
     * 用于延迟创建 pipeline，避免在隐身模式时创建 pipeline 导致的 GPU 资源竞争
     */
    initPipeline() {
        if (this.pipeline) {
            // 已经创建，不需要重复创建
            return;
        }
        // 创建 pipeline 并设置字符数据
        this._createPipeline();
    }
    style(width = 0, height = 0) {
        if (width > 0 && height > 0) {
            // 设置canvas宽度为输入图片宽度的一半，因为输入的是左右两张图片合并的
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }
    /**
     * 设置画布样式（修复transform失效 + 优化对齐逻辑 + 优雅拼接样式）
     * @param avatar 布局配置
     */
    setCanvasStyle(layout) {
        const { width = 1080, height = 1920 } = this.options.resourceManager.getConfig()?.resolution || { width: 1080, height: 1920 };
        // 解构并设置默认值
        const { v_align = 'center', // 垂直对齐：top/middle/bottom（修正命名逻辑）
        h_align = 'center', // 水平对齐：left/center/right
        scale = 1.0, offset_x = 0.0, offset_y = 0.0 } = layout.avatar || {};
        const avatarHeight = height * scale;
        const avatarWidth = width * scale;
        const marginX = avatarWidth / 2;
        const marginY = avatarHeight / 2;
        // 基础样式（提取固定项，避免重复拼接）
        const baseStyles = {
            position: 'absolute',
            zIndex: 100,
            height: `${avatarHeight}px`,
            width: `${avatarWidth}px`,
            objectFit: 'contain',
            top: 'auto',
            right: 'auto',
            bottom: 'auto',
            left: 'auto',
            marginLeft: '0',
            marginTop: '0'
        };
        // 1. 处理水平对齐（h_align）：left/center/right
        switch (h_align) {
            case 'left':
                baseStyles.left = '0';
                break;
            case 'right':
                baseStyles.right = '0';
                break;
            default: // center
                baseStyles.position = 'absolute';
                baseStyles.left = '50%';
                baseStyles.marginLeft = `${-marginX + offset_x}px`;
                break;
        }
        // 2. 处理垂直对齐（v_align）：top/middle/bottom
        switch (v_align) {
            case 'top':
                baseStyles.top = '0';
                break;
            case 'bottom':
                baseStyles.bottom = '0';
                break;
            default: // middle
                baseStyles.position = 'absolute';
                baseStyles.top = '50%';
                baseStyles.marginTop = `${-marginY + offset_y}px`;
                break;
        }
        // 3. 合并transform（核心：只定义一次，避免覆盖）
        // 4. 拼接样式字符串（优雅转换为css样式）
        const styleStr = offline2.getStyleStr(baseStyles);
        // 应用样式
        this.canvas.setAttribute('style', styleStr);
    }
    setCharacterCanvasAnchor(layout) {
        if (layout?.avatar) {
            this.setCanvasStyle(layout);
        }
        else if (this.options.resourceManager.getConfig()?.layout) {
            const layout = this.options.resourceManager.getConfig()?.layout || {
                avatar: {
                    v_align: "default",
                    h_align: "default",
                    scale: 1.0,
                    offset_x: 0.0,
                    offset_y: 0.0,
                },
            };
            this.setCanvasStyle(layout);
        }
        else {
            const baseStyles = {
                position: 'absolute',
                zIndex: 100,
                height: `100%`,
                objectFit: 'contain',
                top: 'auto',
                right: 'auto',
                bottom: 'auto',
                left: 'auto',
                marginLeft: '0',
                marginTop: '0'
            };
            const styleStr = offline2.getStyleStr(baseStyles);
            this.canvas.setAttribute('style', styleStr);
            const auchor = this.options.resourceManager.getConfig()?.init_events?.find((item) => item.type === 'SetCharacterCanvasAnchor') || {
                type: 'SetCharacterCanvasAnchor',
                x_location: 0.0,
                y_location: 0.0,
                width: 1.0,
                height: 1.0,
            };
            const { x_location, y_location, width, height } = auchor;
            const style = this.canvas.style.cssText + `left: calc(${x_location} * 100%); top: calc(${y_location} * 100%); transform: scale(${width}, ${height}); transform-origin: top left;`;
            this.canvas.setAttribute("style", style);
        }
    }
    // 获取权重
    // this.lastWeight应初始化为0
    computeWeight(frameIndex) {
        const maxTweenStep = 12;
        const frameDiff = frameIndex - this.lastFrameIndex;
        const isLost = frameIndex > this.lastRealFaceFrame;
        if (isLost) {
            // 丢帧：权重累加步长，最大不超过1.0
            this.lastWeight = Math.min(this.lastWeight + frameDiff, maxTweenStep);
        }
        else {
            // 未丢帧：权重递减步长，最小不低于0.0
            this.lastWeight = Math.max(this.lastWeight - frameDiff, 0);
        }
        return this.lastWeight / maxTweenStep;
    }
    render(frameIndex) {
        if (!this.isInit) {
            return this.canvas;
        }
        // 确保 device 已创建
        if (!this.device) {
            this.device = new offline2.GLDevice(this.canvas);
            this.device.canvas.addEventListener("webglcontextlost", this.lostHandler, false);
            this.device.canvas.addEventListener("webglcontextrestored", this.restoreHandler, false);
        }
        // pipeline 应该在切换到在线模式时通过 initPipeline() 创建
        // 如果还没有创建，这里作为兜底方案创建（防止遗漏）
        if (!this.pipeline) {
            this.initPipeline();
            // 如果创建失败，返回 canvas
            if (!this.pipeline) {
                return this.canvas;
            }
        }
        const bodyFrame = this.options.dataCacheQueue._getBodyImageBitmap(frameIndex);
        let faceFrame = this.options.dataCacheQueue._getFaceImageBitmap(frameIndex, bodyFrame?.body_id ?? bodyFrame?.id ?? 0);
        let curRealFaceData = this.options.dataCacheQueue._getRealFaceImageBitmap(frameIndex, bodyFrame?.body_id ?? bodyFrame?.id ?? 0);
        if (this.lastFrameState === "speak" && bodyFrame?.frameState !== "speak") {
            // 从speak切出，重置表情权重相关状态
            this.lastRealFaceFrame = -1;
            this.lastRealFaceFrameData = null;
            this.lastWeight = 0.0;
        }
        if (this.interrupt) {
            faceFrame = curRealFaceData;
        }
        else if (faceFrame?.FaceFrameData && faceFrame?.face_frame_type) {
            // 在当前第 i 帧时，如果有实时表情数据real_face_data_i，则用其来渲染，同时更新last_real_face_data和last_real_face_data_frame
            this.lastRealFaceFrameData = faceFrame.FaceFrameData;
            this.lastRealFaceFrame = frameIndex;
            // 实时数据帧连续时，权重递减
            if (this.lastRealFaceFrame !== -1 && this.lastWeight > 0 && curRealFaceData) {
                const lastWeight = this.computeWeight(frameIndex);
                faceFrame = {
                    frameIndex,
                    state: bodyFrame?.frameState || 'idle',
                    body_id: bodyFrame?.body_id || -1,
                    sf: frameIndex,
                    ef: frameIndex,
                    face_frame_type: 0,
                    id: bodyFrame?.body_id || -1,
                    FaceFrameData: offline2.IBRAnimationFrameData_NN.interp(this.lastRealFaceFrameData, curRealFaceData.FaceFrameData, curRealFaceData.FaceFrameData, lastWeight, this.options.resourceManager.resource_pack?.interpolate_joints || [])
                };
            }
        }
        else {
            if (this.lastRealFaceFrame === -1) {
                faceFrame = curRealFaceData;
                // this.options.onError({
                //   code: EErrorCode.RENDER_FACE_ERROR,
                //   message: `第${frameIndex}帧 实时面部数据为空,原始数据渲染`,
                //   e: JSON.stringify({ bodyFrame, faceFrame }),
                // });
            }
            else {
                // this.options.onError({
                //   code: EErrorCode.RENDER_FACE_ERROR,
                //   message: `第${frameIndex}帧 实时面部数据为空，插值渲染`,
                //   e: JSON.stringify({ bodyFrame, faceFrame }),
                // });
                if (curRealFaceData?.FaceFrameData) {
                    if (this.lastRealFaceFrameData === null) {
                        // 如果只有原始表情数据idle_face_data_i，若last_real_face_data为空，直接用idle_face_data_i渲染
                        faceFrame = curRealFaceData;
                    }
                    else {
                        // 若last_real_face_data非空，则使用last_real_face_data和idle_face_data_i的插值结果来渲染
                        const lastWeight = this.computeWeight(frameIndex);
                        faceFrame = {
                            frameIndex,
                            state: bodyFrame?.frameState || 'idle',
                            body_id: bodyFrame?.body_id || -1,
                            sf: frameIndex,
                            ef: frameIndex,
                            face_frame_type: 0,
                            id: bodyFrame?.body_id || -1,
                            FaceFrameData: offline2.IBRAnimationFrameData_NN.interp(this.lastRealFaceFrameData, curRealFaceData.FaceFrameData, curRealFaceData.FaceFrameData, lastWeight, this.options.resourceManager.resource_pack?.interpolate_joints || [])
                        };
                    }
                }
            }
        }
        this._setCurrentBodyFrame(bodyFrame);
        if (((!bodyFrame || !faceFrame) && bodyFrame?.hfd) ||
            (!bodyFrame?.hfd && !bodyFrame?.frame)) {
            // 判断bodyFrame和faceFrame是否为空
            if (!bodyFrame) {
                this.options.onError({
                    code: offline2.EErrorCode.RENDER_BODY_ERROR,
                    message: `Error:  第${frameIndex}帧 bodyFrame为空`,
                    e: JSON.stringify({ bodyFrame, faceFrame }),
                });
            }
            else if (!faceFrame) {
                this.options.onError({
                    code: offline2.EErrorCode.RENDER_FACE_ERROR,
                    message: `Error: 第${frameIndex}帧 faceFrame为空`,
                    e: JSON.stringify({ bodyFrame, faceFrame }),
                });
            }
            window.avatarSDKLogger.log(this.TAG, "render第", frameIndex, "丢帧，bodyFrame", bodyFrame, "faceFrame", faceFrame);
        }
        if (((bodyFrame && faceFrame?.FaceFrameData && bodyFrame?.hfd) ||
            (!bodyFrame?.hfd && bodyFrame?.frame)) &&
            this.device) {
            this.sendVideoInfo({
                name: bodyFrame.name,
                body_id: bodyFrame.body_id,
                id: bodyFrame.id,
            });
            if (bodyFrame?.frameState !== this.lastFrameState) {
                this.onStateChange?.(bodyFrame?.frameState);
                if (bodyFrame.frameState !== "speak") {
                    (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.start_action_render, bodyFrame.frameState);
                }
                this.lastFrameState = bodyFrame?.frameState;
            }
            if (!this.isFirstRender) {
                (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.first_avatar_render);
                this.onDownloadProgress?.(100);
                this.isFirstRender = true;
                this.renderBackground();
            }
            // this.style(bodyFrame.frame.displayWidth, bodyFrame.frame.displayHeight);
            if (this.pipeline) {
                try {
                    const faceData = bodyFrame?.hfd ? faceFrame?.FaceFrameData ?? null : null;
                    if (faceData) {
                        this.saveAndDownload.appendMultipleToArray("render_faceData", [faceFrame]);
                    }
                    window.avatarSDKLogger.log("渲染第", frameIndex, "bodyFrame", bodyFrame, "faceFrame", faceFrame);
                    this.lastFaceFrame = faceFrame;
                    this.pipeline.renderFrame(bodyFrame.frame, faceData, null, 
                    // 临时方案，后续需要根据实际情况调整
                    {
                        offsetX: 0,
                        offsetY: 0,
                        scaleX: 1,
                        scaleY: 1,
                    });
                    const offset_PX = bodyFrame?.offset;
                    if (offset_PX !== this.canvasOffsetX) {
                        this.canvasOffsetX = offset_PX;
                        if (WidgetDefaultRenderer.CUSTOM_WIDGET) {
                            WidgetDefaultRenderer.CUSTOM_WIDGET({
                                type: "set_character_canvas_offset",
                                data: offset_PX
                            });
                        }
                        else if (WidgetDefaultRenderer.PROXY_WIDGET && WidgetDefaultRenderer.PROXY_WIDGET["set_character_canvas_offset"]) {
                            // 如果有代理的渲染器，则根据类型执行代理的渲染器
                            WidgetDefaultRenderer.PROXY_WIDGET["set_character_canvas_offset"](offset_PX);
                        }
                        else {
                            offline2.updateCanvasXOffset(this.canvas, offset_PX);
                        }
                    }
                    this.lastFrameIndex = frameIndex;
                }
                catch (error) {
                    window.avatarSDKLogger.error(this.TAG, "渲染帧失败:", error);
                }
                finally {
                    // 渲染完成后再关闭VideoFrame
                    if (bodyFrame.frame && typeof bodyFrame.frame.close === "function") {
                        bodyFrame.frame.close();
                    }
                }
                this.onRenderChange?.(offline2.RenderState.rendering);
            }
            else {
                // 如果没有渲染，也要关闭VideoFrame
                if (bodyFrame?.frame && typeof bodyFrame.frame.close === "function") {
                    bodyFrame.frame.close();
                }
            }
            return this.canvas;
        }
    }
    renderBackground() {
        const background = this.options.resourceManager.getBackgroundImageElement();
        if (!background)
            return;
        const bgContainer = document.getElementById("avatar-bg-container");
        if (!bgContainer)
            return;
        // 设置背景图样式
        bgContainer.style.backgroundImage = `url(${background.src})`;
        // 可添加其他背景样式（如覆盖方式、定位等）
        bgContainer.style.backgroundSize = "cover";
        bgContainer.style.backgroundPosition = "center";
    }
    _setCurrentBodyFrame(bodyFrame) {
        if (bodyFrame) {
            this.currentBodyFrame = bodyFrame;
        }
    }
    _getCurrentBodyFrameInfo(frameIndex) {
        if (this.currentBodyFrame && frameIndex > 0) {
            return {
                client_frame: frameIndex,
                current_ani: this.currentBodyFrame.name,
                current_ani_frame: this.currentBodyFrame.frameIndex - this.currentBodyFrame.sf,
                next_state: this.lastFrameState || "idle",
            };
        }
        return {
            client_frame: 0,
            current_ani: "",
            current_ani_frame: 0,
            next_state: "idle",
        };
    }
    /**
     * 设置canvas的显隐状态
     * @param visible 是否可见
     */
    setCanvasVisibility(visible) {
        this.avatarCanvasVisible = visible;
        if (this.canvas) {
            this.canvas.style.display = visible ? "" : "none";
        }
    }
    /**
     * 获取canvas的显隐状态
     */
    getCanvasVisibility() {
        return this.avatarCanvasVisible;
    }
    destroy() {
        // 先移除事件监听器，避免在销毁过程中触发
        if (this.device) {
            this.device.canvas.removeEventListener("webglcontextlost", this.lostHandler);
            this.device.canvas.removeEventListener("webglcontextrestored", this.restoreHandler);
            // 如果 pipeline 存在，先销毁 pipeline（释放 WebGL 资源）
            if (this.pipeline) {
                this.pipeline.destroy();
                this.pipeline = null;
            }
            // 最后销毁 device（会释放 WebGL context）
            // 对于隐身的数字人，如果没有 pipeline，说明没有真正使用 WebGL
            // 使用延迟销毁，避免在渲染关键帧时释放 GPU 资源导致其他数字人渲染异常
            if (this.device.gl) {
                // 保存 device 引用，延迟销毁
                const deviceToDestroy = this.device;
                this.device = null; // 先清除引用，避免后续操作使用
                // 延迟到下一帧销毁，给其他数字人留出完成当前渲染的时间
                // 这样可以避免在销毁隐身数字人时影响正在说话的数字人的面部渲染
                requestAnimationFrame(() => {
                    try {
                        if (deviceToDestroy) {
                            deviceToDestroy.destroy();
                        }
                    }
                    catch (error) {
                        // 忽略销毁错误，避免影响其他数字人
                        window.avatarSDKLogger?.warn?.('[AvatarRenderer] 销毁 device 时出错:', error);
                    }
                });
            }
            else {
                // 如果 gl 为 null，直接清理引用
                this.device = null;
            }
        }
        // 清理状态
        this.isInit = false;
        this.isFirstRender = false;
        this.lastRealFaceFrame = -1;
        this.lastRealFaceFrameData = null;
        this.lastWeight = 0.0;
        this.onStateChange = undefined;
        this.lastFrameState = "";
        this.pipeline = null;
        const bgContainer = document.getElementById("avatar-bg-container");
        if (bgContainer && bgContainer.parentNode) {
            bgContainer.parentNode.removeChild(bgContainer);
        }
        // 移除 canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.remove();
        }
    }
    setInterrupt(interrupt) {
        if (this.lastFaceFrame?.state !== 'speak' && interrupt)
            return;
        this.interrupt = interrupt;
    }
}

class BaseTrack {
    render() {
    }
    stop() {
    }
}

class ImageTrack$3 extends BaseTrack {
    data;
    instance; // 实例引用，用于区分不同数字人实例
    constructor(data, instance) {
        super();
        this.data = data;
        this.instance = instance;
    }
    render() {
        return WidgetDefaultRenderer.WIDGET_PIC(this.data, this.instance);
    }
}

class ImageTrack$2 extends BaseTrack {
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    render() {
    }
}

class SubtitleTrack extends BaseTrack {
    data;
    instance; // 实例引用，用于区分不同数字人实例
    constructor(data, instance) {
        super();
        this.data = data;
        this.instance = instance;
    }
    render() {
        return WidgetDefaultRenderer.WIDGET_SUBTITLE(this.data, this.instance);
    }
}

class ImageTrack$1 extends BaseTrack {
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    render() {
    }
}

class ImageTrack extends BaseTrack {
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    render() {
    }
}

class TrackRenderer {
    TAG = '[TrackRenderer]';
    tracker;
    instance; // 实例引用，用于区分不同数字人实例
    constructor(event, instance) {
        this.instance = instance;
        const { type, data, text = '' } = event;
        if (type === 'widget_pic') {
            this.tracker = new ImageTrack$3(data, instance);
        }
        if (type === 'widget_slideshow') {
            this.tracker = new ImageTrack$2(data);
        }
        if (type === 'subtitle_on' || type === 'subtitle_off') {
            this.tracker = new SubtitleTrack({ type, text, axis_id: data?.axis_id ?? 1000 }, instance);
        }
        if (type === 'widget_text') {
            this.tracker = new ImageTrack$1(data);
        }
        if (type === 'widget_video') {
            this.tracker = new ImageTrack(data);
        }
    }
    render() {
        return this.tracker?.render();
    }
    stop() {
        this.tracker.stop();
    }
    destroy() {
        WidgetDefaultRenderer.destroy(this.instance);
    }
}

class UIRenderer {
    TAG = "[UIRenderer]";
    options;
    trackerRenderer = [];
    root = document.createElement("div");
    lastFrameIndex = -1;
    onVoiceEnd;
    onVoiceStart;
    onWalkStateChange;
    clearSubtitleOn;
    initEventsRendered = false;
    lastSpeechId = -1;
    constructor(options) {
        this.options = options;
        this.root.setAttribute("style", "position:absolute;");
        this.onVoiceStart = options.onVoiceStart;
        this.onVoiceEnd = options.onVoiceEnd;
        this.clearSubtitleOn = options.clearSubtitleOn;
        this.initEventsRendered = false;
        this.lastSpeechId = options.lastSpeechId;
        this.onWalkStateChange = options.onWalkStateChange;
    }
    render(frame) {
        if (this.options.sdk.getStatus() === offline2.AvatarStatus.offline)
            return;
        let initEvents = [];
        if (this.lastFrameIndex === -1) {
            this.lastFrameIndex = frame;
            const config = this.options.resourceManager.getConfig();
            if (config.init_events && config.init_events.length > 0) {
                initEvents = config.init_events;
            }
        }
        let event = null;
        if (frame - this.lastFrameIndex > 1) {
            event = this.options.dataCacheQueue._getEventInterval(this.lastFrameIndex, frame);
        }
        else {
            event = this.options.dataCacheQueue._getEvent(frame);
        }
        // 仅执行一次
        if (!this.initEventsRendered) {
            this.initEventsRendered = true;
            if (event) {
                event.e = event.e.concat(initEvents);
            }
            else {
                event = {
                    e: initEvents,
                };
            }
        }
        if (!event) {
            return;
        }
        // 根据lastSpeechId过滤旧的数据,加入前端interrupt事件后，可能在前端打断后，服务仍下发数据
        event.e = event.e.filter(item => item.speech_id > this.lastSpeechId || !item.speech_id);
        if (event.e.some(item => item.type === "voice_start")) {
            const voiceStart = event.e.find(item => item.type === "voice_start");
            const duration = (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.voice_response_play, 'speak');
            this.options.sendSdkPoint('rendering_display', { multi_turn_conversation_id: voiceStart?.multi_turn_conversation_id });
            this.onVoiceStart(duration, voiceStart?.speech_id);
        }
        // 检查并处理voice_end事件
        if (event.e.some(item => item.type === "voice_end")) {
            const voiceEnd = event.e.find(item => item.type === "voice_end");
            this.lastSpeechId = voiceEnd?.speech_id ?? this.lastSpeechId;
            this.onVoiceEnd(voiceEnd?.speech_id);
        }
        // 检查并处理walk_start或speak_walk_start事件
        if (event.e.some(item => item.type === "walk_start") || event.e.some(item => item.type === "speak_walk_start")) {
            event.e.find(item => item.type === "walk_start" || item.type === "speak_walk_start");
            this.onWalkStateChange("walk_start");
        }
        // 检查并处理walk_end或speak_walk_end事件
        if (event.e.some(item => item.type === "walk_end") || event.e.some(item => item.type === "speak_walk_end")) {
            event.e.find(item => item.type === "walk_end" || item.type === "speak_walk_end");
            this.onWalkStateChange("walk_end");
        }
        // 检查并处理subtitle_off事件
        if (event.e.some(item => item.type === "subtitle_off")) {
            const speech_id = event.e.find(item => item.type === "subtitle_off")?.speech_id;
            this.clearSubtitleOn(speech_id);
        }
        const remainingWidgets = [...event.e];
        // 循环遍历 event.e 数组中的所有元素
        for (let i = 0; i < event.e.length; i++) {
            const widgetData = event.e[i];
            if (Object.prototype.hasOwnProperty.call(widgetData, "event_type")) {
                // 先不处理 ka/ka_intent
                continue;
            }
            // 如果有自定义的渲染器，则所有事件都交给自定义的渲染器处理
            if (WidgetDefaultRenderer.CUSTOM_WIDGET) {
                WidgetDefaultRenderer.CUSTOM_WIDGET(widgetData);
                // 从剩余元素中删除已处理的元素
                const index = remainingWidgets.indexOf(widgetData);
                if (index > -1) {
                    remainingWidgets.splice(index, 1);
                }
                continue;
            }
            // 如果有代理的渲染器，则根据类型执行代理的渲染器
            if (WidgetDefaultRenderer.PROXY_WIDGET && WidgetDefaultRenderer.PROXY_WIDGET[widgetData.type]) {
                WidgetDefaultRenderer.PROXY_WIDGET[widgetData.type](widgetData);
                // 从剩余元素中删除已处理的元素
                const index = remainingWidgets.indexOf(widgetData);
                if (index > -1) {
                    remainingWidgets.splice(index, 1);
                }
                continue;
            }
        }
        // 对剩余未自定义的元素执行 TrackerRenderer
        if (remainingWidgets.length > 0) {
            // 遍历剩余的元素，每个单独执行 TrackerRenderer
            // 传递 SDK 实例引用，用于区分不同数字人实例的 widget
            for (const widgetData of remainingWidgets) {
                const tracker = new TrackRenderer(widgetData, this.options.sdk);
                this.trackerRenderer.push(tracker);
            }
        }
        return this.trackerRenderer;
    }
    clearTrackerRenderer() {
        this.trackerRenderer = [];
    }
    destroy() {
        this.lastFrameIndex = -1;
        this.initEventsRendered = false;
        // 传递 SDK 实例引用，只清除当前实例的 widget
        WidgetDefaultRenderer.destroy(this.options.sdk);
        this.trackerRenderer.forEach((tracker) => tracker.destroy());
    }
}

class Composition {
    TAG = "[Composition]";
    container;
    avatarRenderer;
    audioRenderer;
    restRenderers;
    constructor(options) {
        this.container = options.container;
        this.avatarRenderer = options.avatarRenderer;
        this.restRenderers = options.restRenderers;
        this.audioRenderer = options.audioRenderer;
        this.container.appendChild(options.avatarRenderer.canvas);
    }
    compose(frameIndex) {
        this.avatarRenderer.render(frameIndex);
        this.audioRenderer.render(frameIndex);
        for (const r of this.restRenderers) {
            const layer = r.render(frameIndex);
            r.clearTrackerRenderer();
            if (layer) {
                for (const l of layer) {
                    const ele = l?.render();
                    if (ele) {
                        this.container.appendChild(ele);
                    }
                }
            }
        }
    }
    stop() {
        this.audioRenderer.stop(-1);
    }
    destroy() {
        this.avatarRenderer.destroy();
        this.audioRenderer.destroy();
        this.restRenderers.forEach((r) => r.destroy());
    }
}

class ParallelDecoder {
    tasks;
    queue;
    maxParallel;
    currentParallel;
    _locked;
    currentTaskId;
    resourceManager;
    onFrame;
    onDone;
    isFirstDecode;
    pendingAbort = false;
    abortAfterEf = null;
    pendingNewQueue = null;
    currentDecodedFrameIndex = null;
    abortAfterFrame = null;
    cacheVideoCount = 5; // 缓存视频数量
    saveAndDownload;
    dataCacheQueue;
    bodyFrameCountMap;
    maxVideoCount = 2;
    hardwareAcceleration = "default";
    MAX_LOAD_VIDEO_TIMEOUT_MS = 2000; // 最大加载视频超时时间（毫秒）
    _offlineLastFrame = 0;
    _offlineIdle = [];
    _offlineIdleIndex = 0;
    reportMessage;
    constructor(options) {
        this.tasks = new Map();
        this.queue = [];
        this.maxParallel = 1;
        this.currentParallel = 0;
        this._locked = false; // 并发保护锁
        this.currentTaskId = null;
        this.resourceManager = options.resourceManager;
        this.onFrame = () => { };
        this.onDone = () => { };
        this.isFirstDecode = true;
        this.saveAndDownload = options.saveAndDownload;
        this.dataCacheQueue = options.dataCacheQueue;
        this.bodyFrameCountMap = new Map();
        this.hardwareAcceleration = options.hardwareAcceleration;
        this.reportMessage = options.reportMessage;
    }
    getRandomTaskId() {
        return Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }
    decode(files, onFrame) {
        window.avatarSDKLogger.log("开始解码", JSON.stringify(files));
        if (this.isFirstDecode) {
            if (this._locked)
                return; // 并发保护
            this.abort(); // 清理所有旧任务
            this._locked = true;
            this.queue = files; // 拷贝一份队列
            this.onFrame = (file, frame, index) => {
                this.currentDecodedFrameIndex = file.startFrameIndex + index;
                this._handlePendingAbort(file, index);
                onFrame(file, frame, index);
            };
            this.currentParallel = 0;
            this.currentTaskId = this.getRandomTaskId(); // 唯一任务ID
            this.isFirstDecode = false;
        }
        else {
            this.updateQueue(files);
        }
    }
    updateQueue(files) {
        this.abortAfterFrame = null;
        if (this.queue.length === 0) {
            this.queue.push(...files);
            window.avatarSDKLogger.log("队列为空，直接追加", JSON.stringify(this.getQueue()));
            return;
        }
        const lastQueueEf = this.queue[this.queue.length - 1].ef;
        const firstQueueSf = this.queue[0].sf;
        const newSf = files[0].sf;
        window.avatarSDKLogger.log("开始校验视频队列,目前队列", JSON.stringify(this.getQueue()));
        if (newSf >= lastQueueEf) {
            // 顺序追加
            this.queue.push(...files);
            window.avatarSDKLogger.log("顺序追加结果", JSON.stringify(this.getQueue()));
        }
        else if (newSf < firstQueueSf) {
            // 回退/seek，判断是否需要等待
            if (this.currentDecodedFrameIndex !== null &&
                newSf > this.currentDecodedFrameIndex + 1) {
                // 有间隔，需要等待
                this.abortAfterFrame = newSf - 1;
                // 找到数据中ef小于abortAfterFrame的帧
                const oldQueue = this.queue.filter((item) => item.ef < newSf);
                this.queue = oldQueue.concat(files);
                window.avatarSDKLogger.log("等待处理到abortAfterFrame后再abort", this.abortAfterFrame, this.pendingNewQueue);
                return;
            }
            else {
                // 没有间隔，直接abort
                this.abort();
                this.queue = files.slice();
                this._locked = true;
                this.currentTaskId = this.getRandomTaskId();
                window.avatarSDKLogger.log("回退/seek，重置队列", JSON.stringify(this.getQueue()));
                // 清除队列中sf小于newsf的帧
                const newQueueSf = this.queue[0].sf;
                this.dataCacheQueue.clearOldFrames(newQueueSf);
            }
        }
        else if (newSf === firstQueueSf) {
            this.queue = files.slice();
            this.abortAfterFrame = newSf - 1;
            window.avatarSDKLogger.log("重置队列", JSON.stringify(this.getQueue()));
        }
        else {
            // 在队列中间，找到重叠点，截断再追加
            const mp4Index = this.queue.findIndex((item) => item.sf >= newSf);
            if (mp4Index !== -1) {
                this.queue.length = mp4Index;
            }
            this.abortAfterFrame = newSf - 1;
            this.queue.push(...files);
            window.avatarSDKLogger.log("中间追加，截断后追加", JSON.stringify(this.getQueue()));
        }
    }
    _isIOS() {
        return /iPad|iPhone|iPod|iOS/.test(navigator.userAgent);
    }
    getQueue() {
        return this.queue.map(item => ({
            ...item,
            x_offset: []
        }));
    }
    // 定义超时函数：超过指定时间后 reject
    timeoutPromise(ms, reason = "请求超时") {
        return new Promise((_, reject) => {
            setTimeout(() => {
                // (window as any).avatarSDKLogger.error(reason);
                reject();
            }, ms);
        });
    }
    // 加载视频并添加超时控制（800ms）
    async loadVideoWithTimeout(videoKey) {
        try {
            // Promise.race：谁先完成就取谁的结果（加载成功 或 超时）
            const arrayBuffer = await Promise.race([
                this.resourceManager.loadVideo(videoKey), // 原加载逻辑
                this.timeoutPromise(this.MAX_LOAD_VIDEO_TIMEOUT_MS, `视频 ${videoKey} 加载超时（${this.MAX_LOAD_VIDEO_TIMEOUT_MS}ms）`) // 800ms 超时
            ]);
            return arrayBuffer; // 加载成功，返回 ArrayBuffer
        }
        catch (error) {
            return null; // 超时或失败，返回 null 标识
        }
    }
    async _tryStartNext() {
        // 新增：判断当前队列是否包含回退视频（sf < 当前已解码帧索引）
        const hasBackwardVideo = this.queue.some(item => this.currentDecodedFrameIndex !== null && item.sf < this.currentDecodedFrameIndex);
        // 缓存数量判断：回退场景下放宽限制（允许多1个）
        let maxAllowed;
        if (hasBackwardVideo) {
            // 回退时：iOS 保持原限制，其他平台临时+1
            maxAllowed = this._isIOS() ? this.maxVideoCount : this.maxVideoCount + 1;
        }
        else {
            // 非回退时：iOS 限制为1，其他平台用默认最大数量
            maxAllowed = this._isIOS() ? 1 : this.maxVideoCount;
        }
        if (this.dataCacheQueue.getBodyVideoNameListLength() >= maxAllowed) {
            return;
        }
        if (this.currentParallel < this.maxParallel && this.queue.length > 0) {
            const bodyInfo = this.queue.shift();
            this.saveAndDownload.appendMultipleToArray("videoData", [bodyInfo]);
            this._cleanupOldWorkers(bodyInfo.body_id ?? bodyInfo.id ?? 0);
            this.currentParallel++;
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.load_video, bodyInfo);
            if (!bodyInfo.n) {
                this.currentParallel--;
                this._tryStartNext();
                this.reportMessage({
                    code: offline2.EErrorCode.INVALID_BODY_NAME,
                    message: `body数据无Name: ${JSON.stringify(bodyInfo)}`,
                });
                return;
            }
            // 加载视频并添加超时控制
            const arrayBuffer = (await this.loadVideoWithTimeout(bodyInfo.n));
            if (!arrayBuffer) {
                this.currentParallel--;
                this._tryStartNext();
                return;
            }
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.load_video, bodyInfo);
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.decode_video, bodyInfo);
            this._startWorker({
                name: bodyInfo.n,
                id: bodyInfo.id,
                frameState: bodyInfo.s,
                start: bodyInfo.asf,
                end: bodyInfo.aef,
                hfd: bodyInfo.hfd,
                data: arrayBuffer,
                startFrameIndex: bodyInfo.sf,
                endFrameIndex: bodyInfo.ef,
                body_id: bodyInfo.body_id,
                x_offset: offline2.parseUint8ToFloat32(bodyInfo.x_offset) || []
            });
        }
    }
    _startWorker(file) {
        const taskId = this.currentTaskId;
        const worker = new Worker(offline2.workerURL);
        const id = `${file.body_id ?? file.id ?? 0}_${file.name}`;
        const data = file.data;
        const dataCopy = new ArrayBuffer(data.byteLength);
        new Uint8Array(dataCopy).set(new Uint8Array(data));
        const onMessage = (e) => {
            if (taskId !== this.currentTaskId)
                return; // 只处理当前任务
            if (e.data.type === "frame") {
                if (e.data.index < file.start || e.data.index > file.end) {
                    e.data.frame.close();
                }
                else {
                    this.cacheVideo();
                    this.onFrame(file, e.data.frame, e.data.index);
                    const bodyFrameCount = this.bodyFrameCountMap.get(file.name) ?? 0;
                    this.bodyFrameCountMap.set(file.name, bodyFrameCount + 1);
                    if (this.abortAfterFrame && e.data.index + file.startFrameIndex >= this.abortAfterFrame) {
                        this.abortOne(id);
                        this.abortAfterFrame = null;
                        this._tryStartNext();
                    }
                }
            }
            else if (e.data.type === "configSupport") {
                window.avatarSDKLogger.log("configSupport", e.data);
            }
            else if (e.data.type === "done") {
                (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.decode_video, file);
                const bodyFrameCount = this.bodyFrameCountMap.get(file.name) ?? 0;
                if (bodyFrameCount < file.end - file.start - 1) {
                    this.bodyFrameCountMap.delete(file.name);
                }
                const task = this.tasks.get(id);
                if (task) {
                    task.status = "done";
                    task.worker.postMessage({ type: "abort" });
                }
                this.currentParallel--;
                this.onDone && this.onDone(file, id);
                worker.removeEventListener("message", onMessage);
                worker.terminate();
                this.tasks.delete(id);
                if (this.currentParallel === 0 && this.queue.length === 0) {
                    this._locked = false; // 解锁
                }
                this._tryStartNext();
            }
            else if (e.data.type === "error") {
                const task = this.tasks.get(id);
                if (task) {
                    task.status = "error";
                    task.worker.postMessage({ type: "abort" });
                }
                this.currentParallel--;
                this.onDone && this.onDone(file, id);
                worker.removeEventListener("message", onMessage);
                worker.terminate();
                this.tasks.delete(id);
                if (this.currentParallel === 0 && this.queue.length === 0) {
                    this._locked = false; // 解锁
                }
            }
        };
        worker.addEventListener("message", onMessage);
        this.tasks.set(id, {
            worker,
            status: "decoding",
            onMessage,
            ef: file.endFrameIndex,
        });
        worker.postMessage({
            type: "decode",
            file: { data: dataCopy },
            start: file.start,
            end: file.end,
            hardwareAcceleration: this.hardwareAcceleration,
            taskId,
        }, [dataCopy]);
    }
    // 在当前视频解出第一帧后，缓存队列中的前cacheVideoCount个视频（包括当前视频）
    // 首次调用会缓存当前视频及后续cacheVideoCount-1个视频
    // 后续每次调用会重新请求前cacheVideoCount个视频（已缓存的视频会被loadVideo内部过滤）
    cacheVideo() {
        const cacheQueue = this.queue.slice(0, this.cacheVideoCount);
        for (const item of cacheQueue) {
            this.resourceManager.preloadVideo(item.n);
        }
    }
    abort() {
        this.tasks.forEach(({ worker, status, onMessage }) => {
            if (status === "decoding") {
                worker.postMessage({ type: "abort" });
                if (onMessage)
                    worker.removeEventListener("message", onMessage);
                worker.terminate();
            }
        });
        this.tasks.clear();
        this.queue = [];
        this.currentParallel = 0;
        this._locked = false; // 解锁
        this.currentTaskId = null;
    }
    abortOne(id) {
        const task = this.tasks.get(id);
        if (task && task.status === "decoding") {
            task?.worker.postMessage({ type: "abort" });
            if (task?.onMessage) {
                task.worker.removeEventListener("message", task.onMessage);
            }
            task?.worker.terminate();
            this.tasks.delete(id);
            this.currentParallel--;
            if (this.currentParallel === 0 && this.queue.length === 0) {
                this._locked = false; // 解锁
            }
        }
    }
    destroy() {
        this.abort();
        this.queue = [];
        this.currentParallel = 0;
        this._locked = false;
        this.currentTaskId = null;
        this.pendingAbort = false;
        this.abortAfterEf = null;
        this.pendingNewQueue = null;
        this.abortAfterFrame = null;
        this.currentDecodedFrameIndex = null;
    }
    _handlePendingAbort(file, index) {
        if (this.pendingAbort && this.abortAfterEf !== null) {
            const currentFrameIndex = file.startFrameIndex + index;
            if (currentFrameIndex >= this.abortAfterEf) {
                this.abort();
                this.queue = this.pendingNewQueue;
                this._locked = true;
                this.currentTaskId = this.getRandomTaskId();
                // 重置等待标志
                this.pendingAbort = false;
                this.abortAfterEf = null;
                this.pendingNewQueue = null;
            }
        }
    }
    _cleanupOldWorkers(newBodyId) {
        for (const [taskId, task] of this.tasks) {
            // taskId 格式如 '143_stand_by_unface03_cut_011'
            const [bodyIdStr] = taskId.split("_");
            const bodyId = parseInt(bodyIdStr, 10);
            if (!isNaN(bodyId) && bodyId < newBodyId) {
                task.worker.postMessage({ type: "abort" });
                if (task.onMessage)
                    task.worker.removeEventListener("message", task.onMessage);
                task.worker.terminate();
                this.tasks.delete(taskId);
            }
        }
    }
    syncDecode(currentFrameIndex) {
        // 直接打断当前解帧的视频，理论上1s，很小概率用户会切换回来。
        const mp4List = this.queue.filter((item) => item.ef > currentFrameIndex);
        this.abort();
        // 如果上述条件不满足，则打断当前处理中的任务，根据currentFrameIndex获取queue中ef>currentFrameIndex的queue，重新装填到解帧队列，开始解帧
        this.queue = mp4List;
        this._locked = true;
        this.currentTaskId = this.getRandomTaskId();
        this._tryStartNext();
    }
    /** 进入正常模式 */
    _reload() {
        this._offlineLastFrame = 0;
        this.queue = [];
    }
    /** 进入离线，清空剩余身体数据 */
    _offLineMode(offlineIdle, currentFrame) {
        this.abort();
        this._offlineLastFrame = currentFrame;
        this._offlineIdle = offlineIdle;
        this.currentParallel -= 1;
        this.queue = [];
        this._offlineRun();
    }
    _offlineRun() {
        const idle = this._offlineIdle[this._offlineIdleIndex];
        if (idle) {
            this._offlineIdleIndex += 1;
            this._putOfflineBodyData(idle);
        }
        else {
            this._offlineIdleIndex = 0;
        }
    }
    /** 设置 idle 视频 */
    _putOfflineBodyData(idle) {
        const delta = idle.aef - idle.asf;
        const bodyInfo = {
            id: -1,
            n: idle.n,
            s: 'idle',
            hfd: false,
            body_id: -1,
            asf: idle.asf,
            aef: idle.aef,
            sf: this._offlineLastFrame,
            ef: this._offlineLastFrame + delta,
            x_offset: new Uint8Array(),
        };
        this.queue.push(bodyInfo);
        this._offlineLastFrame = bodyInfo.ef;
    }
}

const pcm_audio_script = `// pcm-audio-processor.js - 运行在音频线程的Worklet处理器
class PCMAudioProcessor extends AudioWorkletProcessor {
  // 音量配置（与主线程保持一致）
  static get parameterDescriptors() {
    return [
      {
        name: 'volume',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate' // 支持音频速率自动化
      }
    ];
  }

  constructor() {
    super();
    this.config = {
      sampleRate: 24000, // 固定24kHz采样率
      bytesPerSample: 2, // S16LE=2字节/采样点
    };
    this.pcmCache = new Uint8Array(0); // Worklet内的PCM缓存
    this.isActive = false; // 播放音频状态（控制是否生成声音）
    this.isDestroyed = false;
    this.fadeState = {
      // 淡入淡出状态（避免片段切换爆音）
      phase: 'idle', // idle/fadeIn/fadeOut/steady
      currentGain: 0,
      fadeTime: 0.01, // 淡入淡出时间（秒，建议最小0.01s避免爆音）
      fadeSamples: Math.floor(0.01 * 24000), // 淡入淡出样本数（24000Hz下为240样本）
    };
    this.currentSegment = null; // 当前处理的音频段（float32数组）
    this.segmentOffset = 0; // 当前音频段的播放偏移量
    
    // 监听主线程消息（接收PCM数据、状态控制等）
    this.port.onmessage = (e) => this.handleMainThreadMessage(e.data);
    
    // 初始化淡入淡出样本数
    this.fadeState.fadeSamples = Math.floor(this.fadeState.fadeTime * this.config.sampleRate);
  }

  /**
   * 处理主线程发来的消息（PCM数据/状态控制等）
   * @param {Object} data - 消息数据
   * @param {string} data.type - 消息类型：'pcm'/'start'/'pause'/'stop'/'config'/'destroy'/'volume'
   * @param {Uint8Array} [data.pcmData] - PCM数据（仅type='pcm'时存在）
   * @param {Object} [data.config] - 配置更新（仅type='config'时存在）
   * @param {number} [data.volume] - 音量值（仅type='volume'时存在）
   */
  handleMainThreadMessage(data) {
    switch (data.type) {
      // 接收主线程下发的PCM流数据
      case 'pcm':
        if (data.pcmData instanceof Uint8Array && data.pcmData.length > 0) {
          // 确保PCM数据字节数为2的整数倍（S16LE要求）
          const validLength = data.pcmData.length - (data.pcmData.length % this.config.bytesPerSample);
          if (validLength <= 0) break;
          
          // 合并到Worklet缓存
          const newCache = new Uint8Array(this.pcmCache.length + validLength);
          newCache.set(this.pcmCache, 0);
          newCache.set(data.pcmData.subarray(0, validLength), this.pcmCache.length);
          this.pcmCache = newCache;
          
          // 向主线程发送缓存状态
          this.port.postMessage({
            type: 'cacheStatus',
            size: this.pcmCache.length,
            sampleCount: this.pcmCache.length / this.config.bytesPerSample
          });
        }
        break;

      // 启动播放（继续音频生成）
      case 'start':
        this.isActive = true;
        break;

      // 暂停播放（停止音频生成，保留缓存）
      case 'pause':
        this.isActive = false;
        this.resetSegmentState();
        break;

      // 停止播放（清空缓存+重置状态）
      case 'stop':
        this.isActive = false;
        this.pcmCache = new Uint8Array(0);
        this.resetSegmentState();
        break;

      // 更新配置（如采样率/淡入淡出时间）
      case 'config':
        if (data.config.sampleRate) {
          this.config.sampleRate = data.config.sampleRate;
          // 重新计算淡入淡出样本数
          this.fadeState.fadeSamples = Math.floor(this.fadeState.fadeTime * this.config.sampleRate);
        }
        if (data.config.fadeTime) {
          this.fadeState.fadeTime = data.config.fadeTime;
          this.fadeState.fadeSamples = Math.floor(this.fadeState.fadeTime * this.config.sampleRate);
        }
        break;

      // 单独更新音量（可选，也可通过参数自动化控制）
      case 'volume':
        this.volume = Number(data.volume);
        // 通知主线程同步AudioWorkletNode的parameters
        this.port.postMessage({
          type: 'syncVolume',
          volume: this.volume
        });
        break;

      // 销毁处理器
      case 'destroy':
        this.isDestroyed = true;
        this.isActive = false;
        this.pcmCache = new Uint8Array(0);
        this.resetSegmentState();
        this.port.postMessage({ type: 'destroyConfirmed' });
        break;
  
      default:
        console.warn('[PCMAudioProcessor] 未知消息类型:', data.type);
    }
  }

  /**
   * 重置当前音频段状态（暂停/停止时调用）
   */
  resetSegmentState() {
    this.currentSegment = null;
    this.segmentOffset = 0;
    this.fadeState.phase = 'idle';
    this.fadeState.currentGain = 0;
  }

  /**
   * S16LE Uint8Array 转 Float32Array（-1~1范围）
   * @param {Uint8Array} pcmData - PCM数据
   * @returns {Float32Array} 转换后的音频样本
   */
  pcmToFloat32(pcmData) {
    const sampleCount = pcmData.length / this.config.bytesPerSample;
    const floatData = new Float32Array(sampleCount);
    const dataView = new DataView(pcmData.buffer);

    for (let i = 0; i < sampleCount; i++) {
      // S16LE格式：小端序解析，范围-32768~32767 归一化到-1~1
      floatData[i] = dataView.getInt16(i * this.config.bytesPerSample, true) / 32768;
    }
    return floatData;
  }

  /**
   * 计算当前样本的增益（淡入淡出）
   * @param {number} segmentLength - 当前音频段的总样本数
   * @returns {number} 增益值（0~1）
   */
  calculateGain(segmentLength) {
    const { phase, fadeSamples } = this.fadeState;
    const { segmentOffset } = this;

    // 边界保护：防止无效值导致的NaN
    if (typeof segmentOffset !== 'number' || typeof segmentLength !== 'number' || segmentLength <= 0) {
      return 0;
    }

    switch (phase) {
      // 淡入阶段：从0线性增加到1
      case 'fadeIn':
        if (segmentOffset >= fadeSamples) {
          this.fadeState.phase = 'steady';
          return 1;
        }
        return segmentOffset / fadeSamples;

      // 稳定阶段：增益保持1
      case 'steady':
        // 检测是否进入淡出阶段（接近段尾）
        if (segmentOffset >= segmentLength - fadeSamples) {
          this.fadeState.phase = 'fadeOut';
        }
        return 1;

      // 淡出阶段：从1线性降低到0.0001（避免分音）
      case 'fadeOut':
        const fadeStart = Math.max(segmentLength - fadeSamples, 0);
        const fadeProgress = (segmentOffset - fadeStart) / fadeSamples;
        return Math.max(1 - fadeProgress, 0.0001);

      // 空闲阶段：增益0
      case 'idle':
      default:
        return 0;
    }
  }

  /**
   * AudioWorklet核心方法：实时生成音频样本（音频线程调用）
   * @param {Float32Array[][]} inputs - 输入样本
   * @param {Float32Array[][]} outputs - 输出样本（单声道）
   * @param {Object} parameters - 音频参数
   * @returns {boolean} 是否继续运行
   */
  process(inputs, outputs, parameters) {
    // 销毁状态：终止处理
    if (this.isDestroyed) {
      if (outputs.length > 0 && outputs[0].length > 0) {
        outputs[0][0].fill(0);
      }
      return false;
    }

    // 未激活或无输出：返回静音
    if (!this.isActive || outputs.length === 0 || outputs[0].length === 0) {
      outputs[0][0].fill(0);
      return true;
    }

    const outputBuffer = outputs[0][0];
    const bufferLength = outputBuffer.length;
    // 获取音量参数（支持自动化）
    const volume = parameters.volume.length > 1 
      ? parameters.volume // 自动化模式：每个样本点可能有不同值
      : parameters.volume[0]; // 控制模式：整个缓冲区使用相同值

    // 生成输出样本
    for (let i = 0; i < bufferLength; i++) {
      // 如当前无音频段且缓存有数据，创建新段
      if (!this.currentSegment && this.pcmCache.length > 0) {
        // 使用缓存中的所有数据创建新段
        this.currentSegment = this.pcmToFloat32(this.pcmCache);
        // 清空缓存（已处理）
        this.pcmCache = new Uint8Array(0);
        this.segmentOffset = 0;
        // 根据前一段状态决定是否淡入
        this.fadeState.phase = this.fadeState.phase === 'fadeOut' ? 'steady' : 'fadeIn';
      }

      // 生成当前样本
      let sample = 0;
      if (this.currentSegment) {
        const segmentLength = this.currentSegment.length;
        // 确保偏移量有效
        if (this.segmentOffset < segmentLength) {
          const gain = this.calculateGain(segmentLength);
          // 应用淡入淡出增益和音量控制
          sample = this.currentSegment[this.segmentOffset] * gain * volume;
          this.segmentOffset++;
        } else {
          // 当前段处理完毕，重置
          this.currentSegment = null;
          this.segmentOffset = 0;
          this.fadeState.phase = 'idle';
        }
      }

      outputBuffer[i] = sample;
    }

    return true;
  }
}

// 注册Worklet处理器
registerProcessor('pcm-audio-processor', PCMAudioProcessor);
`;
const workletBlob = new Blob([pcm_audio_script], { type: 'application/javascript' });
const workletUrl = __createObjectURL(workletBlob);
/**
 * Web Audio Worklet版PCM流式播放器（24kHz采样率、S16LE单声道）
 * 核心：无定时器，依赖AudioWorklet的process方法实时处理流式数据
 */
class PCMAudioPlayer {
    // 常量配置（与Worklet保持一致）
    SAMPLE_RATE = 24000;
    FRAME_ALIGNMENT = 2000; // 帧对齐字节数
    WORKLET_SCRIPT_URL = workletUrl; // 改为本地引入，内网客户无法使用远程资源
    // readonly WORKLET_SCRIPT_URL: string = 'http://localhost:5173/pcm-audio-processor.js'; // Worklet脚本路径（需与HTML同域）
    // 实例状态与资源
    audioCtx = null;
    audioWorkletNode = null; // Worklet节点（主线程与Worklet通信桥梁）
    isInitialized = false; // 初始化状态（Worklet加载完成）
    isPlaying = false; // 播放状态标记
    destroyResolve = null;
    /**
     * 初始化（加载Worklet + 创建AudioContext + 连接节点）
     * @returns {Promise<void>} 初始化结果（需用户交互中调用）
     */
    async init() {
        if (this.isInitialized)
            return;
        // 1. 浏览器兼容性处理
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor || !window.AudioWorklet) {
            throw new Error("当前浏览器不支持Web Audio Worklet，无法实现流式播放");
        }
        // 2. 创建AudioContext（24kHz采样率）
        this.audioCtx = new AudioContextConstructor({
            sampleRate: this.SAMPLE_RATE,
        });
        const logger = window.avatarSDKLogger || console;
        try {
            // 3. 加载Worklet脚本（必须先加载，再创建节点）
            await this.audioCtx.audioWorklet.addModule(this.WORKLET_SCRIPT_URL);
            logger.log(`[PCMAudioPlayer] Worklet脚本加载完成: ${this.WORKLET_SCRIPT_URL}`);
            // 4. 创建Worklet节点（指定处理器名称，与Worklet中registerProcessor一致）
            this.audioWorkletNode = new AudioWorkletNode(this.audioCtx, "pcm-audio-processor" // 必须与Worklet中注册的名称一致
            );
            // 5. 连接音频链路：WorkletNode → 扬声器（destination）
            this.audioWorkletNode.connect(this.audioCtx.destination);
            logger.log("[PCMAudioPlayer] Worklet节点已连接到扬声器");
            // 6. 监听Worklet发来的消息（如缓存状态、错误）
            this.audioWorkletNode.port.onmessage = (e) => {
                switch (e.data.type) {
                    case "cacheStatus":
                        // logger.log(`[PCMAudioPlayer] Worklet缓存状态: ${e.data.size}字节`);
                        break;
                    case "error":
                        logger.error(`[PCMAudioPlayer] Worklet错误:`, e.data.detail);
                        break;
                    case "destroyConfirmed":
                        // logger.log(`[PCMAudioPlayer] Worklet已确认销毁`);
                        this.destroyResolve?.(); // 触发销毁等待的Promise
                        break;
                    case "syncVolume":
                        // 同步音量到AudioWorkletNode的parameters
                        const params = this.audioWorkletNode?.parameters;
                        if (params?.get?.("volume")?.value !== undefined) {
                            params.get("volume").value = e.data.volume;
                        }
                        break;
                    default:
                    // logger.log(`[PCMAudioPlayer] Worklet消息:`, e.data);
                }
            };
            // 7. 标记初始化完成
            this.isInitialized = true;
            // logger.log('[PCMAudioPlayer] 播放器初始化完成（Worklet就绪）');
        }
        catch (err) {
            logger.error("[PCMAudioPlayer] 初始化失败:", err);
            throw err; // 抛出错误，让业务层处理
        }
    }
    /**
     * 接收PCM音频流（流式下发到Worklet，无本地缓存）
     * @param {Uint8Array} pcmData - 24kHz S16LE单声道PCM数据
     */
    receivePCMStream(pcmData) {
        const logger = window.avatarSDKLogger || console;
        // 1. 前置校验
        if (!this.isInitialized || !this.audioWorkletNode) {
            logger.error("[PCMAudioPlayer] 播放器未初始化，无法接收PCM数据");
            return;
        }
        if (!(pcmData instanceof Uint8Array)) {
            logger.error("[PCMAudioPlayer] 输入PCM数据必须是非空的Uint8Array");
            return;
        }
        // logger.log(`[PCMAudioPlayer] 已下发PCM数据: ${pcmData.length}字节`);
        // 2. 下发PCM数据到Worklet（通过postMessage，数据会被转移/复制到音频线程）
        try {
            this.audioWorkletNode.port.postMessage({
                type: "pcm",
                pcmData: pcmData, // Worklet中会合并到缓存
            }, [pcmData.buffer] // 可选：Transferable对象，避免数据复制（提升性能）
            );
        }
        catch (err) {
            logger.error("[PCMAudioPlayer] 下发PCM数据到Worklet失败:", err);
        }
    }
    /**
     * 开始播放（激活Worklet的音频生成）
     * @returns {Promise<void>} 启动结果
     */
    async start() {
        if (!this.isInitialized || !this.audioCtx || !this.audioWorkletNode) {
            throw new Error("[PCMAudioPlayer] 请先调用init()初始化播放器");
        }
        // 1. 恢复AudioContext（需用户交互，否则抛异常）
        if (this.audioCtx.state !== "running") {
            await this.audioCtx.resume();
            // logger.log('[PCMAudioPlayer] AudioContext已恢复运行');
        }
        // 2. 发送start消息给Worklet（激活音频生成）
        this.audioWorkletNode.port.postMessage({ type: "start" });
        this.isPlaying = true;
        // logger.log('[PCMAudioPlayer] 已启动播放（Worklet激活）');
    }
    /**
     * 暂停播放（停止Worklet音频生成，保留缓存）
     */
    pause() {
        if (!this.isInitialized || !this.audioWorkletNode)
            return;
        // 发送pause消息给Worklet
        this.audioWorkletNode.port.postMessage({ type: "pause" });
        this.isPlaying = false;
        // logger.log('[PCMAudioPlayer] 已暂停播放（Worklet暂停）');
    }
    /**
     * 停止播放（清空Worklet缓存，重置状态）
     */
    stop() {
        if (!this.isInitialized || !this.audioWorkletNode)
            return;
        // 发送stop消息给Worklet
        this.audioWorkletNode.port.postMessage({ type: "stop" });
        this.isPlaying = false;
        // logger.log('[PCMAudioPlayer] 已停止播放（Worklet缓存清空）');
    }
    /**
     * 销毁播放器（释放所有音频资源，不可恢复）
     * @returns {Promise<void>} 销毁结果
     */
    async destroy() {
        const logger = window.avatarSDKLogger || console;
        // 1. 若未初始化/已销毁，直接返回
        if (!this.isInitialized || !this.audioCtx || !this.audioWorkletNode) {
            // logger.log('[PCMAudioPlayer] 播放器未初始化或已销毁');
            return;
        }
        // 2. 发送销毁指令给Worklet，并等待确认
        await new Promise((resolve) => {
            this.destroyResolve = resolve; // 绑定resolve函数
            // 发送销毁消息（触发Worklet内的#isDestroyed=true）
            this.audioWorkletNode?.port.postMessage({ type: "destroy" });
            // 超时容错：300ms未确认则强制继续（避免Worklet无响应）
            const timeout = setTimeout(() => {
                logger.warn("[PCMAudioPlayer] Worklet销毁超时，强制释放资源");
                this.destroyResolve?.();
            }, 300);
            // 确认后清除超时
            if (this.audioWorkletNode) {
                this.audioWorkletNode.port.onmessage = (e) => {
                    if (e.data.type === "destroyConfirmed") {
                        clearTimeout(timeout);
                        this.destroyResolve?.();
                    }
                };
            }
        });
        // 3. 断开Worklet节点连接（此时Worklet已终止执行）
        this.audioWorkletNode.disconnect();
        this.audioWorkletNode.port.close();
        this.audioWorkletNode = null;
        // 4. 关闭AudioContext（确保音频线程资源释放）
        if (this.audioCtx.state !== "closed") {
            await this.audioCtx.close();
        }
        this.audioCtx = null;
        // logger.log('[PCMAudioPlayer] AudioContext已关闭');
        // 5. 重置所有状态
        this.isInitialized = false;
        this.isPlaying = false;
        this.destroyResolve = null;
        logger.log("[PCMAudioPlayer] 播放器已完全销毁，所有资源释放完成");
    }
    /**
     * 获取当前播放器状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isPlaying: this.isPlaying,
            isWorkletReady: !!this.audioWorkletNode, // Worklet节点是否就绪
        };
    }
    setVolume(valume) {
        if (this.isInitialized && this.audioWorkletNode) {
            this.audioWorkletNode.port.postMessage({
                type: "volume",
                volume: valume,
            });
        }
    }
    /**
     * @returns {Promise<void>} 恢复结果
     */
    async resume() {
        const logger = window.avatarSDKLogger || console;
        try {
            if (this.audioCtx?.state === "suspended") {
                this.audioCtx
                    .resume()
                    .then(() => {
                    window.avatarSDKLogger.info("worklet音频上下文恢复成功");
                })
                    .catch((error) => {
                    window.avatarSDKLogger.error("worklet音频上下文恢复失败:", error);
                });
            }
        }
        catch (err) {
            logger.error("[PCMAudioPlayer] worklet恢复播放失败:", err);
            throw err;
        }
    }
}

/**
 * 基于 MediaSource API 的 WebM 音频流式播放器
 */
class MediaSourceAudioPlayer {
    TAG = "[MediaSourceAudioPlayer]";
    mediaSource = null;
    audioElement = null;
    sourceBuffer = null;
    isInitialized = false;
    isPlaying = false; // 公开访问，用于外部检查播放状态
    volume = 1.0;
    MIME_TYPE = 'audio/webm;codecs=opus';
    queue = [];
    isUpdating = false;
    logger;
    currentObjectURL = null;
    currentSpeechId = -1; // 当前播放的 speech_id
    firstFrameIndex = -1; // 第一个音频段的帧索引
    pendingStartFrameIndex = -1; // 等待开始播放的帧索引
    constructor() {
        this.logger = window.avatarSDKLogger || console;
    }
    /**
     * 清理旧的 MediaSource 资源
     */
    cleanupMediaSource() {
        // 清理旧的 SourceBuffer
        if (this.sourceBuffer) {
            try {
                if (this.mediaSource && this.mediaSource.readyState === 'open') {
                    if (this.mediaSource.sourceBuffers.length > 0) {
                        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
                    }
                }
            }
            catch (e) {
                this.logger.warn(this.TAG, "清理 SourceBuffer 失败:", e);
            }
            this.sourceBuffer = null;
        }
        // 清理旧的 MediaSource
        if (this.mediaSource) {
            try {
                if (this.mediaSource.readyState === 'open') {
                    this.mediaSource.endOfStream();
                }
            }
            catch (e) {
                // ignore
            }
            this.mediaSource = null;
        }
        // 清理旧的 Object URL
        if (this.currentObjectURL && this.audioElement) {
            // 移除之前失效的资源
            this.audioElement.removeAttribute('src');
            __revokeObjectURL(this.currentObjectURL);
            this.currentObjectURL = null;
        }
    }
    /**
     * 创建并初始化 MediaSource
     */
    createMediaSource() {
        if (!this.audioElement)
            return;
        this.mediaSource = new MediaSource();
        this.currentObjectURL = __createObjectURL(this.mediaSource);
        this.audioElement.src = this.currentObjectURL;
        this.mediaSource.addEventListener("sourceopen", () => {
            try {
                this.sourceBuffer = this.mediaSource.addSourceBuffer(this.MIME_TYPE);
                this.sourceBuffer.mode = "sequence";
                this.sourceBuffer.addEventListener("updateend", () => {
                    this.isUpdating = false;
                    this.processQueue();
                });
                this.sourceBuffer.addEventListener("error", (e) => {
                    this.logger.error(this.TAG, "SourceBuffer 错误:", e);
                });
                this.isInitialized = true;
                this.logger.log(this.TAG, "MediaSource 初始化成功");
            }
            catch (error) {
                this.logger.error(this.TAG, "初始化失败:", error.message);
            }
        });
        this.mediaSource.addEventListener("sourceended", () => {
            this.logger.log(this.TAG, "MediaSource 结束");
        });
        this.mediaSource.addEventListener("error", () => {
            this.logger.error(this.TAG, "MediaSource 错误");
        });
    }
    /**
     * 初始化 MediaSource 和 AudioElement
     * 每次播放都重新初始化
     */
    init() {
        // 如果已经初始化且 MediaSource 状态正常，不重复初始化
        if (this.isInitialized && this.mediaSource && this.mediaSource.readyState === 'open') {
            return;
        }
        // 清理旧的资源
        this.cleanupMediaSource();
        // 创建 Audio 元素
        if (!this.audioElement) {
            this.audioElement = document.createElement("audio");
            this.audioElement.style.display = "none";
            document.body.appendChild(this.audioElement);
            // 监听音频播放结束
            this.audioElement.addEventListener("ended", () => {
                this.logger.log(this.TAG, "播放完成");
                this.isPlaying = false;
            });
            // 监听音频错误
            this.audioElement.addEventListener("error", (e) => {
                const error = e.target.error;
                this.logger.error(this.TAG, "播放错误:", error ? error.message : "Unknown");
            });
            // 监听播放卡顿
            this.audioElement.addEventListener("waiting", () => {
                this.logger.log(this.TAG, `⏸ 缓冲中... (currentTime: ${this.audioElement.currentTime.toFixed(2)}s)`);
            });
            this.audioElement.addEventListener("playing", () => {
                this.logger.log(this.TAG, `▶ 继续播放 (currentTime: ${this.audioElement.currentTime.toFixed(2)}s)`);
            });
            this.audioElement.addEventListener("stalled", () => {
                this.logger.error(this.TAG, "⚠️ 播放停滞 (可能是数据获取问题)");
            });
            this.audioElement.addEventListener("suspend", () => {
                this.logger.log(this.TAG, "⏸ 数据加载暂停");
            });
            // 监听时间更新，检测缓冲不足
            this.audioElement.addEventListener("timeupdate", () => {
                if (this.sourceBuffer && this.sourceBuffer.buffered.length > 0) {
                    const currentTime = this.audioElement.currentTime;
                    const bufferedEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
                    const gap = bufferedEnd - currentTime;
                    // 如果缓冲不足，警告
                    if (gap < 0.5 && this.isPlaying) {
                        this.logger.warn(this.TAG, `⚠️ 缓冲不足！gap: ${gap.toFixed(2)}s`);
                    }
                }
            });
        }
        // 创建 MediaSource
        this.createMediaSource();
    }
    /**
     * 添加音频段
     * @param audioData WebM 格式的音频数据（ArrayBuffer）
     * @param frameIndex 帧索引（用于对齐）
     * @param speechId 语音ID（用于区分不同的语音段）
     */
    addAudioSegment(audioData, frameIndex, speechId) {
        // 如果是新的 speech_id，重置状态
        if (speechId !== undefined && speechId !== this.currentSpeechId) {
            if (this.currentSpeechId !== -1) {
                // 停止当前播放，准备播放新的语音
                this.logger.log(this.TAG, `检测到新的 speech_id: ${speechId}, 停止当前播放`);
                this.stop();
                this.init(); // 重新初始化 MediaSource
            }
            this.currentSpeechId = speechId;
            this.firstFrameIndex = frameIndex !== undefined ? frameIndex : -1;
            this.pendingStartFrameIndex = this.firstFrameIndex;
        }
        else if (this.firstFrameIndex === -1 && frameIndex !== undefined) {
            // 记录第一个音频段的帧索引
            this.firstFrameIndex = frameIndex;
            this.pendingStartFrameIndex = frameIndex;
        }
        this.queue.push({ data: audioData, frameIndex, speechId });
        this.processQueue();
    }
    /**
     * 处理队列，将数据添加到 SourceBuffer
     */
    processQueue() {
        if (this.isUpdating || this.queue.length === 0 || !this.sourceBuffer) {
            return;
        }
        // 检查 MediaSource 状态
        if (this.mediaSource &&
            this.mediaSource.readyState !== "open") {
            return;
        }
        this.isUpdating = true;
        const queueItem = this.queue.shift();
        const data = queueItem.data;
        try {
            this.sourceBuffer.appendBuffer(data);
        }
        catch (error) {
            this.logger.error(this.TAG, "追加数据失败:", error.message);
            // 如果是 QuotaExceededError，尝试清理旧数据
            if (error.name === "QuotaExceededError") {
                this.logger.log(this.TAG, "缓冲区已满，清理旧数据...");
                try {
                    const currentTime = this.audioElement.currentTime;
                    // 优化：更激进的清理策略，只保留最近 3 秒的数据（而不是 10 秒）
                    const keepTime = 3;
                    if (currentTime > keepTime && this.sourceBuffer) {
                        // 保留最近 3 秒的数据，减少内存占用
                        // 注意：remove() 是异步的，需要等待 updateend 事件
                        // 将数据放回队列，等待 remove 完成后再处理
                        this.queue.unshift(queueItem);
                        this.sourceBuffer.remove(0, currentTime - 10);
                        // isUpdating 保持为 true，等待 remove 的 updateend 事件
                        // updateend 事件会设置 isUpdating = false 并调用 processQueue
                        return; // 不设置 isUpdating = false，等待 remove 完成
                    }
                    else {
                        // 如果当前时间不足，无法清理，丢弃数据
                        this.logger.warn(this.TAG, `无法清理缓冲区 (currentTime: ${currentTime.toFixed(2)}s)，数据可能丢失`);
                        this.isUpdating = false;
                    }
                }
                catch (removeError) {
                    this.logger.error(this.TAG, "清理缓冲区失败:", removeError.message);
                    this.isUpdating = false;
                }
            }
            else {
                // 其他错误，重置状态
                this.isUpdating = false;
            }
        }
    }
    /**
     * 等待 SourceBuffer 准备好
     */
    async waitForSourceBuffer() {
        return new Promise((resolve) => {
            const check = () => {
                if (this.sourceBuffer) {
                    resolve();
                }
                else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    /**
     * 等待缓冲区更新完成
     * 优化：等待更多数据缓冲，避免播放时卡顿
     */
    async waitForBufferUpdate() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 40; // 最多等待 2 秒 (40 * 50ms)
            const minBufferTime = 0.5; // 至少缓冲 0.5 秒的数据
            const check = () => {
                checkCount++;
                // 检查是否有足够的缓冲数据
                if (this.sourceBuffer && this.sourceBuffer.buffered.length > 0) {
                    const bufferedEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
                    if (bufferedEnd >= minBufferTime) {
                        this.logger.log(this.TAG, `缓冲区就绪: ${bufferedEnd.toFixed(2)}s`);
                        resolve();
                        return;
                    }
                }
                // 如果队列已空且不在更新中，也认为可以开始播放
                if (!this.isUpdating && this.queue.length === 0 && checkCount >= 10) {
                    this.logger.log(this.TAG, "队列已空，开始播放");
                    resolve();
                    return;
                }
                // 超时保护
                if (checkCount >= maxChecks) {
                    this.logger.warn(this.TAG, "等待缓冲区超时，强制开始播放");
                    resolve();
                    return;
                }
                setTimeout(check, 50);
            };
            check();
        });
    }
    /**
     * 开始播放
     * @param frameIndex 当前帧索引（用于对齐）
     */
    async start(frameIndex) {
        if (this.isPlaying)
            return;
        // 如果提供了 frameIndex，检查是否应该开始播放
        if (frameIndex !== undefined && this.pendingStartFrameIndex !== -1) {
            if (frameIndex < this.pendingStartFrameIndex) {
                // 还没到开始播放的帧，等待
                this.logger.log(this.TAG, `等待帧对齐: 当前帧 ${frameIndex}, 目标帧 ${this.pendingStartFrameIndex}`);
                return;
            }
        }
        // 等待 SourceBuffer 准备好
        await this.waitForSourceBuffer();
        // 等待一些数据缓冲（优化后的缓冲策略）
        await this.waitForBufferUpdate();
        try {
            if (this.audioElement) {
                // 检查缓冲状态
                if (this.sourceBuffer && this.sourceBuffer.buffered.length > 0) {
                    const bufferedEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
                    this.logger.log(this.TAG, `🎵 开始播放 (缓冲: ${bufferedEnd.toFixed(2)}s, 队列: ${this.queue.length})`);
                }
                else {
                    this.logger.log(this.TAG, `🎵 开始播放 (队列: ${this.queue.length})`);
                }
                await this.audioElement.play();
                this.isPlaying = true;
                this.pendingStartFrameIndex = -1; // 已开始播放，清除待播放帧索引
                this.logger.log(this.TAG, `🎵 开始播放 (speech_id: ${this.currentSpeechId}, frameIndex: ${frameIndex})`);
            }
        }
        catch (error) {
            // 如果是 AbortError（被 pause 中断），这是正常情况，静默处理
            if (error?.name === 'AbortError' || error?.message?.includes('interrupted')) {
                this.logger.debug?.(this.TAG, `播放被中断（正常情况）: ${error.message}`);
                // 不设置 isPlaying，因为播放没有成功
                return;
            }
            // 其他错误才记录并抛出
            this.logger.error(this.TAG, `播放失败: ${error.message}`);
            throw error;
        }
    }
    /**
     * 停止播放（内部方法：清空队列、暂停音频、重置状态）
     */
    stopPlayback() {
        this.queue = [];
        this.isPlaying = false;
        this.isUpdating = false;
        this.firstFrameIndex = -1;
        this.pendingStartFrameIndex = -1;
        this.currentSpeechId = -1;
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }
    /**
     * 停止播放
     * @param speechId 语音ID（可选，用于确认停止的是当前播放的语音）
     */
    stop(speechId) {
        // 如果提供了 speechId，只停止匹配的语音
        if (speechId !== undefined && speechId !== this.currentSpeechId) {
            this.logger.log(this.TAG, `忽略停止请求: speech_id 不匹配 (当前: ${this.currentSpeechId}, 请求: ${speechId})`);
            return;
        }
        const stoppedSpeechId = this.currentSpeechId;
        this.stopPlayback();
        // 清理旧的 MediaSource，彻底清除旧数据
        this.cleanupMediaSource();
        // 重新创建 MediaSource，为下次播放做准备
        this.createMediaSource();
        this.logger.log(this.TAG, `播放已停止 (speech_id: ${stoppedSpeechId})`);
    }
    /**
     * 设置音量
     * @param volume 音量值（0-1）
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            isPlaying: this.isPlaying,
            isInitialized: this.isInitialized,
            queueLength: this.queue.length,
            bufferedRanges: this.getBufferedRanges(),
            mediaSourceReadyState: this.mediaSource?.readyState || 'null',
        };
    }
    /**
     * 获取缓冲范围
     */
    getBufferedRanges() {
        if (this.sourceBuffer && this.sourceBuffer.buffered.length > 0) {
            const ranges = [];
            for (let i = 0; i < this.sourceBuffer.buffered.length; i++) {
                const start = this.sourceBuffer.buffered.start(i).toFixed(2);
                const end = this.sourceBuffer.buffered.end(i).toFixed(2);
                ranges.push(`[${start}-${end}]`);
            }
            return ranges.join(", ");
        }
        return "-";
    }
    /**
     * 销毁播放器
     */
    async destroy() {
        // 停止播放（暂停音频，清空队列和状态）
        this.stopPlayback();
        // 彻底清理 MediaSource 资源（不重新创建，因为要销毁）
        this.cleanupMediaSource();
        // 移除 Audio 元素
        if (this.audioElement && this.audioElement.parentNode) {
            this.audioElement.parentNode.removeChild(this.audioElement);
        }
        this.audioElement = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.logger.log(this.TAG, "播放器已销毁");
    }
}

/**
 * 音频渲染
 * 使用 AudioContext 控制
 */
class AudioRender {
    TAG = "[AudioRenderer]";
    options;
    audioCtx;
    source = null;
    isPlaying = false;
    gainNode = null;
    lastFrameIndex = -1;
    offset = 0;
    audio = null;
    firstFrameIndex = -1;
    resourceManager;
    valume = 1;
    speech_id = -1; // 当前播放的音频id
    cacheFirstFrameIndex = -1; // 缓存下来的第一个音频的索引
    cacheAudioData = []; // 缓存下来的音频数据
    oldSpeechId = -1; // 上一个播放的音频id
    mseAudioPlayer = null;
    constructor(options) {
        this.options = options;
        this.resourceManager = options.resourceManager;
        this.audioCtx = new AudioContext();
        this.audio = new PCMAudioPlayer();
        this.audio.init();
        if (!this.resourceManager.config.raw_audio) {
            this.mseAudioPlayer = new MediaSourceAudioPlayer();
            this.mseAudioPlayer.init();
        }
    }
    updateAudioData(audioList) {
        if (!this.resourceManager.config.raw_audio ||
            audioList[0].sid === this.oldSpeechId)
            return;
        if (this.firstFrameIndex === -1) {
            this.firstFrameIndex = audioList[0].sf;
        }
        let totalLength = 0;
        for (const audio of audioList) {
            totalLength += audio.ad?.length || 0;
        }
        // 创建合并后的Uint8Array
        const mergedData = new Uint8Array(totalLength);
        let offset = 0;
        // 填充合并数据
        for (const audio of audioList) {
            if (audio.ad) {
                mergedData.set(new Uint8Array(audio.ad), offset);
                offset += audio.ad.length;
            }
        }
        if (this.speech_id === -1) {
            this.speech_id = audioList[0].sid;
            this.audio?.receivePCMStream(mergedData);
        }
        else {
            if (this.speech_id !== audioList[0].sid) {
                // 先缓存下来
                if (this.cacheFirstFrameIndex === -1) {
                    this.cacheFirstFrameIndex = audioList[0].sf;
                }
                this.cacheAudioData.push(mergedData);
            }
            else {
                // 直接播放
                this.audio?.receivePCMStream(mergedData);
            }
        }
    }
    _updateAudio(audioList) {
        if (!this.mseAudioPlayer || audioList.length === 0)
            return;
        const firstAudio = audioList[0];
        // 检查是否是旧的 speech_id
        if (firstAudio.sid === this.oldSpeechId) {
            return;
        }
        // 如果 speech_id 变化，停止当前播放并重置
        if (this.speech_id !== -1 && firstAudio.sid !== this.speech_id) {
            window.avatarSDKLogger?.log(this.TAG, `检测到新的 speech_id: ${firstAudio.sid}, 停止当前 WebM 播放 (旧: ${this.speech_id})`);
            this.mseAudioPlayer.stop();
            this.mseAudioPlayer.init(); // 重新初始化 MediaSource
            this.firstFrameIndex = -1;
        }
        // 记录第一个音频段的帧索引
        if (this.firstFrameIndex === -1) {
            this.firstFrameIndex = firstAudio.sf;
        }
        // 更新 speech_id
        if (this.speech_id === -1) {
            this.speech_id = firstAudio.sid;
        }
        else if (this.speech_id !== firstAudio.sid) {
            this.speech_id = firstAudio.sid;
        }
        // 处理每个音频段
        for (const audio of audioList) {
            if (audio.ad) {
                // 将 Uint8Array 转换为 ArrayBuffer
                const audioData = audio.ad instanceof ArrayBuffer
                    ? audio.ad
                    : audio.ad.buffer.slice(audio.ad.byteOffset, audio.ad.byteOffset + audio.ad.byteLength);
                this.mseAudioPlayer.addAudioSegment(audioData, audio.sf, audio.sid);
            }
        }
    }
    async render(frameIndex) {
        // (window as any).avatarSDKLogger.log("当前帧索引:", frameIndex, "音频开始播放帧：", this.firstFrameIndex);
        if (this.lastFrameIndex === -1) {
            this.lastFrameIndex = frameIndex;
        }
        if (this.options.sdk.getStatus() === offline2.AvatarStatus.offline)
            return;
        // PCM 流式播放（raw_audio = true）
        if (frameIndex >= this.firstFrameIndex &&
            this.firstFrameIndex != -1 &&
            !this.isPlaying &&
            this.resourceManager.config.raw_audio) {
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.start_action_render, "speak");
            this.isPlaying = true;
            this.audio?.start();
            return;
        }
        // WebM 流式播放（raw_audio = false）
        if (!this.resourceManager.config.raw_audio && this.mseAudioPlayer) {
            // 检查是否应该开始播放（帧对齐）
            if (this.firstFrameIndex !== -1 &&
                frameIndex >= this.firstFrameIndex &&
                !this.mseAudioPlayer.isPlaying) {
                // 优化：确保有足够的数据缓冲再开始播放
                const stats = this.mseAudioPlayer.getStats();
                const hasEnoughData = stats.queueLength > 0 || stats.bufferedRanges !== '-';
                if (hasEnoughData) {
                    try {
                        await this.mseAudioPlayer.start();
                        (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.start_action_render, "speak");
                    }
                    catch (error) {
                        window.avatarSDKLogger.error("[AudioRenderer] WebM 音频播放失败:", {
                            error,
                            frameIndex,
                            firstFrameIndex: this.firstFrameIndex,
                            queueLength: stats.queueLength,
                        });
                    }
                }
                else {
                    // 数据不足，等待更多数据
                    window.avatarSDKLogger.debug?.("[AudioRenderer]", `等待更多 WebM 音频数据 (frameIndex: ${frameIndex}, queueLength: ${stats.queueLength})`);
                }
            }
            return; // WebM 模式下不需要继续处理 PCM 播放逻辑
        }
        // 使用 AudioContext 播放音频
        if (this.audioCtx.state === "closed") {
            this.audioCtx = new AudioContext();
        }
        let audioFrame = null;
        if (frameIndex - this.lastFrameIndex > 1) {
            audioFrame = this.options.dataCacheQueue._getAudioInterval(this.lastFrameIndex, frameIndex);
            this.offset = frameIndex - this.lastFrameIndex;
        }
        else {
            audioFrame = this.options.dataCacheQueue._getAudio(frameIndex);
        }
        this.lastFrameIndex = frameIndex;
        if (this.options.dataCacheQueue.currentTtsaState &&
            this.options.dataCacheQueue.currentTtsaState.state !== "speak" &&
            frameIndex >= this.options.dataCacheQueue.currentTtsaState.start_frame) {
            return;
        }
        // 获取音频帧数据
        if (!audioFrame?.ad)
            return;
        this.speech_id = audioFrame.sid;
        /*
        try {
          // 使用 MediaSourceAudioPlayer 播放音频
          this.mseAudioPlayer?.start();
        } catch (error) {
          (window as any).avatarSDKLogger.error("[AudioRenderer] 音频播放失败:", {
            error,
          });
          this.isPlaying = false;
          this.mseAudioPlayer?.destroy();
          this.mseAudioPlayer = null;
        }
        */
        try {
            const audioBuffer = await this.audioCtx.decodeAudioData(audioFrame.ad);
            // 创建音频源并播放
            this.source = this.audioCtx.createBufferSource();
            this.source.buffer = audioBuffer;
            // 连接并播放
            if (!this.gainNode) {
                // 创建增益节点（默认增益为1，即正常音量）
                this.gainNode = this.audioCtx.createGain();
                this.gainNode.connect(this.audioCtx.destination);
                this.gainNode.gain.value = this.valume;
            }
            this.source.connect(this.gainNode);
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.start_action_render, "speak");
            const offsetTime = this.offset > 24 ? (frameIndex - audioFrame.sf) / 24 : 0;
            this.offset = 0;
            this.source.start(0, offsetTime);
            this.isPlaying = true;
            // 监听播放结束
            this.source.onended = () => {
                this.isPlaying = false;
                this.source = null;
            };
        }
        catch (error) {
            window.avatarSDKLogger.error("[AudioRenderer] 音频解码失败:", {
                error,
                audioDataType: typeof audioFrame.ad,
                audioDataConstructor: audioFrame.ad?.constructor?.name,
                audioDataLength: audioFrame.ad?.byteLength || audioFrame.ad?.length,
                frameIndex,
            });
            window.avatarSDKLogger.error(this.TAG, "Error playing audio:", error);
            this.isPlaying = false;
            this.source = null;
        }
    }
    resume() {
        if (this.audio && this.resourceManager.config.raw_audio) {
            this.audio?.resume();
        }
    }
    pause() {
        this.source?.stop();
        this.source?.disconnect();
        this.source = null;
        this.gainNode?.disconnect();
        this.gainNode = null;
        this.isPlaying = false;
        this.options.dataCacheQueue._clearAudio(this.speech_id);
        if (this.audioCtx.state !== "closed") {
            this.audioCtx.close();
        }
        this.firstFrameIndex = -1;
        // 停止 WebM 播放
        this.mseAudioPlayer?.stop(this.speech_id);
        this.speech_id = -1;
    }
    stop(speech_id) {
        // 停止 PCM 播放
        this.source?.stop();
        this.source?.disconnect();
        this.source = null;
        this.gainNode?.disconnect();
        this.gainNode = null;
        this.isPlaying = false;
        this.options.dataCacheQueue._clearAudio(speech_id);
        if (this.audioCtx.state !== "closed") {
            this.audioCtx.close();
        }
        this.firstFrameIndex = -1;
        this.audio?.stop();
        // 停止 WebM 播放
        this.mseAudioPlayer?.stop(speech_id);
        this.oldSpeechId = speech_id;
        this.speech_id = -1;
        if (this.cacheAudioData.length > 0) {
            this.firstFrameIndex = this.cacheFirstFrameIndex;
            this.cacheFirstFrameIndex = -1;
            // 新的缓存下来的数据，推入音频流
            for (const data of this.cacheAudioData) {
                this.audio?.receivePCMStream(data);
            }
            this.cacheAudioData = [];
        }
    }
    setVolume(valume) {
        this.valume = valume;
        if (this.resourceManager.config.raw_audio) {
            this.audio?.setVolume(valume);
        }
        else {
            // WebM 模式：使用 MSEAudioPlayer 设置音量
            this.mseAudioPlayer?.setVolume(valume);
            // 兼容旧的 AudioContext 方式
            if (this.source && this.gainNode?.gain) {
                this.gainNode.gain.value = valume;
            }
        }
    }
    destroy() {
        this.stop(-1);
        this.cacheAudioData = [];
        this.audio?.destroy();
        this.mseAudioPlayer?.destroy();
        this.mseAudioPlayer = null;
    }
}

/**
 * 保存和下载工具 - 小程序适配版本（供打包时原 SDK RenderScheduler 解析）
 * 在小程序中，下载功能可能受限，这里提供一个简化版本
 */
class SaveAndDownload {
    fileName;
    enabled;
    data = {};
    constructor(fileName = "avatarData.js", enabled = false) {
        this.fileName = fileName;
        this.enabled = enabled;
    }
    writeFields(fields) {
        if (!this.enabled)
            return;
        Object.assign(this.data, fields);
    }
    appendMultipleToArray(fieldName, items) {
        if (!this.enabled)
            return;
        if (!this.data[fieldName]) {
            this.data[fieldName] = [];
        }
        this.data[fieldName].push(...items);
    }
    download() {
        if (!this.enabled)
            return;
        console.log('[SaveAndDownload] 数据已保存到内存:', this.data);
    }
    generateJSContent() {
        return `export default ${JSON.stringify(this.data, null, 2)};`;
    }
    downloadFile(content, fileName, contentType) {
        if (!this.enabled)
            return;
        console.log('[SaveAndDownload] 下载文件:', fileName, contentType);
    }
}

class RenderScheduler {
    TAG = "[RenderScheduler]";
    dataCacheQueue;
    sdk;
    avatarRenderer;
    audioRenderer;
    uiRenderer;
    composition;
    currentSpeechId = -1;
    resourceManager;
    frameAnimationController;
    isStartPlay = false;
    renderState = offline2.RenderState.init;
    onDownloadProgress;
    onRenderChange;
    decoder;
    saveAndDownload;
    lastSpeechId = -1;
    enableClientInterrupt = false;
    setAudioInfo;
    setEventData;
    reportMessage;
    sendSdkPoint;
    constructor(config) {
        this.setAudioInfo = config.setAudioInfo;
        this.setEventData = config.setEventData;
        this.reportMessage = config.reportMessage;
        this.sendSdkPoint = config.sendSdkPoint;
        this.onRenderChange = config.onRenderChange;
        this.enableClientInterrupt = config.enableClientInterrupt || false;
        this.saveAndDownload = new SaveAndDownload("avatarData.js", config.enableDebugger);
        this.resourceManager = config.resourceManager;
        this.sdk = config.sdkInstance;
        this.onDownloadProgress = config.onDownloadProgress;
        this.dataCacheQueue = new DataCacheQueue();
        this.decoder = new ParallelDecoder({
            hardwareAcceleration: config.hardwareAcceleration,
            resourceManager: this.resourceManager,
            saveAndDownload: this.saveAndDownload,
            dataCacheQueue: this.dataCacheQueue,
            reportMessage: this.reportMessage,
        });
        this.avatarRenderer = new AvatarRender({
            dataCacheQueue: this.dataCacheQueue,
            resourceManager: this.resourceManager,
            saveAndDownload: this.saveAndDownload,
            onDownloadProgress: (progress) => {
                this.onDownloadProgress(progress);
            },
            onStateChange: (state) => {
                config.onStateChange(state);
            },
            onRenderChange: (state) => {
                config.onRenderChange(state, this.renderState);
                this.renderState = state;
            },
            sendVideoInfo: config.sendVideoInfo,
            onError: (error) => {
                this.sdk.onMessage(error);
            },
        });
        this.uiRenderer = new UIRenderer({
            sdk: this.sdk,
            dataCacheQueue: this.dataCacheQueue,
            resourceManager: this.resourceManager,
            lastSpeechId: this.lastSpeechId,
            onWalkStateChange: (state) => {
                config.onWalkStateChange(state);
            },
            onVoiceStart: (duration, speech_id) => {
                config.onVoiceStateChange("start", duration);
                this.currentSpeechId = speech_id;
            },
            onVoiceEnd: (speech_id) => {
                if (this.enableClientInterrupt) {
                    this.avatarRenderer.setInterrupt(false);
                }
                this.stopAudio(speech_id);
                config.onVoiceStateChange("end");
            },
            clearSubtitleOn: (speech_id) => {
                this.dataCacheQueue.clearSubtitleOn(speech_id);
            },
            sendSdkPoint: (type, data, extra) => {
                config.sendSdkPoint(type, data, extra);
            },
        });
        this.audioRenderer = new AudioRender({
            sdk: this.sdk,
            dataCacheQueue: this.dataCacheQueue,
            resourceManager: this.resourceManager,
        });
        this.composition = new Composition({
            container: config.container,
            avatarRenderer: this.avatarRenderer,
            restRenderers: [this.uiRenderer],
            audioRenderer: this.audioRenderer,
        });
        this.frameAnimationController = new offline2.FrameAnimationController({
            defaultSpeed: 1,
            frameRate: 24,
            frameCallback: (frame) => {
                config.renderFrameCallback(frame);
                if (this.isStartPlay) {
                    this.composition.compose(frame);
                    this.decoder._tryStartNext();
                }
            },
        });
    }
    init() {
        const mouthShapeLib = this.resourceManager.getMouthShapeLib();
        this.saveAndDownload.writeFields({
            resource_pack: this.resourceManager.resource_pack,
        });
        this.avatarRenderer.init({
            char: mouthShapeLib.char_info,
            LUT: null,
            transform: {
                offsetX: 0.0,
                offsetY: 0.0,
                scaleX: 1.0,
                scaleY: 1.0
            },
            multisample: null
        });
    }
    /**
     * 处理数据：拆解并添加到缓存队列中
     * @param data TTSA 下发的数据
     */
    async handleData(data, type) {
        switch (type) {
            case offline2.EFrameDataType.BODY: {
                // 根据currentFrame查找sf>currentFrame的body数据
                const currentFrame = this.frameAnimationController?.getCurrentFrame() ?? 0;
                let mp4List = [...data].filter((item) => item.ef > currentFrame);
                window.avatarSDKLogger.log(mp4List, "mp4List");
                if (mp4List.length > 0) {
                    // 在暂停状态（隐身模式）下，不检查数据是否过期
                    // 因为此时帧动画暂停但数据仍在接收，可能导致帧索引与数据起始帧不同步
                    if (this.renderState !== offline2.RenderState.paused && this.frameAnimationController?.getCurrentFrame() && this.frameAnimationController?.getCurrentFrame() > data[0].sf && this.frameAnimationController?.getCurrentFrame() > 10) {
                        // 判断非初始场景下，body数据下发过期的情况
                        this.sdk.onMessage({
                            code: offline2.EErrorCode.BODY_DATA_EXPIRED,
                            message: `Error: 身体数据过期 cur:${this.frameAnimationController?.getCurrentFrame()}-sf:${data[0].sf}`,
                            e: JSON.stringify({ data }),
                        });
                    }
                    // 已经插入队列的移除掉
                    this.decoder.decode(mp4List, (file, frame, index) => {
                        // createImageBitmap(frame).then((rgbBitmap) => {
                        if (file.start <= index && file.end >= index) {
                            this.dataCacheQueue._updateBodyImageBitmap({
                                frame,
                                frameIndex: file.startFrameIndex + index,
                                frameState: file.frameState,
                                id: file.id,
                                body_id: file.body_id,
                                name: file.name,
                                hfd: file.hfd,
                                sf: file.startFrameIndex,
                                offset: file?.x_offset[index] || 0,
                            });
                            // 视频获取完成，防止后端下发实际帧数大于需要抽的帧数，避免多余抽帧
                            if (file.endFrameIndex <= file.startFrameIndex + index) {
                                this.decoder.abortOne(`${file.body_id ?? file.id ?? 0}_${file.name}`);
                            }
                        }
                    });
                }
                break;
            }
            case offline2.EFrameDataType.FACE:
                const faceData = this.handleFaceData(data);
                if (faceData.length > 0) {
                    this.saveAndDownload.appendMultipleToArray("faceData", faceData);
                }
                this.dataCacheQueue.checkValidData(faceData, type);
                // https://rsjqcmnt5p.feishu.cn/wiki/UiTUwZRKRiRGitkqDc4c78eUnye
                // 遍历处理完成之后的faceData，根据face_frame_type区分原始数据和实时数据，保存到不同的队列内
                let realFaceData = [], nowFaceData = [];
                for (let i = 0; i < faceData.length; i++) {
                    // face_frame_type 1 实时数据
                    if (!faceData[i]?.face_frame_type) {
                        realFaceData.push(faceData[i]);
                    }
                    else {
                        nowFaceData.push(faceData[i]);
                    }
                    nowFaceData.length && this.dataCacheQueue._updateFacial(nowFaceData);
                    realFaceData.length && this.dataCacheQueue._updateRealFacial(realFaceData);
                }
                break;
            case offline2.EFrameDataType.AUDIO:
                const audioData = data;
                this.setAudioInfo({
                    sf: audioData[0].sf,
                    ef: audioData[0].ef,
                    ad: audioData[0].ad,
                });
                // 在暂停状态（隐身模式）下，不检查音频数据是否过期
                // 因为此时帧动画暂停但数据仍在接收，可能导致帧索引与数据起始帧不同步
                if (this.renderState !== offline2.RenderState.paused && this.frameAnimationController?.getCurrentFrame() && this.frameAnimationController?.getCurrentFrame() > data[0].sf) {
                    this.sdk.onMessage({
                        code: offline2.EErrorCode.AUDIO_DATA_EXPIRED,
                        message: `Error: 音频数据过期 cur:${this.frameAnimationController?.getCurrentFrame()}-sf:${data[0].sf}`,
                        e: JSON.stringify({ data }),
                    });
                    const currentFrame = this.frameAnimationController?.getCurrentFrame();
                    const delta = currentFrame ? currentFrame - data[0].sf : 0;
                    this.reportMessage({
                        code: offline2.EErrorCode.AUDIO_DATA_EXPIRED,
                        message: `Error: 音频数据过期 cur:${this.frameAnimationController?.getCurrentFrame()}-sf:${data[0].sf}`,
                        e: {
                            currentFrame: this.frameAnimationController?.getCurrentFrame(),
                            sf: data[0].sf,
                            ef: delta,
                            timestamp: Date.now(),
                        }
                    });
                    this.sendSdkPoint('audio_data_expired', {
                        currentFrame: this.frameAnimationController?.getCurrentFrame(),
                        sf: data[0].sf,
                        ef: delta,
                        timestamp: Date.now(),
                    });
                    return;
                }
                this.dataCacheQueue.checkValidData(data, type);
                const processedAudioData = data.map((item) => {
                    // raw_audio = true 时，PCM 音频下发，不进行转换
                    if (this.resourceManager.config.raw_audio) {
                        return item;
                    }
                    // raw_audio = false 时，PCM 编码音频下发，进行转换 ArrayBuffer
                    return {
                        ...item,
                        ad: item.ad.buffer.slice(item.ad.byteOffset, item.ad.byteOffset + item.ad.byteLength)
                    };
                    // if (item.ad instanceof Uint8Array) {
                    //   // 检查前几个字节来判断格式
                    //   const header = new Uint8Array(item.ad.slice(0, 12));
                    //   const isWebM = header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3;
                    //   if(isWebM) {
                    //     return {
                    //       ...item,
                    //       ad: item.ad.buffer.slice(item.ad.byteOffset, item.ad.byteOffset + item.ad.byteLength)
                    //     };
                    //   }else {
                    //     return item
                    //   }
                    // }
                });
                // 过期的音频数据，直接丢弃
                if (processedAudioData[0].sid <= this.lastSpeechId) {
                    return;
                }
                if (this.resourceManager.config.raw_audio) {
                    window.avatarSDKLogger?.log(this.TAG, 'processedAudioData[0].sid', processedAudioData[0].sid, this.currentSpeechId, this.renderState);
                    this.audioRenderer.updateAudioData(processedAudioData);
                }
                else {
                    // 临时修复: 先缓存一份数据，用于保留开始播放的时间
                    this.dataCacheQueue._updateAudio(processedAudioData);
                    this.audioRenderer._updateAudio(processedAudioData);
                }
                break;
            case offline2.EFrameDataType.EVENT:
                const d = data;
                this.setEventData({
                    sf: d[0].sf,
                    ef: d[0].ef,
                    event: d[0].e,
                });
                this.dataCacheQueue._updateUiEvent(d);
                break;
            default:
                this.sdk.onMessage({
                    code: offline2.EErrorCode.INVALID_DATA_STRUCTURE,
                    message: `Error: 数据类型错误`,
                    e: JSON.stringify({ data, type }),
                });
        }
    }
    setVolume(volume) {
        this.audioRenderer.setVolume(volume);
    }
    runStartFrameIndex() {
        this.frameAnimationController?.play();
    }
    stateChangeHandle(e) {
        this.dataCacheQueue.currentPlayState = e;
    }
    stopAudio(speech_id) {
        this.audioRenderer.stop(speech_id);
    }
    render() {
        // 如果 pipeline 还未创建，在这里初始化（普通模式初始化时会调用这个方法）
        this.avatarRenderer.initPipeline();
        this.isStartPlay = true;
        this.renderState = offline2.RenderState.rendering;
        this.onRenderChange(this.renderState);
    }
    stop() {
        this.isStartPlay = false;
        this.renderState = offline2.RenderState.stopped;
        this.onRenderChange(this.renderState);
        this.composition.stop();
    }
    /**
     * 暂停渲染（停止渲染循环和音频播放）
     * 但继续接收和处理后端推送的数据并放入缓存队列，避免切换到在线时丢失数据导致丢帧
     */
    pauseRender() {
        if (this.renderState === offline2.RenderState.paused) {
            return;
        }
        // 1. 暂停动画帧循环（保留当前帧索引）
        this.frameAnimationController?.pause();
        this.decoder.abort();
        // 2. 停止并清空音频播放（丢弃所有剩余的音频数据）
        this.audioRenderer.stop(-1); // 传入 -1 清空所有音频数据
        // 3. 清空所有表情数据，避免错误的旧脸部数据与当前身体数据一起渲染导致人脸分离
        // 恢复渲染时会使用最新的脸部数据
        this.dataCacheQueue.clearAllFaceData();
        this.renderState = offline2.RenderState.paused;
        this.onRenderChange(this.renderState);
        window.avatarSDKLogger?.log(this.TAG, `渲染已暂停（已清空表情数据，等待恢复）: ${this.renderState}`);
    }
    /**
     * 恢复渲染
     */
    resumeRender() {
        if (this.renderState !== offline2.RenderState.paused) {
            return;
        }
        // 在恢复渲染时初始化 pipeline（如果在隐身模式时还未创建）
        // 这样可以避免在隐身模式时创建 pipeline 导致的 GPU 资源竞争
        // initPipeline() 内部会检查 pipeline 是否已创建，不会重复初始化
        this.avatarRenderer.initPipeline();
        // 重置表情相关状态，避免从隐身模式恢复时人脸和身体不匹配
        this.avatarRenderer.resetFaceFrameState();
        // 3. 恢复动画帧循环（从暂停时的帧索引继续）
        // 注意：frameAnimationController 会保持暂停时的帧索引，恢复时继续
        this.frameAnimationController?.play();
        this.isStartPlay = true;
        this.forceSyncDecoder();
        // 4. 恢复后立即进入渲染中状态
        this.renderState = offline2.RenderState.resumed;
        this.onRenderChange(this.renderState);
        window.avatarSDKLogger?.log(this.TAG, ' 渲染已恢复，状态: this.currentSpeechId===');
    }
    /**
     * 切换隐身模式（暂停/恢复渲染）
     */
    switchInvisibleMode() {
        if (this.renderState === offline2.RenderState.rendering || this.renderState === offline2.RenderState.resumed) {
            window.avatarSDKLogger?.log(this.TAG, 'switchInvisibleMode: rendering to paused');
            this.pauseRender();
        }
        else if (this.renderState === offline2.RenderState.paused) {
            window.avatarSDKLogger?.log(this.TAG, 'switchInvisibleMode: paused to rendering');
            this.resumeRender();
        }
        else {
            // stopped 或 idle 状态不做任何操作
            window.avatarSDKLogger?.warn(this.TAG, `渲染状态为 ${this.renderState}，无法切换隐身模式`);
        }
    }
    /**
     * 获取渲染状态
     */
    getRenderState() {
        window.avatarSDKLogger?.log(this.TAG, `getRenderState: ${this.renderState}`);
        return this.renderState;
    }
    destroy() {
        this.isStartPlay = false;
        this.frameAnimationController?.destroy();
        this.frameAnimationController = undefined;
        this.dataCacheQueue.destroy();
        this.composition.destroy();
        this.decoder.destroy();
    }
    handleFaceData(data) {
        try {
            const resourcePack = this.resourceManager.resource_pack;
            const framedata_proto_version = this.resourceManager.getConfig().framedata_proto_version;
            const blendshape_map = [...resourcePack.blendshape_map ?? []];
            const face_list = data.map((item) => {
                let bsw_list = [];
                const { body_id, sf, ef, s: state, id, js, bsw, ms, face_frame_type } = item;
                let mesh = [];
                if (blendshape_map?.length > 0) {
                    for (let i = 0; i < blendshape_map.length; i++) {
                        const blendshape_map_item = blendshape_map[i];
                        if (blendshape_map_item?.length > 0) {
                            for (let j = 0; j < blendshape_map_item.length; j++) {
                                if (!bsw_list[i]) {
                                    bsw_list[i] = [];
                                }
                                bsw_list[i][j] = bsw[blendshape_map_item[j]];
                            }
                        }
                    }
                    if (!framedata_proto_version) {
                        mesh = Array.from({ length: ms.length }, (_, index) => ({
                            blendshapeWeights: bsw_list[index],
                            textureModelIndex: ms[index]?.[0] ?? 0,
                            texturePCAWeights: ms[index]?.[1] ?? [],
                        }));
                    }
                    else {
                        mesh = Array.from({ length: ms.length }, (_, index) => ({
                            blendshapeWeights: bsw_list[index],
                            textureModelIndex: ms[index]?.index ?? 0,
                            texturePCAWeights: ms[index]?.weights ?? [],
                        }));
                    }
                }
                else {
                    if (!framedata_proto_version) {
                        mesh = Array.from({ length: ms.length }, (_, index) => ({
                            // blendshape_map 内容如[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],[44,45,8,10,12],[44,45,9,11,13],[44,45]]
                            // 在遍历时，需要根据 blendshape_map 的索引，将 bsw 中的值替换为 blendshape_map 中索引的值
                            blendshapeWeights: index === 0 ? bsw : [],
                            textureModelIndex: ms[index]?.[0] ?? 0, // 增加可选链和默认值，防止越界
                            texturePCAWeights: ms[index]?.[1] ?? [],
                        }));
                    }
                    else {
                        mesh = Array.from({ length: ms.length }, (_, index) => ({
                            // blendshape_map 内容如[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],[44,45,8,10,12],[44,45,9,11,13],[44,45]]
                            // 在遍历时，需要根据 blendshape_map 的索引，将 bsw 中的值替换为 blendshape_map 中索引的值
                            blendshapeWeights: index === 0 ? bsw : [],
                            textureModelIndex: ms[index]?.index ?? 0, // 增加可选链和默认值，防止越界
                            texturePCAWeights: ms[index]?.weights ?? [],
                        }));
                    }
                }
                let movableJointTransforms = [];
                if (!framedata_proto_version) {
                    movableJointTransforms = js.map((joint) => offline2.formatMJT(joint[0], joint[1]));
                }
                else {
                    movableJointTransforms = js.map((joint) => offline2.formatMJT(joint.translate, joint.rotate));
                }
                return {
                    body_id,
                    frameIndex: sf,
                    sf,
                    ef,
                    state,
                    id,
                    face_frame_type,
                    FaceFrameData: {
                        mesh,
                        movableJointTransforms,
                        blendshapeWeights: bsw,
                    },
                };
            });
            return face_list;
        }
        catch (error) {
            this.sdk.onMessage({
                code: offline2.EErrorCode.FACE_PROCESSING_ERROR,
                message: `Error: 表情数据处理失败`,
                e: JSON.stringify({ error }),
            });
            return [];
        }
    }
    forceSyncDecoder() {
        const currentFrameIndex = this.frameAnimationController?.getCurrentFrame();
        if (currentFrameIndex) {
            this.decoder.syncDecode(currentFrameIndex);
        }
    }
    _reload() {
        this.decoder._reload();
    }
    _getResumeInfo() {
        const frame = this.frameAnimationController?.getCurrentFrame();
        return this.avatarRenderer._getCurrentBodyFrameInfo(frame || 0);
    }
    sendVoiceEnd() {
        const currentFrameIndex = this.frameAnimationController?.getCurrentFrame() ?? 0 + 1;
        this.dataCacheQueue._updateUiEvent([{
                "id": 0,
                "s": "",
                "sf": currentFrameIndex,
                "ef": currentFrameIndex + 1,
                "e": [
                    {
                        "type": "voice_end",
                    },
                ]
            }]);
    }
    _offlineMode() {
        const speech_id = this.audioRenderer.speech_id;
        this.dataCacheQueue._updateUiEvent([{
                "id": 0,
                "s": "",
                "sf": this.frameAnimationController?.getCurrentFrame() ?? 0 + 1,
                "ef": this.frameAnimationController?.getCurrentFrame() ?? 0 + 2,
                "e": [
                    {
                        "type": "subtitle_off",
                        "speech_id": speech_id
                    },
                ]
            }]);
        this.audioRenderer.pause();
        this.uiRenderer.destroy();
        const frame = this.frameAnimationController?.getCurrentFrame();
        if (frame) {
            this.decoder._offLineMode(this.resourceManager._getOfflineIdle(), frame);
        }
    }
    _offlineRun() {
        this.decoder._offlineRun();
        this.dataCacheQueue.clearAllFaceData();
    }
    ttsaStateChangeHandle(state) {
        this.dataCacheQueue.currentTtsaState = state;
    }
    resume() {
        this.audioRenderer.resume();
    }
    /**
     * 设置数字人canvas的显隐状态
     * @param visible 是否可见
     */
    setAvatarCanvasVisible(visible) {
        this.avatarRenderer.setCanvasVisibility(visible);
    }
    setCharacterCanvasLayout(layout) {
        this.avatarRenderer.setCharacterCanvasAnchor(layout);
    }
    interrupt(type) {
        // 插入中断字幕和语音结束事件
        const speech_id = this.audioRenderer.speech_id;
        if (type === "in_offline_mode") {
            this.lastSpeechId = -1;
        }
        else {
            this.lastSpeechId = speech_id;
        }
        if (type !== "speak" && type !== "in_offline_mode") {
            this.avatarRenderer.setInterrupt(true);
        }
        this.dataCacheQueue._clearAudio(speech_id);
        this.dataCacheQueue.clearSubtitleOn(speech_id);
        this.dataCacheQueue._updateUiEvent([{
                "id": 0,
                "s": "",
                "sf": this.frameAnimationController?.getCurrentFrame() ?? 0 + 1,
                "ef": this.frameAnimationController?.getCurrentFrame() ?? 0 + 2,
                "e": [
                    {
                        "type": "subtitle_off",
                        "speech_id": speech_id
                    },
                ]
            }]);
        // 中断音频播放
        if (type !== "in_offline_mode") {
            this.audioRenderer.stop(speech_id);
        }
    }
}

/**
 * WebSocket 模块，即 TTSA 服务
 */
const proxyProtobuf = protobuf.roots.default;
const pointNameObj = {
    'connect_sdk': '连接SDK',
    'connect_sdk_success': '连接SDK成功',
    'llm_text_sdk_received': '大模型输出的文本SDK前端收到',
    'rendering_data_received': '客户端收到音频数据时间',
    'rendering_display': '客户端播放音频数据时间',
    'close_session': '关闭会话',
    'audio_data_expired': '音频数据过期',
};
class Ttsa {
    TAG = "[TTSA]";
    ws;
    room;
    session_id;
    token;
    framedata_proto_version;
    getResumeInfo;
    runStartFrameIndex;
    ttsaStateChangeHandle;
    sdk;
    reloadSuccess;
    _lastSessionId = "";
    _uniqueSpeakId;
    session_speak_req_id;
    enterOfflineMode;
    reStartSDK;
    reconnect_client_timeout;
    reconnectTimer = -1;
    wsConnectTimer = 0;
    WS_NO_DATA_TIMEOUT = 30000;
    enterOfflineFlag = false;
    sendVoiceEnd;
    /**
     * 清除WebSocket重连定时器
     */
    clearReconnectTimer() {
        if (this.reconnectTimer !== -1) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = -1;
        }
    }
    _isResume = false;
    appInfo;
    constructor(options) {
        this.appInfo = options.appInfo;
        this.sdk = options.sdkInstance;
        this.room = options.room;
        this.session_id = options.session_id;
        this.token = options.token;
        this.framedata_proto_version = options.framedata_proto_version;
        this._uniqueSpeakId = 0;
        this.runStartFrameIndex = options.runStartFrameIndex;
        this.ttsaStateChangeHandle = options.ttsaStateChangeHandle;
        this.reloadSuccess = options.reloadSuccess;
        this.session_speak_req_id = 0;
        this.enterOfflineMode = options.enterOfflineMode;
        this.reStartSDK = options.reStartSDK;
        this.reconnect_client_timeout = options.reconnect_client_timeout;
        this.sendVoiceEnd = options.sendVoiceEnd;
        const ws = vendor.lookup(options.url, {
            query: {
                token: this.token,
            },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 1000,
            randomizationFactor: 0.3
        });
        ws.on("connect", () => {
            // 连接成功时清理重连定时器
            this.clearReconnectTimer();
            this.initWsTimeoutTimer();
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.ttsa_connect);
            const payload = {
                room: this.room,
                client_type: "web",
                invisible_mode: this.sdk.getPendingInvisibleMode(),
            };
            // TODO: 临时处理，待后端修复
            if (this.sdk.getStatus() === offline2.AvatarStatus.offline) {
                this.sdk.onStatusChange(offline2.AvatarStatus.online);
            }
            this.send("enter_room", payload);
        });
        ws.on("first_start_timestamp", (e) => {
            window.avatarSDKLogger.log(this.TAG, "first_start_timestamp", e);
            // 前端在发送first_start_timestamp后运行帧索引
            this.firstStartTimestamp(e.server_time);
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.ttsa_ready);
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.ttsa_body_res);
            window.avatarSDKLogger.log(this.TAG, 'ready');
            this.reloadSuccess();
            options.onReady();
        });
        ws.on("state_change", (e) => {
            this.ttsaStateChangeHandle(e);
        });
        ws.on("tts_audio", (e) => {
            try {
                const decodedData = vendor.msgpack_min.decode(e);
                this.sendSdkPoint('rendering_data_received', { multi_turn_conversation_id: decodedData[0].multi_turn_conversation_id });
                window.avatarSDKLogger.log(this.TAG, "下发音频数据tts_audio", decodedData);
                options.handleMessage(offline2.EFrameDataType.AUDIO, decodedData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: offline2.EErrorCode.AUDIO_DECODE_ERROR,
                    message: `Error: 音频数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("face_data", async (e) => {
            try {
                if (!this.framedata_proto_version) {
                    const faceDecodeData = vendor.msgpack_min.decode(e);
                    window.avatarSDKLogger.log(this.TAG, "face_data", faceDecodeData);
                    if (faceDecodeData[0].s !== 'speak' && this.enterOfflineFlag) {
                        // 发送voice_end
                        this.sendVoiceEnd();
                        this.enterOfflineFlag = false;
                    }
                    options.handleMessage(offline2.EFrameDataType.FACE, faceDecodeData);
                }
                else {
                    let frameList = [];
                    const uint8Array = new Uint8Array(e);
                    const decompressed = vendor.pako.inflate(uint8Array);
                    const FaceFrameDataList = proxyProtobuf.FaceFrameDataList.decode(decompressed, undefined, () => { });
                    const faceFrameList = FaceFrameDataList.toJSON() || { data: [] };
                    frameList = faceFrameList.data.map((frame) => {
                        // 1. 解析 JointData 实例（转为普通对象 + 解码 float16）
                        const joints = (frame.js || []).map((joint) => {
                            // joint 是 protobuf 生成的 JointData 实例，直接访问字段
                            return {
                                translate: joint.translate || [], // float32 无需解码，直接提取
                                rotate: joint.rotate ? offline2.scaledInt16BytesToFloat32(joint.rotate) : []
                            };
                        });
                        // 2. 解析 MeshData 实例（转为普通对象 + 解码 float16）
                        const meshes = (frame.ms || []).map((mesh) => {
                            return {
                                index: mesh.index || 0,
                                weights: mesh.weights || []
                            };
                        });
                        return {
                            ...frame,
                            bsw: frame.bsw ? offline2.scaledInt16BytesToFloat32(frame.bsw) : [],
                            js: joints,
                            ms: meshes,
                            body_id: frame.bodyId || 0, // proto 中的 body_id → 编译后 bodyId（驼峰）
                            face_frame_type: frame.faceFrameType || 0
                        };
                    });
                    options.handleMessage(offline2.EFrameDataType.FACE, frameList);
                    if (frameList[0].s !== 'speak' && this.enterOfflineFlag) {
                        // 发送voice_end
                        this.sendVoiceEnd();
                        this.enterOfflineFlag = false;
                    }
                    // const faceDecodeData = decode(e) as ITtsFaceFrameData[];
                    window.avatarSDKLogger.log(this.TAG, "face_data", frameList);
                }
            }
            catch (error) {
                this.sdk.destroy();
                this.sdk.onMessage({
                    code: offline2.EErrorCode.FACE_DECODE_ERROR,
                    message: `Error: 表情数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("body_data", (e) => {
            try {
                // 清空离线mode
                let bodyDecodeData = vendor.msgpack_min.decode(e);
                (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.start_action_res, bodyDecodeData[0].s);
                const cBody = bodyDecodeData.map(item => ({
                    ...item,
                    x_offset: []
                }));
                window.avatarSDKLogger.log(this.TAG, "body_data", JSON.stringify(cBody), new Date().getTime());
                (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(offline2.performanceConstant.ttsa_body_res);
                options.handleMessage(offline2.EFrameDataType.BODY, bodyDecodeData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: offline2.EErrorCode.VIDEO_DECODE_ERROR,
                    message: `Error: 身体数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("event_data", (e) => {
            try {
                const decodeData = vendor.msgpack_min.decode(e);
                window.avatarSDKLogger.log(this.TAG, "event_data", JSON.stringify(decodeData));
                options.handleMessage(offline2.EFrameDataType.EVENT, decodeData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: offline2.EErrorCode.EVENT_DECODE_ERROR,
                    message: `Error: 事件数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("aa_frame", (e) => {
            window.avatarSDKLogger.log(this.TAG, "下发机器人视频帧aa_frame", e);
            options.handleAAFrame(e);
        });
        ws.on("error_message", (e) => {
            this.sdk.onMessage({
                code: offline2.EErrorCode.TTSA_ERROR,
                message: `${e.msg || 'TTSA返回异常'}`,
                e: JSON.stringify({ e }),
            });
        });
        ws.on("disconnect", (e) => {
            console.log("socket断开（disconnect）", e);
            this.clearOldWsTimeoutTimer();
            if (e === 'io client disconnect') {
                return;
            }
            window.avatarSDKLogger.warn(this.TAG, `${options.url} 已断开`, "disconnect原因", e);
            this.enterOfflineFlag = true;
            if (this.sdk.getStatus() === offline2.AvatarStatus.offline) {
                // 已进入离线模式，不销毁
                this.sdk.onStatusChange(offline2.AvatarStatus.offline);
            }
            else {
                // 无网断开则进入离线模式
                this.enterOfflineMode();
            }
            // else if (navigator.onLine && this.sdk.isDestroyed()) {
            // // 非离线模式 NetworkMonitor.ONLINE 且 sdk 销毁时，触发 close
            //   this.sdk.onStatusChange(AvatarStatus.close);
            // } else if (!this.sdk.isDestroyed()) {
            //   this.sdk.destroyClient();
            //   this.sdk.onStatusChange(AvatarStatus.close);
            // }
            // 发起定时器，getReconnectClientTimeout时间内重连socket，超过时间则发起reStartSession
            // 只有在网络断开时才设置重连定时器，网络恢复时由NetworkMonitor处理
            if (!navigator.onLine) {
                this.reconnectTimer = window.setTimeout(() => {
                    try {
                        ws.disconnect();
                    }
                    catch (error) {
                        window.avatarSDKLogger.warn(this.TAG, "disconnect error", error);
                    }
                    this.sdk.stopSessionFromSocket("WS_TIMEOUT");
                    this.reStartSDK();
                }, this.reconnect_client_timeout * 1000);
            }
        });
        ws.on("client_quit", (e) => {
            window.avatarSDKLogger.warn(this.TAG, "client_quit", "断开原因", e);
            ws.disconnect();
            this.session_speak_req_id = 0;
            if (Object.keys(e).length) {
                this.sdk.onMessage({
                    code: offline2.EErrorCode.STOP_SESSION_ERROR,
                    message: `ttsa主动关闭 reason: ${JSON.stringify({ e })}`,
                    e: JSON.stringify({ e }),
                });
            }
            // 字符库加载失败，进入离线模式
            if (e?.stop_reason !== 'user' && e?.stop_reason !== 'char_bin_load_error' && e?.stop_reason !== 'admin kick' && e?.stop_reason !== 'nebula admin stop') {
                if (this.sdk.getStatus() === offline2.AvatarStatus.offline) {
                    // 已进入离线模式，不销毁
                    this.sdk.onStatusChange(offline2.AvatarStatus.offline);
                }
                else {
                    // 无网断开则进入离线模式
                    this.enterOfflineMode();
                }
                this.reStartSDK();
            }
            else {
                this.sdk.destroyClient();
                this.sdk.onStatusChange(offline2.AvatarStatus.close);
            }
        });
        ws.on("connect_error", (e) => {
            this.sdk.onMessage({
                code: offline2.EErrorCode.CONNECT_SOCKET_ERROR,
                message: `Error: socket连接失败`,
                e: JSON.stringify({ e }),
            });
        });
        ws.onAny((event, args) => {
            window.avatarSDKLogger.log(this.TAG, "ws onAny", event, args);
            this.initWsTimeoutTimer();
        });
        this.ws = ws;
    }
    clearOldWsTimeoutTimer = () => {
        if (this.wsConnectTimer) {
            clearTimeout(this.wsConnectTimer);
            this.wsConnectTimer = 0; // 重置为初始值 0，保持状态统一
        }
    };
    initWsTimeoutTimer = () => {
        this.clearOldWsTimeoutTimer();
        this.wsConnectTimer = window.setTimeout(async () => {
            try {
                this.sdk.onMessage({
                    code: offline2.EErrorCode.CONNECT_SOCKET_ERROR,
                    message: `Error: socket长时间未下发数据`,
                });
                if (this.session_id) {
                    await this.sdk.stopSessionFromSocket("WS_NO_DATA_TIMEOUT");
                    this.ws.disconnect();
                }
                this.reStartSDK();
            }
            finally {
                this.clearOldWsTimeoutTimer();
            }
        }, this.WS_NO_DATA_TIMEOUT);
    };
    start() {
        if (this._isResume) {
            this._isResume = false;
            return;
        }
        this.stateChange("interactive_idle");
    }
    idle() {
        this.stateChange("idle");
    }
    // faceDetect() {
    //   this.stateChange("face_detect");
    // }
    // wakeUp() {
    //   this.stateChange("wake_up");
    // }
    listen() {
        this.stateChange("listen");
    }
    think() {
        this.stateChange("think");
    }
    // skill(action_semantic: string) {
    //   this.stateChange("skill",{
    //     action_semantic
    //   });
    // }
    // exitInteraction() {
    //   this.stateChange("exit_interaction");
    // }
    // touchReact() {
    //   this.stateChange("touch_react");
    // }
    interactiveidle() {
        this.stateChange("interactive_idle");
    }
    /**
     * 通知后端进入隐身模式
     */
    enterInvisibleMode() {
        this.send('switch_invisible_mode', { session_id: this.session_id, invisible_mode: true });
    }
    /**
     * 通知后端退出隐身模式
     */
    exitInvisibleMode() {
        this.send('switch_invisible_mode', { session_id: this.session_id, invisible_mode: false });
    }
    firstStartTimestamp(server_time) {
        const client_time = Date.now() / 1000;
        const payload = {
            server_time,
            client_time,
        };
        const resumeInfo = this._getResumeInfo();
        if (this._isResume && resumeInfo && resumeInfo.client_frame > 0) {
            payload['resume_from_offline_idle'] = resumeInfo;
        }
        else {
            // 数据异常，重置_isResume
            this._isResume = false;
        }
        this.runStartFrameIndex(client_time);
        this.send("first_start_timestamp", payload);
    }
    sendText(ssml, is_start, is_end, extra = {}) {
        if (!this.ws.connected) {
            return;
        }
        const payload = {
            ssml,
            is_start,
            is_end,
            extra,
            multi_turn_conversation_id: this.getUniqueSpeakId(),
            session_speak_req_id: this.session_speak_req_id
        };
        this.sendSdkPoint('llm_text_sdk_received', {
            ...extra,
            is_start,
            is_end,
            content: { ssml },
            multi_turn_conversation_id: this.getUniqueSpeakId(),
            speak_id: this.session_speak_req_id++,
        });
        if (is_start) {
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.start_action_res, 'speak');
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.start_action_render, 'speak');
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.voice_response_play, 'speak');
        }
        if (is_end) {
            this.updateUniqueSpeakId();
        }
        this.send("send_text", payload);
    }
    sendSdkPoint(name, params = {}, extra) {
        this.send("sdk_burial_point", {
            ...params,
            ...extra,
            ...this.appInfo,
            burial_type: 1,
            session_id: this.session_id,
            event_en_name: name,
            event_cn_name: pointNameObj[name],
            device: navigator.userAgent,
            timestamp: params.timestamp || Date.now(),
            // @ts-ignore
            sdkVersion: "0.1.0-beta.1",
        });
    }
    stateChange(state, params) {
        const payload = {
            state,
            params: params || {},
        };
        (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.start_action_res, state);
        (typeof window !== "undefined" ? window : globalThis).performanceTracker.markStart(offline2.performanceConstant.start_action_render, state);
        this.send("state_change", payload);
    }
    sendPerfLog(payload) {
        this.ws.emit('perf_log', {
            payload,
            sessionId: this._lastSessionId,
        });
    }
    changeLayout(layout) {
        this.send("change_layout", layout);
    }
    changeWalkConfig(walkConfig) {
        this.send("walk_config", walkConfig);
    }
    send(event, payload) {
        if (!this.ws.connected) {
            return;
        }
        this.ws.emit(event, payload);
    }
    getStatus() {
        return this.ws.connected;
    }
    _setResumeInfoCallback(lastSessionId, _getResumeInfo) {
        this._isResume = true;
        this._lastSessionId = lastSessionId;
        this.getResumeInfo = _getResumeInfo;
    }
    _getResumeInfo() {
        if (this.getResumeInfo) {
            const resumeInfo = this.getResumeInfo();
            if (this._lastSessionId) {
                resumeInfo['last_session_id'] = this._lastSessionId;
            }
            return resumeInfo;
        }
        return null;
    }
    updateUniqueSpeakId() {
        this._uniqueSpeakId += 1;
    }
    getUniqueSpeakId() {
        return `${this._uniqueSpeakId}-${this.session_id}`;
    }
    close() {
        // 使用 disconnect() 而不是 close()，disconnect() 会停止所有重连尝试
        if (this.ws) {
            this.ws.disconnect();
        }
        this.clearOldWsTimeoutTimer();
        this.session_speak_req_id = 0;
        if (this.reconnectTimer !== -1) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = -1;
        }
    }
    connect() {
        this.ws.connect();
    }
}

exports.RenderScheduler = RenderScheduler;
exports.ResourceManager = ResourceManager;
exports.Ttsa = Ttsa;
//# sourceMappingURL=xmov-avatar-mp.heavy.offline1.js.map

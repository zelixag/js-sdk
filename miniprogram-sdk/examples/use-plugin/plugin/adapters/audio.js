/**
 * 音频适配层 - 小程序版本
 * 使用小程序音频 API 替代 Web Audio API
 */
/**
 * 小程序音频播放器
 * 替代 AudioWorklet 和 Web Audio API
 */
export class MiniProgramAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.volume = 1.0;
        this.sampleRate = 24000; // 默认采样率
        this.onPlayCallback = null;
        this.onPauseCallback = null;
        this.onStopCallback = null;
        this.onEndedCallback = null;
        this.onErrorCallback = null;
        this.audioContext = wx.createInnerAudioContext();
        this._setupEventHandlers();
    }
    _setupEventHandlers() {
        if (!this.audioContext)
            return;
        this.audioContext.onPlay(() => {
            this.isPlaying = true;
            this.isPaused = false;
            if (this.onPlayCallback) {
                this.onPlayCallback();
            }
        });
        this.audioContext.onPause(() => {
            this.isPaused = true;
            this.isPlaying = false;
            if (this.onPauseCallback) {
                this.onPauseCallback();
            }
        });
        this.audioContext.onStop(() => {
            this.isPlaying = false;
            this.isPaused = false;
            if (this.onStopCallback) {
                this.onStopCallback();
            }
        });
        this.audioContext.onEnded(() => {
            this.isPlaying = false;
            if (this.onEndedCallback) {
                this.onEndedCallback();
            }
        });
        this.audioContext.onError((err) => {
            console.error('[Audio] Error:', err);
            if (this.onErrorCallback) {
                this.onErrorCallback(err);
            }
        });
    }
    /**
     * 设置音频源（URL 或文件路径）
     */
    setSrc(src) {
        if (this.audioContext) {
            this.audioContext.src = src;
        }
    }
    /**
     * 播放音频
     */
    play() {
        if (this.audioContext) {
            this.audioContext.play();
        }
    }
    /**
     * 暂停播放
     */
    pause() {
        if (this.audioContext) {
            this.audioContext.pause();
        }
    }
    /**
     * 停止播放
     */
    stop() {
        if (this.audioContext) {
            this.audioContext.stop();
        }
    }
    /**
     * 设置音量（0-1）
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioContext) {
            this.audioContext.volume = this.volume;
        }
    }
    /**
     * 获取音量
     */
    getVolume() {
        return this.volume;
    }
    /**
     * 设置播放位置（秒）
     */
    seek(position) {
        if (this.audioContext) {
            this.audioContext.seek(position);
        }
    }
    /**
     * 获取当前播放位置（秒）
     */
    getCurrentTime() {
        return this.audioContext?.currentTime || 0;
    }
    /**
     * 获取音频时长（秒）
     */
    getDuration() {
        return this.audioContext?.duration || 0;
    }
    /**
     * 监听播放事件
     */
    onPlay(callback) {
        this.onPlayCallback = callback;
    }
    /**
     * 监听暂停事件
     */
    onPause(callback) {
        this.onPauseCallback = callback;
    }
    /**
     * 监听停止事件
     */
    onStop(callback) {
        this.onStopCallback = callback;
    }
    /**
     * 监听播放结束事件
     */
    onEnded(callback) {
        this.onEndedCallback = callback;
    }
    /**
     * 监听错误事件
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }
    /**
     * 销毁音频上下文
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.stop();
            this.audioContext.destroy();
            this.audioContext = null;
        }
        this.onPlayCallback = null;
        this.onPauseCallback = null;
        this.onStopCallback = null;
        this.onEndedCallback = null;
        this.onErrorCallback = null;
    }
}
/**
 * PCM 音频播放器（小程序版本）
 * 由于小程序不支持 AudioWorklet，需要将 PCM 数据转换为音频文件或使用其他方案
 */
export class MiniProgramPCMPlayer {
    constructor(sampleRate = 24000) {
        this.audioContext = null;
        this.pcmCache = new Uint8Array(0);
        this.isPlaying = false;
        this.sampleRate = 24000;
        this.volume = 1.0;
        this.sampleRate = sampleRate;
        this.audioContext = wx.createInnerAudioContext();
    }
    /**
     * 添加 PCM 数据
     * 注意：小程序中需要将 PCM 转换为可播放的音频格式
     * 可以使用服务器端转换，或者使用小程序插件
     */
    addPCMData(pcmData) {
        // 合并到缓存
        const newCache = new Uint8Array(this.pcmCache.length + pcmData.length);
        newCache.set(this.pcmCache, 0);
        newCache.set(pcmData, this.pcmCache.length);
        this.pcmCache = newCache;
        // TODO: 实现 PCM 到音频的转换
        // 方案1：使用服务器端转换服务
        // 方案2：使用小程序音频插件
        // 方案3：在主线程中处理（性能较差）
    }
    /**
     * 开始播放
     */
    start() {
        this.isPlaying = true;
        // TODO: 实现播放逻辑
    }
    /**
     * 停止播放
     */
    stop() {
        this.isPlaying = false;
        if (this.audioContext) {
            this.audioContext.stop();
        }
    }
    /**
     * 设置音量
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioContext) {
            this.audioContext.volume = this.volume;
        }
    }
    /**
     * 销毁
     */
    destroy() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.destroy();
            this.audioContext = null;
        }
        this.pcmCache = new Uint8Array(0);
    }
}

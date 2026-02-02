/**
 * 音频适配层 - 小程序版本
 * 使用小程序音频 API 替代 Web Audio API
 */
/**
 * 小程序音频播放器
 * 替代 AudioWorklet 和 Web Audio API
 */
export declare class MiniProgramAudioPlayer {
    private audioContext;
    private isPlaying;
    private isPaused;
    private volume;
    private sampleRate;
    private onPlayCallback;
    private onPauseCallback;
    private onStopCallback;
    private onEndedCallback;
    private onErrorCallback;
    constructor();
    private _setupEventHandlers;
    /**
     * 设置音频源（URL 或文件路径）
     */
    setSrc(src: string): void;
    /**
     * 播放音频
     */
    play(): void;
    /**
     * 暂停播放
     */
    pause(): void;
    /**
     * 停止播放
     */
    stop(): void;
    /**
     * 设置音量（0-1）
     */
    setVolume(volume: number): void;
    /**
     * 获取音量
     */
    getVolume(): number;
    /**
     * 设置播放位置（秒）
     */
    seek(position: number): void;
    /**
     * 获取当前播放位置（秒）
     */
    getCurrentTime(): number;
    /**
     * 获取音频时长（秒）
     */
    getDuration(): number;
    /**
     * 监听播放事件
     */
    onPlay(callback: () => void): void;
    /**
     * 监听暂停事件
     */
    onPause(callback: () => void): void;
    /**
     * 监听停止事件
     */
    onStop(callback: () => void): void;
    /**
     * 监听播放结束事件
     */
    onEnded(callback: () => void): void;
    /**
     * 监听错误事件
     */
    onError(callback: (err: any) => void): void;
    /**
     * 销毁音频上下文
     */
    destroy(): void;
}
/**
 * PCM 音频播放器（小程序版本）
 * 由于小程序不支持 AudioWorklet，需要将 PCM 数据转换为音频文件或使用其他方案
 */
export declare class MiniProgramPCMPlayer {
    private audioContext;
    private pcmCache;
    private isPlaying;
    private sampleRate;
    private volume;
    constructor(sampleRate?: number);
    /**
     * 添加 PCM 数据
     * 注意：小程序中需要将 PCM 转换为可播放的音频格式
     * 可以使用服务器端转换，或者使用小程序插件
     */
    addPCMData(pcmData: Uint8Array): void;
    /**
     * 开始播放
     */
    start(): void;
    /**
     * 停止播放
     */
    stop(): void;
    /**
     * 设置音量
     */
    setVolume(volume: number): void;
    /**
     * 销毁
     */
    destroy(): void;
}

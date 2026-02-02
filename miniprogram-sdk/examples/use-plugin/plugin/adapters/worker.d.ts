/**
 * Worker 适配层 - 小程序版本
 * 小程序 Worker 需要单独文件，不能使用 Blob URL
 */
/**
 * 创建 Worker
 * 小程序中 Worker 必须使用文件路径，不能使用 Blob URL
 */
export declare function createWorker(scriptPath: string): WechatMiniprogram.Worker;
/**
 * 小程序 Worker 通信封装
 */
export declare class MiniProgramWorker {
    private worker;
    private messageHandlers;
    constructor(scriptPath: string);
    private _setupMessageHandler;
    /**
     * 发送消息到 Worker
     */
    postMessage(message: any): void;
    /**
     * 监听 Worker 消息
     */
    onMessage(type: string, handler: (data: any) => void): void;
    /**
     * 移除消息监听
     */
    offMessage(type: string, handler?: (data: any) => void): void;
    /**
     * 终止 Worker
     */
    terminate(): void;
}
/**
 * 注意：小程序 Worker 的限制
 * 1. Worker 文件必须放在项目根目录的 workers 目录下
 * 2. Worker 文件不能使用相对路径引用其他文件（除了 npm 包）
 * 3. Worker 中不能使用 wx API（除了 console）
 * 4. Worker 中不能使用 Canvas、WebGL 等
 *
 * 因此，视频解码等需要特殊处理：
 * - 方案1：在主线程中处理（性能较差）
 * - 方案2：使用云函数处理（需要服务器支持）
 * - 方案3：使用小程序插件（如果有相关插件）
 */

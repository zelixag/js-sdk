/**
 * Worker 适配层 - 小程序版本
 * 小程序 Worker 需要单独文件，不能使用 Blob URL
 */

/**
 * 创建 Worker
 * 小程序中 Worker 必须使用文件路径，不能使用 Blob URL
 */
export function createWorker(scriptPath: string): WechatMiniprogram.Worker {
  try {
    return wx.createWorker(scriptPath);
  } catch (err) {
    console.error('[Worker] Create worker error:', err);
    throw err;
  }
}

/**
 * 小程序 Worker 通信封装
 */
export class MiniProgramWorker {
  private worker: WechatMiniprogram.Worker;
  private messageHandlers: Map<string, Set<Function>> = new Map();

  constructor(scriptPath: string) {
    this.worker = createWorker(scriptPath);
    this._setupMessageHandler();
  }

  private _setupMessageHandler(): void {
    this.worker.onMessage((res: any) => {
      const { type, data } = res;
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error(`[Worker] Message handler error (${type}):`, err);
          }
        });
      }
    });
  }

  /**
   * 发送消息到 Worker
   */
  postMessage(message: any): void {
    this.worker.postMessage(message);
  }

  /**
   * 监听 Worker 消息
   */
  onMessage(type: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  /**
   * 移除消息监听
   */
  offMessage(type: string, handler?: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) return;

    if (handler) {
      this.messageHandlers.get(type)!.delete(handler);
    } else {
      this.messageHandlers.delete(type);
    }
  }

  /**
   * 终止 Worker
   */
  terminate(): void {
    this.worker.terminate();
    this.messageHandlers.clear();
  }
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

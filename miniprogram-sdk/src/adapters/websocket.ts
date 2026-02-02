/**
 * WebSocket 适配层 - 小程序版本
 * 使用 wx.connectSocket 替代 socket.io-client
 */

export interface WebSocketOptions {
  url: string;
  protocols?: string[];
  header?: Record<string, string>;
  timeout?: number;
  query?: Record<string, string>; // socket.io 兼容：查询参数
  transports?: string[]; // socket.io 兼容：传输方式
  reconnection?: boolean; // socket.io 兼容：是否自动重连
  reconnectionAttempts?: number; // socket.io 兼容：最大重连次数
  reconnectionDelay?: number; // socket.io 兼容：重连延迟
  reconnectionDelayMax?: number; // socket.io 兼容：最大重连延迟
  randomizationFactor?: number; // socket.io 兼容：随机因子
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

/**
 * 小程序 WebSocket 封装
 * 兼容 socket.io 的部分 API
 */
export class MiniProgramWebSocket {
  private socketTask: WechatMiniprogram.SocketTask | null = null;
  private url: string;
  private protocols?: string[];
  private header?: Record<string, string>;
  private timeout?: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectDelayMax = 5000;
  private randomizationFactor = 0.5;
  private reconnectTimer: number | null = null;
  private isManualClose = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private anyListeners: Set<Function> = new Set(); // socket.io 的 onAny 监听器
  private messageQueue: any[] = [];
  private query?: Record<string, string>;

  // 兼容 socket.io 的属性
  public connected = false;
  public disconnected = true;
  public id: string | null = null;

  constructor(options: WebSocketOptions) {
    // 处理 query 参数，将其添加到 URL
    let url = options.url;
    if (options.query) {
      this.query = options.query;
      const queryString = Object.entries(options.query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    this.url = url;
    this.protocols = options.protocols;
    this.header = options.header;
    this.timeout = options.timeout || 30000;
    
    // socket.io 兼容选项
    if (options.reconnection !== undefined) {
      // 如果禁用重连，设置最大重连次数为 0
      if (!options.reconnection) {
        this.maxReconnectAttempts = 0;
      }
    }
    if (options.reconnectionAttempts !== undefined) {
      this.maxReconnectAttempts = options.reconnectionAttempts === Infinity ? 999999 : options.reconnectionAttempts;
    }
    if (options.reconnectionDelay !== undefined) {
      this.reconnectDelay = options.reconnectionDelay;
    }
    if (options.reconnectionDelayMax !== undefined) {
      this.reconnectDelayMax = options.reconnectionDelayMax;
    }
    if (options.randomizationFactor !== undefined) {
      this.randomizationFactor = options.randomizationFactor;
    }
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    this.isManualClose = false;
    this._connect();
  }

  private _connect(): void {
    try {
      this.socketTask = wx.connectSocket({
        url: this.url,
        protocols: this.protocols,
        header: this.header,
        timeout: this.timeout
      });

      this.socketTask.onOpen(() => {
        this.connected = true;
        this.disconnected = false;
        this.reconnectAttempts = 0;
        this.id = Math.random().toString(36).substring(7);
        
        // 发送队列中的消息
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.send(message);
        }

        this._emit('connect');
      });

      this.socketTask.onMessage((res) => {
        try {
          // 尝试解析 JSON
          let data: any;
          if (typeof res.data === 'string') {
            data = JSON.parse(res.data);
          } else if (res.data instanceof ArrayBuffer) {
            // 处理二进制数据
            data = res.data;
          } else {
            data = res.data;
          }

          // 兼容 socket.io 的消息格式
          if (data && typeof data === 'object') {
            if (data.type) {
              this._emit(data.type, data.data || data);
            } else if (Array.isArray(data) && data.length >= 2) {
              // socket.io 格式: [eventName, payload]
              this._emit(data[0], data[1]);
            } else {
              this._emit('message', data);
            }
          } else {
            this._emit('message', data);
          }
        } catch (err) {
          console.error('[WebSocket] Parse message error:', err);
          this.emit('message', res.data);
        }
      });

      this.socketTask.onError((err) => {
        console.error('[WebSocket] Error:', err);
        this._emit('error', err);
        this._emit('connect_error', err); // socket.io 兼容
        this._handleReconnect();
      });

      this.socketTask.onClose((res) => {
        this.connected = false;
        this.disconnected = true;
        this._emit('disconnect', res);
        
        if (!this.isManualClose) {
          this._handleReconnect();
        }
      });
    } catch (err) {
      console.error('[WebSocket] Connect error:', err);
      this._handleReconnect();
    }
  }

  /**
   * 重连处理
   */
  private _handleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    // socket.io 兼容的重连延迟计算
    const baseDelay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.reconnectDelayMax);
    const randomDelay = baseDelay * (1 + Math.random() * this.randomizationFactor);
    const delay = Math.floor(randomDelay);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this._connect();
    }, delay) as any;
  }

  /**
   * 发送消息
   */
  send(data: any): void {
    if (!this.socketTask || !this.connected) {
      // 如果未连接，将消息加入队列
      this.messageQueue.push(data);
      return;
    }

    try {
      let message: string | ArrayBuffer;
      if (typeof data === 'string') {
        message = data;
      } else if (data instanceof ArrayBuffer) {
        message = data;
      } else {
        message = JSON.stringify(data);
      }

      this.socketTask.send({
        data: message
      });
    } catch (err) {
      console.error('[WebSocket] Send error:', err);
    }
  }

  /**
   * 发送事件（兼容 socket.io）
   */
  emit(event: string, data?: any): void {
    if (event === 'message') {
      this.send(data);
    } else {
      // socket.io 格式: [eventName, payload]
      this.send([event, data]);
    }
  }

  /**
   * 监听事件
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 移除监听
   */
  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      this.listeners.get(event)!.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  /**
   * 触发事件（内部方法）
   */
  private _emit(event: string, data?: any): void {
    // 触发 onAny 监听器
    this.anyListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (err) {
        console.error(`[WebSocket] onAny handler error:`, err);
      }
    });
    
    // 触发特定事件监听器
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[WebSocket] Event handler error (${event}):`, err);
        }
      });
    }
  }
  
  /**
   * 监听所有事件（socket.io 兼容）
   */
  onAny(callback: (event: string, ...args: any[]) => void): void {
    this.anyListeners.add(callback);
  }
  
  /**
   * 移除 onAny 监听器
   */
  offAny(callback?: Function): void {
    if (callback) {
      this.anyListeners.delete(callback);
    } else {
      this.anyListeners.clear();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止重连

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socketTask) {
      this.socketTask.close({
        code: 1000,
        reason: 'Manual close'
      });
      this.socketTask = null;
    }

    this.connected = false;
    this.disconnected = true;
    this.listeners.clear();
    this.messageQueue = [];
  }

  /**
   * 关闭连接（别名）
   */
  close(): void {
    this.disconnect();
  }
}

/**
 * 创建 WebSocket 连接（兼容 socket.io 的 io() 函数）
 */
export function createWebSocket(url: string, options?: Partial<WebSocketOptions>): MiniProgramWebSocket {
  const socket = new MiniProgramWebSocket({
    url,
    ...options
  });
  socket.connect();
  return socket;
}

/**
 * socket.io 兼容的 io 函数
 */
export function io(url: string, options?: Partial<WebSocketOptions>): MiniProgramWebSocket {
  return createWebSocket(url, options);
}

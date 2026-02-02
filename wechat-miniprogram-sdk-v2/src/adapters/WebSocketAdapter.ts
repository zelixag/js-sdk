import { SDKError, ErrorCode, NetworkConfig } from '@/types';
import EventEmitter from 'eventemitter3';

/**
 * WebSocket连接状态
 */
enum WSState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * WebSocket适配器
 * 封装小程序WebSocket API，提供自动重连和消息队列功能
 */
export class WebSocketAdapter extends EventEmitter {
  private url: string;
  private config: NetworkConfig;
  private socket: WechatMiniprogram.SocketTask | null = null;
  private state: WSState = WSState.CLOSED;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private messageQueue: any[] = [];
  private isManualClose: boolean = false;

  constructor(url: string, config: NetworkConfig = {}) {
    super();
    this.url = url;
    this.config = {
      timeout: 30000,
      retryTimes: 3,
      heartbeatInterval: 30000,
      autoReconnect: true,
      reconnectDelay: 3000,
      ...config,
    };
  }

  /**
   * 连接WebSocket
   */
  async connect(): Promise<void> {
    if (this.state === WSState.OPEN || this.state === WSState.CONNECTING) {
      console.warn('[WebSocketAdapter] Already connected or connecting');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[WebSocketAdapter] Connecting to:', this.url);
        this.state = WSState.CONNECTING;
        this.isManualClose = false;

        // 创建WebSocket连接
        this.socket = wx.connectSocket({
          url: this.url,
          timeout: this.config.timeout,
          success: () => {
            console.log('[WebSocketAdapter] Socket created');
          },
          fail: (error) => {
            console.error('[WebSocketAdapter] Failed to create socket:', error);
            this.state = WSState.CLOSED;
            reject(new SDKError(
              ErrorCode.WEBSOCKET_ERROR,
              'Failed to create WebSocket',
              error
            ));
          },
        });

        // 设置事件监听
        this.setupSocketListeners(resolve, reject);

        // 设置连接超时
        const timeout = setTimeout(() => {
          if (this.state === WSState.CONNECTING) {
            this.close();
            reject(new SDKError(
              ErrorCode.CONNECT_TIMEOUT,
              'WebSocket connection timeout'
            ));
          }
        }, this.config.timeout!);

        // 连接成功后清除超时
        this.once('open', () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        this.state = WSState.CLOSED;
        reject(new SDKError(
          ErrorCode.WEBSOCKET_ERROR,
          'Failed to connect WebSocket',
          error
        ));
      }
    });
  }

  /**
   * 设置Socket事件监听
   */
  private setupSocketListeners(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.socket) {
      return;
    }

    // 连接打开
    this.socket.onOpen(() => {
      console.log('[WebSocketAdapter] Connection opened');
      this.state = WSState.OPEN;
      this.reconnectAttempts = 0;
      
      // 发送队列中的消息
      this.flushMessageQueue();
      
      // 启动心跳
      this.startHeartbeat();
      
      this.emit('open');
      resolve();
    });

    // 接收消息
    this.socket.onMessage((res) => {
      try {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        this.emit('message', data);
      } catch (error) {
        console.error('[WebSocketAdapter] Failed to parse message:', error);
        this.emit('error', new SDKError(
          ErrorCode.WEBSOCKET_ERROR,
          'Failed to parse message',
          error
        ));
      }
    });

    // 连接错误
    this.socket.onError((error) => {
      console.error('[WebSocketAdapter] Connection error:', error);
      this.emit('error', new SDKError(
        ErrorCode.WEBSOCKET_ERROR,
        'WebSocket error',
        error
      ));
    });

    // 连接关闭
    this.socket.onClose((res) => {
      console.log('[WebSocketAdapter] Connection closed:', res.code, res.reason);
      this.state = WSState.CLOSED;
      this.stopHeartbeat();
      
      this.emit('close', {
        code: res.code,
        reason: res.reason,
      });

      // 自动重连
      if (!this.isManualClose && this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * 发送消息
   */
  send(data: any): void {
    if (this.state !== WSState.OPEN) {
      console.warn('[WebSocketAdapter] Connection not open, queueing message');
      this.messageQueue.push(data);
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket!.send({
        data: message,
        success: () => {
          console.log('[WebSocketAdapter] Message sent');
        },
        fail: (error) => {
          console.error('[WebSocketAdapter] Failed to send message:', error);
          this.emit('error', new SDKError(
            ErrorCode.WEBSOCKET_ERROR,
            'Failed to send message',
            error
          ));
        },
      });
    } catch (error) {
      console.error('[WebSocketAdapter] Failed to serialize message:', error);
      this.emit('error', new SDKError(
        ErrorCode.WEBSOCKET_ERROR,
        'Failed to serialize message',
        error
      ));
    }
  }

  /**
   * 关闭连接
   */
  close(code: number = 1000, reason: string = 'Normal closure'): void {
    console.log('[WebSocketAdapter] Closing connection');
    this.isManualClose = true;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.socket && this.state !== WSState.CLOSED) {
      this.state = WSState.CLOSING;
      this.socket.close({
        code,
        reason,
        success: () => {
          console.log('[WebSocketAdapter] Connection closed successfully');
        },
        fail: (error) => {
          console.error('[WebSocketAdapter] Failed to close connection:', error);
        },
      });
    }

    this.socket = null;
    this.state = WSState.CLOSED;
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`[WebSocketAdapter] Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval || this.heartbeatTimer) {
      return;
    }

    console.log('[WebSocketAdapter] Starting heartbeat');
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state === WSState.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval) as unknown as number;
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[WebSocketAdapter] Heartbeat stopped');
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isManualClose) {
      return;
    }

    if (this.reconnectAttempts >= this.config.retryTimes!) {
      console.error('[WebSocketAdapter] Max reconnect attempts reached');
      this.emit('error', new SDKError(
        ErrorCode.RECONNECT_FAILED,
        'Max reconnect attempts reached'
      ));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * this.reconnectAttempts;
    
    console.log(`[WebSocketAdapter] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.retryTimes})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('[WebSocketAdapter] Reconnect failed:', error);
      });
    }, delay) as unknown as number;
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      console.log('[WebSocketAdapter] Reconnect stopped');
    }
  }

  /**
   * 获取连接状态
   */
  getState(): WSState {
    return this.state;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state === WSState.OPEN;
  }

  /**
   * 销毁适配器
   */
  destroy(): void {
    this.close();
    this.removeAllListeners();
    this.messageQueue = [];
    console.log('[WebSocketAdapter] WebSocket adapter destroyed');
  }
}

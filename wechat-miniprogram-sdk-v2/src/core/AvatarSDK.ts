import {
  SDKConfig,
  SDKState,
  ConnectionStatus,
  SDKError,
  ErrorCode,
  EventType,
  SpeakOptions,
  AnimationOptions,
  Plugin,
} from '@/types';
import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
import { LifecycleManager } from './LifecycleManager';

/**
 * 微信小程序数字人SDK主入口类
 */
export class AvatarSDK {
  private config: SDKConfig;
  private eventBus: EventBus;
  private stateManager: StateManager;
  private lifecycleManager: LifecycleManager;
  private modules: Map<string, any>;
  private plugins: Map<string, Plugin>;
  private webSocket: any | null = null;
  private sessionId: string = '';
  private canvas: any | null = null;
  private gl: any | null = null;

  constructor(config: SDKConfig) {
    this.validateConfig(config);
    this.config = this.mergeDefaultConfig(config);
    
    // 初始化核心组件
    this.eventBus = new EventBus();
    this.stateManager = new StateManager(this.eventBus);
    this.lifecycleManager = new LifecycleManager(this.eventBus, this.stateManager);
    
    // 初始化模块和插件容器
    this.modules = new Map();
    this.plugins = new Map();

    console.log('[AvatarSDK] SDK instance created');
  }

  /**
   * 初始化SDK
   */
  async init(): Promise<void> {
    try {
      console.log('[AvatarSDK] Initializing SDK...');
      this.stateManager.setState(SDKState.INITIALIZING);
      
      // 1. 获取Canvas节点
      console.log('[AvatarSDK] Step 1: Getting canvas node...');
      await this.initCanvas();
      console.log('[AvatarSDK] Canvas node obtained');
      
      // 2. 创建WebGL上下文
      console.log('[AvatarSDK] Step 2: Creating WebGL context...');
      await this.initWebGL();
      console.log('[AvatarSDK] WebGL context created');
      
      // 3. 连接WebSocket服务器
      console.log('[AvatarSDK] Step 3: Connecting to WebSocket server...');
      await this.connectWebSocket();
      console.log('[AvatarSDK] WebSocket connected');
      
      // 4. 发送初始化消息
      console.log('[AvatarSDK] Step 4: Sending init message...');
      await this.sendInitMessage();
      console.log('[AvatarSDK] Init message sent');
      
      // 执行生命周期初始化
      await this.lifecycleManager.init();
      
      // 更新状态
      this.stateManager.setState(SDKState.INITIALIZED);
      
      // 触发ready事件
      this.eventBus.emit(EventType.READY);
      
      // 调用配置的回调
      if (this.config.onReady) {
        this.config.onReady();
      }
      
      console.log('[AvatarSDK] SDK initialized successfully');
    } catch (error) {
      console.error('[AvatarSDK] Initialization failed:', error);
      this.stateManager.setState(SDKState.ERROR);
      
      const sdkError = error instanceof SDKError
        ? error
        : new SDKError(ErrorCode.INIT_FAILED, 'Initialization failed', error);
      
      this.handleError(sdkError);
      throw sdkError;
    }
  }

  /**
   * 初始化Canvas
   */
  private async initCanvas(): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select(`#${this.config.canvas!.id}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            reject(new SDKError(ErrorCode.CANVAS_NOT_FOUND, `Canvas not found: ${this.config.canvas!.id}`));
            return;
          }
          
          this.canvas = res[0].node;
          const dpr = wx.getSystemInfoSync().pixelRatio;
          this.canvas.width = res[0].width * dpr;
          this.canvas.height = res[0].height * dpr;
          
          console.log(`[AvatarSDK] Canvas size: ${this.canvas.width}x${this.canvas.height}`);
          resolve();
        });
    });
  }

  /**
   * 初始化WebGL
   */
  private async initWebGL(): Promise<void> {
    if (!this.canvas) {
      throw new SDKError(ErrorCode.CANVAS_NOT_FOUND, 'Canvas not initialized');
    }
    
    this.gl = this.canvas.getContext('webgl', {
      antialias: this.config.render?.antialias !== false,
      preserveDrawingBuffer: true
    });
    
    if (!this.gl) {
      throw new SDKError(ErrorCode.WEBGL_NOT_SUPPORT, 'Failed to create WebGL context');
    }
    
    // 设置视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    console.log('[AvatarSDK] WebGL context created successfully');
  }

  /**
   * 连接WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    const url = this.buildWebSocketUrl();
    console.log('[AvatarSDK] Connecting to:', url);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SDKError(ErrorCode.CONNECT_TIMEOUT, 'WebSocket connection timeout'));
      }, this.config.network?.timeout || 10000);
      
      this.webSocket = wx.connectSocket({
        url,
        success: () => {
          console.log('[AvatarSDK] WebSocket created');
        },
        fail: (error) => {
          clearTimeout(timeout);
          reject(new SDKError(ErrorCode.WEBSOCKET_ERROR, 'Failed to create WebSocket', error));
        }
      });
      
      this.webSocket.onOpen(() => {
        clearTimeout(timeout);
        console.log('[AvatarSDK] WebSocket connection opened');
        this.stateManager.setConnectionStatus(ConnectionStatus.CONNECTED);
        this.eventBus.emit(EventType.CONNECTED);
        resolve();
      });
      
      this.webSocket.onMessage((res: any) => {
        this.handleWebSocketMessage(res.data);
      });
      
      this.webSocket.onError((error: any) => {
        console.error('[AvatarSDK] WebSocket error:', error);
        this.handleError(new SDKError(ErrorCode.WEBSOCKET_ERROR, 'WebSocket error', error));
      });
      
      this.webSocket.onClose((res: any) => {
        console.log('[AvatarSDK] WebSocket closed:', res.code, res.reason);
        this.stateManager.setConnectionStatus(ConnectionStatus.DISCONNECTED);
        this.eventBus.emit(EventType.DISCONNECTED);
      });
    });
  }

  /**
   * 构建WebSocket URL
   */
  private buildWebSocketUrl(): string {
    const url = new URL(this.config.serverUrl);
    url.searchParams.set('appId', this.config.appId);
    url.searchParams.set('appSecret', this.config.appSecret);
    url.searchParams.set('sdkVersion', '2.0.0');
    url.searchParams.set('platform', 'miniprogram');
    return url.toString();
  }

  /**
   * 发送初始化消息
   */
  private async sendInitMessage(): Promise<void> {
    if (!this.webSocket) {
      throw new SDKError(ErrorCode.WEBSOCKET_ERROR, 'WebSocket not connected');
    }
    
    this.sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    
    const initMessage = {
      type: 'init_session',
      sessionId: this.sessionId,
      canvasInfo: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      },
      userAgent: 'miniprogram',
      sdkVersion: '2.0.0',
      timestamp: Date.now()
    };
    
    this.webSocket.send({
      data: JSON.stringify(initMessage)
    });
    
    console.log('[AvatarSDK] Init message sent:', initMessage);
    
    // 等待服务器响应
    return new Promise((resolve) => {
      // 设置超时，即使没收到响应也继续
      setTimeout(() => {
        console.log('[AvatarSDK] Init message sent, continuing...');
        resolve();
      }, 2000);
    });
  }

  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(data: any): void {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('[AvatarSDK] WebSocket message received:', message.type);
      
      // EventType.MESSAGE 不存在，使用字符串
      this.eventBus.emit('message', message);
      
      switch (message.type) {
        case 'session_started':
          console.log('[AvatarSDK] Session started');
          break;
        case 'render_data':
          // 处理渲染数据
          break;
        case 'error':
          this.handleError(new SDKError(
            message.payload?.code || ErrorCode.UNKNOWN_ERROR,
            message.payload?.message || 'Unknown error'
          ));
          break;
      }
    } catch (error) {
      console.error('[AvatarSDK] Failed to handle WebSocket message:', error);
    }
  }

  /**
   * 启动SDK
   */
  async start(): Promise<void> {
    try {
      console.log('[AvatarSDK] Starting SDK...');
      await this.lifecycleManager.start();
      console.log('[AvatarSDK] SDK started successfully');
    } catch (error) {
      console.error('[AvatarSDK] Start failed:', error);
      throw error;
    }
  }

  /**
   * 暂停SDK
   */
  async pause(): Promise<void> {
    try {
      console.log('[AvatarSDK] Pausing SDK...');
      await this.lifecycleManager.pause();
      console.log('[AvatarSDK] SDK paused successfully');
    } catch (error) {
      console.error('[AvatarSDK] Pause failed:', error);
      throw error;
    }
  }

  /**
   * 恢复SDK
   */
  async resume(): Promise<void> {
    try {
      console.log('[AvatarSDK] Resuming SDK...');
      await this.lifecycleManager.resume();
      console.log('[AvatarSDK] SDK resumed successfully');
    } catch (error) {
      console.error('[AvatarSDK] Resume failed:', error);
      throw error;
    }
  }

  /**
   * 销毁SDK
   */
  async destroy(): Promise<void> {
    try {
      console.log('[AvatarSDK] Destroying SDK...');
      
      // 执行生命周期销毁
      await this.lifecycleManager.destroy();
      
      // 销毁所有模块
      for (const [name, module] of this.modules) {
        if (module.destroy) {
          await module.destroy();
        }
      }
      this.modules.clear();
      
      // 卸载所有插件
      for (const [name, plugin] of this.plugins) {
        if (plugin.uninstall) {
          plugin.uninstall();
        }
      }
      this.plugins.clear();
      
      // 销毁事件总线
      this.eventBus.emit(EventType.DESTROY);
      this.eventBus.destroy();
      
      console.log('[AvatarSDK] SDK destroyed successfully');
    } catch (error) {
      console.error('[AvatarSDK] Destroy failed:', error);
      throw error;
    }
  }

  /**
   * 语音播报
   */
  async speak(text: string, options?: SpeakOptions): Promise<void> {
    if (!this.stateManager.canOperate()) {
      throw new SDKError(
        ErrorCode.INIT_FAILED,
        'SDK is not ready for operation'
      );
    }

    console.log('[AvatarSDK] Speaking:', text);
    
    // TODO: 实现语音播报逻辑
    // 这里需要调用音频模块和动画模块
  }

  /**
   * 播放动画
   */
  async playAnimation(name: string, options?: AnimationOptions): Promise<void> {
    if (!this.stateManager.canOperate()) {
      throw new SDKError(
        ErrorCode.INIT_FAILED,
        'SDK is not ready for operation'
      );
    }

    console.log('[AvatarSDK] Playing animation:', name);
    
    // TODO: 实现动画播放逻辑
    // 这里需要调用动画模块
  }

  /**
   * 停止动画
   */
  async stopAnimation(): Promise<void> {
    console.log('[AvatarSDK] Stopping animation');
    
    // TODO: 实现停止动画逻辑
  }

  /**
   * 获取当前状态
   */
  getState(): SDKState {
    return this.stateManager.getState();
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.stateManager.getConnectionStatus();
  }

  /**
   * 监听事件
   */
  on(event: EventType | string, handler: (...args: any[]) => void): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 监听一次事件
   */
  once(event: EventType | string, handler: (...args: any[]) => void): void {
    this.eventBus.once(event, handler);
  }

  /**
   * 移除事件监听
   */
  off(event: EventType | string, handler?: (...args: any[]) => void): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 使用插件
   */
  use(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[AvatarSDK] Plugin ${plugin.name} already installed`);
      return;
    }

    console.log(`[AvatarSDK] Installing plugin: ${plugin.name} v${plugin.version}`);
    plugin.install(this);
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * 注册模块
   */
  registerModule(name: string, module: any): void {
    if (this.modules.has(name)) {
      console.warn(`[AvatarSDK] Module ${name} already registered`);
      return;
    }

    console.log(`[AvatarSDK] Registering module: ${name}`);
    this.modules.set(name, module);
  }

  /**
   * 获取模块
   */
  getModule<T = any>(name: string): T | undefined {
    return this.modules.get(name);
  }

  /**
   * 获取配置
   */
  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取状态管理器
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * 获取生命周期管理器
   */
  getLifecycleManager(): LifecycleManager {
    return this.lifecycleManager;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: SDKConfig): void {
    if (!config.appId) {
      throw new SDKError(ErrorCode.CONFIG_INVALID, 'appId is required');
    }
    if (!config.appSecret) {
      throw new SDKError(ErrorCode.CONFIG_INVALID, 'appSecret is required');
    }
    if (!config.serverUrl) {
      throw new SDKError(ErrorCode.CONFIG_INVALID, 'serverUrl is required');
    }
    if (!config.canvas || !config.canvas.id) {
      throw new SDKError(ErrorCode.CONFIG_INVALID, 'canvas.id is required');
    }
  }

  /**
   * 合并默认配置
   */
  private mergeDefaultConfig(config: SDKConfig): SDKConfig {
    return {
      ...config,
      render: {
        quality: 'auto',
        fps: 30,
        enableOptimization: true,
        backgroundColor: '#000000',
        antialias: true,
        ...config.render,
      },
      audio: {
        enabled: true,
        volume: 1.0,
        autoPlay: true,
        format: 'mp3',
        ...config.audio,
      },
      network: {
        timeout: 30000,
        retryTimes: 3,
        heartbeatInterval: 30000,
        autoReconnect: true,
        reconnectDelay: 3000,
        ...config.network,
      },
      cache: {
        enabled: true,
        maxSize: 50,
        ttl: 3600000,
        strategy: 'hybrid',
        ...config.cache,
      },
      logger: {
        level: 'info',
        upload: false,
        console: true,
        ...config.logger,
      },
    };
  }

  /**
   * 处理错误
   */
  private handleError(error: SDKError): void {
    console.error('[AvatarSDK] Error:', error);
    
    // 触发错误事件
    this.eventBus.emit(EventType.ERROR, error);
    
    // 调用配置的错误回调
    if (this.config.onError) {
      this.config.onError(error);
    }
  }
}

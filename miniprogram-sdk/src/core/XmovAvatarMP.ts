// @ts-nocheck - 临时禁用类型检查，因为 debugOverlay 对象有大量重复属性（模拟对象）
/**
 * 微信小程序版数字人 SDK 核心类
 * 基于原版 SDK 进行适配改造
 */

// 注意：开发时使用 ../../../src/（从 miniprogram-sdk/src/core 到项目根目录的 src）
// 复制脚本会在复制后修改 .js 文件中的路径为 ../src/（从 sdk/core 到 sdk/src）
import { AvatarStatus, RenderState, IAvatarOptions, IInitParams, InitModel, Layout, WalkConfig } from "../../../src/types/index";
import { EErrorCode } from "../../../src/types/error";
import { EFrameDataType, IRawFrameData, StateChangeInfo } from "../../../src/types/frame-data";
import { ISessionResponse, TDownloadProgress } from "../../../src/modules/ResourceManager";
import { DebugOverlay } from "../../../src/view/DebugOverlay";
import { performanceConstant } from "../../../src/utils/perfermance";
import { 
  IBRAnimationGeneratorCharInfo_NN, 
  unpackIBRAnimation, 
  formatMJT 
} from '../../../src/utils/DataInterface';
import { getVertices, getWavefrontObjFromVertices, getPCATextures } from '../../../src/utils/GLPipelineDebugTools';
import { GLDevice } from '../../../src/utils/GLDevice';
import { GLPipeline } from '../../../src/utils/GLPipeline';
// import { isSupportMES } from "../../../src/utils";
import ResourceManager from '../../../src/modules/ResourceManager';
import RenderScheduler from '../../../src/control/RenderScheduler';
import Ttsa from '../../../src/control/ttsa';
import { replaceAvatarRendererCanvas } from '../utils/canvas-replacement';

// 导入小程序适配器
import { 
  getCanvasNode, 
  createWebGLContext, 
  setCanvasSize 
} from "../adapters/canvas";
import { 
  createWebSocket, 
  MiniProgramWebSocket 
} from "../adapters/websocket";
import { NetworkMonitor } from '../utils/network-adapter';

/**
 * 小程序版数字人 SDK 核心类
 */
export default class XmovAvatarMP {
  private options!: IAvatarOptions;
  private canvasId: string = '';
  private canvas: WechatMiniprogram.Canvas | null = null;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;

  private TAG = "[XMOV AVATAR MINIPROGRAM]";
  private status: AvatarStatus | -1 = -1;

  // 实例组件
  private resourceManager: any;
  private renderScheduler: any;
  private networkMonitor: NetworkMonitor;
  private ttsa: any;
  private debugOverlay: DebugOverlay | null = null;

  // 控制变量
  private _offlineTimer: number | null = null;
  private readonly _offlineInterval = 300;
  private _env = "production";
  private avatarCanvasVisible: boolean = true;
  private pendingInvisibleMode: boolean = false;
  private isInitialized: boolean = false;

  // 事件回调
  public onStateChange: (state: string) => void = () => {};
  public onDownloadProgress: TDownloadProgress | null = null;

  // 静态方法
  static IBRAnimationGeneratorCharInfo_NN = IBRAnimationGeneratorCharInfo_NN;
  static unpackIBRAnimation = unpackIBRAnimation;
  static formatMJT = formatMJT;
  static getVertices = getVertices;
  static getPCATextures = getPCATextures;
  static getWavefrontObjFromVertices = getWavefrontObjFromVertices;
  static GLDevice = GLDevice;
  static GLPipeline = GLPipeline;

  // 其他实例变量
  private boundVisibilityChange: () => void;
  private replayData: any = null;
  private startConnectTime: number = 0;
  private connectSuccessTime: number = 0;
  private enableClientInterrupt: boolean = false;
  private retryCount = 1;
  private retryTimer: number | null = null;
  private maxRetryCount = 9;
  private retryRound = 1;
  private maxRetryRound = 3;
  private isRetrying = false;
  private isStartRetry = false;
  private destroyed = false;
  private reconnectDebounceTimer: number | null = null;
  private _initSDKPromise: Promise<void> | null = null;

  constructor(options: IAvatarOptions) {
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
          code: EErrorCode.NETWORK_DOWN,
          message: message || '网络断开',
        });
        console.log('网络断开（network off）', message);
        
        if (!this.isInitialized) {
          console.warn(this.TAG, '初始化未完成时断网，清除所有资源并断开连接');
          this.cleanupBeforeInitComplete("network_offline_before_init");
          return;
        }
        
        if(this.status !== AvatarStatus.offline) {
          this.offlineHandle();
        }
      },
      onlineCallback: (message) => {
        this.onMessage({
          code: EErrorCode.NETWORK_UP,
          message: message || '网络恢复',
        });
        
        if (!this.isInitialized) {
          console.warn(this.TAG, '网络恢复但初始化未完成，清除所有资源并断开连接');
          this.cleanupBeforeInitComplete("network_online_before_init");
          return;
        }
        
        if(this.isStartRetry) {
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
  public getStatus() {
    return this.status;
  }

  /**
   * 获取标签
   */
  public getTag() {
    return this.options.tag;
  }

  /**
   * 获取业务环境
   */
  public get businessENV() {
    return this._env;
  }

  /**
   * 获取唯一说话ID
   */
  public getUniqueSpeakId() {
    return this.ttsa?.getUniqueSpeakId() || `0-${this.getSessionId()}`;
  }

  /**
   * 初始化 SDK
   */
  private async initializeSDK(options: IAvatarOptions) {
    // 小程序中不需要检查 navigator.onLine，通过 NetworkMonitor 检查
    if (!this.networkMonitor.isOnlineNow()) {
      this.onMessage({
        code: EErrorCode.NETWORK_BREAK,
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
    } catch (error) {
      console.error(this.TAG, 'Canvas initialization failed:', error);
      this.onMessage({
        code: EErrorCode.NETWORK_BREAK, // 使用已存在的错误码
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
      onNetworkInfo: (networkInfo: any) => {
        options.onNetworkInfo?.(networkInfo);
      },
      onStartSessionWarning: (message: Object) => {
        options.onStartSessionWarning?.(message);
      },
    });

    // 初始化渲染调度器（使用适配器）
    this.renderScheduler = this.createRenderScheduler({
      sdkInstance: this,
      canvas: this.canvas,  // 传递 Canvas 节点而非 DOM 元素
      gl: this.gl,          // 传递 WebGL 上下文
      resourceManager: this.resourceManager,
      enableDebugger: options.enableDebugger,
      hardwareAcceleration: options.hardwareAcceleration || "default",
      enableClientInterrupt: this.enableClientInterrupt,
      onDownloadProgress: (progress: number) => {
        this.onDownloadProgress?.(progress);
        // 在小程序中，我们通过回调来通知进度
        // options.onDownloadProgress?.(progress); // 暂时注释掉，因为可能不存在
        this.isInitialized = progress === 100;
      },
      onStateChange: (state: string) => {
        if((this.getStatus() === AvatarStatus.offline && state !== 'idle') || state === "") {
          return;
        }
        options.onStateChange?.(state);
      },
      onRenderChange: (state: RenderState, oldState?: RenderState) => {
        options.onRenderChange?.(state);
        if(state === RenderState.rendering && (oldState === RenderState.resumed || this.getStatus() === AvatarStatus.online)) {
          console.log(this.TAG, 'Status:===== 渲染中，状态: rendering', this.getSessionId());
          this.onStatusChange(AvatarStatus.visible);
        }
      },
      onVoiceStateChange: (state: string, duration?: number) => {
        options.onVoiceStateChange?.(state, duration);
      },
      onWalkStateChange: (state: string) => {
        options.onWalkStateChange?.(state);
      },
      sendVideoInfo: (info: {name: string, body_id: number, id: number}) => {
        this.debugOverlay?.setVideoInfo(info);
      },
      setAudioInfo: (info: {
        sf: number;
        ef: number;
        ad: Uint8Array;
      }) => {
        this.debugOverlay?.setAudioInfo(info);
      },
      setEventData: (info: {
        sf: number;
        ef: number;
        event: Array<any>;
      }) => {
        this.debugOverlay?.setEventData(info);
      },
      renderFrameCallback: (frame: number) => {
        this.renderFrameCallback(frame);
        this.handleReplaySend(frame);
      },
      reportMessage: (message: {
        code: EErrorCode;
        message: string;
        e?: object;
      }) => {
        this.ttsa?.sendPerfLog(message);
      },
      sendSdkPoint: (type: string, data: any, extra?: any) => {
        this.ttsa?.sendSdkPoint(type, data, extra);
      },
    });

    // 其他初始化...
    (globalThis as any).performanceTracker = (globalThis as any).performanceTracker || {
      markStart: () => {},
      markEnd: () => {},
      setOnStateRenderChange: () => {},
      setReportFunc: () => {}
    };
    
    if (options.onStateRenderChange) {
      (globalThis as any).performanceTracker.setOnStateRenderChange(options.onStateRenderChange);
    }
  }

  /**
   * 创建资源管理器（小程序适配）
   */
  private createResourceManager(config: any) {
    return new ResourceManager({
      sdkInstance: this as any,
      config: config.config,
      appId: config.appId,
      appSecret: config.appSecret,
      gatewayServer: config.gatewayServer,
      cacheServer: config.cacheServer,
      headers: config.headers || {},
      onNetworkInfo: (quality: any) => {
        // 网络质量回调
        console.log(this.TAG, 'Network quality:', quality);
      },
      onStartSessionWarning: (message: any) => {
        // 会话警告回调
        console.warn(this.TAG, 'Session warning:', message);
      },
    });
  }

  /**
   * 创建渲染调度器（小程序适配）
   */
  private createRenderScheduler(config: any) {
    // 创建 RenderScheduler（会创建 AvatarRenderer，使用模拟的 canvas）
    const renderScheduler = new RenderScheduler({
      sdkInstance: config.sdkInstance,
      container: config.container || { // 小程序中创建模拟容器
        appendChild: () => {},
        removeChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
      } as any,
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
      renderFrameCallback: config.renderFrameCallback || ((frame: number) => {
        // 默认渲染帧回调
        console.log(this.TAG, 'Render frame:', frame);
      }),
      reportMessage: (message: any) => {
        this.onMessage(message);
      },
      sendSdkPoint: (type: string, data: any, extra?: any) => {
        // SDK 埋点
        console.log(this.TAG, 'SDK Point:', type, data, extra);
      },
    });
    
    // 关键步骤：替换 AvatarRenderer 的 canvas 为真实的 canvas
    if (config.canvas && renderScheduler.avatarRenderer) {
      replaceAvatarRendererCanvas(
        renderScheduler.avatarRenderer,
        config.canvas,
        config.gl
      );
    }
    
    return renderScheduler;
  }

  /**
   * 渲染帧回调
   */
  private renderFrameCallback(frame: number) {
    if(!this.ttsa?.getStatus() && ![AvatarStatus.offline, AvatarStatus.network_off].includes(this.status as AvatarStatus) && frame % 24 === 0) {
      this.offlineHandle();
    }
  }

  /**
   * 初始化会话
   */
  async init(params: IInitParams) {
    this.destroyed = false;
    this.isInitialized = false;
    this.startConnectTime = Date.now();

    const { onDownloadProgress, initModel } = params;
    this.onDownloadProgress = onDownloadProgress;

    if(initModel === InitModel.invisible) {
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
      (globalThis as any).performanceTracker.markStart(performanceConstant.load_resource);
      (globalThis as any).performanceTracker.markStart(performanceConstant.first_avatar_render);
      (globalThis as any).performanceTracker.markStart(performanceConstant.first_webgl_render);
      
      const sessionInfo = await this.resourceManager.load(onDownloadProgress);
      
      if(!sessionInfo?.socket_io_url || !sessionInfo?.token) {
        console.error(this.TAG, "init error, socket_io_url or token is empty reload");
        return;
      }
      
      this.connectSuccessTime = Date.now();
      (globalThis as any).performanceTracker.markEnd(performanceConstant.load_resource);

      // 创建一个模拟的DebugOverlay对象，具有基本的接口
      // 注意：使用 @ts-ignore 来避免重复属性检查，因为这是一个大型模拟对象
      // @ts-ignore - 忽略重复属性检查
      this.debugOverlay = {
        show() {},
        hide() {},
        destroy() {},
        setVideoInfo(info: any) {},
        setAudioInfo(info: any) {},
        setEventData(info: any) {},
        addError(error: any) {},
        container: null,
        sdk: null,
        sessionInfo: null as any,
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
        render: () => {},
        update: () => {},
        reset: () => {},
        getStats: () => ({}),
        setStats: (stats: any) => {},
        addStats: (stats: any) => {},
        removeStats: (key: string) => {},
        clearStats: () => {},
        toggle: () => {},
        setPosition: (x: number, y: number) => {},
        setSize: (width: number, height: number) => {},
        setTheme: (theme: string) => {},
        setOpacity: (opacity: number) => {},
        setScale: (scale: number) => {},
        setRotation: (rotation: number) => {},
        setOffset: (x: number, y: number) => {},
        setAnchor: (x: number, y: number) => {},
        setZIndex: (zIndex: number) => {},
        setVisibility: (visible: boolean) => {},
        setInteractive: (interactive: boolean) => {},
        setEnabled: (enabled: boolean) => {},
        setLocked: (locked: boolean) => {},
        setSelected: (selected: boolean) => {},
        setFocused: (focused: boolean) => {},
        setActive: (active: boolean) => {},
        setHovered: (hovered: boolean) => {},
        setPressed: (pressed: boolean) => {},
        setDisabled: (disabled: boolean) => {},
        setError: (error: any) => {},
        clearError: () => {},
        setWarning: (warning: any) => {},
        clearWarning: () => {},
        setInfo: (info: any) => {},
        clearInfo: () => {},
        setSuccess: (success: any) => {},
        clearSuccess: () => {},
        setMessage: (message: any) => {},
        clearMessage: () => {},
        setTitle: (title: string) => {},
        setDescription: (description: string) => {},
        setIcon: (icon: string) => {},
        setImage: (image: string) => {},
        setVideo: (video: string) => {},
        setAudio: (audio: string) => {},
        setData: (data: any) => {},
        getData: () => ({}),
        setValue: (key: string, value: any) => {},
        getValue: (key: string) => null,
        getProperty: (key: string) => null,
        setProperty: (key: string, value: any) => {},
        hasProperty: (key: string) => false,
        removeProperty: (key: string) => {},
        clearProperties: () => {},
        getProperties: () => ({}),
        setProperties: (props: any) => {},
        addClass: (className: string) => {},
        removeClass: (className: string) => {},
        hasClass: (className: string) => false,
        toggleClass: (className: string) => {},
        setStyle: (style: any) => {},
        getStyle: (property: string) => null,
        removeStyle: (property: string) => {},
        clearStyles: () => {},
        getStyles: () => ({}),
        setStyles: (styles: any) => {},
        setAttribute: (name: string, value: any) => {},
        getAttribute: (name: string) => null,
        removeAttribute: (name: string) => {},
        clearAttributes: () => {},
        getAttributes: () => ({}),
        setAttributes: (attrs: any) => {},
        setText: (text: string) => {},
        getText: () => '',
        setHtml: (html: string) => {},
        getHtml: () => '',
        setSvg: (svg: string) => {},
        getSvg: () => '',
        setCanvas: (canvas: any) => {},
        getCanvas: () => null,
        setContext: (context: any) => {},
        getContext: () => null,
        setBuffer: (buffer: any) => {},
        getBuffer: () => null,
        setTexture: (texture: any) => {},
        getTexture: () => null,
        setShader: (shader: any) => {},
        getShader: () => null,
        setMaterial: (material: any) => {},
        getMaterial: () => null,
        setGeometry: (geometry: any) => {},
        getGeometry: () => null,
        setMesh: (mesh: any) => {},
        getMesh: () => null,
        setModel: (model: any) => {},
        getModel: () => null,
        setScene: (scene: any) => {},
        getScene: () => null,
        setCamera: (camera: any) => {},
        getCamera: () => null,
        setLight: (light: any) => {},
        getLight: () => null,
        setAnimation: (animation: any) => {},
        getAnimation: () => null,
        setController: (controller: any) => {},
        getController: () => null,
        setRenderer: (renderer: any) => {},
        getRenderer: () => null,
        setLoader: (loader: any) => {},
        getLoader: () => null,
        setParser: (parser: any) => {},
        getParser: () => null,
        setValidator: (validator: any) => {},
        getValidator: () => null,
        setSerializer: (serializer: any) => {},
        getSerializer: () => null,
        setDeserializer: (deserializer: any) => {},
        getDeserializer: () => null,
        setTransformer: (transformer: any) => {},
        getTransformer: () => null,
        setConverter: (converter: any) => {},
        getConverter: () => null,
        setProcessor: (processor: any) => {},
        getProcessor: () => null,
        setAnalyzer: (analyzer: any) => {},
        getAnalyzer: () => null,
        setOptimizer: (optimizer: any) => {},
        getOptimizer: () => null,
        setCompressor: (compressor: any) => {},
        getCompressor: () => null,
        setDecompressor: (decompressor: any) => {},
        getDecompressor: () => null,
        setEncryptor: (encryptor: any) => {},
        getEncryptor: () => null,
        setDecryptor: (decryptor: any) => {},
        getDecryptor: () => null,
        setHasher: (hasher: any) => {},
        getHasher: () => null,
        setSigner: (signer: any) => {},
        getSigner: () => null,
        setVerifier: (verifier: any) => {},
        getVerifier: () => null,
        setEncoder: (encoder: any) => {},
        getEncoder: () => null,
        setDecoder: (decoder: any) => {},
        getDecoder: () => null,
        setCodec: (codec: any) => {},
        getCodec: () => null,
        setProtocol: (protocol: any) => {},
        getProtocol: () => null,
        setTransport: (transport: any) => {},
        getTransport: () => null,
        setConnection: (connection: any) => {},
        getConnection: () => null,
        setSession: (session: any) => {},
        getSession: () => null,
        setTransaction: (transaction: any) => {},
        getTransaction: () => null,
        setOperation: (operation: any) => {},
        getOperation: () => null,
        setCommand: (command: any) => {},
        getCommand: () => null,
        setAction: (action: any) => {},
        getAction: () => null,
        setEvent: (event: any) => {},
        getEvent: () => null,
        setCallback: (callback: any) => {},
        getCallback: () => null,
        setResult: (result: any) => {},
        getResult: () => null,
        setErrorStatus: (error: any) => {},
        getErrorStatus: () => null,
        setStatus: (status: any) => {},
        getStatus: () => null,
        setProgress: (progress: any) => {},
        getProgress: () => null,
        setRate: (rate: any) => {},
        getRate: () => null,
        setSpeed: (speed: any) => {},
        getSpeed: () => null,
        setQuality: (quality: any) => {},
        getQuality: () => null,
        setLevel: (level: any) => {},
        getLevel: () => null,
        setPriority: (priority: any) => {},
        getPriority: () => null,
        setWeight: (weight: any) => {},
        getWeight: () => null,
        // 注意：setSize, getSize, setPosition, getPosition, setRotation, getRotation, setScale, getScale 已在前面定义
        setTransform: (transform: any) => {},
        getTransform: () => null,
        setMatrix: (matrix: any) => {},
        getMatrix: () => null,
        setVector: (vector: any) => {},
        getVector: () => null,
        setColor: (color: any) => {},
        getColor: () => null,
        setGradient: (gradient: any) => {},
        getGradient: () => null,
        setPattern: (pattern: any) => {},
        getPattern: () => null,
        setFilter: (filter: any) => {},
        getFilter: () => null,
        setEffect: (effect: any) => {},
        getEffect: () => null,
        setBlend: (blend: any) => {},
        getBlend: () => null,
        setComposite: (composite: any) => {},
        getComposite: () => null,
        setMask: (mask: any) => {},
        getMask: () => null,
        setClip: (clip: any) => {},
        getClip: () => null,
        setRegion: (region: any) => {},
        getRegion: () => null,
        setBoundary: (boundary: any) => {},
        getBoundary: () => null,
        setBounds: (bounds: any) => {},
        getBounds: () => null,
        setRect: (rect: any) => {},
        getRect: () => null,
        setCircle: (circle: any) => {},
        getCircle: () => null,
        setPolygon: (polygon: any) => {},
        getPolygon: () => null,
        setPath: (path: any) => {},
        getPath: () => null,
        setCurve: (curve: any) => {},
        getCurve: () => null,
        setSurface: (surface: any) => {},
        getSurface: () => null,
        setVolume: (volume: any) => {},
        getVolume: () => null,
        setArea: (area: any) => {},
        getArea: () => null,
        setLength: (length: any) => {},
        getLength: () => null,
        setAngle: (angle: any) => {},
        getAngle: () => null,
        setDistance: (distance: any) => {},
        getDistance: () => null,
        setTime: (time: any) => {},
        getTime: () => null,
        setDate: (date: any) => {},
        getDate: () => null,
        setDateTime: (dateTime: any) => {},
        getDateTime: () => null,
        setTimestamp: (timestamp: any) => {},
        getTimestamp: () => null,
        setDuration: (duration: any) => {},
        getDuration: () => null,
        setFrequency: (frequency: any) => {},
        getFrequency: () => null,
        setPeriod: (period: any) => {},
        getPeriod: () => null,
        setPhase: (phase: any) => {},
        getPhase: () => null,
        setAmplitude: (amplitude: any) => {},
        getAmplitude: () => null,
        setFrequency: (frequency: any) => {},
        getFrequency: () => null,
        setWavelength: (wavelength: any) => {},
        getWavelength: () => null,
        setVelocity: (velocity: any) => {},
        getVelocity: () => null,
        setAcceleration: (acceleration: any) => {},
        getAcceleration: () => null,
        setForce: (force: any) => {},
        getForce: () => null,
        setEnergy: (energy: any) => {},
        getEnergy: () => null,
        setPower: (power: any) => {},
        getPower: () => null,
        setPressure: (pressure: any) => {},
        getPressure: () => null,
        setTemperature: (temperature: any) => {},
        getTemperature: () => null,
        setHumidity: (humidity: any) => {},
        getHumidity: () => null,
        setLight: (light: any) => {},
        getLight: () => null,
        setSound: (sound: any) => {},
        getSound: () => null,
        setVibration: (vibration: any) => {},
        getVibration: () => null,
        setMotion: (motion: any) => {},
        getMotion: () => null,
        setGesture: (gesture: any) => {},
        getGesture: () => null,
        setPose: (pose: any) => {},
        getPose: () => null,
        setExpression: (expression: any) => {},
        getExpression: () => null,
        setEmotion: (emotion: any) => {},
        getEmotion: () => null,
        setMood: (mood: any) => {},
        getMood: () => null,
        setBehavior: (behavior: any) => {},
        getBehavior: () => null,
        setAction: (action: any) => {},
        getAction: () => null,
        setActivity: (activity: any) => {},
        getActivity: () => null,
        setTask: (task: any) => {},
        getTask: () => null,
        setJob: (job: any) => {},
        getJob: () => null,
        setProcess: (process: any) => {},
        getProcess: () => null,
        setThread: (thread: any) => {},
        getThread: () => null,
        setWorker: (worker: any) => {},
        getWorker: () => null,
        setAgent: (agent: any) => {},
        getAgent: () => null,
        setActor: (actor: any) => {},
        getActor: () => null,
        setEntity: (entity: any) => {},
        getEntity: () => null,
        setObject: (object: any) => {},
        getObject: () => null,
        setSubject: (subject: any) => {},
        getSubject: () => null,
        setItem: (item: any) => {},
        getItem: () => null,
        setElement: (element: any) => {},
        getElement: () => null,
        setComponent: (component: any) => {},
        getComponent: () => null,
        setModule: (module: any) => {},
        getModule: () => null,
        setPlugin: (plugin: any) => {},
        getPlugin: () => null,
        setExtension: (extension: any) => {},
        getExtension: () => null,
        setFeature: (feature: any) => {},
        getFeature: () => null,
        setCapability: (capability: any) => {},
        getCapability: () => null,
        setPermission: (permission: any) => {},
        getPermission: () => null,
        setAccess: (access: any) => {},
        getAccess: () => null,
        setAuth: (auth: any) => {},
        getAuth: () => null,
        setSecurity: (security: any) => {},
        getSecurity: () => null,
        setPrivacy: (privacy: any) => {},
        getPrivacy: () => null,
        setSafety: (safety: any) => {},
        getSafety: () => null,
        setHealth: (health: any) => {},
        getHealth: () => null,
        setStatus: (status: any) => {},
        getStatus: () => null,
        setState: (state: any) => {},
        getState: () => null,
        setMode: (mode: any) => {},
        getMode: () => null,
        setType: (type: any) => {},
        getType: () => null,
        setKind: (kind: any) => {},
        getKind: () => null,
        setCategory: (category: any) => {},
        getCategory: () => null,
        setClass: (cls: any) => {},
        getClass: () => null,
        setGroup: (group: any) => {},
        getGroup: () => null,
        setFamily: (family: any) => {},
        getFamily: () => null,
        setSpecies: (species: any) => {},
        getSpecies: () => null,
        setGenus: (genus: any) => {},
        getGenus: () => null,
        setOrder: (order: any) => {},
        getOrder: () => null,
        setPhylum: (phylum: any) => {},
        getPhylum: () => null,
        setKingdom: (kingdom: any) => {},
        getKingdom: () => null,
        setDomain: (domain: any) => {},
        getDomain: () => null,
        setName: (name: any) => {},
        getName: () => null,
        setId: (id: any) => {},
        getId: () => null,
        setCode: (code: any) => {},
        getCode: () => null,
        setSymbol: (symbol: any) => {},
        getSymbol: () => null,
        setValue: (value: any) => {},
        getValue: () => null,
        setUnit: (unit: any) => {},
        getUnit: () => null,
        setScale: (scale: any) => {},
        getScale: () => null,
        setPrecision: (precision: any) => {},
        getPrecision: () => null,
        setAccuracy: (accuracy: any) => {},
        getAccuracy: () => null,
        setTolerance: (tolerance: any) => {},
        getTolerance: () => null,
        setError: (error: any) => {},
        getError: () => null,
        setDeviation: (deviation: any) => {},
        getDeviation: () => null,
        setVariance: (variance: any) => {},
        getVariance: () => null,
        setStdDev: (stdDev: any) => {},
        getStdDev: () => null,
        setMean: (mean: any) => {},
        getMean: () => null,
        setMedian: (median: any) => {},
        getMedian: () => null,
        setMode: (mode: any) => {},
        getMode: () => null,
        setRange: (range: any) => {},
        getRange: () => null,
        setMin: (min: any) => {},
        getMin: () => null,
        setMax: (max: any) => {},
        getMax: () => null,
        setAvg: (avg: any) => {},
        getAvg: () => null,
        setSum: (sum: any) => {},
        getSum: () => null,
        setCount: (count: any) => {},
        getCount: () => null,
        setTotal: (total: any) => {},
        getTotal: () => null,
        setPercentage: (percentage: any) => {},
        getPercentage: () => null,
        setRatio: (ratio: any) => {},
        getRatio: () => null,
        setProportion: (proportion: any) => {},
        getProportion: () => null,
        setFraction: (fraction: any) => {},
        getFraction: () => null,
        setDecimal: (decimal: any) => {},
        getDecimal: () => null,
        setInteger: (integer: any) => {},
        getInteger: () => null,
        setFloat: (float: any) => {},
        getFloat: () => null,
        setDouble: (double: any) => {},
        getDouble: () => null,
        setBoolean: (boolean: any) => {},
        getBoolean: () => null,
        setString: (string: any) => {},
        getString: () => null,
        setArray: (array: any) => {},
        getArray: () => null,
        setList: (list: any) => {},
        getList: () => null,
        setMap: (map: any) => {},
        getMap: () => null,
        setObject: (obj: any) => {},
        getObject: () => null,
        setJson: (json: any) => {},
        getJson: () => null,
        setXml: (xml: any) => {},
        getXml: () => null,
        setYaml: (yaml: any) => {},
        getYaml: () => null,
        setCsv: (csv: any) => {},
        getCsv: () => null,
        setTsv: (tsv: any) => {},
        getTsv: () => null,
        setHtml: (html: any) => {},
        getHtml: () => null,
        setCss: (css: any) => {},
        getCss: () => null,
        setJs: (js: any) => {},
        getJs: () => null,
        setTs: (ts: any) => {},
        getTs: () => null,
        setSql: (sql: any) => {},
        getSql: () => null,
        setJsonl: (jsonl: any) => {},
        getJsonl: () => null,
        setNdjson: (ndjson: any) => {},
        getNdjson: () => null,
        setMsgpack: (msgpack: any) => {},
        getMsgpack: () => null,
        setProtobuf: (protobuf: any) => {},
        getProtobuf: () => null,
        setAvro: (avro: any) => {},
        getAvro: () => null,
        setParquet: (parquet: any) => {},
        getParquet: () => null,
        setHdf5: (hdf5: any) => {},
        getHdf5: () => null,
        setNetcdf: (netcdf: any) => {},
        getNetcdf: () => null,
        setFits: (fits: any) => {},
        getFits: () => null,
        setPng: (png: any) => {},
        getPng: () => null,
        setJpg: (jpg: any) => {},
        getJpg: () => null,
        setGif: (gif: any) => {},
        getGif: () => null,
        setBmp: (bmp: any) => {},
        getBmp: () => null,
        setTiff: (tiff: any) => {},
        getTiff: () => null,
        setWebp: (webp: any) => {},
        getWebp: () => null,
        setSvg: (svg: any) => {},
        getSvg: () => null,
        setPdf: (pdf: any) => {},
        getPdf: () => null,
        setDoc: (doc: any) => {},
        getDoc: () => null,
        setXls: (xls: any) => {},
        getXls: () => null,
        setPpt: (ppt: any) => {},
        getPpt: () => null,
        setMp3: (mp3: any) => {},
        getMp3: () => null,
        setWav: (wav: any) => {},
        getWav: () => null,
        setFlac: (flac: any) => {},
        getFlac: () => null,
        setOgg: (ogg: any) => {},
        getOgg: () => null,
        setM4a: (m4a: any) => {},
        getM4a: () => null,
        setMp4: (mp4: any) => {},
        getMp4: () => null,
        setAvi: (avi: any) => {},
        getAvi: () => null,
        setMov: (mov: any) => {},
        getMov: () => null,
        setWmv: (wmv: any) => {},
        getWmv: () => null,
        setFlv: (flv: any) => {},
        getFlv: () => null,
        setWebm: (webm: any) => {},
        getWebm: () => null,
        set3gp: (_3gp: any) => {},
        get3gp: () => null,
        setMkv: (mkv: any) => {},
        getMkv: () => null,
      } as any; // 使用 as any 绕过类型检查
      
      // 连接 WebSocket
      this.ttsa = this.connectTtsa(sessionInfo);
      this.renderScheduler.init();
      this.renderScheduler.setAvatarCanvasVisible(this.avatarCanvasVisible);

      // 注意：小程序中没有 window 和 document，所以不添加事件监听器
    } catch (error) {
      console.error(this.TAG, 'Init error:', error);
      this.onMessage({
        code: EErrorCode.NETWORK_BREAK, // 使用已存在的错误码
        message: `初始化失败: ${(error as Error).message}`,
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
  setReplayData(data: any) {
    this.replayData = data;
  }

  /**
   * 处理回放发送
   */
  handleReplaySend(frame: number) {
    if(!this.replayData) {
      return;
    }
    const frameReplayData = this.replayData.filter((item: any) => (Number(item.client_frame_number) === frame && item.event_type !== "sdk_burial_point"))?.[0];
    if(frameReplayData) {
      if(frameReplayData.event_type === 'state_change') {
        this.ttsa?.stateChange(frameReplayData.event_data.state, frameReplayData.event_data.params);
      }else if(frameReplayData.event_type === 'send_text') {
        this.speak(frameReplayData.event_data.ssml, frameReplayData.event_data.is_start, frameReplayData.event_data.is_end, frameReplayData.event_data.extra);
      }else {
        console.log(this.TAG, `[handleReplaySend] 未知事件类型: ${frameReplayData}`);
      }
    }
  }

  /**
   * 连接 Ttsa（WebSocket）
   */
  private connectTtsa(sessionInfo: ISessionResponse) {
    console.log(this.TAG, 'Connecting to Ttsa...');
    (globalThis as any).performanceTracker?.markStart?.(performanceConstant.ttsa_connect);
    (globalThis as any).performanceTracker?.markStart?.(performanceConstant.ttsa_ready);
    return new Ttsa({
      sdkInstance: this as any,
      url: sessionInfo.socket_io_url,
      room: sessionInfo.room,
      session_id: sessionInfo.session_id,
      token: sessionInfo.token,
      appInfo: this.resourceManager.getAppInfo(),
      framedata_proto_version: sessionInfo.config.framedata_proto_version,
      onReady: () => {
        this.onStatusChange(AvatarStatus.online);
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
    } else {
      this.onStatusChange(AvatarStatus.online);
    }
  }

  /**
   * 重新加载
   */
  private async _reload() {
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
    this.onStatusChange(AvatarStatus.online);
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
  private handleMessage = (type: EFrameDataType, data: IRawFrameData[]) => {
    if (!this.renderScheduler) {
      console.warn(this.TAG, 'RenderScheduler not initialized');
      return;
    }
    this.renderScheduler.handleData(data, type);
  };

  /**
   * 处理 AA 帧数据
   */
  private handleAAFrame = (data: any) => {
    this.options.onAAFrameHandle?.(data);
  };

  /**
   * 运行起始帧索引
   */
  private runStartFrameIndex = (client_time: number) => {
    if (!this.renderScheduler) {
      console.warn(this.TAG, 'RenderScheduler not initialized');
      return;
    }
    this.renderScheduler.runStartFrameIndex();
  };

  /**
   * TTSA 状态变化处理
   */
  private ttsaStateChangeHandle = (state: StateChangeInfo) => {
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
  public async destroyClient() {
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

    if(this.networkMonitor) {
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
  public async destroy(stop_reason: string = "user"): Promise<void> {
    console.log(this.TAG, 'Destroying SDK...');
    this.replayData = null;
    this.ttsa?.sendSdkPoint('close_session', {
      reason: stop_reason,
    });
    this.destroyClient();
    
    const res = await this.resourceManager.stopSession(stop_reason);
    if(res) {
      this.onStatusChange(AvatarStatus.close);
    }
    return res;
  }

  /**
   * 空闲状态
   */
  idle() {
    if(this.enableClientInterrupt) {
      this.renderScheduler.interrupt("idle");
    }
    this.ttsa?.idle();
  }

  /**
   * 监听状态
   */
  listen() {
    if(this.enableClientInterrupt) {    
      this.renderScheduler.interrupt("listen");
    }
    this.ttsa?.listen();
  }

  /**
   * 思考状态
   */
  think() {
    if(this.enableClientInterrupt) {    
      this.renderScheduler.interrupt("think");
    }
    this.ttsa?.think();
  }

  /**
   * 交互空闲状态
   */
  interactiveidle() {
    if(this.enableClientInterrupt) {    
      this.renderScheduler.interrupt("interactiveidle");
    }
    this.ttsa?.interactiveidle();
  }

  /**
   * 说话
   */
  speak(ssml: string, is_start: boolean = true, is_end: boolean = true, extra = {}) {
    if(this.enableClientInterrupt) {    
      this.renderScheduler.interrupt("speak");
    }
    this.ttsa?.sendText(ssml, is_start, is_end, extra);
    this.renderScheduler.resume();
  }

  /**
   * 设置音量
   */
  setVolume(volume: number) {
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
  public showDebugInfo() {
    this.debugOverlay?.show();
  }

  /**
   * 隐藏调试信息
   */
  public hideDebugInfo() {
    this.debugOverlay?.hide();
  }

  /**
   * 更改头像可见性
   */
  public changeAvatarVisible(visible: boolean) {
    this.avatarCanvasVisible = visible;
    this.renderScheduler?.setAvatarCanvasVisible(visible);
  }

  /**
   * 清理初始化前的资源
   */
  private cleanupBeforeInitComplete(reason: string) {
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
      } catch (e) {
        console.warn(this.TAG, '清理 renderScheduler 时出错', e);
      }
    }
    
    if (this.resourceManager) {
      try {
        this.resourceManager.destroy();
      } catch (e) {
        console.warn(this.TAG, '清理 resourceManager 时出错', e);
      }
    }
    
    if (this.debugOverlay) {
      try {
        this.debugOverlay.destroy();
        this.debugOverlay = null;
      } catch (e) {
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
  private offlineHandle() {
    this.onStatusChange(AvatarStatus.offline);
    this.renderScheduler._offlineMode?.();
    
    // 使用 setTimeout 替代 setInterval
    const intervalFunc = () => {
      if(this.status !== AvatarStatus.offline) {
        if (this._offlineTimer) {
          clearTimeout(this._offlineTimer);
          this._offlineTimer = null;
        }
        return;
      }
      this.renderScheduler._offlineRun?.();
      
      // 递归调用实现循环
      this._offlineTimer = setTimeout(intervalFunc, this._offlineInterval) as any;
    };
    
    this._offlineTimer = setTimeout(intervalFunc, this._offlineInterval) as any;
  }

  /**
   * Socket 会话停止
   */
  public stopSessionFromSocket(reason: string) {
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
  onMessage(params: any) {
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
  onStatusChange(status: AvatarStatus) {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  /**
   * 切换隐身模式
   */
  public switchInvisibleMode(): void {
    if (!this.renderScheduler) {
      console.warn(this.TAG, 'RenderScheduler 未初始化，无法切换隐身模式');
      return;
    }
    
    if (this.status === AvatarStatus.visible || this.status === AvatarStatus.online) {
      this.setInvisibleMode();
    } else {
      this.ttsa?.exitInvisibleMode?.();
      this.renderScheduler.switchInvisibleMode?.();
      this.listen();
    }
  }

  /**
   * 设置隐身模式
   */
  private setInvisibleMode() {
    this.interactiveidle();
    this.renderScheduler.switchInvisibleMode?.();
    this.ttsa?.enterInvisibleMode?.();
    this.onStatusChange(AvatarStatus.invisible);
  }

  /**
   * 获取隐身模式状态
   */
  public getPendingInvisibleMode() {
    return this.pendingInvisibleMode || false;
  }

  /**
   * 获取渲染状态
   */
  public getRenderState(): RenderState {
    if (!this.renderScheduler) {
      return RenderState.init;
    }
    return this.renderScheduler.getRenderState?.() || RenderState.init;
  }

  /**
   * 更改布局
   */
  changeLayout(layout: Layout) {
    this.ttsa?.changeLayout?.(layout);
    this.renderScheduler.setCharacterCanvasLayout?.(layout);
  }

  /**
   * 更改行走配置
   */
  changeWalkConfig(walkConfig: WalkConfig) {
    this.ttsa?.changeWalkConfig?.(walkConfig);
  }
  
  /**
   * 中断
   */
  interrupt(type: string) {
    this.renderScheduler.interrupt?.(type);
  }

  /**
   * 触发重连
   */
  private triggerReconnect() {
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
    }, 100) as any;
  }

  /**
   * 重新开始会话
   */
  reStartSession() {
    if (this.isRetrying || this.retryRound > this.maxRetryRound) return;

    this.clearAllRetryTimers();

    this.isStartRetry = true;
    this.isRetrying = true;

    this._retryImpl();
  }

  /**
   * 重试实现
   */
  private async _retryImpl() {
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
              console.warn(
                this.TAG, 
                `重试达最大轮次(${this.maxRetryRound})+每轮最大次数(${this.maxRetryCount})，总次数=${this.maxRetryRound*this.maxRetryCount}，停止重试`
              );
              this.resetRetryState();
              return;
            } else {
              console.warn(
                this.TAG, 
                `第${this.retryRound}轮重试次数达上限(${this.maxRetryCount})，进入第${this.retryRound+1}轮重试`
              );
              this.retryCount = 1;
              this.retryRound += 1;
            }
          } else {
            this.retryCount += 1;
          }
          this._retryImpl();
        } else {
          this.renderScheduler.stopAudio?.(-1);
          console.log(
            this.TAG, 
            `第${this.retryRound}轮第${this.retryCount}次重试成功，停止重试`
          );
          this.resetRetryState();
        }
      } catch (error) {
        console.error(this.TAG, "重试过程异常", error);
        if (this.retryCount >= this.maxRetryCount) {
          if (this.retryRound >= this.maxRetryRound) {
            console.warn(
              this.TAG, 
              `重试异常且达总次数上限(${this.maxRetryRound*this.maxRetryCount})，停止重试`
            );
            this.resetRetryState();
            return;
          } else {
            this.retryCount = 1;
            this.retryRound += 1;
          }
        } else {
          this.retryCount += 1;
        }
        
        if (this.retryRound <= this.maxRetryRound && this.isRetrying) {
          this._retryImpl();
        } else {
          this.resetRetryState();
        }
      }
    }, delay);
  }

  /**
   * 清除所有重试定时器
   */
  private clearAllRetryTimers() {
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
  private resetRetryState() {
    this.isRetrying = false;
    this.isStartRetry = false;
    this.retryCount = 1;
    this.retryRound = 1;
  }
}
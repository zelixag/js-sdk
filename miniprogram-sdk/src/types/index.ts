/**
 * 小程序版 SDK 类型定义
 */

export enum EErrorCode {
  NETWORK_DOWN = 1000,
  NETWORK_UP = 1001,
  NETWORK_RETRY = 1002,
  NETWORK_BREAK = 1003,
  CONTAINER_NOT_FOUND = 2001,
  CANVAS_INIT_FAILED = 2002,
  INIT_FAILED = 2003,
  RENDER_BODY_ERROR = 3001,
  RENDER_FACE_ERROR = 3002,
  BODY_DATA_EXPIRED = 3003,
  WEBSOCKET_CONNECT_ERROR = 4001,
  WEBSOCKET_DISCONNECTED = 4002,
  RESOURCE_LOAD_FAILED = 5001,
  AUDIO_PLAYBACK_ERROR = 6001,
  WEBGL_CONTEXT_LOST = 7001,
}

export interface IAvatarOptions {
  containerId: string;
  appId: string;
  appSecret: string;
  gatewayServer: string;
  cacheServer?: string;
  config?: any;
  env?: string;
  enableLogger?: boolean;
  enableDebugger?: boolean;
  hardwareAcceleration?: 'default' | 'on' | 'off';
  enableClientInterrupt?: boolean;
  headers?: Record<string, string>;
  tag?: string;
  onMessage?: (error: any) => void;
  onStateChange?: (state: string) => void;
  onStatusChange?: (status: AvatarStatus) => void;
  onRenderChange?: (state: RenderState) => void;
  onVoiceStateChange?: (state: string, duration?: number) => void;
  onWalkStateChange?: (state: string) => void;
  onNetworkInfo?: (networkInfo: any) => void;
  onStartSessionWarning?: (message: any) => void;
  onStateRenderChange?: (state: string) => void;
  onAAFrameHandle?: (data: any) => void;
  onWidgetEvent?: (widget: any) => void;
  proxyWidget?: any;
  onDownloadProgress?: (progress: number) => void; // 添加这个属性
}

export interface IInitParams {
  onDownloadProgress?: (progress: number) => void;
  initModel?: InitModel;
  [key: string]: any;
}

export enum AvatarStatus {
  close = 0,
  online = 1,
  offline = 2,
  invisible = 3,
  visible = 4
}

export enum RenderState {
  init = 'init',
  loading = 'loading',
  rendering = 'rendering',
  stopped = 'stopped',
  resumed = 'resumed'
}

export enum InitModel {
  normal = 'normal',
  invisible = 'invisible'
}

export interface Layout {
  [key: string]: any;
}

export interface WalkConfig {
  [key: string]: any;
}

export interface ISessionResponse {
  socket_io_url: string;
  token: string;
  room: string;
  session_id: string;
  reconnect_client_timeout?: number;
  [key: string]: any;
}

export type TDownloadProgress = (progress: number) => void;
/**
 * 小程序版 SDK 错误类型定义
 */
export declare enum EErrorCode {
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
    WEBGL_CONTEXT_LOST = 7001
}
export interface SDKError {
    code: EErrorCode;
    message: string;
    timestamp: number;
    details?: any;
}

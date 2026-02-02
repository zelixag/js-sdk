/**
 * @file 错误码和定义
 */
export declare enum EErrorCode {
    CONTAINER_NOT_FOUND = 10001,
    CONNECT_SOCKET_ERROR = 10002,
    START_SESSION_ERROR = 10003,
    STOP_SESSION_ERROR = 10004,
    VIDEO_FRAME_EXTRACT_ERROR = 20001,
    INIT_WORKER_ERROR = 20002,
    PROCESS_VIDEO_STREAM_ERROR = 20003,
    FACE_PROCESSING_ERROR = 20004,
    RENDER_BODY_ERROR = 20005,
    RENDER_FACE_ERROR = 20006,
    BACKGROUND_IMAGE_LOAD_ERROR = 30001,
    FACE_BIN_LOAD_ERROR = 30002,
    INVALID_BODY_NAME = 30003,
    VIDEO_DOWNLOAD_ERROR = 30004,
    BODY_DATA_EXPIRED = 30005,
    AUDIO_DECODE_ERROR = 40001,// 音频解码错误
    FACE_DECODE_ERROR = 40002,// 表情解码错误
    VIDEO_DECODE_ERROR = 40003,// 身体视频解码错误
    EVENT_DECODE_ERROR = 40004,// 事件解码错误
    INVALID_DATA_STRUCTURE = 40005,// ttsa返回数据类型错误，非audio、body、face、event等
    TTSA_ERROR = 40006,// ttsa下行发送异常信息
    AUDIO_DATA_EXPIRED = 40007,// ttsa下发音频数据过期
    NETWORK_DOWN = 50001,// 离线模式
    NETWORK_UP = 50002,// 在线模式
    NETWORK_RETRY = 50003,// 网络重试
    NETWORK_BREAK = 50004
}
export interface SDKError {
    code: EErrorCode;
    message: string;
    timestamp: number;
    originalError?: any;
}

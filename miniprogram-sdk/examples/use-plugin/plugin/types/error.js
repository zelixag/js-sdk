/**
 * 小程序版 SDK 错误类型定义
 */
export var EErrorCode;
(function (EErrorCode) {
    EErrorCode[EErrorCode["NETWORK_DOWN"] = 1000] = "NETWORK_DOWN";
    EErrorCode[EErrorCode["NETWORK_UP"] = 1001] = "NETWORK_UP";
    EErrorCode[EErrorCode["NETWORK_RETRY"] = 1002] = "NETWORK_RETRY";
    EErrorCode[EErrorCode["NETWORK_BREAK"] = 1003] = "NETWORK_BREAK";
    EErrorCode[EErrorCode["CONTAINER_NOT_FOUND"] = 2001] = "CONTAINER_NOT_FOUND";
    EErrorCode[EErrorCode["CANVAS_INIT_FAILED"] = 2002] = "CANVAS_INIT_FAILED";
    EErrorCode[EErrorCode["INIT_FAILED"] = 2003] = "INIT_FAILED";
    EErrorCode[EErrorCode["RENDER_BODY_ERROR"] = 3001] = "RENDER_BODY_ERROR";
    EErrorCode[EErrorCode["RENDER_FACE_ERROR"] = 3002] = "RENDER_FACE_ERROR";
    EErrorCode[EErrorCode["BODY_DATA_EXPIRED"] = 3003] = "BODY_DATA_EXPIRED";
    EErrorCode[EErrorCode["WEBSOCKET_CONNECT_ERROR"] = 4001] = "WEBSOCKET_CONNECT_ERROR";
    EErrorCode[EErrorCode["WEBSOCKET_DISCONNECTED"] = 4002] = "WEBSOCKET_DISCONNECTED";
    EErrorCode[EErrorCode["RESOURCE_LOAD_FAILED"] = 5001] = "RESOURCE_LOAD_FAILED";
    EErrorCode[EErrorCode["AUDIO_PLAYBACK_ERROR"] = 6001] = "AUDIO_PLAYBACK_ERROR";
    EErrorCode[EErrorCode["WEBGL_CONTEXT_LOST"] = 7001] = "WEBGL_CONTEXT_LOST";
})(EErrorCode || (EErrorCode = {}));

/**
 * @file 错误码和定义
 */
export var EErrorCode;
(function (EErrorCode) {
    // 初始化错误
    // 容器不存在
    EErrorCode[EErrorCode["CONTAINER_NOT_FOUND"] = 10001] = "CONTAINER_NOT_FOUND";
    // socket连接错误
    EErrorCode[EErrorCode["CONNECT_SOCKET_ERROR"] = 10002] = "CONNECT_SOCKET_ERROR";
    // 会话错误，start_session进入catch（/api/session的接口数据异常，均使用response.error_code）
    EErrorCode[EErrorCode["START_SESSION_ERROR"] = 10003] = "START_SESSION_ERROR";
    // 会话错误，stop_session进入catch
    EErrorCode[EErrorCode["STOP_SESSION_ERROR"] = 10004] = "STOP_SESSION_ERROR";
    // 前端处理逻辑错误
    // 视频抽帧错误
    EErrorCode[EErrorCode["VIDEO_FRAME_EXTRACT_ERROR"] = 20001] = "VIDEO_FRAME_EXTRACT_ERROR";
    // 初始化视频抽帧WORKER错误
    EErrorCode[EErrorCode["INIT_WORKER_ERROR"] = 20002] = "INIT_WORKER_ERROR";
    // 抽帧视频流处理错误
    EErrorCode[EErrorCode["PROCESS_VIDEO_STREAM_ERROR"] = 20003] = "PROCESS_VIDEO_STREAM_ERROR";
    // 表情处理错误
    EErrorCode[EErrorCode["FACE_PROCESSING_ERROR"] = 20004] = "FACE_PROCESSING_ERROR";
    // 渲染错误
    EErrorCode[EErrorCode["RENDER_BODY_ERROR"] = 20005] = "RENDER_BODY_ERROR";
    EErrorCode[EErrorCode["RENDER_FACE_ERROR"] = 20006] = "RENDER_FACE_ERROR";
    // 资源管理错误
    // 背景图片加载错误
    EErrorCode[EErrorCode["BACKGROUND_IMAGE_LOAD_ERROR"] = 30001] = "BACKGROUND_IMAGE_LOAD_ERROR";
    // 表情数据加载错误
    EErrorCode[EErrorCode["FACE_BIN_LOAD_ERROR"] = 30002] = "FACE_BIN_LOAD_ERROR";
    // body数据无Name
    EErrorCode[EErrorCode["INVALID_BODY_NAME"] = 30003] = "INVALID_BODY_NAME";
    // 视频下载错误
    EErrorCode[EErrorCode["VIDEO_DOWNLOAD_ERROR"] = 30004] = "VIDEO_DOWNLOAD_ERROR";
    // 身体数据过期
    EErrorCode[EErrorCode["BODY_DATA_EXPIRED"] = 30005] = "BODY_DATA_EXPIRED";
    // sdk 获取ttsa数据解压缩错误
    EErrorCode[EErrorCode["AUDIO_DECODE_ERROR"] = 40001] = "AUDIO_DECODE_ERROR";
    EErrorCode[EErrorCode["FACE_DECODE_ERROR"] = 40002] = "FACE_DECODE_ERROR";
    EErrorCode[EErrorCode["VIDEO_DECODE_ERROR"] = 40003] = "VIDEO_DECODE_ERROR";
    EErrorCode[EErrorCode["EVENT_DECODE_ERROR"] = 40004] = "EVENT_DECODE_ERROR";
    EErrorCode[EErrorCode["INVALID_DATA_STRUCTURE"] = 40005] = "INVALID_DATA_STRUCTURE";
    EErrorCode[EErrorCode["TTSA_ERROR"] = 40006] = "TTSA_ERROR";
    EErrorCode[EErrorCode["AUDIO_DATA_EXPIRED"] = 40007] = "AUDIO_DATA_EXPIRED";
    // 网络错误
    EErrorCode[EErrorCode["NETWORK_DOWN"] = 50001] = "NETWORK_DOWN";
    EErrorCode[EErrorCode["NETWORK_UP"] = 50002] = "NETWORK_UP";
    EErrorCode[EErrorCode["NETWORK_RETRY"] = 50003] = "NETWORK_RETRY";
    EErrorCode[EErrorCode["NETWORK_BREAK"] = 50004] = "NETWORK_BREAK";
})(EErrorCode || (EErrorCode = {}));

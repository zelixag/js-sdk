/**
 * WebSocket 模块，即 TTSA 服务
 */
import { decode } from "@msgpack/msgpack";
import io from "socket.io-client";
import { EFrameDataType, } from "../types/frame-data";
import { AvatarStatus } from "../types";
import { EErrorCode } from "../types/error";
import { performanceConstant } from "../utils/perfermance";
import { scaledInt16BytesToFloat32 } from "../utils/float32-decoder";
import Pako from 'pako';
import '../proto/protobuf.min';
import '../proto/face_data_pb';
const proxyProtobuf = protobuf.roots.default;
const pointNameObj = {
    'connect_sdk': '连接SDK',
    'connect_sdk_success': '连接SDK成功',
    'llm_text_sdk_received': '大模型输出的文本SDK前端收到',
    'rendering_data_received': '客户端收到音频数据时间',
    'rendering_display': '客户端播放音频数据时间',
    'close_session': '关闭会话',
    'audio_data_expired': '音频数据过期',
};
export default class Ttsa {
    /**
     * 清除WebSocket重连定时器
     */
    clearReconnectTimer() {
        if (this.reconnectTimer !== -1) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = -1;
        }
    }
    constructor(options) {
        this.TAG = "[TTSA]";
        this._lastSessionId = "";
        this.reconnectTimer = -1;
        this.wsConnectTimer = 0;
        this.WS_NO_DATA_TIMEOUT = 30000;
        this.enterOfflineFlag = false;
        this._isResume = false;
        this.clearOldWsTimeoutTimer = () => {
            if (this.wsConnectTimer) {
                clearTimeout(this.wsConnectTimer);
                this.wsConnectTimer = 0; // 重置为初始值 0，保持状态统一
            }
        };
        this.initWsTimeoutTimer = () => {
            this.clearOldWsTimeoutTimer();
            this.wsConnectTimer = window.setTimeout(async () => {
                try {
                    this.sdk.onMessage({
                        code: EErrorCode.CONNECT_SOCKET_ERROR,
                        message: `Error: socket长时间未下发数据`,
                    });
                    if (this.session_id) {
                        await this.sdk.stopSessionFromSocket("WS_NO_DATA_TIMEOUT");
                        this.ws.disconnect();
                    }
                    this.reStartSDK();
                }
                finally {
                    this.clearOldWsTimeoutTimer();
                }
            }, this.WS_NO_DATA_TIMEOUT);
        };
        this.appInfo = options.appInfo;
        this.sdk = options.sdkInstance;
        this.room = options.room;
        this.session_id = options.session_id;
        this.token = options.token;
        this.framedata_proto_version = options.framedata_proto_version;
        this._uniqueSpeakId = 0;
        this.runStartFrameIndex = options.runStartFrameIndex;
        this.ttsaStateChangeHandle = options.ttsaStateChangeHandle;
        this.reloadSuccess = options.reloadSuccess;
        this.session_speak_req_id = 0;
        this.enterOfflineMode = options.enterOfflineMode;
        this.reStartSDK = options.reStartSDK;
        this.reconnect_client_timeout = options.reconnect_client_timeout;
        this.sendVoiceEnd = options.sendVoiceEnd;
        const ws = io(options.url, {
            query: {
                token: this.token,
            },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 1000,
            randomizationFactor: 0.3
        });
        ws.on("connect", () => {
            // 连接成功时清理重连定时器
            this.clearReconnectTimer();
            this.initWsTimeoutTimer();
            window.performanceTracker.markEnd(performanceConstant.ttsa_connect);
            const payload = {
                room: this.room,
                client_type: "web",
                invisible_mode: this.sdk.getPendingInvisibleMode(),
            };
            // TODO: 临时处理，待后端修复
            if (this.sdk.getStatus() === AvatarStatus.offline) {
                this.sdk.onStatusChange(AvatarStatus.online);
            }
            this.send("enter_room", payload);
        });
        ws.on("first_start_timestamp", (e) => {
            window.avatarSDKLogger.log(this.TAG, "first_start_timestamp", e);
            // 前端在发送first_start_timestamp后运行帧索引
            this.firstStartTimestamp(e.server_time);
            window.performanceTracker.markEnd(performanceConstant.ttsa_ready);
            window.performanceTracker.markStart(performanceConstant.ttsa_body_res);
            window.avatarSDKLogger.log(this.TAG, 'ready');
            this.reloadSuccess();
            options.onReady();
        });
        ws.on("state_change", (e) => {
            this.ttsaStateChangeHandle(e);
        });
        ws.on("tts_audio", (e) => {
            try {
                const decodedData = decode(e);
                this.sendSdkPoint('rendering_data_received', { multi_turn_conversation_id: decodedData[0].multi_turn_conversation_id });
                window.avatarSDKLogger.log(this.TAG, "下发音频数据tts_audio", decodedData);
                options.handleMessage(EFrameDataType.AUDIO, decodedData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: EErrorCode.AUDIO_DECODE_ERROR,
                    message: `Error: 音频数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("face_data", async (e) => {
            try {
                if (!this.framedata_proto_version) {
                    const faceDecodeData = decode(e);
                    window.avatarSDKLogger.log(this.TAG, "face_data", faceDecodeData);
                    if (faceDecodeData[0].s !== 'speak' && this.enterOfflineFlag) {
                        // 发送voice_end
                        this.sendVoiceEnd();
                        this.enterOfflineFlag = false;
                    }
                    options.handleMessage(EFrameDataType.FACE, faceDecodeData);
                }
                else {
                    let frameList = [];
                    const uint8Array = new Uint8Array(e);
                    const decompressed = Pako.inflate(uint8Array);
                    const FaceFrameDataList = proxyProtobuf.FaceFrameDataList.decode(decompressed, undefined, () => { });
                    const faceFrameList = FaceFrameDataList.toJSON() || { data: [] };
                    frameList = faceFrameList.data.map((frame) => {
                        // 1. 解析 JointData 实例（转为普通对象 + 解码 float16）
                        const joints = (frame.js || []).map((joint) => {
                            // joint 是 protobuf 生成的 JointData 实例，直接访问字段
                            return {
                                translate: joint.translate || [], // float32 无需解码，直接提取
                                rotate: joint.rotate ? scaledInt16BytesToFloat32(joint.rotate) : []
                            };
                        });
                        // 2. 解析 MeshData 实例（转为普通对象 + 解码 float16）
                        const meshes = (frame.ms || []).map((mesh) => {
                            return {
                                index: mesh.index || 0,
                                weights: mesh.weights || []
                            };
                        });
                        return {
                            ...frame,
                            bsw: frame.bsw ? scaledInt16BytesToFloat32(frame.bsw) : [],
                            js: joints,
                            ms: meshes,
                            body_id: frame.bodyId || 0, // proto 中的 body_id → 编译后 bodyId（驼峰）
                            face_frame_type: frame.faceFrameType || 0
                        };
                    });
                    options.handleMessage(EFrameDataType.FACE, frameList);
                    if (frameList[0].s !== 'speak' && this.enterOfflineFlag) {
                        // 发送voice_end
                        this.sendVoiceEnd();
                        this.enterOfflineFlag = false;
                    }
                    // const faceDecodeData = decode(e) as ITtsFaceFrameData[];
                    window.avatarSDKLogger.log(this.TAG, "face_data", frameList);
                }
            }
            catch (error) {
                this.sdk.destroy();
                this.sdk.onMessage({
                    code: EErrorCode.FACE_DECODE_ERROR,
                    message: `Error: 表情数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("body_data", (e) => {
            try {
                // 清空离线mode
                let bodyDecodeData = decode(e);
                window.performanceTracker.markEnd(performanceConstant.start_action_res, bodyDecodeData[0].s);
                const cBody = bodyDecodeData.map(item => ({
                    ...item,
                    x_offset: []
                }));
                window.avatarSDKLogger.log(this.TAG, "body_data", JSON.stringify(cBody), new Date().getTime());
                window.performanceTracker.markEnd(performanceConstant.ttsa_body_res);
                options.handleMessage(EFrameDataType.BODY, bodyDecodeData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: EErrorCode.VIDEO_DECODE_ERROR,
                    message: `Error: 身体数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("event_data", (e) => {
            try {
                const decodeData = decode(e);
                window.avatarSDKLogger.log(this.TAG, "event_data", JSON.stringify(decodeData));
                options.handleMessage(EFrameDataType.EVENT, decodeData);
            }
            catch (error) {
                this.sdk.onMessage({
                    code: EErrorCode.EVENT_DECODE_ERROR,
                    message: `Error: 事件数据解码失败`,
                    e: JSON.stringify({ error }),
                });
            }
        });
        ws.on("aa_frame", (e) => {
            window.avatarSDKLogger.log(this.TAG, "下发机器人视频帧aa_frame", e);
            options.handleAAFrame(e);
        });
        ws.on("error_message", (e) => {
            this.sdk.onMessage({
                code: EErrorCode.TTSA_ERROR,
                message: `${e.msg || 'TTSA返回异常'}`,
                e: JSON.stringify({ e }),
            });
        });
        ws.on("disconnect", (e) => {
            console.log("socket断开（disconnect）", e);
            this.clearOldWsTimeoutTimer();
            if (e === 'io client disconnect') {
                return;
            }
            window.avatarSDKLogger.warn(this.TAG, `${options.url} 已断开`, "disconnect原因", e);
            this.enterOfflineFlag = true;
            if (this.sdk.getStatus() === AvatarStatus.offline) {
                // 已进入离线模式，不销毁
                this.sdk.onStatusChange(AvatarStatus.offline);
            }
            else {
                // 无网断开则进入离线模式
                this.enterOfflineMode();
            }
            // else if (navigator.onLine && this.sdk.isDestroyed()) {
            // // 非离线模式 NetworkMonitor.ONLINE 且 sdk 销毁时，触发 close
            //   this.sdk.onStatusChange(AvatarStatus.close);
            // } else if (!this.sdk.isDestroyed()) {
            //   this.sdk.destroyClient();
            //   this.sdk.onStatusChange(AvatarStatus.close);
            // }
            // 发起定时器，getReconnectClientTimeout时间内重连socket，超过时间则发起reStartSession
            // 只有在网络断开时才设置重连定时器，网络恢复时由NetworkMonitor处理
            if (!navigator.onLine) {
                this.reconnectTimer = window.setTimeout(() => {
                    try {
                        ws.disconnect();
                    }
                    catch (error) {
                        window.avatarSDKLogger.warn(this.TAG, "disconnect error", error);
                    }
                    this.sdk.stopSessionFromSocket("WS_TIMEOUT");
                    this.reStartSDK();
                }, this.reconnect_client_timeout * 1000);
            }
        });
        ws.on("client_quit", (e) => {
            window.avatarSDKLogger.warn(this.TAG, "client_quit", "断开原因", e);
            ws.disconnect();
            this.session_speak_req_id = 0;
            if (Object.keys(e).length) {
                this.sdk.onMessage({
                    code: EErrorCode.STOP_SESSION_ERROR,
                    message: `ttsa主动关闭 reason: ${JSON.stringify({ e })}`,
                    e: JSON.stringify({ e }),
                });
            }
            // 字符库加载失败，进入离线模式
            if (e?.stop_reason !== 'user' && e?.stop_reason !== 'char_bin_load_error' && e?.stop_reason !== 'admin kick' && e?.stop_reason !== 'nebula admin stop') {
                if (this.sdk.getStatus() === AvatarStatus.offline) {
                    // 已进入离线模式，不销毁
                    this.sdk.onStatusChange(AvatarStatus.offline);
                }
                else {
                    // 无网断开则进入离线模式
                    this.enterOfflineMode();
                }
                this.reStartSDK();
            }
            else {
                this.sdk.destroyClient();
                this.sdk.onStatusChange(AvatarStatus.close);
            }
        });
        ws.on("connect_error", (e) => {
            this.sdk.onMessage({
                code: EErrorCode.CONNECT_SOCKET_ERROR,
                message: `Error: socket连接失败`,
                e: JSON.stringify({ e }),
            });
        });
        ws.onAny((event, args) => {
            window.avatarSDKLogger.log(this.TAG, "ws onAny", event, args);
            this.initWsTimeoutTimer();
        });
        this.ws = ws;
    }
    start() {
        if (this._isResume) {
            this._isResume = false;
            return;
        }
        this.stateChange("interactive_idle");
    }
    idle() {
        this.stateChange("idle");
    }
    // faceDetect() {
    //   this.stateChange("face_detect");
    // }
    // wakeUp() {
    //   this.stateChange("wake_up");
    // }
    listen() {
        this.stateChange("listen");
    }
    think() {
        this.stateChange("think");
    }
    // skill(action_semantic: string) {
    //   this.stateChange("skill",{
    //     action_semantic
    //   });
    // }
    // exitInteraction() {
    //   this.stateChange("exit_interaction");
    // }
    // touchReact() {
    //   this.stateChange("touch_react");
    // }
    interactiveidle() {
        this.stateChange("interactive_idle");
    }
    /**
     * 通知后端进入隐身模式
     */
    enterInvisibleMode() {
        this.send('switch_invisible_mode', { session_id: this.session_id, invisible_mode: true });
    }
    /**
     * 通知后端退出隐身模式
     */
    exitInvisibleMode() {
        this.send('switch_invisible_mode', { session_id: this.session_id, invisible_mode: false });
    }
    firstStartTimestamp(server_time) {
        const client_time = Date.now() / 1000;
        const payload = {
            server_time,
            client_time,
        };
        const resumeInfo = this._getResumeInfo();
        if (this._isResume && resumeInfo && resumeInfo.client_frame > 0) {
            payload['resume_from_offline_idle'] = resumeInfo;
        }
        else {
            // 数据异常，重置_isResume
            this._isResume = false;
        }
        this.runStartFrameIndex(client_time);
        this.send("first_start_timestamp", payload);
    }
    sendText(ssml, is_start, is_end, extra = {}) {
        if (!this.ws.connected) {
            return;
        }
        const payload = {
            ssml,
            is_start,
            is_end,
            extra,
            multi_turn_conversation_id: this.getUniqueSpeakId(),
            session_speak_req_id: this.session_speak_req_id
        };
        this.sendSdkPoint('llm_text_sdk_received', {
            ...extra,
            is_start,
            is_end,
            content: { ssml },
            multi_turn_conversation_id: this.getUniqueSpeakId(),
            speak_id: this.session_speak_req_id++,
        });
        if (is_start) {
            window.performanceTracker.markStart(performanceConstant.start_action_res, 'speak');
            window.performanceTracker.markStart(performanceConstant.start_action_render, 'speak');
            window.performanceTracker.markStart(performanceConstant.voice_response_play, 'speak');
        }
        if (is_end) {
            this.updateUniqueSpeakId();
        }
        this.send("send_text", payload);
    }
    sendSdkPoint(name, params = {}, extra) {
        this.send("sdk_burial_point", {
            ...params,
            ...extra,
            ...this.appInfo,
            burial_type: 1,
            session_id: this.session_id,
            event_en_name: name,
            event_cn_name: pointNameObj[name],
            device: navigator.userAgent,
            timestamp: params.timestamp || Date.now(),
            // @ts-ignore
            sdkVersion: VERSION,
        });
    }
    stateChange(state, params) {
        const payload = {
            state,
            params: params || {},
        };
        window.performanceTracker.markStart(performanceConstant.start_action_res, state);
        window.performanceTracker.markStart(performanceConstant.start_action_render, state);
        this.send("state_change", payload);
    }
    sendPerfLog(payload) {
        this.ws.emit('perf_log', {
            payload,
            sessionId: this._lastSessionId,
        });
    }
    changeLayout(layout) {
        this.send("change_layout", layout);
    }
    changeWalkConfig(walkConfig) {
        this.send("walk_config", walkConfig);
    }
    send(event, payload) {
        if (!this.ws.connected) {
            return;
        }
        this.ws.emit(event, payload);
    }
    getStatus() {
        return this.ws.connected;
    }
    _setResumeInfoCallback(lastSessionId, _getResumeInfo) {
        this._isResume = true;
        this._lastSessionId = lastSessionId;
        this.getResumeInfo = _getResumeInfo;
    }
    _getResumeInfo() {
        if (this.getResumeInfo) {
            const resumeInfo = this.getResumeInfo();
            if (this._lastSessionId) {
                resumeInfo['last_session_id'] = this._lastSessionId;
            }
            return resumeInfo;
        }
        return null;
    }
    updateUniqueSpeakId() {
        this._uniqueSpeakId += 1;
    }
    getUniqueSpeakId() {
        return `${this._uniqueSpeakId}-${this.session_id}`;
    }
    close() {
        // 使用 disconnect() 而不是 close()，disconnect() 会停止所有重连尝试
        if (this.ws) {
            this.ws.disconnect();
        }
        this.clearOldWsTimeoutTimer();
        this.session_speak_req_id = 0;
        if (this.reconnectTimer !== -1) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = -1;
        }
    }
    connect() {
        this.ws.connect();
    }
}

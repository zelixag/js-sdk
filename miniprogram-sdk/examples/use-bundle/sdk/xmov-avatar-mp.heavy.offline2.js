'use strict';

var vendor = require('./xmov-avatar-mp.heavy.vendor.js');
var offline = require('./xmov-avatar-mp.heavy.offline.js');

exports.AvatarStatus = void 0;
(function (AvatarStatus) {
    // initialized,
    AvatarStatus[AvatarStatus["online"] = 0] = "online";
    AvatarStatus[AvatarStatus["offline"] = 1] = "offline";
    AvatarStatus[AvatarStatus["network_on"] = 2] = "network_on";
    AvatarStatus[AvatarStatus["network_off"] = 3] = "network_off";
    AvatarStatus[AvatarStatus["close"] = 4] = "close";
    AvatarStatus[AvatarStatus["visible"] = 5] = "visible";
    AvatarStatus[AvatarStatus["invisible"] = 6] = "invisible";
    AvatarStatus[AvatarStatus["stopped"] = 7] = "stopped";
})(exports.AvatarStatus || (exports.AvatarStatus = {}));
/**
 * 渲染状态枚举
 * 用于表示渲染器的状态，与数字人状态（AvatarStatus）分离
 */
exports.RenderState = void 0;
(function (RenderState) {
    RenderState["init"] = "init";
    RenderState["rendering"] = "rendering";
    RenderState["pausing"] = "pausing";
    RenderState["paused"] = "paused";
    RenderState["resumed"] = "resumed";
    RenderState["stopped"] = "stopped";
})(exports.RenderState || (exports.RenderState = {}));
exports.InitModel = void 0;
(function (InitModel) {
    InitModel["normal"] = "normal";
    InitModel["invisible"] = "invisible";
})(exports.InitModel || (exports.InitModel = {}));

/**
 * @file 错误码和定义
 */
exports.EErrorCode = void 0;
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
})(exports.EErrorCode || (exports.EErrorCode = {}));

const performanceConstant = {
    load_resource: 'load_resource',
    ttsa_connect: 'ttsa_connect',
    ttsa_ready: 'ttsa_ready',
    first_avatar_render: 'first_avatar_render',
    first_webgl_render: 'first_webgl_render',
    ttsa_body_res: 'ttsa_body_res',
    start_action_res: 'start_action_res',
    start_action_render: 'start_action_render',
    load_video: 'load_video',
    decode_video: 'decode_video',
    voice_response_play: 'voice_response_play',
};
class PerformanceTracker {
    marks = new Map();
    measures = new Map();
    reportFunc = null;
    onStateRenderChange = () => { };
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }
    // 记录开始时间点
    markStart(key, state) {
        this.marks.set(key, {
            state,
            time: performance.now(),
        });
    }
    // 记录结束时间点并计算耗时
    markEnd(key, state) {
        const mark = this.marks.get(key);
        if (!mark)
            return;
        if (state && typeof state === 'string' && state !== mark?.state) {
            return;
        }
        const endTime = performance.now();
        const duration = endTime - mark.time;
        this.measures.set(key, {
            state: mark?.state,
            time: duration,
        });
        // 提供给业务方状态改变到渲染耗时
        if (mark.state && key === performanceConstant.start_action_render) {
            this.onStateRenderChange(mark.state, duration);
        }
        this.reportMetric();
        if (key !== performanceConstant.load_video && key !== performanceConstant.decode_video) {
            this.marks.delete(key);
        }
        return duration;
    }
    // 获取所有性能数据
    getAllMetrics() {
        return Object.fromEntries(this.measures.entries());
    }
    getVideoMetrics() {
        const data = this.getAllMetrics();
        const filterData = Object.fromEntries(Object.entries(data).filter(([key]) => [performanceConstant.decode_video, performanceConstant.load_video].includes(key)));
        return filterData;
    }
    setReportFunc(ttsa) {
        this.reportFunc = ttsa;
    }
    // 上报数据到服务器
    reportMetric() {
        const data = this.getAllMetrics();
        if (Object.keys(data).length > 0 && this.reportFunc?.getStatus()) {
            // 过滤load_video和decode_video
            const filterData = Object.fromEntries(Object.entries(data).filter(([key]) => ![performanceConstant.load_video, performanceConstant.decode_video].includes(key)));
            if (Object.keys(filterData).length > 0) {
                this.reportFunc?.sendPerfLog(filterData);
            }
            // 遍历data
            for (const key in filterData) {
                if (key !== performanceConstant.decode_video && key !== performanceConstant.load_video) {
                    this.measures.delete(key);
                }
            }
        }
    }
    setOnStateRenderChange(onStateRenderChange) {
        this.onStateRenderChange = onStateRenderChange;
    }
}
// 创建全局单例
(typeof window !== "undefined" ? window : globalThis).performanceTracker = new PerformanceTracker();

function length(vec) { return Math.sqrt(vec.reduce((sum, val) => (sum + val * val), 0.0)); }
function normalize(vec) {
    let vec_len = length(vec);
    return vec.map((x) => (x / vec_len));
}
function mvmul(lhs, rhs) {
    // lhs is row major.
    const size_row = lhs.length;
    const size_col = rhs.length;
    let result = Array(size_row);
    for (let i = 0; i < size_row; i++) {
        result[i] = 0.0;
        for (let j = 0; j < size_col; j++)
            result[i] += lhs[i][j] * rhs[j];
    }
    return result;
}
function mmul(lhs, rhs) {
    // lhs and rhs is row major.
    const size_row = lhs.length;
    const size_mid = rhs.length;
    const size_col = rhs[0].length;
    let result = Array(size_row);
    for (let i = 0; i < size_row; i++) {
        let result_row = Array(size_col);
        for (let j = 0; j < size_col; j++) {
            result_row[j] = 0.0;
            for (let k = 0; k < size_mid; k++)
                result_row[j] += lhs[i][k] * rhs[k][j];
        }
        result[i] = result_row;
    }
    return result;
}
function identity(size) {
    let result = Array(size);
    for (let i = 0; i < size; i++) {
        let result_row = Array(size);
        for (let j = 0; j < size; j++)
            result_row[j] = (i == j ? 1.0 : 0.0);
        result[i] = result_row;
    }
    return result;
}
function det3(mat) {
    let result = 0.0;
    result += mat[0][0] * mat[1][1] * mat[2][2];
    result += mat[0][1] * mat[1][2] * mat[2][0];
    result += mat[0][2] * mat[1][0] * mat[2][1];
    result -= mat[0][2] * mat[1][1] * mat[2][0];
    result -= mat[0][1] * mat[1][0] * mat[2][2];
    result -= mat[0][0] * mat[1][2] * mat[2][1];
    return result;
}
function inv3(mat) {
    const invdet = 1.0 / det3(mat);
    return [
        [(mat[1][1] * mat[2][2] - mat[2][1] * mat[1][2]) * invdet, (mat[0][2] * mat[2][1] - mat[0][1] * mat[2][2]) * invdet, (mat[0][1] * mat[1][2] - mat[0][2] * mat[1][1]) * invdet],
        [(mat[1][2] * mat[2][0] - mat[1][0] * mat[2][2]) * invdet, (mat[0][0] * mat[2][2] - mat[0][2] * mat[2][0]) * invdet, (mat[1][0] * mat[0][2] - mat[0][0] * mat[1][2]) * invdet],
        [(mat[1][0] * mat[2][1] - mat[2][0] * mat[1][1]) * invdet, (mat[2][0] * mat[0][1] - mat[0][0] * mat[2][1]) * invdet, (mat[0][0] * mat[1][1] - mat[1][0] * mat[0][1]) * invdet]
    ];
}
function quaternion_conj(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}
function quaternion_mul(lhs, rhs) {
    return [
        lhs[0] * rhs[0] - lhs[1] * rhs[1] - lhs[2] * rhs[2] - lhs[3] * rhs[3],
        lhs[0] * rhs[1] + lhs[1] * rhs[0] + lhs[2] * rhs[3] - lhs[3] * rhs[2],
        lhs[0] * rhs[2] - lhs[1] * rhs[3] + lhs[2] * rhs[0] + lhs[3] * rhs[1],
        lhs[0] * rhs[3] + lhs[1] * rhs[2] - lhs[2] * rhs[1] + lhs[3] * rhs[0],
    ];
}
function quaternion_to_mat(q) {
    const [r, i, j, k] = q;
    return [
        [r * r + i * i - j * j - k * k, 2 * (i * j - k * r), 2 * (i * k + j * r)],
        [2 * (i * j + k * r), r * r - i * i + j * j - k * k, 2 * (j * k - i * r)],
        [2 * (i * k - j * r), 2 * (j * k + i * r), r * r - i * i - j * j + k * k]
    ];
}
function GivensTransform(mat, row0, row1, angle) {
    // The angle should be in radian.
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const size_col = mat[0].length;
    for (let i = 0; i < size_col; i++) {
        const a1 = c * mat[row0][i] - s * mat[row1][i];
        const a2 = s * mat[row0][i] + c * mat[row1][i];
        mat[row0][i] = a1;
        mat[row1][i] = a2;
    }
}
function Euler_to_mat(angles, order = "xyz") {
    // The angle should be in radian.
    let result = identity(3);
    switch (order) {
        case "xyz":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "yzx":
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            break;
        case "zxy":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "xzy":
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 2, 0, angles[1]);
            break;
        case "yxz":
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 1, 2, angles[0]);
            GivensTransform(result, 0, 1, angles[2]);
            break;
        case "zyx":
            GivensTransform(result, 0, 1, angles[2]);
            GivensTransform(result, 2, 0, angles[1]);
            GivensTransform(result, 1, 2, angles[0]);
            break;
        default:
            throw Error("Unrecognizable rotation order.");
    }
    return result;
}
function make_homogeneous(mat, translation) {
    // lhs and rhs is row major.
    return [
        [mat[0][0], mat[0][1], mat[0][2], translation[0]],
        [mat[1][0], mat[1][1], mat[1][2], translation[1]],
        [mat[2][0], mat[2][1], mat[2][2], translation[2]],
        [0.0, 0.0, 0.0, 1.0]
    ];
}
function flatten(mat) {
    const size_row = mat.length;
    const size_col = mat[0].length;
    let result = Array(size_row * size_col);
    for (let i = 0; i < size_row; i++) {
        for (let j = 0; j < size_col; j++)
            result[i * size_col + j] = mat[i][j];
    }
    return result;
}

// @ts-nocheck
const __version__ = "3.0.0";
function checkVersion(buffer, version) {
    if (buffer instanceof ArrayBuffer)
        buffer = { offset: 0, dataview: new DataView(buffer) };
    const dataver = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        dataver[i] = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
    }
    const refver = version.split(".").map(x => parseInt(x));
    if (refver[0] < dataver[0])
        throw new Error(`Data version (${dataver[0]}.${dataver[1]}.${dataver[2]}) is incompatible with the version of current data interface (${refver[0]}.${refver[1]}.${refver[2]}).`);
    return dataver;
}
function decodeStr(buffer) {
    if (buffer instanceof ArrayBuffer)
        buffer = { offset: 0, dataview: new DataView(buffer) };
    const charView = new Uint8Array(buffer.dataview.buffer, buffer.offset, buffer.dataview.byteLength - buffer.offset);
    let strlen = 0;
    while (strlen < charView.byteLength && charView[strlen] > 0)
        strlen++;
    buffer.offset += strlen + 1;
    const stringBytes = charView.slice(0, strlen);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(stringBytes);
}
function decodeLongInt(buffer) {
    if (buffer instanceof ArrayBuffer)
        buffer = { offset: 0, dataview: new DataView(buffer) };
    let result = 0, shift = 0;
    while (true) {
        let byte_val = buffer.dataview.getUint8(buffer.offset);
        buffer.offset++;
        let data_bits = byte_val & 0x7F;
        let new_result = result | (data_bits << shift);
        if (new_result < result)
            throw new Error("Integer too large to decode.");
        result = new_result;
        if (0 === (byte_val & 0x80))
            break;
        shift += 7;
    }
    return result;
}
const TensorDataTypeMap = {
    "B": Uint8Array,
    "b": Int8Array,
    "H": Uint16Array,
    "h": Int16Array,
    "I": Uint32Array,
    "i": Int32Array,
    "L": BigUint64Array,
    "l": BigInt64Array,
    "f": Float32Array,
    "d": Float64Array
};
if ("undefined" !== typeof Float16Array)
    TensorDataTypeMap["e"] = Float16Array;
class Tensor {
    size;
    data;
    constructor(size, data) {
        this.size = size;
        this.data = data;
    }
    itemSize() {
        let size = 1;
        for (let dim of this.size)
            size *= dim;
        return size;
    }
    byteSize() { return this.itemSize() * this.data.BYTES_PER_ELEMENT; }
    static zeros(size, dataType = Float32Array) {
        let itemSize = 1;
        for (let i = 0; i < size.length; i++)
            itemSize *= size[i];
        const data = new dataType(itemSize);
        for (let i = 0; i < itemSize; i++)
            data[i] = 0;
        return new Tensor(size, data);
    }
    // extract subtensors
    part(...index) {
        if (index.length > this.size.length)
            throw new Error("Subtensor index length larger than tensor dimension.");
        let size = [];
        let newLength = 1;
        for (let i = index.length; i < this.size.length; i++) {
            size.push(this.size[i]);
            newLength *= this.size[i];
        }
        let newStart = 0;
        if (index.length > 0)
            newStart += index[0];
        for (let i = 1; i < index.length; i++) {
            newStart *= this.size[i];
            newStart += index[i];
        }
        newStart *= newLength;
        return new Tensor(size, this.data.slice(newStart, newStart + newLength));
    }
    static deserialize(buffer) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        const dimCount = buffer.dataview.getUint8(buffer.offset);
        buffer.offset++;
        const size = new Array(dimCount);
        let dataSize = 1;
        for (let i = 0; i < dimCount; i++) {
            size[i] = decodeLongInt(buffer);
            dataSize *= size[i];
        }
        const dataTypeSymbol = String.fromCodePoint(buffer.dataview.getUint8(buffer.offset));
        buffer.offset++;
        const dataType = TensorDataTypeMap[dataTypeSymbol];
        if (undefined === dataType)
            throw new Error(`Unsupported tensor element type "${dataTypeSymbol}".`);
        const dataByteSize = dataSize * dataType.BYTES_PER_ELEMENT;
        const dataView = buffer.dataview.buffer.slice(buffer.offset, buffer.offset + dataByteSize);
        const data = new dataType(dataView);
        buffer.offset += dataByteSize;
        return new Tensor(size, data);
    }
}
function loadArchives(buffer) {
    if (buffer instanceof ArrayBuffer)
        buffer = { offset: 0, dataview: new DataView(buffer) };
    let result = [null];
    while (true) {
        const mimeType = decodeStr(buffer);
        if ('' == mimeType)
            break;
        else {
            let item = null;
            if ("text/plain;charset=UTF-8" === mimeType) {
                const dataLen = decodeLongInt(buffer);
                const charView = new Uint8Array(buffer.dataview.buffer, buffer.offset, dataLen);
                buffer.offset += dataLen;
                const decoder = new TextDecoder('utf-8');
                item = decoder.decode(charView);
            }
            else if ("application/json;charset=UTF-8" == mimeType) {
                const dataLen = decodeLongInt(buffer);
                const charView = new Uint8Array(buffer.dataview.buffer, buffer.offset, dataLen);
                buffer.offset += dataLen;
                const decoder = new TextDecoder('utf-8');
                item = JSON.parse(decoder.decode(charView));
            }
            else if ("application/octet-stream" === mimeType)
                item = Tensor.deserialize(buffer);
            else {
                const dataLen = decodeLongInt(buffer);
                const dataSlice = buffer.dataview.buffer.slice(buffer.offset, buffer.offset + dataLen);
                buffer.offset += dataLen;
                item = new Blob([dataSlice], { type: mimeType });
            }
            result.push(item);
        }
    }
    return result;
}
class CameraConfig {
    focalLength = 75.0;
    filmAperture = [1.0, 1.0]; // horizontal, vertical
    translation = [0.0, 0.0, 0.0]; // X, Y, Z
    rotation = [0.0, 0.0, 0.0]; // X, Y, Z
    // methods
    getIntrinsicMatrix(resolution) {
        const [size_X, size_Y] = resolution;
        // 摄影机光圈是指多少英寸，25.4mm，胶片大小
        let camera_aperture_in_mm_x = this.filmAperture[0] * 25.4;
        // 纵向的根据横向的来计算，而不是直接读取，可能和渲染分辨率、镜头挤压比有关系
        // 在maya里面修改纵向光圈值完全没反应的，是根据渲染分辨率和横向光圈值来计算的
        // 胶片纵横比理论上需要等于渲染分辨率的纵横比
        // camera_aperture_in_mm_ = this.filmAperture[1] * 25.4
        let camera_aperture_in_mm_y = camera_aperture_in_mm_x * resolution[1] / resolution[0];
        // convert from maya camera to OpenCV camera
        let px = resolution[0] / 2.0;
        let py = resolution[1] / 2.0;
        // 胶片尺寸/像素，代表1个像素多少mm，然后可以得到内参矩阵
        let fx = this.focalLength / (camera_aperture_in_mm_x / size_X);
        let fy = this.focalLength / (camera_aperture_in_mm_y / size_Y);
        return [
            [fx, 0, px],
            [0, fy, py],
            [0, 0, 1]
        ];
    }
    getProjMatrix(resolution, near = 0.01, far = Infinity) {
        const [size_X, size_Y] = resolution;
        const intrinsic_mat = this.getIntrinsicMatrix(resolution);
        let proj22;
        let proj23;
        if (Infinity === far) {
            proj22 = -1.0;
            proj23 = -2.0 * near;
        }
        else {
            proj22 = -(far + near) / (far - near);
            proj23 = -(2.0 * far * near) / (far - near);
        }
        return [
            [2.0 * intrinsic_mat[0][0] / size_X, 0.0, (size_X - 2 * intrinsic_mat[0][2]) / size_X, 0.0],
            [0.0, 2.0 * intrinsic_mat[1][1] / size_Y, (size_Y - 2 * intrinsic_mat[1][2]) / size_Y, 0.0],
            [0.0, 0.0, proj22, proj23],
            [0.0, 0.0, -1.0, 0.0]
        ];
    }
    getExtrinsicMatrix() {
        // 相机的世界坐标轴
        const deg2rad = Math.PI / 180.0;
        const R = Euler_to_mat(this.rotation.map(x => x * deg2rad), "xyz");
        // 反算物体的view matrix, 将相机坐标系转成世界坐标系, 相机朝向-z轴
        const R_inv = inv3(R);
        const R_inv_neg_t = mvmul(R_inv, this.translation.map(x => -x));
        return make_homogeneous(R_inv, R_inv_neg_t);
    }
    static deserialize(buffer) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        let result = new CameraConfig();
        result.focalLength = buffer.dataview.getFloat32(buffer.offset, true);
        for (let i = 0; i < 2; i++)
            result.filmAperture[i] = buffer.dataview.getFloat32(buffer.offset + (i + 1) * 4, true);
        for (let i = 0; i < 3; i++)
            result.translation[i] = buffer.dataview.getFloat32(buffer.offset + (i + 3) * 4, true);
        for (let i = 0; i < 3; i++)
            result.rotation[i] = buffer.dataview.getFloat32(buffer.offset + (i + 6) * 4, true);
        buffer.offset += 9 * 4;
        return result;
    }
}
class RigidTransform {
    translation; // X, Y, Z
    rotQuaternion; // 1, i, j, k
    // methods
    constructor(translation = [0.0, 0.0, 0.0], rotQuaternion = [1.0, 0.0, 0.0, 0.0]) {
        this.translation = translation;
        this.rotQuaternion = rotQuaternion;
    }
    apply(x) {
        if (x instanceof RigidTransform) {
            let result_quaternion = quaternion_mul(this.rotQuaternion, x.rotQuaternion);
            result_quaternion = normalize(result_quaternion); // reduce floating point error
            let result_translation = mvmul(quaternion_to_mat(this.rotQuaternion), x.translation);
            for (let i = 0; i < 3; i++)
                result_translation[i] += this.translation[i];
            return new RigidTransform(result_translation, result_quaternion);
        }
        else {
            let result = mvmul(this.matrix(), x);
            for (let i = 0; i < 3; i++)
                result[i] += this.translation[i];
            return result;
        }
    }
    inv() {
        let newRotQuaternion = quaternion_conj(this.rotQuaternion);
        let R_inv_neg_x = mvmul(quaternion_to_mat(newRotQuaternion), this.translation.map(x => -x));
        return new RigidTransform(R_inv_neg_x, newRotQuaternion);
    }
    matrix() { return quaternion_to_mat(this.rotQuaternion); }
    homogeneous_matrix() { return make_homogeneous(this.matrix(), this.translation); }
    static deserialize(buffer) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        let translation = [0.0, 0.0, 0.0];
        let rotQuaternion = [1.0, 0.0, 0.0, 0.0];
        for (let i = 0; i < 3; i++)
            translation[i] = buffer.dataview.getFloat32(buffer.offset + i * 4, true);
        let sum_sqr = 0.0;
        for (let i = 0; i < 3; i++) {
            rotQuaternion[i + 1] = buffer.dataview.getFloat32(buffer.offset + (i + 3) * 4, true);
            sum_sqr += rotQuaternion[i + 1] * rotQuaternion[i + 1];
        }
        rotQuaternion[0] = Math.sqrt(Math.max(1.0 - sum_sqr, 0.0));
        buffer.offset += 6 * 4;
        return new RigidTransform(translation, rotQuaternion);
    }
}
class IBRMeshInfo {
    genMask;
    opacity;
    triangles;
    UVCoord;
    blendshapeIndices;
    blendshapes; // Dim 0 is the number of blendshapes, blendshape #0 is neutral
    jointIndex; // vertexCount * skeletonJointCount
    jointWeight; // vertexCount * skeletonJointCount
    textureModels;
    constructor(buffer, spec) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        if (spec.version[0] > 2) {
            // v3.0
            let meshFlag = buffer.dataview.getUint8(buffer.offset);
            buffer.offset += 1;
            this.genMask = (meshFlag & 1) > 0;
            let bs_indices = [];
            let bs_element_indices = [];
            while (true) {
                let bs_index = decodeLongInt(buffer);
                if (0 === bs_index && bs_indices.length > 0)
                    break;
                else
                    bs_indices.push(bs_index);
                let cur_bs_element_indices = [];
                let segment_stat = true, segment_ptr = 0;
                while (true) {
                    let segment_len = decodeLongInt(buffer);
                    if (segment_stat) {
                        for (let i = 0; i < segment_len; i++)
                            cur_bs_element_indices.push(segment_ptr + i);
                    }
                    segment_stat = !segment_stat;
                    segment_ptr += segment_len;
                    if (0 === segment_len && segment_ptr > 0)
                        break;
                }
                bs_element_indices.push(cur_bs_element_indices);
            }
            let vertexCount = bs_element_indices[0].length;
            this.blendshapeIndices = bs_indices;
            let rawBlendshapeData = spec.archivedItems[decodeLongInt(buffer)];
            let blendshapes = Tensor.zeros([this.blendshapeIndices.length, vertexCount, rawBlendshapeData.size[1]], rawBlendshapeData.data.constructor);
            let bs_data_index = 0;
            for (let bs_index = 0; bs_index < bs_element_indices.length; bs_index++) {
                const elementIndexList = bs_element_indices[bs_index];
                for (let element_index of elementIndexList) {
                    for (let i = 0; i < 3; i++)
                        blendshapes.data[(bs_index * vertexCount + element_index) * 3 + i] = rawBlendshapeData.data[bs_data_index * 3 + i];
                    bs_data_index++;
                }
            }
            this.blendshapes = blendshapes;
            this.triangles = spec.archivedItems[decodeLongInt(buffer)];
            this.opacity = spec.archivedItems[decodeLongInt(buffer)];
            this.UVCoord = spec.archivedItems[decodeLongInt(buffer)];
            this.jointIndex = new Uint8Array(vertexCount * spec.maxJointsPerVertex);
            this.jointWeight = new Float32Array(vertexCount * spec.maxJointsPerVertex);
            for (let i = 0; i < vertexCount; i++) {
                for (let j = 0; j < spec.maxJointsPerVertex; j++) {
                    this.jointIndex[i * spec.maxJointsPerVertex + j] = buffer.dataview.getUint8(buffer.offset);
                    buffer.offset += 1;
                }
                for (let j = 0; j < spec.maxJointsPerVertex; j++) {
                    this.jointWeight[i * spec.maxJointsPerVertex + j] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
            }
            const textureModelCount = buffer.dataview.getUint8(buffer.offset);
            buffer.offset += 1;
            this.textureModels = new Array(textureModelCount);
            for (let i = 0; i < textureModelCount; i++) {
                this.textureModels[i] = {
                    data: spec.archivedItems[decodeLongInt(buffer)],
                    scalingFactor: spec.archivedItems[decodeLongInt(buffer)]
                };
            }
        }
        else {
            // v2.0
            this.genMask = true;
            let vertexCount = buffer.dataview.getUint16(buffer.offset, true);
            buffer.offset += 2;
            const opacity = new Float32Array(vertexCount);
            for (let i = 0; i < vertexCount; i++) {
                opacity[i] = buffer.dataview.getFloat32(buffer.offset, true);
                buffer.offset += 4;
            }
            this.opacity = new Tensor([vertexCount], opacity);
            let triangleCount = buffer.dataview.getUint16(buffer.offset, true);
            buffer.offset += 2;
            const triangles = new Uint16Array(triangleCount * 3);
            for (let i = 0; i < triangleCount; i++) {
                for (let j = 0; j < 3; j++) {
                    triangles[i * 3 + j] = buffer.dataview.getUint16(buffer.offset, true);
                    buffer.offset += 2;
                }
            }
            this.triangles = new Tensor([triangleCount, 3], triangles);
            const UVCoord = new Float32Array(vertexCount * 2);
            for (let i = 0; i < vertexCount; i++) {
                for (let j = 0; j < 2; j++) {
                    UVCoord[i * 2 + j] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
            }
            this.UVCoord = new Tensor([vertexCount, 2], UVCoord);
            const blendshapeCount = buffer.dataview.getUint16(buffer.offset, true);
            buffer.offset += 2;
            const blendshapes = new Float32Array(blendshapeCount * vertexCount * 3);
            for (let i = 0; i < blendshapeCount * vertexCount * 3; i++) {
                blendshapes[i] = buffer.dataview.getFloat32(buffer.offset, true);
                buffer.offset += 4;
            }
            this.blendshapes = new Tensor([blendshapeCount, vertexCount, 3], blendshapes);
            this.blendshapeIndices = [0];
            for (let index of spec.blendshapeIndices)
                this.blendshapeIndices.push(index + 1);
            this.jointIndex = new Uint8Array(vertexCount * spec.maxJointsPerVertex);
            this.jointWeight = new Float32Array(vertexCount * spec.maxJointsPerVertex);
            for (let i = 0; i < vertexCount; i++) {
                for (let j = 0; j < spec.maxJointsPerVertex; j++) {
                    this.jointIndex[i * spec.maxJointsPerVertex + j] = buffer.dataview.getUint8(buffer.offset);
                    buffer.offset += 1;
                }
                for (let j = 0; j < spec.maxJointsPerVertex; j++) {
                    this.jointWeight[i * spec.maxJointsPerVertex + j] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
            }
            const textureModelCount = buffer.dataview.getUint8(buffer.offset);
            buffer.offset += 1;
            this.textureModels = new Array(textureModelCount);
            for (let i = 0; i < textureModelCount; i++) {
                const PCASize = [0, 0, 0, 3];
                for (let j = 0; j < 3; j++) {
                    PCASize[j] = buffer.dataview.getUint16(buffer.offset, true);
                    buffer.offset += 2;
                }
                const PCAComponents = new Float32Array(PCASize[0] * PCASize[1] * PCASize[2] * 3);
                for (let j = 0; j < PCAComponents.length; j++) {
                    PCAComponents[j] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
                this.textureModels[i] = { data: new Tensor(PCASize, PCAComponents) };
            }
        }
    }
}
class IBRMeshFrameInfo {
    textureModelIndex;
    texturePCAWeights;
    constructor(textureModelIndex, texturePCAWeights) {
        this.textureModelIndex = textureModelIndex;
        this.texturePCAWeights = texturePCAWeights;
    }
    static deserialize(buffer, char_data) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        let textureModelIndex = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
        let texturePCAWeights = new Float32Array(char_data.textureModels[textureModelIndex].data.size[0] - 1);
        for (let i = 0; i < texturePCAWeights.length; i++) {
            texturePCAWeights[i] = buffer.dataview.getFloat32(buffer.offset, true);
            buffer.offset += 4;
        }
        return new IBRMeshFrameInfo(textureModelIndex, texturePCAWeights);
    }
}
class IBRAnimationGeneratorCharInfo_NN {
    cameraConfig;
    blendshapeCount;
    mesh;
    skeleton;
    jointEvalOrder;
    movableJoints;
    maxJointsPerVertex;
    constructor(buffer, spec = {}) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        const version = checkVersion(buffer, __version__);
        let archivedItems = [];
        if (version[0] > 2)
            archivedItems = loadArchives(buffer);
        this.cameraConfig = CameraConfig.deserialize(buffer);
        if (version[0] > 2)
            this.blendshapeCount = decodeLongInt(buffer);
        else {
            if (!spec.blendshapeMap)
                throw new Error(`A blendshape map is required to load the character information of v2.0 format.`);
            let bsIndexSet = new Set();
            for (const map of spec.blendshapeMap) {
                for (const index of map)
                    bsIndexSet.add(index);
            }
            this.blendshapeCount = bsIndexSet.size;
        }
        let skeletonJointCount = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
        this.maxJointsPerVertex = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
        let movableJointCount = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
        let movableJoints = new Array(movableJointCount);
        for (let i = 0; i < movableJointCount; i++) {
            movableJoints[i] = buffer.dataview.getUint8(buffer.offset);
            buffer.offset += 1;
        }
        this.movableJoints = movableJoints;
        this.skeleton = new Array(skeletonJointCount);
        for (let i = 0; i < skeletonJointCount; i++) {
            let parent = buffer.dataview.getUint8(buffer.offset);
            if (parent >= this.skeleton.length)
                parent = null;
            buffer.offset += 1;
            let local_transform = RigidTransform.deserialize(buffer);
            this.skeleton[i] = { parent: parent, local_transform: local_transform };
        }
        this.jointEvalOrder = new Array(skeletonJointCount);
        for (let i = 0; i < skeletonJointCount; i++) {
            this.jointEvalOrder[i] = buffer.dataview.getUint8(buffer.offset);
            buffer.offset += 1;
        }
        let meshInfoSpec = {
            version: version,
            maxJointsPerVertex: this.maxJointsPerVertex
        };
        if (version[0] > 2)
            meshInfoSpec.archivedItems = archivedItems;
        let meshCount = buffer.dataview.getUint8(buffer.offset);
        buffer.offset += 1;
        this.mesh = new Array(meshCount);
        for (let i = 0; i < meshCount; i++) {
            if (version[0] <= 2)
                meshInfoSpec.blendshapeIndices = spec.blendshapeMap[i];
            this.mesh[i] = new IBRMeshInfo(buffer, meshInfoSpec);
        }
    }
    evalSkeleton() {
        let result = Array(this.skeleton.length);
        for (let i of this.jointEvalOrder) {
            if (null == this.skeleton[i].parent)
                result[i] = this.skeleton[i].local_transform;
            else
                result[i] = result[this.skeleton[i].parent].apply(this.skeleton[i].local_transform);
        }
        return result;
    }
    evalSkeletonFromMovable(movableJointTransforms) {
        let result = Array(this.skeleton.length);
        for (let i = 0; i < movableJointTransforms.length; i++)
            result[this.movableJoints[i]] = movableJointTransforms[i];
        for (let i of this.jointEvalOrder) {
            if (null != this.skeleton[i].parent)
                result[i] = result[this.skeleton[i].parent].apply(this.skeleton[i].local_transform);
        }
        return result;
    }
}
class IBRAnimationFrameData_NN {
    mesh;
    blendshapeWeights;
    movableJointTransforms;
    constructor() {
        this.mesh = [];
        this.blendshapeWeights = new Float32Array();
        this.movableJointTransforms = [];
    }
    static deserialize(buffer, char_data, version) {
        if (buffer instanceof ArrayBuffer)
            buffer = { offset: 0, dataview: new DataView(buffer) };
        let result = new IBRAnimationFrameData_NN();
        const meshCount = char_data.mesh.length;
        result.mesh = new Array(meshCount);
        result.blendshapeWeights = new Float32Array(char_data.blendshapeCount);
        if (version[0] > 2) {
            // v3.0
            for (let i = 0; i < meshCount; i++)
                result.mesh[i] = IBRMeshFrameInfo.deserialize(buffer, char_data.mesh[i]);
            for (let i = 0; i < result.blendshapeWeights.length; i++) {
                result.blendshapeWeights[i] = buffer.dataview.getFloat32(buffer.offset, true);
                buffer.offset += 4;
            }
        }
        else {
            // v2.0
            for (let i = 0; i < meshCount; i++) {
                const blendshapeIndices = char_data.mesh[i].blendshapeIndices;
                for (let j = 0; j + 1 < blendshapeIndices.length; j++) {
                    result.blendshapeWeights[blendshapeIndices[j + 1] - 1] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
                let textureModelIndex = buffer.dataview.getUint8(buffer.offset);
                buffer.offset += 1;
                let texturePCAWeights = new Float32Array(char_data.mesh[i].textureModels[textureModelIndex].data.size[0] - 1);
                for (let j = 0; j < texturePCAWeights.length; j++) {
                    texturePCAWeights[j] = buffer.dataview.getFloat32(buffer.offset, true);
                    buffer.offset += 4;
                }
                result.mesh[i] = new IBRMeshFrameInfo(textureModelIndex, texturePCAWeights);
            }
        }
        result.movableJointTransforms = new Array(char_data.movableJoints.length);
        for (let i = 0; i < char_data.movableJoints.length; i++)
            result.movableJointTransforms[i] = RigidTransform.deserialize(buffer);
        return result;
    }
    static interp(frame1, frame2, frameJointRef, t, jointEvalOrder) {
        // return linear interpolated result between frame data.
        let result = new IBRAnimationFrameData_NN();
        result.blendshapeWeights = new Float32Array(frame1.blendshapeWeights.length);
        for (let i = 0; i < result.blendshapeWeights.length; i++)
            result.blendshapeWeights[i] = t * frame2.blendshapeWeights[i] + (1.0 - t) * frame1.blendshapeWeights[i];
        result.mesh = [];
        for (let i = 0; i < frame1.mesh.length; i++) {
            let new_mesh_pca_info = new IBRMeshFrameInfo(frame1.mesh[i].textureModelIndex, new Float32Array(frame1.mesh[i].texturePCAWeights.length));
            for (let j = 0; j < frame1.mesh[i].texturePCAWeights.length; j++)
                new_mesh_pca_info.texturePCAWeights[j] = t * frame2.mesh[i].texturePCAWeights[j] + (1.0 - t) * frame1.mesh[i].texturePCAWeights[j];
            result.mesh.push(new_mesh_pca_info);
        }
        // joints
        result.movableJointTransforms = new Array(frameJointRef.movableJointTransforms.length);
        for (let i = 0; i < frameJointRef.movableJointTransforms.length; i++) {
            let preserved = true;
            for (let [index_child, _] of jointEvalOrder) {
                if (index_child === i) {
                    preserved = false;
                    break;
                }
            }
            if (preserved)
                result.movableJointTransforms[i] = frameJointRef.movableJointTransforms[i];
        }
        for (let [index_child, index_parent] of jointEvalOrder) {
            let T1 = frame1.movableJointTransforms[index_parent].inv().apply(frame1.movableJointTransforms[index_child]);
            let T2 = frame2.movableJointTransforms[index_parent].inv().apply(frame2.movableJointTransforms[index_child]);
            let translation = [], rotQuaternion = [];
            for (let j = 0; j < 3; j++)
                translation.push(t * T2.translation[j] + (1.0 - t) * T1.translation[j]);
            for (let j = 0; j < 4; j++)
                rotQuaternion.push(t * T2.rotQuaternion[j] + (1.0 - t) * T1.rotQuaternion[j]);
            rotQuaternion = normalize(rotQuaternion);
            let blended_transform = new RigidTransform(translation, rotQuaternion);
            blended_transform = frameJointRef.movableJointTransforms[index_parent].apply(blended_transform);
            result.movableJointTransforms[index_child] = blended_transform;
        }
        return result;
    }
}
function unpackIBRAnimation(buffer, char_data) {
    if (buffer instanceof ArrayBuffer)
        buffer = { offset: 0, dataview: new DataView(buffer) };
    const version = checkVersion(buffer, __version__);
    const frameCount = buffer.dataview.getUint32(buffer.offset, true);
    buffer.offset += 4;
    let result = Array(frameCount);
    for (let i = 0; i < frameCount; i++)
        result[i] = IBRAnimationFrameData_NN.deserialize(buffer, char_data, version);
    return result;
}
function formatMJT(a1, a2) {
    return new RigidTransform(a1, a2);
}

function sampleUniformTensor(data, index) {
    if (Float32Array === data.constructor || Float64Array == data.constructor)
        return data[index];
    else if (Uint8Array == data.constructor)
        return (data[index] / 0xFF) * 2.0 - 1.0;
    else if (Int8Array == data.constructor)
        return ((data[index] + 0x80) / 0xFF) * 2.0 - 1.0;
    else if (Uint16Array == data.constructor)
        return (data[index] / 0xFFFF) * 2.0 - 1.0;
    else if (Int16Array == data.constructor)
        return ((data[index] + 0x8000) / 0xFFFF) * 2.0 - 1.0;
    else if (Uint32Array == data.constructor)
        return (data[index] / 0xFFFFFFFF) * 2.0 - 1.0;
    else if (Int32Array == data.constructor)
        return ((data[index] + 0x80000000) / 0xFFFFFFFF) * 2.0 - 1.0;
    else if (BigUint64Array == data.constructor)
        return (Number(data[index] >> 32n) / 0xFFFFFFFF) * 2.0 - 1.0;
    else if (BigInt64Array == data.constructor)
        return ((Number(data[index] >> 32n) + 0x80000000) / 0xFFFFFFFF) * 2.0 - 1.0;
    else
        return 0.0;
}
function getVertices(data, frame_data) {
    let char = data.char;
    let initSkeletonStatus = char.evalSkeleton();
    let currentSkeletonStatus = char.evalSkeletonFromMovable(frame_data.movableJointTransforms);
    let joint_matrices = Array(char.skeleton.length);
    for (let i = 0; i < char.skeleton.length; i++) {
        const joint_transform = currentSkeletonStatus[i].apply(initSkeletonStatus[i].inv());
        joint_matrices[i] = joint_transform.homogeneous_matrix();
    }
    let result = [];
    for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
        let geometry = [];
        for (let i = 0; i < char.mesh[mesh_index].blendshapes.size[1]; i++) {
            let vertex = [];
            let blendshapes = char.mesh[mesh_index].blendshapes;
            let blendshapeWeights = frame_data.blendshapeWeights;
            for (let k = 0; k < 3; k++)
                vertex.push(Number(blendshapes.data[i * blendshapes.size[2] + k]));
            for (let j = 0; j + 1 < char.mesh[mesh_index].blendshapeIndices.length; j++) {
                for (let k = 0; k < 3; k++)
                    vertex[k] += blendshapeWeights[char.mesh[mesh_index].blendshapeIndices[j + 1] - 1] * Number(blendshapes.data[((j + 1) * blendshapes.size[1] + i) * blendshapes.size[2] + k]);
            }
            vertex.push(1.0);
            let vertex_lbs = [0.0, 0.0, 0.0, 0.0];
            let jointIndex = char.mesh[mesh_index].jointIndex;
            let jointWeight = char.mesh[mesh_index].jointWeight;
            for (let j = 0; j < char.maxJointsPerVertex; j++) {
                let curJointIndex = jointIndex[i * char.maxJointsPerVertex + j];
                if (curJointIndex < char.skeleton.length) {
                    let vertex_transformed = mvmul(joint_matrices[curJointIndex], vertex);
                    for (let k = 0; k < 4; k++)
                        vertex_lbs[k] += jointWeight[i * char.maxJointsPerVertex + j] * vertex_transformed[k];
                }
            }
            for (let k = 0; k < 3; k++)
                vertex_lbs[k] /= vertex_lbs[3];
            geometry.push([vertex_lbs[0], vertex_lbs[1], vertex_lbs[2]]);
        }
        result.push(geometry);
    }
    return result;
}
function getPCATextures(data, frame_data) {
    let char = data.char;
    let result = [];
    for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
        let texture_model = char.mesh[mesh_index].textureModels[frame_data.mesh[mesh_index].textureModelIndex];
        let texture = [];
        let texture_data = new Uint8ClampedArray(texture_model.data.size[1] * texture_model.data.size[2] * 4);
        let mean_weight = 1.0;
        if (texture_model.scalingFactor)
            mean_weight *= Number(texture_model.scalingFactor.data[0]);
        for (let j = 0; j < texture_model.data.size[1]; j++) {
            let row = [];
            for (let k = 0; k < texture_model.data.size[2]; k++) {
                let pixel = [];
                for (let l = 0; l < 3; l++)
                    pixel.push(mean_weight * sampleUniformTensor(texture_model.data.data, (j * texture_model.data.size[2] + k) * 3 + l));
                row.push(pixel);
            }
            texture.push(row);
        }
        for (let i = 1; i < texture_model.data.size[0]; i++) {
            let weight = frame_data.mesh[mesh_index].texturePCAWeights[i - 1];
            if (texture_model.scalingFactor)
                weight *= Number(texture_model.scalingFactor.data[i]);
            for (let j = 0; j < texture_model.data.size[1]; j++) {
                for (let k = 0; k < texture_model.data.size[2]; k++) {
                    for (let l = 0; l < 3; l++)
                        texture[j][k][l] += weight * sampleUniformTensor(texture_model.data.data, ((i * texture_model.data.size[1] + j) * texture_model.data.size[2] + k) * 3 + l);
                }
            }
        }
        for (let j = 0; j < texture_model.data.size[1]; j++) {
            for (let k = 0; k < texture_model.data.size[2]; k++) {
                for (let l = 0; l < 3; l++)
                    texture_data[(j * texture_model.data.size[2] + k) * 4 + l] = Math.round(texture[texture_model.data.size[1] - 1 - j][k][2 - l] * 255);
                texture_data[(j * texture_model.data.size[2] + k) * 4 + 3] = 0xFF;
            }
        }
        result.push(new ImageData(texture_data, texture_model.data.size[1], texture_model.data.size[2]));
    }
    return result;
}
function exportAsWavefrontObj(geometries) {
    let vertex_string = "";
    let polygon_string = "";
    let vertex_index_offset = 1;
    let geometry_offset = 0;
    for (const geometry of geometries) {
        for (const vertex of geometry.vertices)
            vertex_string += `v ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`;
        for (const uv of geometry.uv)
            vertex_string += `vt ${uv[0]} ${uv[1]}}\n`;
        polygon_string += `g Obj${geometry_offset}\n`;
        for (const poly of geometry.polygons) {
            let poly_str = poly.map(x => (x + vertex_index_offset).toString()).map(x => `${x}/${x}`).join(" ");
            polygon_string += `f ${poly_str}\n`;
        }
        vertex_index_offset += geometry.vertices.length;
        geometry_offset += 1;
    }
    return vertex_string + polygon_string;
}
function getWavefrontObjFromVertices(data, vertices) {
    function unflattenUniform(data, new_axis_size) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
            if (0 == i % new_axis_size)
                result.push([]);
            result[result.length - 1].push(sampleUniformTensor(data, i));
        }
        return result;
    }
    function unflatten(data, new_axis_size) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
            if (0 == i % new_axis_size)
                result.push([]);
            result[result.length - 1].push(Number(data[i]));
        }
        return result;
    }
    let char = data.char;
    let geometries = [];
    for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
        geometries.push({
            vertices: vertices[mesh_index],
            uv: unflattenUniform(char.mesh[mesh_index].UVCoord.data, 2),
            polygons: unflatten(char.mesh[mesh_index].triangles.data, 3)
        });
    }
    return exportAsWavefrontObj(geometries);
}

// @ts-nocheck
class GLDevice {
    _ElementTypeMap_JS2GL;
    _FormatTypeMap_Ext2Int;
    _FormatTypeMap_Ext2Str;
    shaderStage;
    running = true;
    syncMedia = null;
    syncMediaTime = null;
    _lost_context_sim = null;
    canvas;
    gl;
    frameID;
    cbRender;
    _isDestroyed = false;
    constructor(canvas) {
        this.canvas = canvas;
        this.frameID = null;
        const initContext = () => {
            const gl = this.canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true });
            if (!gl)
                throw Error("WebGL context cannot be created.");
            else
                this.gl = gl;
            this._lost_context_sim = this.gl.getExtension("WEBGL_lose_context");
            this.shaderStage = {
                "vertex": this.gl.VERTEX_SHADER,
                "fragment": this.gl.FRAGMENT_SHADER
            };
            this._ElementTypeMap_JS2GL = {
                "Uint8Array": this.gl.UNSIGNED_BYTE,
                "Uint8ClampedArray": this.gl.UNSIGNED_BYTE,
                "Int8Array": this.gl.BYTE,
                "Uint16Array": this.gl.UNSIGNED_SHORT,
                "Int16Array": this.gl.SHORT,
                "Uint32Array": this.gl.UNSIGNED_INT,
                "Int32Array": this.gl.INT,
                "Float16Array": this.gl.HALF_FLOAT,
                "Float32Array": this.gl.FLOAT
            };
            const _FormatTypeMap_Ext2Int_Raw = [
                [this.gl.UNSIGNED_BYTE, [[this.gl.RED, this.gl.R8], [this.gl.RED_INTEGER, this.gl.R8UI], [this.gl.RG, this.gl.RG8], [this.gl.RG_INTEGER, this.gl.RG8UI], [this.gl.RGB, this.gl.RGB8], [this.gl.RGB_INTEGER, this.gl.RGB8UI], [this.gl.RGBA, this.gl.RGBA8], [this.gl.RGBA_INTEGER, this.gl.RGBA8UI]]],
                [this.gl.BYTE, [[this.gl.RED, this.gl.R8_SNORM], [this.gl.RED_INTEGER, this.gl.R8I], [this.gl.RG, this.gl.RG8_SNORM], [this.gl.RG_INTEGER, this.gl.RG8I], [this.gl.RGB, this.gl.RGB8_SNORM], [this.gl.RGB_INTEGER, this.gl.RGB8I], [this.gl.RGBA, this.gl.RGBA8_SNORM], [this.gl.RGBA_INTEGER, this.gl.RGBA8I]]],
                [this.gl.UNSIGNED_SHORT, [[this.gl.RED_INTEGER, this.gl.R16UI], [this.gl.RG_INTEGER, this.gl.RG16UI], [this.gl.RGB_INTEGER, this.gl.RGB16UI], [this.gl.RGBA_INTEGER, this.gl.RGBA16UI], [this.gl.DEPTH_COMPONENT, this.gl.DEPTH_COMPONENT16]]],
                [this.gl.SHORT, [[this.gl.RED_INTEGER, this.gl.R16I], [this.gl.RG_INTEGER, this.gl.RG16I], [this.gl.RGB_INTEGER, this.gl.RGB16I], [this.gl.RGBA_INTEGER, this.gl.RGBA16I]]],
                [this.gl.UNSIGNED_INT, [[this.gl.RED_INTEGER, this.gl.R32UI], [this.gl.RG_INTEGER, this.gl.RG32UI], [this.gl.RGB_INTEGER, this.gl.RGB32UI], [this.gl.RGBA_INTEGER, this.gl.RGBA32UI], [this.gl.DEPTH_COMPONENT, this.gl.DEPTH_COMPONENT24]]],
                [this.gl.INT, [[this.gl.RED_INTEGER, this.gl.R32I], [this.gl.RG_INTEGER, this.gl.RG32I], [this.gl.RGB_INTEGER, this.gl.RGB32I], [this.gl.RGBA_INTEGER, this.gl.RGBA32I]]],
                [this.gl.HALF_FLOAT, [[this.gl.RED, this.gl.R16F], [this.gl.RG, this.gl.RG16F], [this.gl.RGB, this.gl.RGB16F], [this.gl.RGBA, this.gl.RGBA16F]]],
                [this.gl.FLOAT, [[this.gl.RED, this.gl.R32F], [this.gl.RG, this.gl.RG32F], [this.gl.RGB, this.gl.RGB32F], [this.gl.RGBA, this.gl.RGBA32F], [this.gl.DEPTH_COMPONENT, this.gl.DEPTH_COMPONENT32F]]],
                [this.gl.UNSIGNED_SHORT_5_6_5, [[this.gl.RGB, this.gl.RGB565]]],
                [this.gl.UNSIGNED_SHORT_4_4_4_4, [[this.gl.RGBA, this.gl.RGBA4]]],
                [this.gl.UNSIGNED_SHORT_5_5_5_1, [[this.gl.RGBA, this.gl.RGB5_A1]]],
                [this.gl.UNSIGNED_INT_2_10_10_10_REV, [[this.gl.RGBA, this.gl.RGB10_A2]]],
                [this.gl.UNSIGNED_INT_10F_11F_11F_REV, [[this.gl.RGB, this.gl.R11F_G11F_B10F]]],
                [this.gl.UNSIGNED_INT_5_9_9_9_REV, [[this.gl.RGB, this.gl.RGB9_E5]]],
                [this.gl.UNSIGNED_INT_24_8, [[this.gl.DEPTH_STENCIL, this.gl.DEPTH24_STENCIL8]]],
                [this.gl.FLOAT_32_UNSIGNED_INT_24_8_REV, [[this.gl.DEPTH_STENCIL, this.gl.DEPTH32F_STENCIL8]]]
            ];
            this._FormatTypeMap_Ext2Int = new Map();
            for (const [elemType, formats] of _FormatTypeMap_Ext2Int_Raw) {
                const formatMap = new Map();
                for (const [extFormat, intFormat] of formats)
                    formatMap.set(extFormat, intFormat);
                this._FormatTypeMap_Ext2Int.set(elemType, formatMap);
            }
            const _FormatTypeMap_Ext2Str_Raw = {
                "GL_RED": this.gl.RED,
                "GL_RED_INTEGER": this.gl.RED_INTEGER,
                "GL_RG": this.gl.RG,
                "GL_RG_INTEGER": this.gl.RG_INTEGER,
                "GL_RGB": this.gl.RGB,
                "GL_RGB_INTEGER": this.gl.RGB_INTEGER,
                "GL_RGBA": this.gl.RGBA,
                "GL_RGBA_INTEGER": this.gl.RGBA_INTEGER,
                "GL_DEPTH_COMPONENT": this.gl.DEPTH_COMPONENT,
                "GL_DEPTH_STENCIL": this.gl.DEPTH_STENCIL
            };
            this._FormatTypeMap_Ext2Str = new Map();
            for (const [name, value] of Object.entries(_FormatTypeMap_Ext2Str_Raw))
                this._FormatTypeMap_Ext2Str.set(value, name);
        };
        this.frameID = null;
        this.cbRender = () => { };
        this.canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            this.stop();
        }, false);
        this.canvas.addEventListener("webglcontextrestored", initContext, false);
        this.canvas.addEventListener("webglcontextcreationerror", (e) => { console.error(e.statusMessage || "WebGL context creation error: unknown error."); });
        initContext();
    }
    compileShaderProgram(shaders) {
        let shaderProgram = this.gl.createProgram();
        if (!shaderProgram)
            throw new Error('WebGL shader program creation failed.');
        for (const [stage, code] of Object.entries(shaders)) {
            const shader = this.gl.createShader(this.shaderStage[stage]);
            if (!shader)
                throw new Error('WebGL shader creation failed.');
            this.gl.shaderSource(shader, code);
            this.gl.compileShader(shader);
            if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                const compile_log = this.gl.getShaderInfoLog(shader);
                this.gl.deleteShader(shader);
                throw new Error('WebGL shader compile failed:' + compile_log);
            }
            this.gl.attachShader(shaderProgram, shader);
        }
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            const link_log = this.gl.getProgramInfoLog(shaderProgram);
            this.gl.deleteProgram(shaderProgram);
            throw new Error('WebGL shader compile failed:' + link_log);
        }
        return shaderProgram;
    }
    getShaderProgramUniformLocation(program, attribNames) {
        let result = {};
        for (const name of attribNames)
            result[name] = this.gl.getUniformLocation(program, name);
        return result;
    }
    getShaderProgramUniformBlockLocation(program, attribNames) {
        let result = {};
        for (const name of attribNames)
            result[name] = this.gl.getUniformBlockIndex(program, name);
        return result;
    }
    getShaderProgramAttribLocation(program, attribNames) {
        let result = {};
        for (const name of attribNames)
            result[name] = this.gl.getAttribLocation(program, name);
        return result;
    }
    getGLArrayElementType(arr) {
        // @ts-ignore
        const tag = arr[Symbol.toStringTag];
        if (tag in this._ElementTypeMap_JS2GL)
            return this._ElementTypeMap_JS2GL[tag];
        else
            return null;
    }
    getGLTexInternalFormat(externalFormat, elementType) {
        const formats = this._FormatTypeMap_Ext2Int.get(elementType);
        if (formats) {
            const internalFormat = formats.get(externalFormat);
            if (internalFormat)
                return internalFormat;
        }
        return null;
    }
    texImage2D(target, level, width, height, format, srcData) {
        const elementType = this.getGLArrayElementType(srcData);
        // @ts-ignore
        if (!elementType)
            throw new Error(`Unsupported data format: ${srcData[Symbol.toStringTag]}`);
        const internalFormat = this.getGLTexInternalFormat(format, elementType);
        // @ts-ignore
        if (!internalFormat)
            throw new Error(`No available internal format for ${srcData[Symbol.toStringTag]} and ${this._FormatTypeMap_Ext2Str.get(format) ?? "unknown"}.`);
        if (this.gl.HALF_FLOAT == elementType)
            srcData = new Uint16Array(srcData.buffer); // patch for Float16Array
        this.gl.texImage2D(target, level, internalFormat, width, height, 0, format, elementType, srcData);
    }
    texImage3D(target, level, width, height, depth, format, srcData) {
        const elementType = this.getGLArrayElementType(srcData);
        // @ts-ignore
        if (!elementType)
            throw new Error('Unsupported data format: ' + srcData[Symbol.toStringTag]);
        const internalFormat = this.getGLTexInternalFormat(format, elementType);
        // @ts-ignore
        if (!internalFormat)
            throw new Error(`No available internal format for ${srcData[Symbol.toStringTag]} and ${this._FormatTypeMap_Ext2Str.get(format) ?? "unknown"}.`);
        if (this.gl.HALF_FLOAT == elementType)
            srcData = new Uint16Array(srcData.buffer); // patch for Float16Array
        this.gl.texImage3D(target, level, internalFormat, width, height, depth, 0, format, elementType, srcData);
    }
    run(fn, syncMedia) {
        this.running = true;
        this.cbRender = fn;
        if (syncMedia && syncMedia instanceof HTMLVideoElement) {
            this.syncMedia = syncMedia;
            const fnWrapper = (now, metadata) => {
                if (this.running) {
                    this.syncMediaTime = metadata.mediaTime;
                    this.cbRender(this);
                    this.frameID = syncMedia.requestVideoFrameCallback(fnWrapper);
                }
            };
            this.syncMediaTime = syncMedia.currentTime;
            this.cbRender(this);
            syncMedia.requestVideoFrameCallback(fnWrapper);
        }
        else {
            const fnWrapper = () => {
                if (this.running) {
                    this.cbRender(this);
                    this.frameID = requestAnimationFrame(fnWrapper);
                }
            };
            fnWrapper();
        }
    }
    refresh() { this.cbRender(this); }
    getSyncMediaTime() { return this.syncMediaTime; }
    stop() {
        if (null !== this.frameID) {
            if (this.syncMedia) {
                this.syncMedia.cancelVideoFrameCallback(this.frameID);
                this.syncMedia = null;
                this.syncMediaTime = null;
            }
            else
                cancelAnimationFrame(this.frameID);
            this.frameID = null;
        }
        this.running = false;
    }
    simulateContextFault(contextAvailable) {
        if (this._lost_context_sim) {
            contextAvailable ? this._lost_context_sim.restoreContext() : this._lost_context_sim.loseContext();
        }
    }
    captureFrame() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const pixelData = new Uint8Array(width * height * 4);
        this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelData);
        return {
            width,
            height,
            data: pixelData
        };
    }
    destroy() {
        // 1. 防止重复销毁
        if (this._isDestroyed || !this.gl) {
            return;
        }
        const gl = this.gl;
        try {
            // 主动丢失WebGL上下文（关键：通知浏览器回收上下文）
            const loseExtension = gl.getExtension("WEBGL_lose_context");
            if (loseExtension) {
                loseExtension.loseContext(); // 触发上下文丢失，释放浏览器级资源
            }
            // 清理画布状态
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            gl.flush(); // 确保所有渲染命令执行完毕
            // 清除DOM/引用（助力垃圾回收）
            if (this.canvas) {
                // 可选：从DOM移除画布（根据业务需求决定是否保留）
                // this.canvas.remove();
                // 清空画布内容
                const ctx2d = this.canvas.getContext("2d");
                if (ctx2d) {
                    ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
            }
            // 标记上下文为null，防止后续误调用
            this.gl = null;
            this._isDestroyed = true;
        }
        catch (error) {
            // 即使出错，也标记为销毁（避免重复尝试）
            this._isDestroyed = true;
        }
    }
}

const shader_common = `
  vec4 RGB2sRGB(vec4 color){
    for(uint i = 0u; i < 4u; i++){
      if(color[i] <= 0.0031308)color[i] *= 12.92;
      else color[i] = 1.055 * pow(color[i], 1.0 / 2.4) - 0.055;
    }
    return color;
  }
  vec4 sRGB2RGB(vec4 color){
    for(uint i = 0u; i < 4u; i++){
      if(color[i] <= 0.04045)color[i] /= 12.92;
      else color[i] = pow((color[i] + 0.055) / 1.055, 2.4);
    }
    return color;
  }
`;
const vs_background = `#version 300 es
  layout(location = 0) in vec2 pos;
  layout(location = 1) in vec2 texCoord;
  out vec2 v_texCoord;
  void main() {
    gl_Position = vec4(pos, 0, 1);
    v_texCoord = texCoord;
  }
`;
const fs_background = `#version 300 es
  precision mediump float;
  uniform sampler2D u_image_bg, u_image_char_body, u_image_mesh_color, u_image_mesh_alpha;
  uniform mat2 u_transform_2d; // mat2[0] = scale, mat2[1] = translation
  uniform uint flags; // 1 - has background

  in vec2 v_texCoord;
  out vec4 fragColor;

  ${shader_common}

  void main() {
    vec2 texcoord_transformed = v_texCoord * u_transform_2d[0] + u_transform_2d[1];
    texcoord_transformed = clamp(texcoord_transformed, 0.0, 1.0);
    vec2 texCoord_char_color = vec2(texcoord_transformed.x * 0.5, texcoord_transformed.y);
    vec2 texCoord_char_alpha = vec2(texcoord_transformed.x * 0.5 + 0.5, texcoord_transformed.y);
    vec2 texCoord_mesh = vec2(v_texCoord.x, 1.0 - v_texCoord.y);

    vec4 char_color = vec4(texture(u_image_char_body, texCoord_char_color));
    vec4 char_alpha = vec4(texture(u_image_char_body, texCoord_char_alpha));
    char_color = sRGB2RGB(char_color);
    char_alpha = sRGB2RGB(char_alpha);
    float char_alpha_back = char_alpha.r;
    float char_alpha_front = max(char_alpha.r - char_alpha.b, 0.0);

    vec4 mesh_color_srgb = texture(u_image_mesh_color, texCoord_mesh);
    mesh_color_srgb.rgb /= max(mesh_color_srgb.a, 9e-5); // epsilon for float16
    vec4 mesh_alpha = texture(u_image_mesh_alpha, texCoord_mesh);
    
    vec3 final_rgb = mesh_alpha.r * mesh_color_srgb.rgb + (1.0 - mesh_alpha.r) * char_alpha_back * char_color.rgb;
    float final_alpha = mesh_alpha.r + (1.0 - mesh_alpha.r) * char_alpha_back;
    final_rgb = char_alpha_front * char_color.rgb + (1.0 - char_alpha_front) * final_alpha * final_rgb;
    final_alpha = char_alpha_front + (1.0 - char_alpha_front) * final_alpha;

    if(flags > 0u){
      vec4 bg_color = sRGB2RGB(texture(u_image_bg, v_texCoord));
      final_rgb += bg_color.rgb * (1.0 - final_alpha);
      final_alpha = 1.0;
    }
    final_rgb = RGB2sRGB(vec4(final_rgb, 1.0)).rgb;
    fragColor = vec4(final_rgb, final_alpha);
  }
`;
const uniform_var_list_bg = [
    "u_image_bg", "u_image_char_body", "u_image_mesh_color", "u_image_mesh_alpha", "u_transform_2d", "flags"
];
function generateMeshPipelineShader(params) {
    const vs_mesh = `#version 300 es
  precision highp float;

  layout (std140) uniform ub_rig_info {
    mat4 joint_matrices[${params.max_bones}];
    vec4 bs_weights[${params.max_bs_count / 4}];
  } ub_rig;
  
  uniform sampler2D u_image_bs; // used for blendshape deformation
  uniform mat4 u_proj_mat;
  uniform mat2 u_transform_2d; // mat2[0] = scale, mat2[1] = translation
  uniform uint u_bs_count; // number of bs weight vectors (divided by 4)
  uniform uint flags; // 1 - has opacity

  layout(location = 0) in vec3 pos;
  layout(location = 1) in vec2 tex_coord;
  layout(location = 2) in float opacity;
  layout(location = 3) in uvec4 bone_index_0_4;
  layout(location = 4) in uvec4 bone_index_4_8;
  layout(location = 5) in vec4 bone_weight_0_4;
  layout(location = 6) in vec4 bone_weight_4_8;

  out vec4 v_pos;
  out vec2 v_tex_coord;
  out float v_opacity;

  vec4 lbs_transform(vec3 pos){
    float total_weight = 0.0;
    vec4 aug_pos = vec4(pos, 1.0);
    vec4 result = vec4(0.0);
    uint index;
    for(index = 0u;index < 8u;index++){
      uint joint_index;
      float joint_weight;
      if(index < 4u) {
        joint_index = bone_index_0_4[index];
        joint_weight = bone_weight_0_4[index];
      }
      else {
        joint_index = bone_index_4_8[index - 4u];
        joint_weight = bone_weight_4_8[index - 4u];
      }
      if(255u == joint_index)break;
      else result += joint_weight * (ub_rig.joint_matrices[joint_index] * aug_pos);
    }
    result /= result.w;
    return vec4(result.xyz, 1.0);
  }

  vec3 bs_accumulate(uint vertex_id){
    ivec2 texSize = textureSize(u_image_bs, 0);
    vec3 pos = vec3(0.0);

    uint vertex_offset = vertex_id * u_bs_count * 3u;
    for(uint i = 0u; i < u_bs_count; i++){
      vec4 bs_weight_vec = ub_rig.bs_weights[i];
      for (uint j = 0u; j < 3u; j++){
        uint texel_offset = j * u_bs_count + vertex_offset + i;
        uint texel_x = texel_offset % uint(texSize.x);
        uint texel_y = texel_offset / uint(texSize.x);
        vec4 data = texelFetch(u_image_bs, ivec2(texel_x, texel_y), 0);
        pos[j] += dot(data, bs_weight_vec);
      }
    }
    return pos;
  }
  
  void main() {
    if(flags % 2u >= 1u)v_opacity = opacity; else v_opacity = 1.0;
    
    vec3 bs_pos = vec3(0.0);
    if(u_bs_count > 0u)bs_pos = bs_accumulate(uint(gl_VertexID)) * v_opacity;
    v_pos = u_proj_mat * lbs_transform(pos + bs_pos);
    v_pos /= v_pos.w;
    v_pos.xy = u_transform_2d[0] * v_pos.xy + u_transform_2d[1];
    v_tex_coord = tex_coord;
    gl_Position = v_pos;
  }
`;
    const fs_mask = `#version 300 es
  precision highp float;
  
  in vec4 v_pos;
  in float v_opacity;
  in vec2 v_tex_coord;

  out vec4 fragColor;

  void main() {
    if(gl_FrontFacing)fragColor = vec4(v_opacity);
    else fragColor = vec4(0.0);
  }
`;
    const fs_mesh = `#version 300 es
  precision highp int;
  precision highp float;
  precision highp sampler2DArray;
  precision highp sampler3D;
  layout (std140) uniform ub_pca_info {
    vec4 weights[${params.max_pca_component_count / 4}];
  } ub_pca;
  uniform sampler2DArray u_image_pca;
  uniform sampler3D u_image_lut;
  uniform uint flags; // 2 - has LUT, 4 - unsigned PCA component
  uniform vec3 u_gamma;
  uniform vec3 u_color_balance; // r/c, g/m, b/y

  ${shader_common}

  vec4 pca_accumulate(vec2 tex_coord, bool _unsigned){
    ivec3 texSize = textureSize(u_image_pca, 0);
    vec4 result = vec4(0.0);
    for(int i = 0; i < texSize.z; i++){
      int vec_index = i / 4;
      int elem_index = i % 4;
      vec4 pca_sample = texture(u_image_pca, vec3(tex_coord, float(i)));
      if(_unsigned)pca_sample = 2.0 * pca_sample - 1.0;
      result += ub_pca.weights[vec_index][elem_index] * pca_sample;
    }
    return result;
  }
  
  in vec4 v_pos;
  in float v_opacity;
  in vec2 v_tex_coord;

  out vec4 fragColor;

  void main() {
    if(gl_FrontFacing){
      vec2 fragTexCoord = v_tex_coord;
      vec4 sample_color = pca_accumulate(v_tex_coord, flags % 8u >= 4u);
      if(flags % 4u >= 2u)sample_color = texture(u_image_lut, sample_color.rgb);
      // Apply gamma correction
      vec3 final_color = pow(sample_color.rgb, u_gamma);

      // Apply color balance
      // Convert -100 to 100 range to -0.5 to 0.5 range
      vec3 balance_adjusted = u_color_balance / 200.0; // Map -100..100 to -0.5..0.5

      // Red/Cyan adjustment
      final_color.r += balance_adjusted.x;
      final_color.g -= balance_adjusted.x; // Cyan is opposite of Red

      // Green/Magenta adjustment
      final_color.g += balance_adjusted.y;
      final_color.b -= balance_adjusted.y; // Magenta is opposite of Green

      // Blue/Yellow adjustment
      final_color.b += balance_adjusted.z;
      final_color.r -= balance_adjusted.z; // Yellow is opposite of Blue

      // Clamp values to [0, 1]
      final_color = clamp(final_color, 0.0, 1.0);

      fragColor = sRGB2RGB(vec4(final_color.bgr, 1.0));
    }
    else fragColor = vec4(0.0);
  }
`;
    return { vertex: vs_mesh, fragment_mask: fs_mask, fragment: fs_mesh };
}
const uniform_var_list_mesh = [
    "u_proj_mat", "u_transform_2d", "u_image", "u_image_bs", "u_image_pca", "u_image_lut", "u_bs_count", "flags", "u_gamma", "u_color_balance"
];
const uniform_block_list_mesh = [
    "ub_pca_info", "ub_rig_info"
];
class GLPipeline {
    device;
    compat_features = {};
    charData = null;
    backgroundPipelineInfo;
    backgroundVAO;
    backgroundTextures = {};
    backgroundTextureSrc = null;
    meshPipelineInfo = null;
    maskPipelineInfo = null;
    meshInfos = [];
    meshStatistics = {
        max_pca_component_count: 4,
        max_bs_count: 4,
        max_bones: 1
    };
    FrameTexture_meshColor = null;
    FrameTexture_meshAlpha = null;
    LUTTexture = null;
    FrameBuffer_MSAA = null;
    FrameBuffer_meshColor = null;
    FrameBuffer_meshAlpha = null;
    initSkeletonStatus = [];
    frameDataCallback = () => null;
    currentGamma = { r: 1.0, g: 1.0, b: 1.0 };
    currentColorBalance = { rc: 0.0, gm: 0.0, by: 0.0 };
    _ub_rig_info_data = null;
    _ub_pca_info_data = null;
    assembleBackgroundPipeline() {
        const program = this.device.compileShaderProgram({
            "vertex": vs_background,
            "fragment": fs_background
        });
        const progUniforms = this.device.getShaderProgramUniformLocation(program, uniform_var_list_bg);
        this.backgroundPipelineInfo = {
            program: program,
            progUniforms: progUniforms,
            progUniformBlocks: {}
        };
        this.backgroundVAO = this.device.gl.createVertexArray();
        this.device.gl.bindVertexArray(this.backgroundVAO);
        // Setup buffers and attributes
        const positionBuffer = this.device.gl.createBuffer();
        this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1, -1, 0, 1,
            1, -1, 1, 1,
            -1, 1, 0, 0,
            -1, 1, 0, 0,
            1, -1, 1, 1,
            1, 1, 1, 0
        ];
        this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, new Float32Array(positions), this.device.gl.STATIC_DRAW);
        // pos
        this.device.gl.enableVertexAttribArray(0);
        this.device.gl.vertexAttribPointer(0, 2, this.device.gl.FLOAT, false, 16, 0);
        // texCoord
        this.device.gl.enableVertexAttribArray(1);
        this.device.gl.vertexAttribPointer(1, 2, this.device.gl.FLOAT, false, 16, 8);
        this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, null);
        this.device.gl.bindVertexArray(null);
        // Create texture
        let textures = {};
        textures["u_image_bg"] = this.device.gl.createTexture();
        if (!textures["u_image_bg"])
            throw new Error('WebGL texture creation failed.');
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, textures["u_image_bg"]);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.LINEAR);
        textures["u_image_char_body"] = this.device.gl.createTexture();
        if (!textures["u_image_char_body"])
            throw new Error('WebGL texture creation failed.');
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, textures["u_image_char_body"]);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.LINEAR);
        this.backgroundTextures = textures;
    }
    assembleMeshPipelines(data) {
        const char = data.char;
        // statistics
        let meshStatistics = {
            max_pca_component_count: 4,
            max_bs_count: 4,
            max_bones: Math.max(char.skeleton.length, 1)
        };
        for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
            const textureModels = char.mesh[mesh_index].textureModels;
            let pca_component_count = 0;
            for (let model of textureModels) {
                let pca_component_count_model = model.data.size[0] + (4 - 1);
                pca_component_count_model -= pca_component_count_model % 4;
                pca_component_count = Math.max(pca_component_count, pca_component_count_model);
            }
            meshStatistics.max_pca_component_count = Math.max(meshStatistics.max_pca_component_count, pca_component_count);
            let max_bs_count = char.mesh[mesh_index].blendshapes.size[0] - 1 + (4 - 1);
            max_bs_count -= max_bs_count % 4;
            meshStatistics.max_bs_count = Math.max(meshStatistics.max_bs_count, max_bs_count);
        }
        this.meshStatistics = meshStatistics;
        this._ub_rig_info_data = new Float32Array(this.meshStatistics.max_bones * 16 + this.meshStatistics.max_bs_count);
        this._ub_pca_info_data = new Float32Array(this.meshStatistics.max_pca_component_count);
        const shader = generateMeshPipelineShader(this.meshStatistics);
        let program = this.device.compileShaderProgram({ vertex: shader.vertex, fragment: shader.fragment });
        let progUniforms = this.device.getShaderProgramUniformLocation(program, uniform_var_list_mesh);
        let progUniformBlocks = this.device.getShaderProgramUniformBlockLocation(program, uniform_block_list_mesh);
        this.meshPipelineInfo = {
            program: program,
            progUniforms: progUniforms,
            progUniformBlocks: progUniformBlocks,
        };
        this.device.gl.uniformBlockBinding(this.meshPipelineInfo.program, this.meshPipelineInfo.progUniformBlocks["ub_rig_info"], 0);
        this.device.gl.uniformBlockBinding(this.meshPipelineInfo.program, this.meshPipelineInfo.progUniformBlocks["ub_pca_info"], 1);
        program = this.device.compileShaderProgram({ vertex: shader.vertex, fragment: shader.fragment_mask });
        progUniforms = this.device.getShaderProgramUniformLocation(program, uniform_var_list_mesh);
        progUniformBlocks = this.device.getShaderProgramUniformBlockLocation(program, uniform_block_list_mesh);
        this.maskPipelineInfo = {
            program: program,
            progUniforms: progUniforms,
            progUniformBlocks: progUniformBlocks,
        };
        this.device.gl.uniformBlockBinding(this.maskPipelineInfo.program, this.maskPipelineInfo.progUniformBlocks["ub_rig_info"], 0);
        this.meshInfos = [];
        for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
            let currentMeshInfo = {
                VAO: this.device.gl.createVertexArray(),
                buffers: {},
                textures: {},
                texturePCAModels: [],
                uniformUInts: {},
            };
            // Setup buffers and attributes
            this.device.gl.bindVertexArray(currentMeshInfo.VAO);
            if (null === this.device.getGLArrayElementType(char.mesh[mesh_index].blendshapes.data))
                throw new Error(`Data type unsupported by WebGL: ${char.mesh[mesh_index].blendshapes.data}`);
            currentMeshInfo.buffers['pos'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, currentMeshInfo.buffers['pos']);
            this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, char.mesh[mesh_index].blendshapes.part(0).data, this.device.gl.STATIC_DRAW);
            this.device.gl.enableVertexAttribArray(0);
            this.device.gl.vertexAttribPointer(0, 3, this.device.getGLArrayElementType(char.mesh[mesh_index].blendshapes.data), false, 0, 0);
            if (null === this.device.getGLArrayElementType(char.mesh[mesh_index].UVCoord.data))
                throw new Error(`Data type unsupported by WebGL: ${char.mesh[mesh_index].UVCoord.data}`);
            currentMeshInfo.buffers['tex_coord'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, currentMeshInfo.buffers['tex_coord']);
            this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, char.mesh[mesh_index].UVCoord.data, this.device.gl.STATIC_DRAW);
            this.device.gl.enableVertexAttribArray(1);
            this.device.gl.vertexAttribPointer(1, 2, this.device.getGLArrayElementType(char.mesh[mesh_index].UVCoord.data), true, 0, 0);
            if (char.mesh[mesh_index].opacity) {
                if (null === this.device.getGLArrayElementType(char.mesh[mesh_index].opacity.data))
                    throw new Error(`Data type unsupported by WebGL: ${char.mesh[mesh_index].opacity.data}`);
                currentMeshInfo.buffers['opacity'] = this.device.gl.createBuffer();
                this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, currentMeshInfo.buffers['opacity']);
                this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, char.mesh[mesh_index].opacity.data, this.device.gl.STATIC_DRAW);
                this.device.gl.enableVertexAttribArray(2);
                this.device.gl.vertexAttribPointer(2, 1, this.device.getGLArrayElementType(char.mesh[mesh_index].opacity.data), true, 0, 0);
            }
            currentMeshInfo.buffers['bone_indices'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, currentMeshInfo.buffers['bone_indices']);
            this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, char.mesh[mesh_index].jointIndex, this.device.gl.STATIC_DRAW);
            this.device.gl.enableVertexAttribArray(3);
            this.device.gl.vertexAttribIPointer(3, 4, this.device.gl.UNSIGNED_BYTE, 8, 0);
            this.device.gl.enableVertexAttribArray(4);
            this.device.gl.vertexAttribIPointer(4, 4, this.device.gl.UNSIGNED_BYTE, 8, 4);
            currentMeshInfo.buffers['bone_weight'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, currentMeshInfo.buffers['bone_weight']);
            this.device.gl.bufferData(this.device.gl.ARRAY_BUFFER, char.mesh[mesh_index].jointWeight, this.device.gl.STATIC_DRAW);
            this.device.gl.enableVertexAttribArray(5);
            this.device.gl.vertexAttribPointer(5, 4, this.device.gl.FLOAT, false, 32, 0);
            this.device.gl.enableVertexAttribArray(6);
            this.device.gl.vertexAttribPointer(6, 4, this.device.gl.FLOAT, false, 32, 16);
            this.device.gl.bindBuffer(this.device.gl.ARRAY_BUFFER, null);
            if (null === this.device.getGLArrayElementType(char.mesh[mesh_index].triangles.data))
                throw new Error(`Data type unsupported by WebGL: ${char.mesh[mesh_index].triangles.data}`);
            currentMeshInfo.buffers['indices'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.ELEMENT_ARRAY_BUFFER, currentMeshInfo.buffers['indices']);
            this.device.gl.bufferData(this.device.gl.ELEMENT_ARRAY_BUFFER, char.mesh[mesh_index].triangles.data, this.device.gl.STATIC_DRAW);
            currentMeshInfo.buffers['ub_pca_info'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.UNIFORM_BUFFER, currentMeshInfo.buffers['ub_pca_info']);
            this.device.gl.bufferData(this.device.gl.UNIFORM_BUFFER, new Float32Array(meshStatistics.max_pca_component_count), this.device.gl.DYNAMIC_DRAW);
            currentMeshInfo.buffers['ub_rig_info'] = this.device.gl.createBuffer();
            this.device.gl.bindBuffer(this.device.gl.UNIFORM_BUFFER, currentMeshInfo.buffers['ub_rig_info']);
            this.device.gl.bufferData(this.device.gl.UNIFORM_BUFFER, new Float32Array(meshStatistics.max_bones * 16 + meshStatistics.max_bs_count), this.device.gl.DYNAMIC_DRAW);
            this.device.gl.bindVertexArray(null);
            // Create texture
            // blendshape texture
            if (char.mesh[mesh_index].blendshapes.size[0] > 1) {
                let bs_texture_size = [Math.ceil((char.mesh[mesh_index].blendshapes.size[0] - 1) / 4), char.mesh[mesh_index].blendshapes.size[1] * char.mesh[mesh_index].blendshapes.size[2]];
                // reshape the texture into a square one
                let square_bs_texture_size = Math.ceil(Math.sqrt(bs_texture_size[0] * bs_texture_size[1]));
                let bs_vec_stride = bs_texture_size[0] * 4;
                // let texture_row_stride = square_bs_texture_size * 4;
                let bs_texture_data = new Float32Array(square_bs_texture_size * square_bs_texture_size * 4);
                for (let i = 0; i < bs_texture_size[1]; i++) {
                    for (let j = 1; j < char.mesh[mesh_index].blendshapes.size[0]; j++)
                        bs_texture_data[i * bs_vec_stride + (j - 1)] = char.mesh[mesh_index].blendshapes.data[j * bs_texture_size[1] + i];
                    for (let j = char.mesh[mesh_index].blendshapes.size[0] - 1; j < bs_vec_stride; j++)
                        bs_texture_data[i * bs_vec_stride + j] = 0.0;
                }
                currentMeshInfo.textures["u_image_bs"] = this.device.gl.createTexture();
                if (!currentMeshInfo.textures["u_image_bs"])
                    throw new Error('WebGL texture creation failed.');
                this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, currentMeshInfo.textures["u_image_bs"]);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.NEAREST);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MAG_FILTER, this.device.gl.NEAREST);
                this.device.texImage2D(this.device.gl.TEXTURE_2D, 0, square_bs_texture_size, square_bs_texture_size, this.device.gl.RGBA, bs_texture_data);
                currentMeshInfo.uniformUInts["u_bs_count"] = bs_texture_size[0];
            }
            else
                currentMeshInfo.uniformUInts["u_bs_count"] = 0;
            // PCA textures
            for (let pca_model of char.mesh[mesh_index].textureModels) {
                let pca_texture = this.device.gl.createTexture();
                if (!pca_texture)
                    throw new Error('WebGL texture creation failed.');
                this.device.gl.bindTexture(this.device.gl.TEXTURE_2D_ARRAY, pca_texture);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D_ARRAY, this.device.gl.TEXTURE_WRAP_R, this.device.gl.CLAMP_TO_EDGE);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D_ARRAY, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D_ARRAY, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D_ARRAY, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.LINEAR);
                this.device.gl.texParameteri(this.device.gl.TEXTURE_2D_ARRAY, this.device.gl.TEXTURE_MAG_FILTER, this.device.gl.LINEAR);
                let dataType = this.device.getGLArrayElementType(pca_model.data.data);
                let assembledPCAModel = {
                    texture: pca_texture,
                    unsigned: this.device.gl.UNSIGNED_BYTE === dataType || this.device.gl.UNSIGNED_SHORT === dataType || this.device.gl.UNSIGNED_INT === dataType
                };
                let PCAData = pca_model.data.data;
                if ("Float64Array" === pca_model.data.data[Symbol.toStringTag]
                    || (this.device.gl.FLOAT === dataType && !this.compat_features["OES_texture_float_linear"])
                    || (this.device.gl.HALF_FLOAT === dataType && !this.compat_features["OES_texture_half_float_linear"])) {
                    const texture_component_size = pca_model.data.size[1] * pca_model.data.size[2] * 3;
                    const roundedTexture = new Uint8Array(pca_model.data.size[0] * texture_component_size);
                    // for every component, calculate their scale factor and round (-1, 1) to (0, 255)
                    let scalingFactor = new Float32Array(pca_model.data.size[0]);
                    for (let i = 0; i < pca_model.data.size[0]; i++) {
                        let scale_factor = 1e-6;
                        for (let j = 0; j < texture_component_size; j++)
                            scale_factor = Math.max(scale_factor, Math.abs(pca_model.data.data[i * texture_component_size + j]));
                        let inv_scale_factor = 1.0 / scale_factor;
                        for (let j = 0; j < texture_component_size; j++) {
                            let scaled_value = pca_model.data.data[i * texture_component_size + j] * inv_scale_factor;
                            roundedTexture[i * texture_component_size + j] = Math.round((scaled_value * 0.5 + 0.5) * 255.0);
                        }
                        scalingFactor[i] = scale_factor;
                    }
                    PCAData = roundedTexture;
                    assembledPCAModel.unsigned = true;
                    assembledPCAModel.scalingFactor = scalingFactor;
                }
                if (pca_model.scalingFactor)
                    assembledPCAModel.scalingFactor = pca_model.scalingFactor.data;
                this.device.texImage3D(this.device.gl.TEXTURE_2D_ARRAY, 0, pca_model.data.size[1], pca_model.data.size[2], pca_model.data.size[0], this.device.gl.RGB, PCAData);
                this.device.gl.bindTexture(this.device.gl.TEXTURE_2D_ARRAY, null);
                currentMeshInfo.texturePCAModels.push(assembledPCAModel);
            }
            this.meshInfos.push(currentMeshInfo);
        }
        // texture render targets
        this.FrameTexture_meshColor = this.device.gl.createTexture();
        if (!this.FrameTexture_meshColor)
            throw Error('WebGL texture creation failed.');
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.FrameTexture_meshColor);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.NEAREST);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MAG_FILTER, this.device.gl.NEAREST);
        this.device.gl.texImage2D(this.device.gl.TEXTURE_2D, 0, this.device.gl.RGBA8, this.device.canvas.width, this.device.canvas.height, 0, this.device.gl.RGBA, this.device.gl.UNSIGNED_BYTE, null);
        this.FrameTexture_meshAlpha = this.device.gl.createTexture();
        if (!this.FrameTexture_meshAlpha)
            throw Error('WebGL texture creation failed.');
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.FrameTexture_meshAlpha);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.NEAREST);
        this.device.gl.texParameteri(this.device.gl.TEXTURE_2D, this.device.gl.TEXTURE_MAG_FILTER, this.device.gl.NEAREST);
        this.device.gl.texImage2D(this.device.gl.TEXTURE_2D, 0, this.device.gl.RGBA8, this.device.canvas.width, this.device.canvas.height, 0, this.device.gl.RGBA, this.device.gl.UNSIGNED_BYTE, null);
        // depth renderbuffer for mask rendering
        const maskDepthBuffer = this.device.gl.createRenderbuffer();
        this.device.gl.bindRenderbuffer(this.device.gl.RENDERBUFFER, maskDepthBuffer);
        if (data.multisample && data.multisample > 1)
            this.device.gl.renderbufferStorageMultisample(this.device.gl.RENDERBUFFER, data.multisample, this.device.gl.DEPTH_COMPONENT16, this.device.canvas.width, this.device.canvas.height);
        else
            this.device.gl.renderbufferStorage(this.device.gl.RENDERBUFFER, this.device.gl.DEPTH_COMPONENT16, this.device.canvas.width, this.device.canvas.height);
        const maskColorBuffer = this.device.gl.createRenderbuffer();
        this.device.gl.bindRenderbuffer(this.device.gl.RENDERBUFFER, maskColorBuffer);
        if (data.multisample && data.multisample > 1)
            this.device.gl.renderbufferStorageMultisample(this.device.gl.RENDERBUFFER, data.multisample, this.device.gl.RGBA8, this.device.canvas.width, this.device.canvas.height);
        else
            this.device.gl.renderbufferStorage(this.device.gl.RENDERBUFFER, this.device.gl.RGBA8, this.device.canvas.width, this.device.canvas.height);
        this.FrameBuffer_MSAA = this.device.gl.createFramebuffer();
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_MSAA);
        this.device.gl.framebufferRenderbuffer(this.device.gl.FRAMEBUFFER, this.device.gl.COLOR_ATTACHMENT0, this.device.gl.RENDERBUFFER, maskColorBuffer);
        this.device.gl.framebufferRenderbuffer(this.device.gl.FRAMEBUFFER, this.device.gl.DEPTH_ATTACHMENT, this.device.gl.RENDERBUFFER, maskDepthBuffer);
        this.FrameBuffer_meshColor = this.device.gl.createFramebuffer();
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_meshColor);
        this.device.gl.framebufferTexture2D(this.device.gl.FRAMEBUFFER, this.device.gl.COLOR_ATTACHMENT0, this.device.gl.TEXTURE_2D, this.FrameTexture_meshColor, 0);
        this.FrameBuffer_meshAlpha = this.device.gl.createFramebuffer();
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_meshAlpha);
        this.device.gl.framebufferTexture2D(this.device.gl.FRAMEBUFFER, this.device.gl.COLOR_ATTACHMENT0, this.device.gl.TEXTURE_2D, this.FrameTexture_meshAlpha, 0);
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, null);
        this.initSkeletonStatus = char.evalSkeleton();
        // LUT textures
        if (data.LUT === null)
            this.LUTTexture = null;
        else {
            this.LUTTexture = this.device.gl.createTexture();
            if (!this.LUTTexture)
                throw new Error('WebGL texture creation failed.');
            this.device.gl.bindTexture(this.device.gl.TEXTURE_3D, this.LUTTexture);
            this.device.gl.texParameteri(this.device.gl.TEXTURE_3D, this.device.gl.TEXTURE_WRAP_R, this.device.gl.CLAMP_TO_EDGE);
            this.device.gl.texParameteri(this.device.gl.TEXTURE_3D, this.device.gl.TEXTURE_WRAP_S, this.device.gl.CLAMP_TO_EDGE);
            this.device.gl.texParameteri(this.device.gl.TEXTURE_3D, this.device.gl.TEXTURE_WRAP_T, this.device.gl.CLAMP_TO_EDGE);
            this.device.gl.texParameteri(this.device.gl.TEXTURE_3D, this.device.gl.TEXTURE_MIN_FILTER, this.device.gl.LINEAR);
            this.device.gl.texParameteri(this.device.gl.TEXTURE_3D, this.device.gl.TEXTURE_MAG_FILTER, this.device.gl.LINEAR);
            if (this.compat_features["OES_texture_float_linear"]) {
                this.device.texImage3D(this.device.gl.TEXTURE_3D, 0, data.LUT.size[1], data.LUT.size[2], data.LUT.size[0], this.device.gl.RGB, data.LUT.data);
            }
            else {
                // this will reduce the quality of LUT color correction significantly
                const roundedTexture = new Uint8Array(data.LUT.size[0] * data.LUT.size[1] * data.LUT.size[2] * 3);
                // for the mean texture, convert float to uint8 directly
                for (let j = 0; j < roundedTexture.length; j++)
                    roundedTexture[j] = Math.round(data.LUT.data[j] * 255.0);
                this.device.texImage3D(this.device.gl.TEXTURE_3D, 0, data.LUT.size[1], data.LUT.size[2], data.LUT.size[0], this.device.gl.RGB, roundedTexture);
            }
            this.device.gl.bindTexture(this.device.gl.TEXTURE_3D, null);
        }
        this.backgroundTextureSrc = null;
    }
    initFrame() {
        this.device.gl.viewport(0, 0, this.device.gl.drawingBufferWidth, this.device.gl.drawingBufferHeight);
        this.device.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.device.gl.clearDepth(1.0);
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_meshColor);
        this.device.gl.clear(this.device.gl.COLOR_BUFFER_BIT);
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_meshAlpha);
        this.device.gl.clear(this.device.gl.COLOR_BUFFER_BIT);
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, null);
        this.device.gl.clear(this.device.gl.COLOR_BUFFER_BIT | this.device.gl.DEPTH_BUFFER_BIT);
    }
    renderBackground(background, char_body, transform) {
        this.device.gl.disable(this.device.gl.DEPTH_TEST);
        this.device.gl.disable(this.device.gl.CULL_FACE);
        this.device.gl.disable(this.device.gl.BLEND);
        this.device.gl.useProgram(this.backgroundPipelineInfo.program);
        if (transform) {
            this.device.gl.uniformMatrix2fv(this.backgroundPipelineInfo.progUniforms['u_transform_2d'], false, new Float32Array([
                1.0 / transform.scaleX, 1.0 / transform.scaleY, -transform.offsetX / transform.scaleX, -transform.offsetY / transform.scaleY
            ]));
        }
        else
            this.device.gl.uniformMatrix2fv(this.backgroundPipelineInfo.progUniforms['u_transform_2d'], false, new Float32Array([1.0, 1.0, 0.0, 0.0]));
        this.device.gl.uniform1ui(this.backgroundPipelineInfo.progUniforms['flags'], background === null ? 0 : 1);
        this.device.gl.bindVertexArray(this.backgroundVAO);
        this.device.gl.uniform1i(this.backgroundPipelineInfo.progUniforms[`u_image_bg`], 0);
        if (background !== null) {
            this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 0);
            this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.backgroundTextures["u_image_bg"]);
            if (this.backgroundTextureSrc !== background) {
                this.device.gl.texImage2D(this.device.gl.TEXTURE_2D, 0, this.device.gl.RGB, this.device.gl.RGB, this.device.gl.UNSIGNED_BYTE, background);
                this.backgroundTextureSrc = background;
            }
        }
        this.device.gl.uniform1i(this.backgroundPipelineInfo.progUniforms[`u_image_char_body`], 1);
        this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 1);
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.backgroundTextures["u_image_char_body"]);
        this.device.gl.texImage2D(this.device.gl.TEXTURE_2D, 0, this.device.gl.RGB, this.device.gl.RGB, this.device.gl.UNSIGNED_BYTE, char_body);
        this.device.gl.uniform1i(this.backgroundPipelineInfo.progUniforms[`u_image_mesh_color`], 2);
        this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 2);
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.FrameTexture_meshColor);
        this.device.gl.uniform1i(this.backgroundPipelineInfo.progUniforms[`u_image_mesh_alpha`], 3);
        this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 3);
        this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, this.FrameTexture_meshAlpha);
        this.device.gl.drawArrays(this.device.gl.TRIANGLES, 0, 6);
    }
    renderMesh(data, frame_data) {
        this.device.gl.enable(this.device.gl.DEPTH_TEST);
        this.device.gl.disable(this.device.gl.CULL_FACE);
        this.device.gl.disable(this.device.gl.BLEND);
        const char = data.char;
        let proj_mat = new Float32Array(flatten(mmul(char.cameraConfig.getProjMatrix([this.device.canvas.width, this.device.canvas.height], 200, 800), char.cameraConfig.getExtrinsicMatrix())));
        let transform_2d_mat = new Float32Array([data.transform.scaleX, data.transform.scaleY, (data.transform.scaleX - 1.0) + 2.0 * data.transform.offsetX, (1.0 - data.transform.scaleY) - 2.0 * data.transform.offsetY]);
        let currentSkeletonStatus = char.evalSkeletonFromMovable(frame_data.movableJointTransforms);
        let joint_matrices = Array(char.skeleton.length);
        for (let i = 0; i < char.skeleton.length; i++) {
            const joint_transform = currentSkeletonStatus[i].apply(this.initSkeletonStatus[i].inv());
            joint_matrices[i] = joint_transform.homogeneous_matrix();
        }
        let ub_rig_info_data_offset = 0;
        for (let i = 0; i < Math.min(this.meshStatistics.max_bones, char.skeleton.length); i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++)
                    this._ub_rig_info_data[ub_rig_info_data_offset + j * 4 + k] = joint_matrices[i][k][j];
            }
            ub_rig_info_data_offset += 16;
        }
        // render mask
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_MSAA);
        this.device.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.device.gl.clearDepth(1.0);
        this.device.gl.clear(this.device.gl.COLOR_BUFFER_BIT | this.device.gl.DEPTH_BUFFER_BIT);
        this.device.gl.useProgram(this.maskPipelineInfo.program);
        this.device.gl.uniformMatrix4fv(this.maskPipelineInfo.progUniforms['u_proj_mat'], true, proj_mat);
        this.device.gl.uniformMatrix2fv(this.maskPipelineInfo.progUniforms['u_transform_2d'], false, transform_2d_mat);
        for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
            if (char.mesh[mesh_index].genMask) {
                const currentMeshInfo = this.meshInfos[mesh_index];
                if (char.mesh[mesh_index].blendshapes.size[0] > 1) {
                    ub_rig_info_data_offset = this.meshStatistics.max_bones * 16;
                    let effective_bs_count = Math.min(char.mesh[mesh_index].blendshapeIndices.length - 1, this.meshStatistics.max_bs_count);
                    for (let i = 0; i < effective_bs_count; i++)
                        this._ub_rig_info_data[ub_rig_info_data_offset + i] = frame_data.blendshapeWeights[char.mesh[mesh_index].blendshapeIndices[i + 1] - 1];
                    for (let i = effective_bs_count; i < this.meshStatistics.max_bs_count; i++)
                        this._ub_rig_info_data[ub_rig_info_data_offset + i] = 0.0;
                }
                let flags = 0;
                if (char.mesh[mesh_index].opacity)
                    flags += 1;
                for (const var_name in currentMeshInfo.uniformUInts)
                    this.device.gl.uniform1ui(this.maskPipelineInfo.progUniforms[var_name], currentMeshInfo.uniformUInts[var_name]);
                this.device.gl.uniform1ui(this.maskPipelineInfo.progUniforms['flags'], flags);
                this.device.gl.bindBuffer(this.device.gl.UNIFORM_BUFFER, currentMeshInfo.buffers['ub_rig_info']);
                this.device.gl.bufferData(this.device.gl.UNIFORM_BUFFER, this._ub_rig_info_data, this.device.gl.DYNAMIC_DRAW);
                this.device.gl.bindBufferBase(this.device.gl.UNIFORM_BUFFER, 0, currentMeshInfo.buffers["ub_rig_info"]);
                this.device.gl.bindVertexArray(currentMeshInfo.VAO);
                this.device.gl.bindBuffer(this.device.gl.ELEMENT_ARRAY_BUFFER, currentMeshInfo.buffers["indices"]);
                this.device.gl.uniform1i(this.maskPipelineInfo.progUniforms[`u_image_bs`], 0);
                this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 0);
                this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, currentMeshInfo.textures["u_image_bs"]);
                this.device.gl.drawElements(this.device.gl.TRIANGLES, char.mesh[mesh_index].triangles.itemSize(), this.device.getGLArrayElementType(char.mesh[mesh_index].triangles.data), 0);
            }
        }
        this.device.gl.bindFramebuffer(this.device.gl.DRAW_FRAMEBUFFER, this.FrameBuffer_meshAlpha);
        this.device.gl.blitFramebuffer(0, 0, this.device.canvas.width, this.device.canvas.height, 0, 0, this.device.canvas.width, this.device.canvas.height, this.device.gl.COLOR_BUFFER_BIT, this.device.gl.NEAREST);
        // render color
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_MSAA);
        this.device.gl.clear(this.device.gl.COLOR_BUFFER_BIT | this.device.gl.DEPTH_BUFFER_BIT);
        this.device.gl.useProgram(this.meshPipelineInfo.program);
        this.device.gl.uniformMatrix4fv(this.meshPipelineInfo.progUniforms['u_proj_mat'], true, proj_mat);
        this.device.gl.uniformMatrix2fv(this.meshPipelineInfo.progUniforms['u_transform_2d'], false, transform_2d_mat);
        for (let mesh_index = 0; mesh_index < char.mesh.length; mesh_index++) {
            const currentMeshInfo = this.meshInfos[mesh_index];
            let PCAModel = currentMeshInfo.texturePCAModels[frame_data.mesh[mesh_index].textureModelIndex];
            if (char.mesh[mesh_index].blendshapes.size[0] > 1) {
                ub_rig_info_data_offset = this.meshStatistics.max_bones * 16;
                let effective_bs_count = Math.min(char.mesh[mesh_index].blendshapeIndices.length - 1, this.meshStatistics.max_bs_count);
                for (let i = 0; i < effective_bs_count; i++)
                    this._ub_rig_info_data[ub_rig_info_data_offset + i] = frame_data.blendshapeWeights[char.mesh[mesh_index].blendshapeIndices[i + 1] - 1];
                for (let i = effective_bs_count; i < this.meshStatistics.max_bs_count; i++)
                    this._ub_rig_info_data[ub_rig_info_data_offset + i] = 0.0;
            }
            let flags = 0;
            if (char.mesh[mesh_index].opacity)
                flags += 1;
            if (this.LUTTexture !== null)
                flags += 2;
            if (PCAModel.unsigned)
                flags += 4;
            for (const var_name in currentMeshInfo.uniformUInts)
                this.device.gl.uniform1ui(this.meshPipelineInfo.progUniforms[var_name], currentMeshInfo.uniformUInts[var_name]);
            this.device.gl.uniform1ui(this.meshPipelineInfo.progUniforms['flags'], flags);
            this.device.gl.uniform3f(this.meshPipelineInfo.progUniforms['u_gamma'], this.currentGamma.r, this.currentGamma.g, this.currentGamma.b);
            this.device.gl.uniform3f(this.meshPipelineInfo.progUniforms['u_color_balance'], this.currentColorBalance.rc, this.currentColorBalance.gm, this.currentColorBalance.by);
            this.device.gl.bindBuffer(this.device.gl.UNIFORM_BUFFER, currentMeshInfo.buffers['ub_rig_info']);
            this.device.gl.bufferData(this.device.gl.UNIFORM_BUFFER, this._ub_rig_info_data, this.device.gl.DYNAMIC_DRAW);
            this.device.gl.bindBufferBase(this.device.gl.UNIFORM_BUFFER, 0, currentMeshInfo.buffers["ub_rig_info"]);
            let effective_pca_component_count = Math.min(frame_data.mesh[mesh_index].texturePCAWeights.length + 1, this._ub_pca_info_data.length);
            this._ub_pca_info_data[0] = 1.0;
            for (let i = 1; i < effective_pca_component_count; i++)
                this._ub_pca_info_data[i] = frame_data.mesh[mesh_index].texturePCAWeights[i - 1];
            if (PCAModel.scalingFactor) {
                for (let i = 0; i < effective_pca_component_count; i++)
                    this._ub_pca_info_data[i] *= PCAModel.scalingFactor[i];
            }
            for (let i = effective_pca_component_count; i < this.meshStatistics.max_pca_component_count; i++)
                this._ub_pca_info_data[i] = 0.0;
            this.device.gl.bindBuffer(this.device.gl.UNIFORM_BUFFER, currentMeshInfo.buffers['ub_pca_info']);
            this.device.gl.bufferData(this.device.gl.UNIFORM_BUFFER, this._ub_pca_info_data, this.device.gl.DYNAMIC_DRAW);
            this.device.gl.bindBufferBase(this.device.gl.UNIFORM_BUFFER, 1, currentMeshInfo.buffers["ub_pca_info"]);
            this.device.gl.bindVertexArray(currentMeshInfo.VAO);
            this.device.gl.bindBuffer(this.device.gl.ELEMENT_ARRAY_BUFFER, currentMeshInfo.buffers["indices"]);
            this.device.gl.uniform1i(this.meshPipelineInfo.progUniforms[`u_image_bs`], 0);
            this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 0);
            this.device.gl.bindTexture(this.device.gl.TEXTURE_2D, currentMeshInfo.textures["u_image_bs"]);
            this.device.gl.uniform1i(this.meshPipelineInfo.progUniforms[`u_image_pca`], 1);
            this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 1);
            if (PCAModel.texture)
                this.device.gl.bindTexture(this.device.gl.TEXTURE_2D_ARRAY, PCAModel.texture);
            this.device.gl.uniform1i(this.meshPipelineInfo.progUniforms[`u_image_lut`], 2);
            if (this.LUTTexture) {
                this.device.gl.activeTexture(this.device.gl.TEXTURE0 + 2);
                this.device.gl.bindTexture(this.device.gl.TEXTURE_3D, this.LUTTexture);
            }
            this.device.gl.drawElements(this.device.gl.TRIANGLES, char.mesh[mesh_index].triangles.itemSize(), this.device.getGLArrayElementType(char.mesh[mesh_index].triangles.data), 0);
        }
        this.device.gl.bindFramebuffer(this.device.gl.DRAW_FRAMEBUFFER, this.FrameBuffer_meshColor);
        this.device.gl.blitFramebuffer(0, 0, this.device.canvas.width, this.device.canvas.height, 0, 0, this.device.canvas.width, this.device.canvas.height, this.device.gl.COLOR_BUFFER_BIT, this.device.gl.NEAREST);
        this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, null);
    }
    constructor(device) {
        this.device = device;
        this.reinitialize();
    }
    reinitialize() {
        this.compat_features = {};
        this.compat_features["OES_texture_float_linear"] = this.device.gl.getExtension("OES_texture_float_linear"); // this extension is essential for loseless PCA texture composition
        this.compat_features["OES_texture_half_float_linear"] = this.device.gl.getExtension("OES_texture_half_float_linear");
        this.assembleBackgroundPipeline();
        if (this.charData)
            this.assembleMeshPipelines(this.charData);
    }
    setSyncMedia(syncMedia) {
        this.device.run((device) => this._onRender(), syncMedia);
    }
    setCharData(charData) {
        if (charData?.char) {
            this.charData = charData;
            this.assembleMeshPipelines(this.charData);
        }
        else
            this.charData = null;
    }
    setFrameDataCallback(cb) {
        this.frameDataCallback = cb;
    }
    setGamma(gammaR, gammaG, gammaB) {
        this.currentGamma = { r: gammaR, g: gammaG, b: gammaB };
    }
    setColorBalance(rc, gm, by) {
        this.currentColorBalance = { rc: rc, gm: gm, by: by };
    }
    _onRender() {
        const frameData = this.frameDataCallback();
        if (null !== frameData) {
            this.initFrame();
            if (null !== this.charData && null !== this.charData.char && null !== frameData.data)
                this.renderMesh(this.charData, frameData.data);
            this.renderBackground(frameData.backgroundTexture, frameData.charBodyTexture, null === this.charData ? null : this.charData.transform);
            if (!this.first_webgl_render) {
                (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(performanceConstant.first_webgl_render);
                this.first_webgl_render = true;
            }
            if (null !== frameData.onPostRender)
                frameData.onPostRender(this);
        }
        this.device.gl?.flush();
    }
    renderFrame(image, frame, background, transform) {
        this.initFrame();
        // 检查faceFrame数据是否有效
        if (null !== this.charData && null !== this.charData.char && frame) {
            this.renderMesh(this.charData, frame);
        }
        // 总是渲染背景
        this.renderBackground(background, image, transform ?? (null === this.charData ? null : this.charData.transform));
        if (!this.first_webgl_render) {
            (typeof window !== "undefined" ? window : globalThis).performanceTracker.markEnd(performanceConstant.first_webgl_render);
            this.first_webgl_render = true;
        }
        this.device.gl.flush();
    }
    destroy() {
        // 销毁网格相关资源
        if (this.meshInfos) {
            this.meshInfos.forEach(meshInfo => {
                // 销毁VAO
                if (meshInfo.VAO) {
                    this.device.gl.deleteVertexArray(meshInfo.VAO);
                }
                // 销毁缓冲区
                Object.values(meshInfo.buffers).forEach(buffer => {
                    if (buffer) {
                        this.device.gl.deleteBuffer(buffer);
                    }
                });
                // 销毁纹理
                Object.values(meshInfo.textures).forEach(texture => {
                    if (texture) {
                        this.device.gl.deleteTexture(texture);
                    }
                });
                // 销毁PCA纹理数组
                meshInfo.texturePCAModels.forEach(pcaModel => {
                    if (pcaModel.texture) {
                        this.device.gl.deleteTexture(pcaModel.texture);
                    }
                });
            });
            this.meshInfos = [];
        }
        // 销毁帧缓冲和渲染缓冲
        if (this.FrameBuffer_MSAA) {
            this.device.gl.deleteFramebuffer(this.FrameBuffer_MSAA);
            this.FrameBuffer_MSAA = null;
        }
        if (this.FrameBuffer_meshColor) {
            this.device.gl.deleteFramebuffer(this.FrameBuffer_meshColor);
            this.FrameBuffer_meshColor = null;
        }
        if (this.FrameBuffer_meshAlpha) {
            this.device.gl.deleteFramebuffer(this.FrameBuffer_meshAlpha);
            this.FrameBuffer_meshAlpha = null;
        }
        // 销毁帧纹理
        if (this.FrameTexture_meshColor) {
            this.device.gl.deleteTexture(this.FrameTexture_meshColor);
            this.FrameTexture_meshColor = null;
        }
        if (this.FrameTexture_meshAlpha) {
            this.device.gl.deleteTexture(this.FrameTexture_meshAlpha);
            this.FrameTexture_meshAlpha = null;
        }
        // 销毁LUT纹理
        if (this.LUTTexture) {
            this.device.gl.deleteTexture(this.LUTTexture);
            this.LUTTexture = null;
        }
        // 销毁着色器程序
        if (this.meshPipelineInfo?.program) {
            this.device.gl.deleteProgram(this.meshPipelineInfo.program);
            this.meshPipelineInfo.program = null;
        }
        if (this.maskPipelineInfo?.program) {
            this.device.gl.deleteProgram(this.maskPipelineInfo.program);
            this.maskPipelineInfo.program = null;
        }
        // 清除数据数组引用
        this._ub_rig_info_data = null;
        this._ub_pca_info_data = null;
        // 通知设备销毁（如果需要）
        this.device.destroy?.();
    }
}

async function request(url, options = {}) {
    const { method = 'GET', data, headers = {} } = options;
    const config = {
        method,
        // headers,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };
    if (method === 'GET' && data) {
        const params = new URLSearchParams(data).toString();
        url += `${url.includes('?') ? '&' : '?'}${params}`;
    }
    if (method !== 'GET' && data) {
        config.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const error = {
                status: response.status,
                statusText: response.statusText,
                message: `HTTP error! status: ${response.status}`,
            };
            throw error;
        }
        return response;
    }
    catch (error) {
        if (error instanceof Error) {
            throw {
                message: error.message,
                status: 500,
                statusText: 'Client Error',
            };
        }
        throw error;
    }
}
/**
 * 资源下载请求
 * @returns {Promise<[isError: boolean, data: ArrayBuffer | string]>}
 * */
function XMLRequest(options) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', options.url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const arrayBuffer = xhr.response;
                resolve([false, arrayBuffer]);
            }
            else if (xhr.status !== 200) {
                reject([true, xhr.statusText]);
            }
        };
        xhr.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                options.onProgress(percent);
            }
        };
        xhr.send();
    });
}

function encodeWithMd5(s) {
    return vendor.md5(s);
}
function parseUrlWithoutBase(url) {
    try {
        // 尝试直接解析为绝对 URL（不含基准）
        const urlObj = new URL(url);
        // 若是绝对 URL，返回标记+完整路径+查询
        return {
            isAbsolute: true,
            pathWithQuery: urlObj.pathname + urlObj.search
        };
    }
    catch {
        // 解析失败，视为相对路径（path+query）
        // 处理开头可能的斜杠，确保统一格式（如 "path" → "/path"）
        let path = url.trim();
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return {
            isAbsolute: false,
            pathWithQuery: path
        };
    }
}
function headersNeedSign(ak, sk, method, url, data) {
    const headers = {};
    const t = Math.floor(Date.now() / 1000);
    const urlPathQuery = parseUrlWithoutBase(url).pathWithQuery;
    // 递归排序对象的所有 key（包括嵌套对象）
    function sortObjectKeys(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sortObjectKeys(item));
        }
        if (typeof obj !== 'object') {
            return obj;
        }
        const sortedKeys = Object.keys(obj).sort();
        const sortedObj = {};
        for (const key of sortedKeys) {
            sortedObj[key] = sortObjectKeys(obj[key]);
        }
        return sortedObj;
    }
    // 对象按 key 排序并去除空格
    const sortedData = sortObjectKeys(data);
    const dataStr = JSON.stringify(sortedData).replace(/ /g, '');
    const oriSign = `${urlPathQuery.toLowerCase()}${method.toLowerCase()}${dataStr}${sk}${t}`;
    const sign = encodeWithMd5(oriSign);
    headers['X-APP-ID'] = ak;
    headers['X-TOKEN'] = sign;
    headers['X-TIMESTAMP'] = t.toString();
    return {
        headers,
        data: sortedData,
    };
}

exports.EFrameDataType = void 0;
(function (EFrameDataType) {
    EFrameDataType["AUDIO"] = "tts_audio";
    EFrameDataType["BODY"] = "body_data";
    EFrameDataType["FACE"] = "face_data";
    EFrameDataType["EVENT"] = "event_data";
    EFrameDataType["AA_FRAME"] = "aa_frame";
})(exports.EFrameDataType || (exports.EFrameDataType = {}));

// @ts-ignore
function getStyleStr(styles) {
    return Object.entries(styles).map(([key, value]) => {
        // 处理zIndex等数字属性转字符串
        const val = typeof value === 'number' ? value.toString() : value;
        // 驼峰转短横线（如zIndex → z-index）
        const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
        return `${cssKey}:${val};`;
    }).join('');
}
function updateCanvasXOffset(canvas, offset_PX) {
    // 1. 获取当前 transform 样式
    const currentTransform = canvas.style.transform || '';
    // 2. 正则匹配现有 translateX 的值（提取数字）
    const translateXRegex = /translateX\((-?\d+(\.\d+)?)px\)/;
    // 3. 计算新的偏移量（初始为0，匹配到则取原有值）
    // 4. 移除原有 translateX，拼接新值（保留其他 transform 效果）
    const newTransform = currentTransform
        .replace(translateXRegex, '') // 移除旧的 translateX
        .trim() + ` translateX(${offset_PX}px)`; // 添加新的 translateX
    // 5. 应用新样式（去除多余空格）
    canvas.style.transform = newTransform.replace(/\s+/g, ' ').trim();
}

const mp4boxSource = `
var Log = function() {
	var i = new Date,
	r = 4;
	return {
		setLogLevel: function(t) {
			r = t == this.debug ? 1 : t == this.info ? 2 : t == this.warn ? 3 : (this.error, 4)
		},
		debug: function(t, e) {
			void 0 === console.debug && (console.debug = console.log),
			r <= 1 && console.debug("[" + Log.getDurationString(new Date - i, 1e3) + "]", "[" + t + "]", e)
		},
		log: function(t, e) {
			this.debug(t.msg)
		},
		info: function(t, e) {
			r <= 2 && console.info("[" + Log.getDurationString(new Date - i, 1e3) + "]", "[" + t + "]", e)
		},
		warn: function(t, e) {
			r <= 3 && console.warn("[" + Log.getDurationString(new Date - i, 1e3) + "]", "[" + t + "]", e)
		},
		error: function(t, e) {
			r <= 4 && console.error("[" + Log.getDurationString(new Date - i, 1e3) + "]", "[" + t + "]", e)
		}
	}
} ();
Log.getDurationString = function(t, e) {
	var i;
	function r(t, e) {
		for (var i = ("" + t).split("."); i[0].length < e;) i[0] = "0" + i[0];
		return i.join(".")
	}
	t < 0 ? (i = !0, t = -t) : i = !1;
	var s = t / (e || 1),
	a = Math.floor(s / 3600);
	s -= 3600 * a;
	t = Math.floor(s / 60),
	e = 1e3 * (s -= 60 * t);
	return e -= 1e3 * (s = Math.floor(s)),
	e = Math.floor(e),
	(i ? "-": "") + a + ":" + r(t, 2) + ":" + r(s, 2) + "." + r(e, 3)
},
Log.printRanges = function(t) {
	var e = t.length;
	if (0 < e) {
		for (var i = "",
		r = 0; r < e; r++) 0 < r && (i += ","),
		i += "[" + Log.getDurationString(t.start(r)) + "," + Log.getDurationString(t.end(r)) + "]";
		return i
	}
	return "(empty)"
},
"undefined" != typeof exports && (exports.Log = Log);
var MP4BoxStream = function(t) {
	if (! (t instanceof ArrayBuffer)) throw "Needs an array buffer";
	this.buffer = t,
	this.dataview = new DataView(t),
	this.position = 0
};
MP4BoxStream.prototype.getPosition = function() {
	return this.position
},
MP4BoxStream.prototype.getEndPosition = function() {
	return this.buffer.byteLength
},
MP4BoxStream.prototype.getLength = function() {
	return this.buffer.byteLength
},
MP4BoxStream.prototype.seek = function(t) {
	t = Math.max(0, Math.min(this.buffer.byteLength, t));
	return this.position = isNaN(t) || !isFinite(t) ? 0 : t,
	!0
},
MP4BoxStream.prototype.isEos = function() {
	return this.getPosition() >= this.getEndPosition()
},
MP4BoxStream.prototype.readAnyInt = function(t, e) {
	var i = 0;
	if (this.position + t <= this.buffer.byteLength) {
		switch (t) {
		case 1:
			i = e ? this.dataview.getInt8(this.position) : this.dataview.getUint8(this.position);
			break;
		case 2:
			i = e ? this.dataview.getInt16(this.position) : this.dataview.getUint16(this.position);
			break;
		case 3:
			if (e) throw "No method for reading signed 24 bits values";
			i = this.dataview.getUint8(this.position) << 16,
			i |= this.dataview.getUint8(this.position + 1) << 8,
			i |= this.dataview.getUint8(this.position + 2);
			break;
		case 4:
			i = e ? this.dataview.getInt32(this.position) : this.dataview.getUint32(this.position);
			break;
		case 8:
			if (e) throw "No method for reading signed 64 bits values";
			i = this.dataview.getUint32(this.position) << 32,
			i |= this.dataview.getUint32(this.position + 4);
			break;
		default:
			throw "readInt method not implemented for size: " + t
		}
		return this.position += t,
		i
	}
	throw "Not enough bytes in buffer"
},
MP4BoxStream.prototype.readUint8 = function() {
	return this.readAnyInt(1, !1)
},
MP4BoxStream.prototype.readUint16 = function() {
	return this.readAnyInt(2, !1)
},
MP4BoxStream.prototype.readUint24 = function() {
	return this.readAnyInt(3, !1)
},
MP4BoxStream.prototype.readUint32 = function() {
	return this.readAnyInt(4, !1)
},
MP4BoxStream.prototype.readUint64 = function() {
	return this.readAnyInt(8, !1)
},
MP4BoxStream.prototype.readString = function(t) {
	if (this.position + t <= this.buffer.byteLength) {
		for (var e = "",
		i = 0; i < t; i++) e += String.fromCharCode(this.readUint8());
		return e
	}
	throw "Not enough bytes in buffer"
},
MP4BoxStream.prototype.readCString = function() {
	for (var t = [];;) {
		var e = this.readUint8();
		if (0 === e) break;
		t.push(e)
	}
	return String.fromCharCode.apply(null, t)
},
MP4BoxStream.prototype.readInt8 = function() {
	return this.readAnyInt(1, !0)
},
MP4BoxStream.prototype.readInt16 = function() {
	return this.readAnyInt(2, !0)
},
MP4BoxStream.prototype.readInt32 = function() {
	return this.readAnyInt(4, !0)
},
MP4BoxStream.prototype.readInt64 = function() {
	return this.readAnyInt(8, !1)
},
MP4BoxStream.prototype.readUint8Array = function(t) {
	for (var e = new Uint8Array(t), i = 0; i < t; i++) e[i] = this.readUint8();
	return e
},
MP4BoxStream.prototype.readInt16Array = function(t) {
	for (var e = new Int16Array(t), i = 0; i < t; i++) e[i] = this.readInt16();
	return e
},
MP4BoxStream.prototype.readUint16Array = function(t) {
	for (var e = new Int16Array(t), i = 0; i < t; i++) e[i] = this.readUint16();
	return e
},
MP4BoxStream.prototype.readUint32Array = function(t) {
	for (var e = new Uint32Array(t), i = 0; i < t; i++) e[i] = this.readUint32();
	return e
},
MP4BoxStream.prototype.readInt32Array = function(t) {
	for (var e = new Int32Array(t), i = 0; i < t; i++) e[i] = this.readInt32();
	return e
},
"undefined" != typeof exports && (exports.MP4BoxStream = MP4BoxStream);
var DataStream = function(t, e, i) {
	this._byteOffset = e || 0,
	t instanceof ArrayBuffer ? this.buffer = t: "object" == typeof t ? (this.dataView = t, e && (this._byteOffset += e)) : this.buffer = new ArrayBuffer(t || 0),
	this.position = 0,
	this.endianness = null == i ? DataStream.LITTLE_ENDIAN: i
};
DataStream.prototype = {},
DataStream.prototype.getPosition = function() {
	return this.position
},
DataStream.prototype._realloc = function(t) {
	if (this._dynamicSize) {
		var e = this._byteOffset + this.position + t,
		i = this._buffer.byteLength;
		if (e <= i) e > this._byteLength && (this._byteLength = e);
		else {
			for (i < 1 && (i = 1); i < e;) i *= 2;
			var r = new ArrayBuffer(i),
			t = new Uint8Array(this._buffer);
			new Uint8Array(r, 0, t.length).set(t),
			this.buffer = r,
			this._byteLength = e
		}
	}
},
DataStream.prototype._trimAlloc = function() {
	var t, e, i;
	this._byteLength != this._buffer.byteLength && (t = new ArrayBuffer(this._byteLength), e = new Uint8Array(t), i = new Uint8Array(this._buffer, 0, e.length), e.set(i), this.buffer = t)
},
DataStream.BIG_ENDIAN = !1,
DataStream.LITTLE_ENDIAN = !0,
DataStream.prototype._byteLength = 0,
Object.defineProperty(DataStream.prototype, "byteLength", {
	get: function() {
		return this._byteLength - this._byteOffset
	}
}),
Object.defineProperty(DataStream.prototype, "buffer", {
	get: function() {
		return this._trimAlloc(),
		this._buffer
	},
	set: function(t) {
		this._buffer = t,
		this._dataView = new DataView(this._buffer, this._byteOffset),
		this._byteLength = this._buffer.byteLength
	}
}),
Object.defineProperty(DataStream.prototype, "byteOffset", {
	get: function() {
		return this._byteOffset
	},
	set: function(t) {
		this._byteOffset = t,
		this._dataView = new DataView(this._buffer, this._byteOffset),
		this._byteLength = this._buffer.byteLength
	}
}),
Object.defineProperty(DataStream.prototype, "dataView", {
	get: function() {
		return this._dataView
	},
	set: function(t) {
		this._byteOffset = t.byteOffset,
		this._buffer = t.buffer,
		this._dataView = new DataView(this._buffer, this._byteOffset),
		this._byteLength = this._byteOffset + t.byteLength
	}
}),
DataStream.prototype.seek = function(t) {
	t = Math.max(0, Math.min(this.byteLength, t));
	this.position = isNaN(t) || !isFinite(t) ? 0 : t
},
DataStream.prototype.isEof = function() {
	return this.position >= this._byteLength
},
DataStream.prototype.mapUint8Array = function(t) {
	this._realloc( + t);
	var e = new Uint8Array(this._buffer, this.byteOffset + this.position, t);
	return this.position += +t,
	e
},
DataStream.prototype.readInt32Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 4 : t;
	var i = new Int32Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readInt16Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 2 : t;
	var i = new Int16Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readInt8Array = function(t) {
	t = null == t ? this.byteLength - this.position: t;
	var e = new Int8Array(t);
	return DataStream.memcpy(e.buffer, 0, this.buffer, this.byteOffset + this.position, t * e.BYTES_PER_ELEMENT),
	this.position += e.byteLength,
	e
},
DataStream.prototype.readUint32Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 4 : t;
	var i = new Uint32Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readUint16Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 2 : t;
	var i = new Uint16Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readUint8Array = function(t) {
	t = null == t ? this.byteLength - this.position: t;
	var e = new Uint8Array(t);
	return DataStream.memcpy(e.buffer, 0, this.buffer, this.byteOffset + this.position, t * e.BYTES_PER_ELEMENT),
	this.position += e.byteLength,
	e
},
DataStream.prototype.readFloat64Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 8 : t;
	var i = new Float64Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readFloat32Array = function(t, e) {
	t = null == t ? this.byteLength - this.position / 4 : t;
	var i = new Float32Array(t);
	return DataStream.memcpy(i.buffer, 0, this.buffer, this.byteOffset + this.position, t * i.BYTES_PER_ELEMENT),
	DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += i.byteLength,
	i
},
DataStream.prototype.readInt32 = function(t) {
	t = this._dataView.getInt32(this.position, null == t ? this.endianness: t);
	return this.position += 4,
	t
},
DataStream.prototype.readInt16 = function(t) {
	t = this._dataView.getInt16(this.position, null == t ? this.endianness: t);
	return this.position += 2,
	t
},
DataStream.prototype.readInt8 = function() {
	var t = this._dataView.getInt8(this.position);
	return this.position += 1,
	t
},
DataStream.prototype.readUint32 = function(t) {
	t = this._dataView.getUint32(this.position, null == t ? this.endianness: t);
	return this.position += 4,
	t
},
DataStream.prototype.readUint16 = function(t) {
	t = this._dataView.getUint16(this.position, null == t ? this.endianness: t);
	return this.position += 2,
	t
},
DataStream.prototype.readUint8 = function() {
	var t = this._dataView.getUint8(this.position);
	return this.position += 1,
	t
},
DataStream.prototype.readFloat32 = function(t) {
	t = this._dataView.getFloat32(this.position, null == t ? this.endianness: t);
	return this.position += 4,
	t
},
DataStream.prototype.readFloat64 = function(t) {
	t = this._dataView.getFloat64(this.position, null == t ? this.endianness: t);
	return this.position += 8,
	t
},
DataStream.endianness = 0 < new Int8Array(new Int16Array([1]).buffer)[0],
DataStream.memcpy = function(t, e, i, r, s) {
	e = new Uint8Array(t, e, s),
	s = new Uint8Array(i, r, s);
	e.set(s)
},
DataStream.arrayToNative = function(t, e) {
	return e == this.endianness ? t: this.flipArrayEndianness(t)
},
DataStream.nativeToEndian = function(t, e) {
	return this.endianness == e ? t: this.flipArrayEndianness(t)
},
DataStream.flipArrayEndianness = function(t) {
	for (var e = new Uint8Array(t.buffer, t.byteOffset, t.byteLength), i = 0; i < t.byteLength; i += t.BYTES_PER_ELEMENT) for (var r = i + t.BYTES_PER_ELEMENT - 1,
	s = i; s < r; r--, s++) {
		var a = e[s];
		e[s] = e[r],
		e[r] = a
	}
	return t
},
DataStream.prototype.failurePosition = 0,
String.fromCharCodeUint8 = function(t) {
	for (var e = [], i = 0; i < t.length; i++) e[i] = t[i];
	return String.fromCharCode.apply(null, e)
},
DataStream.prototype.readString = function(t, e) {
	return null == e || "ASCII" == e ? String.fromCharCodeUint8.apply(null, [this.mapUint8Array(null == t ? this.byteLength - this.position: t)]) : new TextDecoder(e).decode(this.mapUint8Array(t))
},
DataStream.prototype.readCString = function(t) {
	var e = this.byteLength - this.position,
	i = new Uint8Array(this._buffer, this._byteOffset + this.position),
	r = e;
	null != t && (r = Math.min(t, e));
	for (var s = 0; s < r && 0 !== i[s]; s++);
	var a = String.fromCharCodeUint8.apply(null, [this.mapUint8Array(s)]);
	return null != t ? this.position += r - s: s != e && (this.position += 1),
	a
};
var MAX_SIZE = Math.pow(2, 32);
DataStream.prototype.readInt64 = function() {
	return this.readInt32() * MAX_SIZE + this.readUint32()
},
DataStream.prototype.readUint64 = function() {
	return this.readUint32() * MAX_SIZE + this.readUint32()
},
DataStream.prototype.readInt64 = function() {
	return this.readUint32() * MAX_SIZE + this.readUint32()
},
DataStream.prototype.readUint24 = function() {
	return (this.readUint8() << 16) + (this.readUint8() << 8) + this.readUint8()
},
"undefined" != typeof exports && (exports.DataStream = DataStream),
DataStream.prototype.save = function(t) {
	var e = new Blob([this.buffer]);
	if (!window.URL || !URL.createObjectURL) throw "DataStream.save: Can't create object URL.";
	var i = __createObjectURL(e),
	e = document.createElement("a");
	document.body.appendChild(e),
	e.setAttribute("href", i),
	e.setAttribute("download", t),
	e.setAttribute("target", "_self"),
	e.click(),
	__revokeObjectURL(i)
},
DataStream.prototype._dynamicSize = !0,
Object.defineProperty(DataStream.prototype, "dynamicSize", {
	get: function() {
		return this._dynamicSize
	},
	set: function(t) {
		t || this._trimAlloc(),
		this._dynamicSize = t
	}
}),
DataStream.prototype.shift = function(t) {
	var e = new ArrayBuffer(this._byteLength - t),
	i = new Uint8Array(e),
	r = new Uint8Array(this._buffer, t, i.length);
	i.set(r),
	this.buffer = e,
	this.position -= t
},
DataStream.prototype.writeInt32Array = function(t, e) {
	if (this._realloc(4 * t.length), t instanceof Int32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapInt32Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeInt32(t[i], e)
},
DataStream.prototype.writeInt16Array = function(t, e) {
	if (this._realloc(2 * t.length), t instanceof Int16Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapInt16Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeInt16(t[i], e)
},
DataStream.prototype.writeInt8Array = function(t) {
	if (this._realloc( + t.length), t instanceof Int8Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapInt8Array(t.length);
	else for (var e = 0; e < t.length; e++) this.writeInt8(t[e])
},
DataStream.prototype.writeUint32Array = function(t, e) {
	if (this._realloc(4 * t.length), t instanceof Uint32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapUint32Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeUint32(t[i], e)
},
DataStream.prototype.writeUint16Array = function(t, e) {
	if (this._realloc(2 * t.length), t instanceof Uint16Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapUint16Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeUint16(t[i], e)
},
DataStream.prototype.writeUint8Array = function(t) {
	if (this._realloc( + t.length), t instanceof Uint8Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapUint8Array(t.length);
	else for (var e = 0; e < t.length; e++) this.writeUint8(t[e])
},
DataStream.prototype.writeFloat64Array = function(t, e) {
	if (this._realloc(8 * t.length), t instanceof Float64Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapFloat64Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeFloat64(t[i], e)
},
DataStream.prototype.writeFloat32Array = function(t, e) {
	if (this._realloc(4 * t.length), t instanceof Float32Array && this.byteOffset + this.position % t.BYTES_PER_ELEMENT === 0) DataStream.memcpy(this._buffer, this.byteOffset + this.position, t.buffer, 0, t.byteLength),
	this.mapFloat32Array(t.length, e);
	else for (var i = 0; i < t.length; i++) this.writeFloat32(t[i], e)
},
DataStream.prototype.writeInt32 = function(t, e) {
	this._realloc(4),
	this._dataView.setInt32(this.position, t, null == e ? this.endianness: e),
	this.position += 4
},
DataStream.prototype.writeInt16 = function(t, e) {
	this._realloc(2),
	this._dataView.setInt16(this.position, t, null == e ? this.endianness: e),
	this.position += 2
},
DataStream.prototype.writeInt8 = function(t) {
	this._realloc(1),
	this._dataView.setInt8(this.position, t),
	this.position += 1
},
DataStream.prototype.writeUint32 = function(t, e) {
	this._realloc(4),
	this._dataView.setUint32(this.position, t, null == e ? this.endianness: e),
	this.position += 4
},
DataStream.prototype.writeUint16 = function(t, e) {
	this._realloc(2),
	this._dataView.setUint16(this.position, t, null == e ? this.endianness: e),
	this.position += 2
},
DataStream.prototype.writeUint8 = function(t) {
	this._realloc(1),
	this._dataView.setUint8(this.position, t),
	this.position += 1
},
DataStream.prototype.writeFloat32 = function(t, e) {
	this._realloc(4),
	this._dataView.setFloat32(this.position, t, null == e ? this.endianness: e),
	this.position += 4
},
DataStream.prototype.writeFloat64 = function(t, e) {
	this._realloc(8),
	this._dataView.setFloat64(this.position, t, null == e ? this.endianness: e),
	this.position += 8
},
DataStream.prototype.writeUCS2String = function(t, e, i) {
	null == i && (i = t.length);
	for (var r = 0; r < t.length && r < i; r++) this.writeUint16(t.charCodeAt(r), e);
	for (; r < i; r++) this.writeUint16(0)
},
DataStream.prototype.writeString = function(t, e, i) {
	var r = 0;
	if (null == e || "ASCII" == e) if (null != i) {
		for (var s = Math.min(t.length, i), r = 0; r < s; r++) this.writeUint8(t.charCodeAt(r));
		for (; r < i; r++) this.writeUint8(0)
	} else for (r = 0; r < t.length; r++) this.writeUint8(t.charCodeAt(r));
	else this.writeUint8Array(new TextEncoder(e).encode(t.substring(0, i)))
},
DataStream.prototype.writeCString = function(t, e) {
	var i = 0;
	if (null != e) {
		for (var r = Math.min(t.length, e), i = 0; i < r; i++) this.writeUint8(t.charCodeAt(i));
		for (; i < e; i++) this.writeUint8(0)
	} else {
		for (i = 0; i < t.length; i++) this.writeUint8(t.charCodeAt(i));
		this.writeUint8(0)
	}
},
DataStream.prototype.writeStruct = function(t, e) {
	for (var i = 0; i < t.length; i += 2) {
		var r = t[i + 1];
		this.writeType(r, e[t[i]], e)
	}
},
DataStream.prototype.writeType = function(t, e, i) {
	var r;
	if ("function" == typeof t) return t(this, e);
	if ("object" == typeof t && !(t instanceof Array)) return t.set(this, e, i);
	var s = null,
	a = "ASCII",
	i = this.position;
	switch ("string" == typeof t && /:/.test(t) && (t = (r = t.split(":"))[0], s = parseInt(r[1])), "string" == typeof t && /,/.test(t) && (t = (r = t.split(","))[0], a = parseInt(r[1])), t) {
	case "uint8":
		this.writeUint8(e);
		break;
	case "int8":
		this.writeInt8(e);
		break;
	case "uint16":
		this.writeUint16(e, this.endianness);
		break;
	case "int16":
		this.writeInt16(e, this.endianness);
		break;
	case "uint32":
		this.writeUint32(e, this.endianness);
		break;
	case "int32":
		this.writeInt32(e, this.endianness);
		break;
	case "float32":
		this.writeFloat32(e, this.endianness);
		break;
	case "float64":
		this.writeFloat64(e, this.endianness);
		break;
	case "uint16be":
		this.writeUint16(e, DataStream.BIG_ENDIAN);
		break;
	case "int16be":
		this.writeInt16(e, DataStream.BIG_ENDIAN);
		break;
	case "uint32be":
		this.writeUint32(e, DataStream.BIG_ENDIAN);
		break;
	case "int32be":
		this.writeInt32(e, DataStream.BIG_ENDIAN);
		break;
	case "float32be":
		this.writeFloat32(e, DataStream.BIG_ENDIAN);
		break;
	case "float64be":
		this.writeFloat64(e, DataStream.BIG_ENDIAN);
		break;
	case "uint16le":
		this.writeUint16(e, DataStream.LITTLE_ENDIAN);
		break;
	case "int16le":
		this.writeInt16(e, DataStream.LITTLE_ENDIAN);
		break;
	case "uint32le":
		this.writeUint32(e, DataStream.LITTLE_ENDIAN);
		break;
	case "int32le":
		this.writeInt32(e, DataStream.LITTLE_ENDIAN);
		break;
	case "float32le":
		this.writeFloat32(e, DataStream.LITTLE_ENDIAN);
		break;
	case "float64le":
		this.writeFloat64(e, DataStream.LITTLE_ENDIAN);
		break;
	case "cstring":
		this.writeCString(e, s);
		break;
	case "string":
		this.writeString(e, a, s);
		break;
	case "u16string":
		this.writeUCS2String(e, this.endianness, s);
		break;
	case "u16stringle":
		this.writeUCS2String(e, DataStream.LITTLE_ENDIAN, s);
		break;
	case "u16stringbe":
		this.writeUCS2String(e, DataStream.BIG_ENDIAN, s);
		break;
	default:
		if (3 == t.length) {
			for (var n = t[1], o = 0; o < e.length; o++) this.writeType(n, e[o]);
			break
		}
		this.writeStruct(t, e)
	}
	null != s && (this.position = i, this._realloc(s), this.position = i + s)
},
DataStream.prototype.writeUint64 = function(t) {
	var e = Math.floor(t / MAX_SIZE);
	this.writeUint32(e),
	this.writeUint32(4294967295 & t)
},
DataStream.prototype.writeUint24 = function(t) {
	this.writeUint8((16711680 & t) >> 16),
	this.writeUint8((65280 & t) >> 8),
	this.writeUint8(255 & t)
},
DataStream.prototype.adjustUint32 = function(t, e) {
	var i = this.position;
	this.seek(t),
	this.writeUint32(e),
	this.seek(i)
},
DataStream.prototype.mapInt32Array = function(t, e) {
	this._realloc(4 * t);
	var i = new Int32Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 4 * t,
	i
},
DataStream.prototype.mapInt16Array = function(t, e) {
	this._realloc(2 * t);
	var i = new Int16Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 2 * t,
	i
},
DataStream.prototype.mapInt8Array = function(t) {
	this._realloc( + t);
	var e = new Int8Array(this._buffer, this.byteOffset + this.position, t);
	return this.position += +t,
	e
},
DataStream.prototype.mapUint32Array = function(t, e) {
	this._realloc(4 * t);
	var i = new Uint32Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 4 * t,
	i
},
DataStream.prototype.mapUint16Array = function(t, e) {
	this._realloc(2 * t);
	var i = new Uint16Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 2 * t,
	i
},
DataStream.prototype.mapFloat64Array = function(t, e) {
	this._realloc(8 * t);
	var i = new Float64Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 8 * t,
	i
},
DataStream.prototype.mapFloat32Array = function(t, e) {
	this._realloc(4 * t);
	var i = new Float32Array(this._buffer, this.byteOffset + this.position, t);
	return DataStream.arrayToNative(i, null == e ? this.endianness: e),
	this.position += 4 * t,
	i
};
var MultiBufferStream = function(t) {
	this.buffers = [],
	this.bufferIndex = -1,
	t && (this.insertBuffer(t), this.bufferIndex = 0)
};
MultiBufferStream.prototype = new DataStream(new ArrayBuffer, 0, DataStream.BIG_ENDIAN),
MultiBufferStream.prototype.initialized = function() {
	var t;
	return - 1 < this.bufferIndex || (0 < this.buffers.length ? 0 === (t = this.buffers[0]).fileStart ? (this.buffer = t, this.bufferIndex = 0, Log.debug("MultiBufferStream", "Stream ready for parsing"), !0) : (Log.warn("MultiBufferStream", "The first buffer should have a fileStart of 0"), this.logBufferLevel(), !1) : (Log.warn("MultiBufferStream", "No buffer to start parsing from"), this.logBufferLevel(), !1))
},
ArrayBuffer.concat = function(t, e) {
	Log.debug("ArrayBuffer", "Trying to create a new buffer of size: " + (t.byteLength + e.byteLength));
	var i = new Uint8Array(t.byteLength + e.byteLength);
	return i.set(new Uint8Array(t), 0),
	i.set(new Uint8Array(e), t.byteLength),
	i.buffer
},
MultiBufferStream.prototype.reduceBuffer = function(t, e, i) {
	var r = new Uint8Array(i);
	return r.set(new Uint8Array(t, e, i)),
	r.buffer.fileStart = t.fileStart + e,
	r.buffer.usedBytes = 0,
	r.buffer
},
MultiBufferStream.prototype.insertBuffer = function(t) {
	for (var e = !0,
	i = 0; i < this.buffers.length; i++) {
		var r = this.buffers[i];
		if (t.fileStart <= r.fileStart) {
			if (t.fileStart === r.fileStart) {
				if (t.byteLength > r.byteLength) {
					this.buffers.splice(i, 1),
					i--;
					continue
				}
				Log.warn("MultiBufferStream", "Buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ") already appended, ignoring")
			} else t.fileStart + t.byteLength <= r.fileStart || (t = this.reduceBuffer(t, 0, r.fileStart - t.fileStart)),
			Log.debug("MultiBufferStream", "Appending new buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ")"),
			this.buffers.splice(i, 0, t),
			0 === i && (this.buffer = t);
			e = !1;
			break
		}
		if (t.fileStart < r.fileStart + r.byteLength) {
			var s = r.fileStart + r.byteLength - t.fileStart,
			r = t.byteLength - s;
			if (! (0 < r)) {
				e = !1;
				break
			}
			t = this.reduceBuffer(t, s, r)
		}
	}
	e && (Log.debug("MultiBufferStream", "Appending new buffer (fileStart: " + t.fileStart + " - Length: " + t.byteLength + ")"), this.buffers.push(t), 0 === i && (this.buffer = t))
},
MultiBufferStream.prototype.logBufferLevel = function(t) {
	for (var e, i, r = [], s = "", a = 0, n = 0, o = 0; o < this.buffers.length; o++) e = this.buffers[o],
	0 === o ? (i = {},
	r.push(i), i.start = e.fileStart, i.end = e.fileStart + e.byteLength, s += "[" + i.start + "-") : i.end === e.fileStart ? i.end = e.fileStart + e.byteLength: ((i = {}).start = e.fileStart, s += r[r.length - 1].end - 1 + "], [" + i.start + "-", i.end = e.fileStart + e.byteLength, r.push(i)),
	a += e.usedBytes,
	n += e.byteLength;
	0 < r.length && (s += i.end - 1 + "]");
	t = t ? Log.info: Log.debug;
	0 === this.buffers.length ? t("MultiBufferStream", "No more buffer in memory") : t("MultiBufferStream", this.buffers.length + " stored buffer(s) (" + a + "/" + n + " bytes), continuous ranges: " + s)
},
MultiBufferStream.prototype.cleanBuffers = function() {
	for (var t, e = 0; e < this.buffers.length; e++)(t = this.buffers[e]).usedBytes === t.byteLength && (Log.debug("MultiBufferStream", "Removing buffer #" + e), this.buffers.splice(e, 1), e--)
},
MultiBufferStream.prototype.mergeNextBuffer = function() {
	var t;
	if (this.bufferIndex + 1 < this.buffers.length) {
		if ((t = this.buffers[this.bufferIndex + 1]).fileStart !== this.buffer.fileStart + this.buffer.byteLength) return ! 1;
		var e = this.buffer.byteLength,
		i = this.buffer.usedBytes,
		r = this.buffer.fileStart;
		return this.buffers[this.bufferIndex] = ArrayBuffer.concat(this.buffer, t),
		this.buffer = this.buffers[this.bufferIndex],
		this.buffers.splice(this.bufferIndex + 1, 1),
		this.buffer.usedBytes = i,
		this.buffer.fileStart = r,
		Log.debug("ISOFile", "Concatenating buffer for box parsing (length: " + e + "->" + this.buffer.byteLength + ")"),
		!0
	}
	return ! 1
},
MultiBufferStream.prototype.findPosition = function(t, e, i) {
	for (var r = null,
	s = -1,
	a = !0 === t ? 0 : this.bufferIndex; a < this.buffers.length && (r = this.buffers[a]).fileStart <= e;) s = a,
	i && (r.fileStart + r.byteLength <= e ? r.usedBytes = r.byteLength: r.usedBytes = e - r.fileStart, this.logBufferLevel()),
	a++;
	return - 1 !== s && (r = this.buffers[s]).fileStart + r.byteLength >= e ? (Log.debug("MultiBufferStream", "Found position in existing buffer #" + s), s) : -1
},
MultiBufferStream.prototype.findEndContiguousBuf = function(t) {
	var e, i, t = void 0 !== t ? t: this.bufferIndex,
	r = this.buffers[t];
	if (this.buffers.length > t + 1) for (e = t + 1; e < this.buffers.length && (i = this.buffers[e]).fileStart === r.fileStart + r.byteLength; e++) r = i;
	return r.fileStart + r.byteLength
},
MultiBufferStream.prototype.getEndFilePositionAfter = function(t) {
	var e = this.findPosition(!0, t, !1);
	return - 1 !== e ? this.findEndContiguousBuf(e) : t
},
MultiBufferStream.prototype.addUsedBytes = function(t) {
	this.buffer.usedBytes += t,
	this.logBufferLevel()
},
MultiBufferStream.prototype.setAllUsedBytes = function() {
	this.buffer.usedBytes = this.buffer.byteLength,
	this.logBufferLevel()
},
MultiBufferStream.prototype.seek = function(t, e, i) {
	i = this.findPosition(e, t, i);
	return - 1 !== i ? (this.buffer = this.buffers[i], this.bufferIndex = i, this.position = t - this.buffer.fileStart, Log.debug("MultiBufferStream", "Repositioning parser at buffer position: " + this.position), !0) : (Log.debug("MultiBufferStream", "Position " + t + " not found in buffered data"), !1)
},
MultiBufferStream.prototype.getPosition = function() {
	if (-1 === this.bufferIndex || null === this.buffers[this.bufferIndex]) throw "Error accessing position in the MultiBufferStream";
	return this.buffers[this.bufferIndex].fileStart + this.position
},
MultiBufferStream.prototype.getLength = function() {
	return this.byteLength
},
MultiBufferStream.prototype.getEndPosition = function() {
	if (-1 === this.bufferIndex || null === this.buffers[this.bufferIndex]) throw "Error accessing position in the MultiBufferStream";
	return this.buffers[this.bufferIndex].fileStart + this.byteLength
},
"undefined" != typeof exports && (exports.MultiBufferStream = MultiBufferStream);
var MPEG4DescriptorParser = function() {
	var s = [];
	s[3] = "ES_Descriptor",
	s[4] = "DecoderConfigDescriptor",
	s[5] = "DecoderSpecificInfo",
	s[6] = "SLConfigDescriptor",
	this.getDescriptorName = function(t) {
		return s[t]
	};
	var r = this,
	a = {};
	return this.parseOneDescriptor = function(t) {
		var e, i = 0,
		r = t.readUint8();
		for (e = t.readUint8(), 0; 128 & e;) i = (i << 7) + (127 & e),
		e = t.readUint8(),
		0;
		return i = (i << 7) + (127 & e),
		Log.debug("MPEG4DescriptorParser", "Found " + (s[r] || "Descriptor " + r) + ", size " + i + " at position " + t.getPosition()),
		(r = new(s[r] ? a[s[r]] : a.Descriptor)(i)).parse(t),
		r
	},
	a.Descriptor = function(t, e) {
		this.tag = t,
		this.size = e,
		this.descs = []
	},
	a.Descriptor.prototype.parse = function(t) {
		this.data = t.readUint8Array(this.size)
	},
	a.Descriptor.prototype.findDescriptor = function(t) {
		for (var e = 0; e < this.descs.length; e++) if (this.descs[e].tag == t) return this.descs[e];
		return null
	},
	a.Descriptor.prototype.parseRemainingDescriptors = function(t) {
		for (var e = t.position; t.position < e + this.size;) {
			var i = r.parseOneDescriptor(t);
			this.descs.push(i)
		}
	},
	a.ES_Descriptor = function(t) {
		a.Descriptor.call(this, 3, t)
	},
	a.ES_Descriptor.prototype = new a.Descriptor,
	a.ES_Descriptor.prototype.parse = function(t) {
		var e;
		this.ES_ID = t.readUint16(),
		this.flags = t.readUint8(),
		this.size -= 3,
		128 & this.flags ? (this.dependsOn_ES_ID = t.readUint16(), this.size -= 2) : this.dependsOn_ES_ID = 0,
		64 & this.flags ? (e = t.readUint8(), this.URL = t.readString(e), this.size -= e + 1) : this.URL = "",
		32 & this.flags ? (this.OCR_ES_ID = t.readUint16(), this.size -= 2) : this.OCR_ES_ID = 0,
		this.parseRemainingDescriptors(t)
	},
	a.ES_Descriptor.prototype.getOTI = function(t) {
		var e = this.findDescriptor(4);
		return e ? e.oti: 0
	},
	a.ES_Descriptor.prototype.getAudioConfig = function(t) {
		var e = this.findDescriptor(4);
		if (!e) return null;
		var i = e.findDescriptor(5);
		if (i && i.data) {
			e = (248 & i.data[0]) >> 3;
			return 31 === e && 2 <= i.data.length && (e = 32 + ((7 & i.data[0]) << 3) + ((224 & i.data[1]) >> 5)),
			e
		}
		return null
	},
	a.DecoderConfigDescriptor = function(t) {
		a.Descriptor.call(this, 4, t)
	},
	a.DecoderConfigDescriptor.prototype = new a.Descriptor,
	a.DecoderConfigDescriptor.prototype.parse = function(t) {
		this.oti = t.readUint8(),
		this.streamType = t.readUint8(),
		this.upStream = 0 != (this.streamType >> 1 & 1),
		this.streamType = this.streamType >>> 2,
		this.bufferSize = t.readUint24(),
		this.maxBitrate = t.readUint32(),
		this.avgBitrate = t.readUint32(),
		this.size -= 13,
		this.parseRemainingDescriptors(t)
	},
	a.DecoderSpecificInfo = function(t) {
		a.Descriptor.call(this, 5, t)
	},
	a.DecoderSpecificInfo.prototype = new a.Descriptor,
	a.SLConfigDescriptor = function(t) {
		a.Descriptor.call(this, 6, t)
	},
	a.SLConfigDescriptor.prototype = new a.Descriptor,
	this
};
"undefined" != typeof exports && (exports.MPEG4DescriptorParser = MPEG4DescriptorParser);
var BoxParser = {
	ERR_INVALID_DATA: -1,
	ERR_NOT_ENOUGH_DATA: 0,
	OK: 1,
	BASIC_BOXES: [{
		type: "mdat",
		name: "MediaDataBox"
	},
	{
		type: "idat",
		name: "ItemDataBox"
	},
	{
		type: "free",
		name: "FreeSpaceBox"
	},
	{
		type: "skip",
		name: "FreeSpaceBox"
	},
	{
		type: "meco",
		name: "AdditionalMetadataContainerBox"
	},
	{
		type: "strk",
		name: "SubTrackBox"
	}],
	FULL_BOXES: [{
		type: "hmhd",
		name: "HintMediaHeaderBox"
	},
	{
		type: "nmhd",
		name: "NullMediaHeaderBox"
	},
	{
		type: "iods",
		name: "ObjectDescriptorBox"
	},
	{
		type: "xml ",
		name: "XMLBox"
	},
	{
		type: "bxml",
		name: "BinaryXMLBox"
	},
	{
		type: "ipro",
		name: "ItemProtectionBox"
	},
	{
		type: "mere",
		name: "MetaboxRelationBox"
	}],
	CONTAINER_BOXES: [[{
		type: "moov",
		name: "CompressedMovieBox"
	},
	["trak", "pssh"]], [{
		type: "trak",
		name: "TrackBox"
	}], [{
		type: "edts",
		name: "EditBox"
	}], [{
		type: "mdia",
		name: "MediaBox"
	}], [{
		type: "minf",
		name: "MediaInformationBox"
	}], [{
		type: "dinf",
		name: "DataInformationBox"
	}], [{
		type: "stbl",
		name: "SampleTableBox"
	},
	["sgpd", "sbgp"]], [{
		type: "mvex",
		name: "MovieExtendsBox"
	},
	["trex"]], [{
		type: "moof",
		name: "CompressedMovieFragmentBox"
	},
	["traf"]], [{
		type: "traf",
		name: "TrackFragmentBox"
	},
	["trun", "sgpd", "sbgp"]], [{
		type: "vttc",
		name: "VTTCueBox"
	}], [{
		type: "tref",
		name: "TrackReferenceBox"
	}], [{
		type: "iref",
		name: "ItemReferenceBox"
	}], [{
		type: "mfra",
		name: "MovieFragmentRandomAccessBox"
	},
	["tfra"]], [{
		type: "meco",
		name: "AdditionalMetadataContainerBox"
	}], [{
		type: "hnti",
		name: "trackhintinformation"
	}], [{
		type: "hinf",
		name: "hintstatisticsbox"
	}], [{
		type: "strk",
		name: "SubTrackBox"
	}], [{
		type: "strd",
		name: "SubTrackDefinitionBox"
	}], [{
		type: "sinf",
		name: "ProtectionSchemeInfoBox"
	}], [{
		type: "rinf",
		name: "RestrictedSchemeInfoBox"
	}], [{
		type: "schi",
		name: "SchemeInformationBox"
	}], [{
		type: "trgr",
		name: "TrackGroupBox"
	}], [{
		type: "udta",
		name: "UserDataBox"
	},
	["kind"]], [{
		type: "iprp",
		name: "ItemPropertiesBox"
	},
	["ipma"]], [{
		type: "ipco",
		name: "ItemPropertyContainerBox"
	}], [{
		type: "grpl",
		name: "GroupsListBox"
	}], [{
		type: "j2kH",
		name: "J2KHeaderInfoBox"
	}], [{
		type: "etyp",
		name: "ExtendedTypeBox"
	},
	["tyco"]]],
	boxCodes: [],
	fullBoxCodes: [],
	containerBoxCodes: [],
	sampleEntryCodes: {},
	sampleGroupEntryCodes: [],
	trackGroupTypes: [],
	UUIDBoxes: {},
	UUIDs: [],
	initialize: function() {
		BoxParser.FullBox.prototype = new BoxParser.Box,
		BoxParser.ContainerBox.prototype = new BoxParser.Box,
		BoxParser.SampleEntry.prototype = new BoxParser.Box,
		BoxParser.TrackGroupTypeBox.prototype = new BoxParser.FullBox,
		BoxParser.BASIC_BOXES.forEach(function(t) {
			BoxParser.createBoxCtor(t.type, t.name)
		}),
		BoxParser.FULL_BOXES.forEach(function(t) {
			BoxParser.createFullBoxCtor(t.type, t.name)
		}),
		BoxParser.CONTAINER_BOXES.forEach(function(t) {
			BoxParser.createContainerBoxCtor(t[0].type, t[0].name, null, t[1])
		})
	},
	Box: function(t, e, i, r) {
		this.type = t,
		this.box_name = i,
		this.size = e,
		this.uuid = r
	},
	FullBox: function(t, e, i, r) {
		BoxParser.Box.call(this, t, e, i, r),
		this.flags = 0,
		this.version = 0
	},
	ContainerBox: function(t, e, i, r) {
		BoxParser.Box.call(this, t, e, i, r),
		this.boxes = []
	},
	SampleEntry: function(t, e, i, r) {
		BoxParser.ContainerBox.call(this, t, e),
		this.hdr_size = i,
		this.start = r
	},
	SampleGroupEntry: function(t) {
		this.grouping_type = t
	},
	TrackGroupTypeBox: function(t, e) {
		BoxParser.FullBox.call(this, t, e)
	},
	createBoxCtor: function(e, i, t) {
		BoxParser.boxCodes.push(e),
		BoxParser[e + "Box"] = function(t) {
			BoxParser.Box.call(this, e, t, i)
		},
		BoxParser[e + "Box"].prototype = new BoxParser.Box,
		t && (BoxParser[e + "Box"].prototype.parse = t)
	},
	createFullBoxCtor: function(e, i, r) {
		BoxParser[e + "Box"] = function(t) {
			BoxParser.FullBox.call(this, e, t, i)
		},
		BoxParser[e + "Box"].prototype = new BoxParser.FullBox,
		BoxParser[e + "Box"].prototype.parse = function(t) {
			this.parseFullHeader(t),
			r && r.call(this, t)
		}
	},
	addSubBoxArrays: function(t) {
		if (t) for (var e = (this.subBoxNames = t).length, i = 0; i < e; i++) this[t[i] + "s"] = []
	},
	createContainerBoxCtor: function(e, i, t, r) {
		BoxParser[e + "Box"] = function(t) {
			BoxParser.ContainerBox.call(this, e, t, i),
			BoxParser.addSubBoxArrays.call(this, r)
		},
		BoxParser[e + "Box"].prototype = new BoxParser.ContainerBox,
		t && (BoxParser[e + "Box"].prototype.parse = t)
	},
	createMediaSampleEntryCtor: function(t, e, i) {
		BoxParser.sampleEntryCodes[t] = [],
		BoxParser[t + "SampleEntry"] = function(t, e) {
			BoxParser.SampleEntry.call(this, t, e),
			BoxParser.addSubBoxArrays.call(this, i)
		},
		BoxParser[t + "SampleEntry"].prototype = new BoxParser.SampleEntry,
		e && (BoxParser[t + "SampleEntry"].prototype.parse = e)
	},
	createSampleEntryCtor: function(e, i, t, r) {
		BoxParser.sampleEntryCodes[e].push(i),
		BoxParser[i + "SampleEntry"] = function(t) {
			BoxParser[e + "SampleEntry"].call(this, i, t),
			BoxParser.addSubBoxArrays.call(this, r)
		},
		BoxParser[i + "SampleEntry"].prototype = new BoxParser[e + "SampleEntry"],
		t && (BoxParser[i + "SampleEntry"].prototype.parse = t)
	},
	createEncryptedSampleEntryCtor: function(t, e, i) {
		BoxParser.createSampleEntryCtor.call(this, t, e, i, ["sinf"])
	},
	createSampleGroupCtor: function(e, t) {
		BoxParser[e + "SampleGroupEntry"] = function(t) {
			BoxParser.SampleGroupEntry.call(this, e, t)
		},
		BoxParser[e + "SampleGroupEntry"].prototype = new BoxParser.SampleGroupEntry,
		t && (BoxParser[e + "SampleGroupEntry"].prototype.parse = t)
	},
	createTrackGroupCtor: function(e, t) {
		BoxParser[e + "TrackGroupTypeBox"] = function(t) {
			BoxParser.TrackGroupTypeBox.call(this, e, t)
		},
		BoxParser[e + "TrackGroupTypeBox"].prototype = new BoxParser.TrackGroupTypeBox,
		t && (BoxParser[e + "TrackGroupTypeBox"].prototype.parse = t)
	},
	createUUIDBox: function(e, i, r, s, a) {
		BoxParser.UUIDs.push(e),
		BoxParser.UUIDBoxes[e] = function(t) { (r ? BoxParser.FullBox: s ? BoxParser.ContainerBox: BoxParser.Box).call(this, "uuid", t, i, e)
		},
		BoxParser.UUIDBoxes[e].prototype = new(r ? BoxParser.FullBox: s ? BoxParser.ContainerBox: BoxParser.Box),
		a && (BoxParser.UUIDBoxes[e].prototype.parse = r ?
		function(t) {
			this.parseFullHeader(t),
			a && a.call(this, t)
		}: a)
	}
};
function printPS(t) {
	var e = "<table class='inner-table'>";
	e += "<thead><tr><th>length</th><th>nalu_data</th></tr></thead>",
	e += "<tbody>";
	for (var i = 0; i < t.length; i++) {
		var r = t[i];
		e += "<tr>",
		e += "<td>" + r.length + "</td>",
		e += "<td>",
		e += r.nalu.reduce(function(t, e) {
			return t + e.toString(16).padStart(2, "0")
		},
		"0x"),
		e += "</td></tr>"
	}
	return e += "</tbody></table>"
}
function ColorPoint(t, e) {
	this.x = t,
	this.y = e
}
function Pixel(t, e) {
	this.bad_pixel_row = t,
	this.bad_pixel_column = e
}
BoxParser.initialize(),
BoxParser.TKHD_FLAG_ENABLED = 1,
BoxParser.TKHD_FLAG_IN_MOVIE = 2,
BoxParser.TKHD_FLAG_IN_PREVIEW = 4,
BoxParser.TFHD_FLAG_BASE_DATA_OFFSET = 1,
BoxParser.TFHD_FLAG_SAMPLE_DESC = 2,
BoxParser.TFHD_FLAG_SAMPLE_DUR = 8,
BoxParser.TFHD_FLAG_SAMPLE_SIZE = 16,
BoxParser.TFHD_FLAG_SAMPLE_FLAGS = 32,
BoxParser.TFHD_FLAG_DUR_EMPTY = 65536,
BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF = 131072,
BoxParser.TRUN_FLAGS_DATA_OFFSET = 1,
BoxParser.TRUN_FLAGS_FIRST_FLAG = 4,
BoxParser.TRUN_FLAGS_DURATION = 256,
BoxParser.TRUN_FLAGS_SIZE = 512,
BoxParser.TRUN_FLAGS_FLAGS = 1024,
BoxParser.TRUN_FLAGS_CTS_OFFSET = 2048,
BoxParser.Box.prototype.add = function(t) {
	return this.addBox(new BoxParser[t + "Box"])
},
BoxParser.Box.prototype.addBox = function(t) {
	return this.boxes.push(t),
	this[t.type + "s"] ? this[t.type + "s"].push(t) : this[t.type] = t,
	t
},
BoxParser.Box.prototype.set = function(t, e) {
	return this[t] = e,
	this
},
BoxParser.Box.prototype.addEntry = function(t, e) {
	e = e || "entries";
	return this[e] || (this[e] = []),
	this[e].push(t),
	this
},
"undefined" != typeof exports && (exports.BoxParser = BoxParser),
BoxParser.parseUUID = function(t) {
	return BoxParser.parseHex16(t)
},
BoxParser.parseHex16 = function(t) {
	for (var e = "",
	i = 0; i < 16; i++) {
		var r = t.readUint8().toString(16);
		e += 1 === r.length ? "0" + r: r
	}
	return e
},
BoxParser.parseOneBox = function(t, e, i) {
	var r, s, a = t.getPosition(),
	n = 0;
	if (t.getEndPosition() - a < 8) return Log.debug("BoxParser", "Not enough data in stream to parse the type and size of the box"),
	{
		code: BoxParser.ERR_NOT_ENOUGH_DATA
	};
	if (i && i < 8) return Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a new box"),
	{
		code: BoxParser.ERR_NOT_ENOUGH_DATA
	};
	var o = t.readUint32(),
	h = t.readString(4),
	d = h;
	if (Log.debug("BoxParser", "Found box of type '" + h + "' and size " + o + " at position " + a), n = 8, "uuid" == h) {
		if (t.getEndPosition() - t.getPosition() < 16 || i - n < 16) return t.seek(a),
		Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a UUID box"),
		{
			code: BoxParser.ERR_NOT_ENOUGH_DATA
		};
		n += 16,
		d = s = BoxParser.parseUUID(t)
	}
	if (1 == o) {
		if (t.getEndPosition() - t.getPosition() < 8 || i && i - n < 8) return t.seek(a),
		Log.warn("BoxParser", 'Not enough data in stream to parse the extended size of the "' + h + '" box'),
		{
			code: BoxParser.ERR_NOT_ENOUGH_DATA
		};
		o = t.readUint64(),
		n += 8
	} else if (0 === o) if (i) o = i;
	else if ("mdat" !== h) return Log.error("BoxParser", "Unlimited box size not supported for type: '" + h + "'"),
	r = new BoxParser.Box(h, o),
	{
		code: BoxParser.OK,
		box: r,
		size: r.size
	};
	return 0 !== o && o < n ? (Log.error("BoxParser", "Box of type " + h + " has an invalid size " + o + " (too small to be a box)"), {
		code: BoxParser.ERR_NOT_ENOUGH_DATA,
		type: h,
		size: o,
		hdr_size: n,
		start: a
	}) : 0 !== o && i && i < o ? (Log.error("BoxParser", "Box of type '" + h + "' has a size " + o + " greater than its container size " + i), {
		code: BoxParser.ERR_NOT_ENOUGH_DATA,
		type: h,
		size: o,
		hdr_size: n,
		start: a
	}) : 0 !== o && a + o > t.getEndPosition() ? (t.seek(a), Log.info("BoxParser", "Not enough data in stream to parse the entire '" + h + "' box"), {
		code: BoxParser.ERR_NOT_ENOUGH_DATA,
		type: h,
		size: o,
		hdr_size: n,
		start: a
	}) : e ? {
		code: BoxParser.OK,
		type: h,
		size: o,
		hdr_size: n,
		start: a
	}: (BoxParser[h + "Box"] ? r = new BoxParser[h + "Box"](o) : "uuid" !== h ? (Log.warn("BoxParser", "Unknown box type: '" + h + "'"), (r = new BoxParser.Box(h, o)).has_unparsed_data = !0) : BoxParser.UUIDBoxes[s] ? r = new BoxParser.UUIDBoxes[s](o) : (Log.warn("BoxParser", "Unknown uuid type: '" + s + "'"), (r = new BoxParser.Box(h, o)).uuid = s, r.has_unparsed_data = !0), r.hdr_size = n, r.start = a, r.write === BoxParser.Box.prototype.write && "mdat" !== r.type && (Log.info("BoxParser", "'" + d + "' box writing not yet implemented, keeping unparsed data in memory for later write"), r.parseDataAndRewind(t)), r.parse(t), (a = t.getPosition() - (r.start + r.size)) < 0 ? (Log.warn("BoxParser", "Parsing of box '" + d + "' did not read the entire indicated box data size (missing " + -a + " bytes), seeking forward"), t.seek(r.start + r.size)) : 0 < a && (Log.error("BoxParser", "Parsing of box '" + d + "' read " + a + " more bytes than the indicated box data size, seeking backwards"), 0 !== r.size && t.seek(r.start + r.size)), {
		code: BoxParser.OK,
		box: r,
		size: r.size
	})
},
BoxParser.Box.prototype.parse = function(t) {
	"mdat" != this.type ? this.data = t.readUint8Array(this.size - this.hdr_size) : 0 === this.size ? t.seek(t.getEndPosition()) : t.seek(this.start + this.size)
},
BoxParser.Box.prototype.parseDataAndRewind = function(t) {
	this.data = t.readUint8Array(this.size - this.hdr_size),
	t.position -= this.size - this.hdr_size
},
BoxParser.FullBox.prototype.parseDataAndRewind = function(t) {
	this.parseFullHeader(t),
	this.data = t.readUint8Array(this.size - this.hdr_size),
	this.hdr_size -= 4,
	t.position -= this.size - this.hdr_size
},
BoxParser.FullBox.prototype.parseFullHeader = function(t) {
	this.version = t.readUint8(),
	this.flags = t.readUint24(),
	this.hdr_size += 4
},
BoxParser.FullBox.prototype.parse = function(t) {
	this.parseFullHeader(t),
	this.data = t.readUint8Array(this.size - this.hdr_size)
},
BoxParser.ContainerBox.prototype.parse = function(t) {
	for (; t.getPosition() < this.start + this.size;) {
		if ((e = BoxParser.parseOneBox(t, !1, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return;
		var e, i = e.box;
		this.boxes.push(i),
		this.subBoxNames && -1 != this.subBoxNames.indexOf(i.type) ? this[this.subBoxNames[this.subBoxNames.indexOf(i.type)] + "s"].push(i) : this[e = "uuid" !== i.type ? i.type: i.uuid] ? Log.warn("Box of type " + e + " already stored in field of this type") : this[e] = i
	}
},
BoxParser.Box.prototype.parseLanguage = function(t) {
	this.language = t.readUint16();
	t = [];
	t[0] = this.language >> 10 & 31,
	t[1] = this.language >> 5 & 31,
	t[2] = 31 & this.language,
	this.languageString = String.fromCharCode(t[0] + 96, t[1] + 96, t[2] + 96)
},
BoxParser.SAMPLE_ENTRY_TYPE_VISUAL = "Visual",
BoxParser.SAMPLE_ENTRY_TYPE_AUDIO = "Audio",
BoxParser.SAMPLE_ENTRY_TYPE_HINT = "Hint",
BoxParser.SAMPLE_ENTRY_TYPE_METADATA = "Metadata",
BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE = "Subtitle",
BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM = "System",
BoxParser.SAMPLE_ENTRY_TYPE_TEXT = "Text",
BoxParser.SampleEntry.prototype.parseHeader = function(t) {
	t.readUint8Array(6),
	this.data_reference_index = t.readUint16(),
	this.hdr_size += 8
},
BoxParser.SampleEntry.prototype.parse = function(t) {
	this.parseHeader(t),
	this.data = t.readUint8Array(this.size - this.hdr_size)
},
BoxParser.SampleEntry.prototype.parseDataAndRewind = function(t) {
	this.parseHeader(t),
	this.data = t.readUint8Array(this.size - this.hdr_size),
	this.hdr_size -= 8,
	t.position -= this.size - this.hdr_size
},
BoxParser.SampleEntry.prototype.parseFooter = function(t) {
	BoxParser.ContainerBox.prototype.parse.call(this, t)
},
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_HINT),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_TEXT),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL,
function(t) {
	var e;
	this.parseHeader(t),
	t.readUint16(),
	t.readUint16(),
	t.readUint32Array(3),
	this.width = t.readUint16(),
	this.height = t.readUint16(),
	this.horizresolution = t.readUint32(),
	this.vertresolution = t.readUint32(),
	t.readUint32(),
	this.frame_count = t.readUint16(),
	e = Math.min(31, t.readUint8()),
	this.compressorname = t.readString(e),
	e < 31 && t.readString(31 - e),
	this.depth = t.readUint16(),
	t.readUint16(),
	this.parseFooter(t)
}),
BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO,
function(t) {
	this.parseHeader(t),
	t.readUint32Array(2),
	this.channel_count = t.readUint16(),
	this.samplesize = t.readUint16(),
	t.readUint16(),
	t.readUint16(),
	this.samplerate = t.readUint32() / 65536,
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc2"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc3"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc4"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "av01"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dav1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hvc1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hev1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hvt1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "lhe1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dvh1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dvhe"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvc1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvi1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvs1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvcN"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vp08"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vp09"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avs3"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "j2ki"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "mjp2"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "mjpg"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "uncv"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "mp4a"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "ac-3"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "ac-4"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "ec-3"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "Opus"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "mha1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "mha2"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "mhm1"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "mhm2"),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "fLaC"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "encv"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, "enca"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "encu"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM, "encs"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_TEXT, "enct"),
BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "encm"),
BoxParser.createBoxCtor("a1lx", "AV1LayeredImageIndexingProperty",
function(t) {
	var e = 16 * (1 + (1 & (1 & t.readUint8())));
	this.layer_size = [];
	for (var i = 0; i < 3; i++) this.layer_size[i] = 16 == e ? t.readUint16() : t.readUint32()
}),
BoxParser.createBoxCtor("a1op", "OperatingPointSelectorProperty",
function(t) {
	this.op_index = t.readUint8()
}),
BoxParser.createFullBoxCtor("auxC", "AuxiliaryTypeProperty",
function(t) {
	this.aux_type = t.readCString();
	var e = this.size - this.hdr_size - (this.aux_type.length + 1);
	this.aux_subtype = t.readUint8Array(e)
}),
BoxParser.createBoxCtor("av1C", "AV1CodecConfigurationBox",
function(t) {
	var e = t.readUint8();
	if (1 == (e >> 7 & 1)) if (this.version = 127 & e, 1 === this.version) if (e = t.readUint8(), this.seq_profile = e >> 5 & 7, this.seq_level_idx_0 = 31 & e, e = t.readUint8(), this.seq_tier_0 = e >> 7 & 1, this.high_bitdepth = e >> 6 & 1, this.twelve_bit = e >> 5 & 1, this.monochrome = e >> 4 & 1, this.chroma_subsampling_x = e >> 3 & 1, this.chroma_subsampling_y = e >> 2 & 1, this.chroma_sample_position = 3 & e, e = t.readUint8(), this.reserved_1 = e >> 5 & 7, 0 === this.reserved_1) {
		if (this.initial_presentation_delay_present = e >> 4 & 1, 1 === this.initial_presentation_delay_present) this.initial_presentation_delay_minus_one = 15 & e;
		else if (this.reserved_2 = 15 & e, 0 !== this.reserved_2) return void Log.error("av1C reserved_2 parsing problem");
		e = this.size - this.hdr_size - 4;
		this.configOBUs = t.readUint8Array(e)
	} else Log.error("av1C reserved_1 parsing problem");
	else Log.error("av1C version " + this.version + " not supported");
	else Log.error("av1C marker problem")
}),
BoxParser.createBoxCtor("avcC", "AVCConfigurationBox",
function(t) {
	var e, i;
	for (this.configurationVersion = t.readUint8(), this.AVCProfileIndication = t.readUint8(), this.profile_compatibility = t.readUint8(), this.AVCLevelIndication = t.readUint8(), this.lengthSizeMinusOne = 3 & t.readUint8(), this.nb_SPS_nalus = 31 & t.readUint8(), i = this.size - this.hdr_size - 6, this.SPS = [], this.SPS.toString = function() {
		return printPS(this)
	},
	e = 0; e < this.nb_SPS_nalus; e++) this.SPS[e] = {},
	this.SPS[e].length = t.readUint16(),
	this.SPS[e].nalu = t.readUint8Array(this.SPS[e].length),
	i -= 2 + this.SPS[e].length;
	for (this.nb_PPS_nalus = t.readUint8(), i--, this.PPS = [], this.PPS.toString = function() {
		return printPS(this)
	},
	e = 0; e < this.nb_PPS_nalus; e++) this.PPS[e] = {},
	this.PPS[e].length = t.readUint16(),
	this.PPS[e].nalu = t.readUint8Array(this.PPS[e].length),
	i -= 2 + this.PPS[e].length;
	0 < i && (this.ext = t.readUint8Array(i))
}),
BoxParser.createBoxCtor("btrt", "BitRateBox",
function(t) {
	this.bufferSizeDB = t.readUint32(),
	this.maxBitrate = t.readUint32(),
	this.avgBitrate = t.readUint32()
}),
BoxParser.createFullBoxCtor("ccst", "CodingConstraintsBox",
function(t) {
	var e = t.readUint8();
	this.all_ref_pics_intra = 128 == (128 & e),
	this.intra_pred_used = 64 == (64 & e),
	this.max_ref_per_pic = (63 & e) >> 2,
	t.readUint24()
}),
BoxParser.createBoxCtor("cdef", "ComponentDefinitionBox",
function(t) {
	var e;
	for (this.channel_count = t.readUint16(), this.channel_indexes = [], this.channel_types = [], this.channel_associations = [], e = 0; e < this.channel_count; e++) this.channel_indexes.push(t.readUint16()),
	this.channel_types.push(t.readUint16()),
	this.channel_associations.push(t.readUint16())
}),
BoxParser.createBoxCtor("clap", "CleanApertureBox",
function(t) {
	this.cleanApertureWidthN = t.readUint32(),
	this.cleanApertureWidthD = t.readUint32(),
	this.cleanApertureHeightN = t.readUint32(),
	this.cleanApertureHeightD = t.readUint32(),
	this.horizOffN = t.readUint32(),
	this.horizOffD = t.readUint32(),
	this.vertOffN = t.readUint32(),
	this.vertOffD = t.readUint32()
}),
BoxParser.createBoxCtor("clli", "ContentLightLevelBox",
function(t) {
	this.max_content_light_level = t.readUint16(),
	this.max_pic_average_light_level = t.readUint16()
}),
BoxParser.createFullBoxCtor("cmex", "CameraExtrinsicMatrixProperty",
function(t) {
	1 & this.flags && (this.pos_x = t.readInt32()),
	2 & this.flags && (this.pos_y = t.readInt32()),
	4 & this.flags && (this.pos_z = t.readInt32()),
	8 & this.flags && (0 == this.version ? 16 & this.flags ? (this.quat_x = t.readInt32(), this.quat_y = t.readInt32(), this.quat_z = t.readInt32()) : (this.quat_x = t.readInt16(), this.quat_y = t.readInt16(), this.quat_z = t.readInt16()) : this.version),
	32 & this.flags && (this.id = t.readUint32())
}),
BoxParser.createFullBoxCtor("cmin", "CameraIntrinsicMatrixProperty",
function(t) {
	this.focal_length_x = t.readInt32(),
	this.principal_point_x = t.readInt32(),
	this.principal_point_y = t.readInt32(),
	1 & this.flags && (this.focal_length_y = t.readInt32(), this.skew_factor = t.readInt32())
}),
BoxParser.createBoxCtor("cmpd", "ComponentDefinitionBox",
function(t) {
	for (this.component_count = t.readUint32(), this.component_types = [], this.component_type_urls = [], i = 0; i < this.component_count; i++) {
		var e = t.readUint16();
		this.component_types.push(e),
		32768 <= e && this.component_type_urls.push(t.readCString())
	}
}),
BoxParser.createFullBoxCtor("co64", "ChunkLargeOffsetBox",
function(t) {
	var e, i = t.readUint32();
	if (this.chunk_offsets = [], 0 === this.version) for (e = 0; e < i; e++) this.chunk_offsets.push(t.readUint64())
}),
BoxParser.createFullBoxCtor("CoLL", "ContentLightLevelBox",
function(t) {
	this.maxCLL = t.readUint16(),
	this.maxFALL = t.readUint16()
}),
BoxParser.createBoxCtor("colr", "ColourInformationBox",
function(t) {
	var e;
	this.colour_type = t.readString(4),
	"nclx" === this.colour_type ? (this.colour_primaries = t.readUint16(), this.transfer_characteristics = t.readUint16(), this.matrix_coefficients = t.readUint16(), e = t.readUint8(), this.full_range_flag = e >> 7) : "rICC" !== this.colour_type && "prof" !== this.colour_type || (this.ICC_profile = t.readUint8Array(this.size - 4))
}),
BoxParser.createFullBoxCtor("cprt", "CopyrightBox",
function(t) {
	this.parseLanguage(t),
	this.notice = t.readCString()
}),
BoxParser.createFullBoxCtor("cslg", "CompositionToDecodeBox",
function(t) {
	0 === this.version && (this.compositionToDTSShift = t.readInt32(), this.leastDecodeToDisplayDelta = t.readInt32(), this.greatestDecodeToDisplayDelta = t.readInt32(), this.compositionStartTime = t.readInt32(), this.compositionEndTime = t.readInt32())
}),
BoxParser.createFullBoxCtor("ctts", "CompositionOffsetBox",
function(t) {
	var e, i = t.readUint32();
	if (this.sample_counts = [], this.sample_offsets = [], 0 === this.version) for (e = 0; e < i; e++) {
		this.sample_counts.push(t.readUint32());
		var r = t.readInt32();
		r < 0 && Log.warn("BoxParser", "ctts box uses negative values without using version 1"),
		this.sample_offsets.push(r)
	} else if (1 == this.version) for (e = 0; e < i; e++) this.sample_counts.push(t.readUint32()),
	this.sample_offsets.push(t.readInt32())
}),
BoxParser.createBoxCtor("dac3", "AC3SpecificBox",
function(t) {
	var e = t.readUint8(),
	i = t.readUint8(),
	t = t.readUint8();
	this.fscod = e >> 6,
	this.bsid = e >> 1 & 31,
	this.bsmod = (1 & e) << 2 | i >> 6 & 3,
	this.acmod = i >> 3 & 7,
	this.lfeon = i >> 2 & 1,
	this.bit_rate_code = 3 & i | t >> 5 & 7
}),
BoxParser.createBoxCtor("dec3", "EC3SpecificBox",
function(t) {
	var e = t.readUint16();
	this.data_rate = e >> 3,
	this.num_ind_sub = 7 & e,
	this.ind_subs = [];
	for (var i = 0; i < this.num_ind_sub + 1; i++) {
		var r = {};
		this.ind_subs.push(r);
		var s = t.readUint8(),
		a = t.readUint8(),
		n = t.readUint8();
		r.fscod = s >> 6,
		r.bsid = s >> 1 & 31,
		r.bsmod = (1 & s) << 4 | a >> 4 & 15,
		r.acmod = a >> 1 & 7,
		r.lfeon = 1 & a,
		r.num_dep_sub = n >> 1 & 15,
		0 < r.num_dep_sub && (r.chan_loc = (1 & n) << 8 | t.readUint8())
	}
}),
BoxParser.createFullBoxCtor("dfLa", "FLACSpecificBox",
function(t) {
	for (var e = [], i = ["STREAMINFO", "PADDING", "APPLICATION", "SEEKTABLE", "VORBIS_COMMENT", "CUESHEET", "PICTURE", "RESERVED"];;) {
		var r = t.readUint8(),
		s = Math.min(127 & r, i.length - 1);
		if (s ? t.readUint8Array(t.readUint24()) : (t.readUint8Array(13), this.samplerate = t.readUint32() >> 12, t.readUint8Array(20)), e.push(i[s]), 128 & r) break
	}
	this.numMetadataBlocks = e.length + " (" + e.join(", ") + ")"
}),
BoxParser.createBoxCtor("dimm", "hintimmediateBytesSent",
function(t) {
	this.bytessent = t.readUint64()
}),
BoxParser.createBoxCtor("dmax", "hintlongestpacket",
function(t) {
	this.time = t.readUint32()
}),
BoxParser.createBoxCtor("dmed", "hintmediaBytesSent",
function(t) {
	this.bytessent = t.readUint64()
}),
BoxParser.createBoxCtor("dOps", "OpusSpecificBox",
function(t) {
	if (this.Version = t.readUint8(), this.OutputChannelCount = t.readUint8(), this.PreSkip = t.readUint16(), this.InputSampleRate = t.readUint32(), this.OutputGain = t.readInt16(), this.ChannelMappingFamily = t.readUint8(), 0 !== this.ChannelMappingFamily) {
		this.StreamCount = t.readUint8(),
		this.CoupledCount = t.readUint8(),
		this.ChannelMapping = [];
		for (var e = 0; e < this.OutputChannelCount; e++) this.ChannelMapping[e] = t.readUint8()
	}
}),
BoxParser.createFullBoxCtor("dref", "DataReferenceBox",
function(t) {
	var e;
	this.entries = [];
	for (var i = t.readUint32(), r = 0; r < i; r++) {
		if ((e = BoxParser.parseOneBox(t, !1, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return;
		e = e.box,
		this.entries.push(e)
	}
}),
BoxParser.createBoxCtor("drep", "hintrepeatedBytesSent",
function(t) {
	this.bytessent = t.readUint64()
}),
BoxParser.createFullBoxCtor("elng", "ExtendedLanguageBox",
function(t) {
	this.extended_language = t.readString(this.size - this.hdr_size)
}),
BoxParser.createFullBoxCtor("elst", "EditListBox",
function(t) {
	this.entries = [];
	for (var e = t.readUint32(), i = 0; i < e; i++) {
		var r = {};
		this.entries.push(r),
		1 === this.version ? (r.segment_duration = t.readUint64(), r.media_time = t.readInt64()) : (r.segment_duration = t.readUint32(), r.media_time = t.readInt32()),
		r.media_rate_integer = t.readInt16(),
		r.media_rate_fraction = t.readInt16()
	}
}),
BoxParser.createFullBoxCtor("emsg", "EventMessageBox",
function(t) {
	1 == this.version ? (this.timescale = t.readUint32(), this.presentation_time = t.readUint64(), this.event_duration = t.readUint32(), this.id = t.readUint32(), this.scheme_id_uri = t.readCString(), this.value = t.readCString()) : (this.scheme_id_uri = t.readCString(), this.value = t.readCString(), this.timescale = t.readUint32(), this.presentation_time_delta = t.readUint32(), this.event_duration = t.readUint32(), this.id = t.readUint32());
	var e = this.size - this.hdr_size - (16 + (this.scheme_id_uri.length + 1) + (this.value.length + 1));
	1 == this.version && (e -= 4),
	this.message_data = t.readUint8Array(e)
}),
BoxParser.createEntityToGroupCtor = function(e, r) {
	BoxParser[e + "Box"] = function(t) {
		BoxParser.FullBox.call(this, e, t)
	},
	BoxParser[e + "Box"].prototype = new BoxParser.FullBox,
	BoxParser[e + "Box"].prototype.parse = function(t) {
		if (this.parseFullHeader(t), r) r.call(this, t);
		else for (this.group_id = t.readUint32(), this.num_entities_in_group = t.readUint32(), this.entity_ids = [], i = 0; i < this.num_entities_in_group; i++) {
			var e = t.readUint32();
			this.entity_ids.push(e)
		}
	}
},
BoxParser.createEntityToGroupCtor("aebr"),
BoxParser.createEntityToGroupCtor("afbr"),
BoxParser.createEntityToGroupCtor("albc"),
BoxParser.createEntityToGroupCtor("altr"),
BoxParser.createEntityToGroupCtor("brst"),
BoxParser.createEntityToGroupCtor("dobr"),
BoxParser.createEntityToGroupCtor("eqiv"),
BoxParser.createEntityToGroupCtor("favc"),
BoxParser.createEntityToGroupCtor("fobr"),
BoxParser.createEntityToGroupCtor("iaug"),
BoxParser.createEntityToGroupCtor("pano"),
BoxParser.createEntityToGroupCtor("slid"),
BoxParser.createEntityToGroupCtor("ster"),
BoxParser.createEntityToGroupCtor("tsyn"),
BoxParser.createEntityToGroupCtor("wbbr"),
BoxParser.createEntityToGroupCtor("prgr"),
BoxParser.createEntityToGroupCtor("pymd",
function(t) {
	this.group_id = t.readUint32(),
	this.num_entities_in_group = t.readUint32(),
	this.entity_ids = [];
	for (var e = 0; e < this.num_entities_in_group; e++) {
		var i = t.readUint32();
		this.entity_ids.push(i)
	}
	for (this.tile_size_x = t.readUint16(), this.tile_size_y = t.readUint16(), this.layer_binning = [], this.tiles_in_layer_column_minus1 = [], this.tiles_in_layer_row_minus1 = [], e = 0; e < this.num_entities_in_group; e++) this.layer_binning[e] = t.readUint16(),
	this.tiles_in_layer_row_minus1[e] = t.readUint16(),
	this.tiles_in_layer_column_minus1[e] = t.readUint16()
}),
BoxParser.createFullBoxCtor("esds", "ElementaryStreamDescriptorBox",
function(t) {
	var e = t.readUint8Array(this.size - this.hdr_size);
	void 0 !== MPEG4DescriptorParser && (t = new MPEG4DescriptorParser, this.esd = t.parseOneDescriptor(new DataStream(e.buffer, 0, DataStream.BIG_ENDIAN)))
}),
BoxParser.createBoxCtor("fiel", "FieldHandlingBox",
function(t) {
	this.fieldCount = t.readUint8(),
	this.fieldOrdering = t.readUint8()
}),
BoxParser.createBoxCtor("frma", "OriginalFormatBox",
function(t) {
	this.data_format = t.readString(4)
}),
BoxParser.createBoxCtor("ftyp", "FileTypeBox",
function(t) {
	var e = this.size - this.hdr_size;
	this.major_brand = t.readString(4),
	this.minor_version = t.readUint32(),
	e -= 8,
	this.compatible_brands = [];
	for (var i = 0; 4 <= e;) this.compatible_brands[i] = t.readString(4),
	e -= 4,
	i++
}),
BoxParser.createFullBoxCtor("hdlr", "HandlerBox",
function(t) {
	0 === this.version && (t.readUint32(), this.handler = t.readString(4), t.readUint32Array(3), this.name = t.readString(this.size - this.hdr_size - 20), "\0" === this.name[this.name.length - 1] && (this.name = this.name.slice(0, -1)))
}),
BoxParser.createBoxCtor("hvcC", "HEVCConfigurationBox",
function(t) {
	var e, i;
	this.configurationVersion = t.readUint8(),
	i = t.readUint8(),
	this.general_profile_space = i >> 6,
	this.general_tier_flag = (32 & i) >> 5,
	this.general_profile_idc = 31 & i,
	this.general_profile_compatibility = t.readUint32(),
	this.general_constraint_indicator = t.readUint8Array(6),
	this.general_level_idc = t.readUint8(),
	this.min_spatial_segmentation_idc = 4095 & t.readUint16(),
	this.parallelismType = 3 & t.readUint8(),
	this.chroma_format_idc = 3 & t.readUint8(),
	this.bit_depth_luma_minus8 = 7 & t.readUint8(),
	this.bit_depth_chroma_minus8 = 7 & t.readUint8(),
	this.avgFrameRate = t.readUint16(),
	i = t.readUint8(),
	this.constantFrameRate = i >> 6,
	this.numTemporalLayers = (13 & i) >> 3,
	this.temporalIdNested = (4 & i) >> 2,
	this.lengthSizeMinusOne = 3 & i,
	this.nalu_arrays = [],
	this.nalu_arrays.toString = function() {
		var t = "<table class='inner-table'>";
		t += "<thead><tr><th>completeness</th><th>nalu_type</th><th>nalu_data</th></tr></thead>",
		t += "<tbody>";
		for (var e = 0; e < this.length; e++) {
			var i = this[e];
			t += "<tr>",
			t += "<td rowspan='" + i.length + "'>" + i.completeness + "</td>",
			t += "<td rowspan='" + i.length + "'>" + i.nalu_type + "</td>";
			for (var r = 0; r < i.length; r++) 0 !== r && (t += "<tr>"),
			t += "<td>",
			t += i[r].data.reduce(function(t, e) {
				return t + e.toString(16).padStart(2, "0")
			},
			"0x"),
			t += "</td></tr>"
		}
		return t += "</tbody></table>"
	};
	for (var r = t.readUint8(), s = 0; s < r; s++) {
		var a = [];
		this.nalu_arrays.push(a),
		i = t.readUint8(),
		a.completeness = (128 & i) >> 7,
		a.nalu_type = 63 & i;
		for (var n = t.readUint16(), o = 0; o < n; o++) {
			var h = {};
			a.push(h),
			e = t.readUint16(),
			h.data = t.readUint8Array(e)
		}
	}
}),
BoxParser.createFullBoxCtor("iinf", "ItemInfoBox",
function(t) {
	var e;
	0 === this.version ? this.entry_count = t.readUint16() : this.entry_count = t.readUint32(),
	this.item_infos = [];
	for (var i = 0; i < this.entry_count; i++) {
		if ((e = BoxParser.parseOneBox(t, !1, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return;
		"infe" !== e.box.type && Log.error("BoxParser", "Expected 'infe' box, got " + e.box.type),
		this.item_infos[i] = e.box
	}
}),
BoxParser.createFullBoxCtor("iloc", "ItemLocationBox",
function(t) {
	var e = t.readUint8();
	this.offset_size = e >> 4 & 15,
	this.length_size = 15 & e,
	e = t.readUint8(),
	this.base_offset_size = e >> 4 & 15,
	1 === this.version || 2 === this.version ? this.index_size = 15 & e: this.index_size = 0,
	this.items = [];
	var i = 0;
	if (this.version < 2) i = t.readUint16();
	else {
		if (2 !== this.version) throw "version of iloc box not supported";
		i = t.readUint32()
	}
	for (var r = 0; r < i; r++) {
		var s = {};
		if (this.items.push(s), this.version < 2) s.item_ID = t.readUint16();
		else {
			if (2 !== this.version) throw "version of iloc box not supported";
			s.item_ID = t.readUint32()
		}
		switch (1 === this.version || 2 === this.version ? s.construction_method = 15 & t.readUint16() : s.construction_method = 0, s.data_reference_index = t.readUint16(), this.base_offset_size) {
		case 0:
			s.base_offset = 0;
			break;
		case 4:
			s.base_offset = t.readUint32();
			break;
		case 8:
			s.base_offset = t.readUint64();
			break;
		default:
			throw "Error reading base offset size"
		}
		var a = t.readUint16();
		s.extents = [];
		for (var n = 0; n < a; n++) {
			var o = {};
			if (s.extents.push(o), 1 === this.version || 2 === this.version) switch (this.index_size) {
			case 0:
				o.extent_index = 0;
				break;
			case 4:
				o.extent_index = t.readUint32();
				break;
			case 8:
				o.extent_index = t.readUint64();
				break;
			default:
				throw "Error reading extent index"
			}
			switch (this.offset_size) {
			case 0:
				o.extent_offset = 0;
				break;
			case 4:
				o.extent_offset = t.readUint32();
				break;
			case 8:
				o.extent_offset = t.readUint64();
				break;
			default:
				throw "Error reading extent index"
			}
			switch (this.length_size) {
			case 0:
				o.extent_length = 0;
				break;
			case 4:
				o.extent_length = t.readUint32();
				break;
			case 8:
				o.extent_length = t.readUint64();
				break;
			default:
				throw "Error reading extent index"
			}
		}
	}
}),
BoxParser.createBoxCtor("imir", "ImageMirror",
function(t) {
	t = t.readUint8();
	this.reserved = t >> 7,
	this.axis = 1 & t
}),
BoxParser.createFullBoxCtor("infe", "ItemInfoEntry",
function(t) {
	return 0 !== this.version && 1 !== this.version || (this.item_ID = t.readUint16(), this.item_protection_index = t.readUint16(), this.item_name = t.readCString(), this.content_type = t.readCString(), this.content_encoding = t.readCString()),
	1 === this.version ? (this.extension_type = t.readString(4), Log.warn("BoxParser", "Cannot parse extension type"), void t.seek(this.start + this.size)) : void(2 <= this.version && (2 === this.version ? this.item_ID = t.readUint16() : 3 === this.version && (this.item_ID = t.readUint32()), this.item_protection_index = t.readUint16(), this.item_type = t.readString(4), this.item_name = t.readCString(), "mime" === this.item_type ? (this.content_type = t.readCString(), this.content_encoding = t.readCString()) : "uri " === this.item_type && (this.item_uri_type = t.readCString())))
}),
BoxParser.createFullBoxCtor("ipma", "ItemPropertyAssociationBox",
function(t) {
	var e, i;
	for (entry_count = t.readUint32(), this.associations = [], e = 0; e < entry_count; e++) {
		var r = {};
		this.associations.push(r),
		this.version < 1 ? r.id = t.readUint16() : r.id = t.readUint32();
		var s = t.readUint8();
		for (r.props = [], i = 0; i < s; i++) {
			var a = t.readUint8(),
			n = {};
			r.props.push(n),
			n.essential = (128 & a) >> 7 == 1,
			1 & this.flags ? n.property_index = (127 & a) << 8 | t.readUint8() : n.property_index = 127 & a
		}
	}
}),
BoxParser.createFullBoxCtor("iref", "ItemReferenceBox",
function(t) {
	var e;
	for (this.references = []; t.getPosition() < this.start + this.size;) {
		if ((e = BoxParser.parseOneBox(t, !0, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return; (e = new(0 === this.version ? BoxParser.SingleItemTypeReferenceBox: BoxParser.SingleItemTypeReferenceBoxLarge)(e.type, e.size, e.hdr_size, e.start)).write === BoxParser.Box.prototype.write && "mdat" !== e.type && (Log.warn("BoxParser", e.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), e.parseDataAndRewind(t)),
		e.parse(t),
		this.references.push(e)
	}
}),
BoxParser.createBoxCtor("irot", "ImageRotation",
function(t) {
	this.angle = 3 & t.readUint8()
}),
BoxParser.createFullBoxCtor("ispe", "ImageSpatialExtentsProperty",
function(t) {
	this.image_width = t.readUint32(),
	this.image_height = t.readUint32()
}),
BoxParser.createFullBoxCtor("kind", "KindBox",
function(t) {
	this.schemeURI = t.readCString(),
	this.value = t.readCString()
}),
BoxParser.createFullBoxCtor("leva", "LevelAssignmentBox",
function(t) {
	var e = t.readUint8();
	this.levels = [];
	for (var i = 0; i < e; i++) {
		var r = {}; (this.levels[i] = r).track_ID = t.readUint32();
		var s = t.readUint8();
		switch (r.padding_flag = s >> 7, r.assignment_type = 127 & s, r.assignment_type) {
		case 0:
			r.grouping_type = t.readString(4);
			break;
		case 1:
			r.grouping_type = t.readString(4),
			r.grouping_type_parameter = t.readUint32();
			break;
		case 2:
		case 3:
			break;
		case 4:
			r.sub_track_id = t.readUint32();
			break;
		default:
			Log.warn("BoxParser", "Unknown leva assignement type")
		}
	}
}),
BoxParser.createBoxCtor("lhvC", "LHEVCConfigurationBox",
function(t) {
	var e;
	this.configurationVersion = t.readUint8(),
	this.min_spatial_segmentation_idc = 4095 & t.readUint16(),
	this.parallelismType = 3 & t.readUint8(),
	e = t.readUint8(),
	this.numTemporalLayers = (13 & e) >> 3,
	this.temporalIdNested = (4 & e) >> 2,
	this.lengthSizeMinusOne = 3 & e,
	this.nalu_arrays = [],
	this.nalu_arrays.toString = function() {
		var t = "<table class='inner-table'>";
		t += "<thead><tr><th>completeness</th><th>nalu_type</th><th>nalu_data</th></tr></thead>",
		t += "<tbody>";
		for (var e = 0; e < this.length; e++) {
			var i = this[e];
			t += "<tr>",
			t += "<td rowspan='" + i.length + "'>" + i.completeness + "</td>",
			t += "<td rowspan='" + i.length + "'>" + i.nalu_type + "</td>";
			for (var r = 0; r < i.length; r++) 0 !== r && (t += "<tr>"),
			t += "<td>",
			t += i[r].data.reduce(function(t, e) {
				return t + e.toString(16).padStart(2, "0")
			},
			"0x"),
			t += "</td></tr>"
		}
		return t += "</tbody></table>"
	};
	for (var i = t.readUint8(), r = 0; r < i; r++) {
		var s = [];
		this.nalu_arrays.push(s),
		e = t.readUint8(),
		s.completeness = (128 & e) >> 7,
		s.nalu_type = 63 & e;
		for (var a = t.readUint16(), n = 0; n < a; n++) {
			var o = {};
			s.push(o);
			var h = t.readUint16();
			o.data = t.readUint8Array(h)
		}
	}
}),
BoxParser.createBoxCtor("lsel", "LayerSelectorProperty",
function(t) {
	this.layer_id = t.readUint16()
}),
BoxParser.createBoxCtor("maxr", "hintmaxrate",
function(t) {
	this.period = t.readUint32(),
	this.bytes = t.readUint32()
}),
ColorPoint.prototype.toString = function() {
	return "(" + this.x + "," + this.y + ")"
},
BoxParser.createBoxCtor("mdcv", "MasteringDisplayColourVolumeBox",
function(t) {
	this.display_primaries = [],
	this.display_primaries[0] = new ColorPoint(t.readUint16(), t.readUint16()),
	this.display_primaries[1] = new ColorPoint(t.readUint16(), t.readUint16()),
	this.display_primaries[2] = new ColorPoint(t.readUint16(), t.readUint16()),
	this.white_point = new ColorPoint(t.readUint16(), t.readUint16()),
	this.max_display_mastering_luminance = t.readUint32(),
	this.min_display_mastering_luminance = t.readUint32()
}),
BoxParser.createFullBoxCtor("mdhd", "MediaHeaderBox",
function(t) {
	1 == this.version ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.timescale = t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.timescale = t.readUint32(), this.duration = t.readUint32()),
	this.parseLanguage(t),
	t.readUint16()
}),
BoxParser.createFullBoxCtor("mehd", "MovieExtendsHeaderBox",
function(t) {
	1 & this.flags && (Log.warn("BoxParser", "mehd box incorrectly uses flags set to 1, converting version to 1"), this.version = 1),
	1 == this.version ? this.fragment_duration = t.readUint64() : this.fragment_duration = t.readUint32()
}),
BoxParser.createFullBoxCtor("meta", "MetaBox",
function(t) {
	this.boxes = [],
	BoxParser.ContainerBox.prototype.parse.call(this, t)
}),
BoxParser.createFullBoxCtor("mfhd", "MovieFragmentHeaderBox",
function(t) {
	this.sequence_number = t.readUint32()
}),
BoxParser.createFullBoxCtor("mfro", "MovieFragmentRandomAccessOffsetBox",
function(t) {
	this._size = t.readUint32()
}),
BoxParser.createFullBoxCtor("mskC", "MaskConfigurationProperty",
function(t) {
	this.bits_per_pixel = t.readUint8()
}),
BoxParser.createFullBoxCtor("mvhd", "MovieHeaderBox",
function(t) {
	1 == this.version ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.timescale = t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.timescale = t.readUint32(), this.duration = t.readUint32()),
	this.rate = t.readUint32(),
	this.volume = t.readUint16() >> 8,
	t.readUint16(),
	t.readUint32Array(2),
	this.matrix = t.readUint32Array(9),
	t.readUint32Array(6),
	this.next_track_id = t.readUint32()
}),
BoxParser.createBoxCtor("npck", "hintPacketsSent",
function(t) {
	this.packetssent = t.readUint32()
}),
BoxParser.createBoxCtor("nump", "hintPacketsSent",
function(t) {
	this.packetssent = t.readUint64()
}),
BoxParser.createFullBoxCtor("padb", "PaddingBitsBox",
function(t) {
	var e = t.readUint32();
	this.padbits = [];
	for (var i = 0; i < Math.floor((e + 1) / 2); i++) this.padbits = t.readUint8()
}),
BoxParser.createBoxCtor("pasp", "PixelAspectRatioBox",
function(t) {
	this.hSpacing = t.readUint32(),
	this.vSpacing = t.readUint32()
}),
BoxParser.createBoxCtor("payl", "CuePayloadBox",
function(t) {
	this.text = t.readString(this.size - this.hdr_size)
}),
BoxParser.createBoxCtor("payt", "hintpayloadID",
function(t) {
	this.payloadID = t.readUint32();
	var e = t.readUint8();
	this.rtpmap_string = t.readString(e)
}),
BoxParser.createFullBoxCtor("pdin", "ProgressiveDownloadInfoBox",
function(t) {
	var e = (this.size - this.hdr_size) / 8;
	this.rate = [],
	this.initial_delay = [];
	for (var i = 0; i < e; i++) this.rate[i] = t.readUint32(),
	this.initial_delay[i] = t.readUint32()
}),
BoxParser.createFullBoxCtor("pitm", "PrimaryItemBox",
function(t) {
	0 === this.version ? this.item_id = t.readUint16() : this.item_id = t.readUint32()
}),
BoxParser.createFullBoxCtor("pixi", "PixelInformationProperty",
function(t) {
	var e;
	for (this.num_channels = t.readUint8(), this.bits_per_channels = [], e = 0; e < this.num_channels; e++) this.bits_per_channels[e] = t.readUint8()
}),
BoxParser.createBoxCtor("pmax", "hintlargestpacket",
function(t) {
	this.bytes = t.readUint32()
}),
BoxParser.createFullBoxCtor("prdi", "ProgressiveDerivedImageItemInformationProperty",
function(t) {
	if (this.step_count = t.readUint16(), this.item_count = [], 2 & this.flags) for (var e = 0; e < this.step_count; e++) this.item_count[e] = t.readUint16()
}),
BoxParser.createFullBoxCtor("prft", "ProducerReferenceTimeBox",
function(t) {
	this.ref_track_id = t.readUint32(),
	this.ntp_timestamp = t.readUint64(),
	0 === this.version ? this.media_time = t.readUint32() : this.media_time = t.readUint64()
}),
BoxParser.createFullBoxCtor("pssh", "ProtectionSystemSpecificHeaderBox",
function(t) {
	if (this.system_id = BoxParser.parseHex16(t), 0 < this.version) {
		var e = t.readUint32();
		this.kid = [];
		for (var i = 0; i < e; i++) this.kid[i] = BoxParser.parseHex16(t)
	}
	var r = t.readUint32();
	0 < r && (this.data = t.readUint8Array(r))
}),
BoxParser.createFullBoxCtor("clef", "TrackCleanApertureDimensionsBox",
function(t) {
	this.width = t.readUint32(),
	this.height = t.readUint32()
}),
BoxParser.createFullBoxCtor("enof", "TrackEncodedPixelsDimensionsBox",
function(t) {
	this.width = t.readUint32(),
	this.height = t.readUint32()
}),
BoxParser.createFullBoxCtor("prof", "TrackProductionApertureDimensionsBox",
function(t) {
	this.width = t.readUint32(),
	this.height = t.readUint32()
}),
BoxParser.createContainerBoxCtor("tapt", "TrackApertureModeDimensionsBox", null, ["clef", "prof", "enof"]),
BoxParser.createBoxCtor("rtp ", "rtpmoviehintinformation",
function(t) {
	this.descriptionformat = t.readString(4),
	this.sdptext = t.readString(this.size - this.hdr_size - 4)
}),
BoxParser.createFullBoxCtor("saio", "SampleAuxiliaryInformationOffsetsBox",
function(t) {
	1 & this.flags && (this.aux_info_type = t.readString(4), this.aux_info_type_parameter = t.readUint32());
	var e = t.readUint32();
	this.offset = [];
	for (var i = 0; i < e; i++) 0 === this.version ? this.offset[i] = t.readUint32() : this.offset[i] = t.readUint64()
}),
BoxParser.createFullBoxCtor("saiz", "SampleAuxiliaryInformationSizesBox",
function(t) {
	if (1 & this.flags && (this.aux_info_type = t.readString(4), this.aux_info_type_parameter = t.readUint32()), this.default_sample_info_size = t.readUint8(), this.sample_count = t.readUint32(), this.sample_info_size = [], 0 === this.default_sample_info_size) for (var e = 0; e < this.sample_count; e++) this.sample_info_size[e] = t.readUint8()
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "mett",
function(t) {
	this.parseHeader(t),
	this.content_encoding = t.readCString(),
	this.mime_format = t.readCString(),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "metx",
function(t) {
	this.parseHeader(t),
	this.content_encoding = t.readCString(),
	this.namespace = t.readCString(),
	this.schema_location = t.readCString(),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "sbtt",
function(t) {
	this.parseHeader(t),
	this.content_encoding = t.readCString(),
	this.mime_format = t.readCString(),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "stpp",
function(t) {
	this.parseHeader(t),
	this.namespace = t.readCString(),
	this.schema_location = t.readCString(),
	this.auxiliary_mime_types = t.readCString(),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "stxt",
function(t) {
	this.parseHeader(t),
	this.content_encoding = t.readCString(),
	this.mime_format = t.readCString(),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "tx3g",
function(t) {
	this.parseHeader(t),
	this.displayFlags = t.readUint32(),
	this.horizontal_justification = t.readInt8(),
	this.vertical_justification = t.readInt8(),
	this.bg_color_rgba = t.readUint8Array(4),
	this.box_record = t.readInt16Array(4),
	this.style_record = t.readUint8Array(12),
	this.parseFooter(t)
}),
BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "wvtt",
function(t) {
	this.parseHeader(t),
	this.parseFooter(t)
}),
BoxParser.createSampleGroupCtor("alst",
function(t) {
	var e, i = t.readUint16();
	for (this.first_output_sample = t.readUint16(), this.sample_offset = [], e = 0; e < i; e++) this.sample_offset[e] = t.readUint32();
	var r = this.description_length - 4 - 4 * i;
	for (this.num_output_samples = [], this.num_total_samples = [], e = 0; e < r / 4; e++) this.num_output_samples[e] = t.readUint16(),
	this.num_total_samples[e] = t.readUint16()
}),
BoxParser.createSampleGroupCtor("avll",
function(t) {
	this.layerNumber = t.readUint8(),
	this.accurateStatisticsFlag = t.readUint8(),
	this.avgBitRate = t.readUint16(),
	this.avgFrameRate = t.readUint16()
}),
BoxParser.createSampleGroupCtor("avss",
function(t) {
	this.subSequenceIdentifier = t.readUint16(),
	this.layerNumber = t.readUint8();
	var e = t.readUint8();
	this.durationFlag = e >> 7,
	this.avgRateFlag = e >> 6 & 1,
	this.durationFlag && (this.duration = t.readUint32()),
	this.avgRateFlag && (this.accurateStatisticsFlag = t.readUint8(), this.avgBitRate = t.readUint16(), this.avgFrameRate = t.readUint16()),
	this.dependency = [];
	for (var i = t.readUint8(), r = 0; r < i; r++) {
		var s = {};
		this.dependency.push(s),
		s.subSeqDirectionFlag = t.readUint8(),
		s.layerNumber = t.readUint8(),
		s.subSequenceIdentifier = t.readUint16()
	}
}),
BoxParser.createSampleGroupCtor("dtrt",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("mvif",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("prol",
function(t) {
	this.roll_distance = t.readInt16()
}),
BoxParser.createSampleGroupCtor("rap ",
function(t) {
	t = t.readUint8();
	this.num_leading_samples_known = t >> 7,
	this.num_leading_samples = 127 & t
}),
BoxParser.createSampleGroupCtor("rash",
function(t) {
	if (this.operation_point_count = t.readUint16(), this.description_length !== 2 + (1 === this.operation_point_count ? 2 : 6 * this.operation_point_count) + 9) Log.warn("BoxParser", "Mismatch in " + this.grouping_type + " sample group length"),
	this.data = t.readUint8Array(this.description_length - 2);
	else {
		if (1 === this.operation_point_count) this.target_rate_share = t.readUint16();
		else {
			this.target_rate_share = [],
			this.available_bitrate = [];
			for (var e = 0; e < this.operation_point_count; e++) this.available_bitrate[e] = t.readUint32(),
			this.target_rate_share[e] = t.readUint16()
		}
		this.maximum_bitrate = t.readUint32(),
		this.minimum_bitrate = t.readUint32(),
		this.discard_priority = t.readUint8()
	}
}),
BoxParser.createSampleGroupCtor("roll",
function(t) {
	this.roll_distance = t.readInt16()
}),
BoxParser.SampleGroupEntry.prototype.parse = function(t) {
	Log.warn("BoxParser", "Unknown Sample Group type: " + this.grouping_type),
	this.data = t.readUint8Array(this.description_length)
},
BoxParser.createSampleGroupCtor("scif",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("scnm",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("seig",
function(t) {
	this.reserved = t.readUint8();
	var e = t.readUint8();
	this.crypt_byte_block = e >> 4,
	this.skip_byte_block = 15 & e,
	this.isProtected = t.readUint8(),
	this.Per_Sample_IV_Size = t.readUint8(),
	this.KID = BoxParser.parseHex16(t),
	this.constant_IV_size = 0,
	this.constant_IV = 0,
	1 === this.isProtected && 0 === this.Per_Sample_IV_Size && (this.constant_IV_size = t.readUint8(), this.constant_IV = t.readUint8Array(this.constant_IV_size))
}),
BoxParser.createSampleGroupCtor("stsa",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("sync",
function(t) {
	t = t.readUint8();
	this.NAL_unit_type = 63 & t
}),
BoxParser.createSampleGroupCtor("tele",
function(t) {
	t = t.readUint8();
	this.level_independently_decodable = t >> 7
}),
BoxParser.createSampleGroupCtor("tsas",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("tscl",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createSampleGroupCtor("vipr",
function(t) {
	Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed")
}),
BoxParser.createFullBoxCtor("sbgp", "SampleToGroupBox",
function(t) {
	this.grouping_type = t.readString(4),
	1 === this.version ? this.grouping_type_parameter = t.readUint32() : this.grouping_type_parameter = 0,
	this.entries = [];
	for (var e = t.readUint32(), i = 0; i < e; i++) {
		var r = {};
		this.entries.push(r),
		r.sample_count = t.readInt32(),
		r.group_description_index = t.readInt32()
	}
}),
Pixel.prototype.toString = function() {
	return "[row: " + this.bad_pixel_row + ", column: " + this.bad_pixel_column + "]"
},
BoxParser.createFullBoxCtor("sbpm", "SensorBadPixelsMapBox",
function(t) {
	var e;
	for (this.component_count = t.readUint16(), this.component_index = [], e = 0; e < this.component_count; e++) this.component_index.push(t.readUint16());
	var i = t.readUint8();
	for (this.correction_applied = 128 == (128 & i), this.num_bad_rows = t.readUint32(), this.num_bad_cols = t.readUint32(), this.num_bad_pixels = t.readUint32(), this.bad_rows = [], this.bad_columns = [], this.bad_pixels = [], e = 0; e < this.num_bad_rows; e++) this.bad_rows.push(t.readUint32());
	for (e = 0; e < this.num_bad_cols; e++) this.bad_columns.push(t.readUint32());
	for (e = 0; e < this.num_bad_pixels; e++) {
		var r = t.readUint32(),
		s = t.readUint32();
		this.bad_pixels.push(new Pixel(r, s))
	}
}),
BoxParser.createFullBoxCtor("schm", "SchemeTypeBox",
function(t) {
	this.scheme_type = t.readString(4),
	this.scheme_version = t.readUint32(),
	1 & this.flags && (this.scheme_uri = t.readString(this.size - this.hdr_size - 8))
}),
BoxParser.createBoxCtor("sdp ", "rtptracksdphintinformation",
function(t) {
	this.sdptext = t.readString(this.size - this.hdr_size)
}),
BoxParser.createFullBoxCtor("sdtp", "SampleDependencyTypeBox",
function(t) {
	var e, i = this.size - this.hdr_size;
	this.is_leading = [],
	this.sample_depends_on = [],
	this.sample_is_depended_on = [],
	this.sample_has_redundancy = [];
	for (var r = 0; r < i; r++) e = t.readUint8(),
	this.is_leading[r] = e >> 6,
	this.sample_depends_on[r] = e >> 4 & 3,
	this.sample_is_depended_on[r] = e >> 2 & 3,
	this.sample_has_redundancy[r] = 3 & e
}),
BoxParser.createFullBoxCtor("senc", "SampleEncryptionBox"),
BoxParser.createFullBoxCtor("sgpd", "SampleGroupDescriptionBox",
function(t) {
	this.grouping_type = t.readString(4),
	Log.debug("BoxParser", "Found Sample Groups of type " + this.grouping_type),
	1 === this.version ? this.default_length = t.readUint32() : this.default_length = 0,
	2 <= this.version && (this.default_group_description_index = t.readUint32()),
	this.entries = [];
	for (var e = t.readUint32(), i = 0; i < e; i++) {
		var r = new(BoxParser[this.grouping_type + "SampleGroupEntry"] ? BoxParser[this.grouping_type + "SampleGroupEntry"] : BoxParser.SampleGroupEntry)(this.grouping_type);
		this.entries.push(r),
		1 === this.version && 0 === this.default_length ? r.description_length = t.readUint32() : r.description_length = this.default_length,
		r.write === BoxParser.SampleGroupEntry.prototype.write && (Log.info("BoxParser", "SampleGroup for type " + this.grouping_type + " writing not yet implemented, keeping unparsed data in memory for later write"), r.data = t.readUint8Array(r.description_length), t.position -= r.description_length),
		r.parse(t)
	}
}),
BoxParser.createFullBoxCtor("sidx", "CompressedSegmentIndexBox",
function(t) {
	this.reference_ID = t.readUint32(),
	this.timescale = t.readUint32(),
	0 === this.version ? (this.earliest_presentation_time = t.readUint32(), this.first_offset = t.readUint32()) : (this.earliest_presentation_time = t.readUint64(), this.first_offset = t.readUint64()),
	t.readUint16(),
	this.references = [];
	for (var e = t.readUint16(), i = 0; i < e; i++) {
		var r = {};
		this.references.push(r);
		var s = t.readUint32();
		r.reference_type = s >> 31 & 1,
		r.referenced_size = 2147483647 & s,
		r.subsegment_duration = t.readUint32(),
		s = t.readUint32(),
		r.starts_with_SAP = s >> 31 & 1,
		r.SAP_type = s >> 28 & 7,
		r.SAP_delta_time = 268435455 & s
	}
}),
BoxParser.SingleItemTypeReferenceBox = function(t, e, i, r) {
	BoxParser.Box.call(this, t, e),
	this.hdr_size = i,
	this.start = r
},
BoxParser.SingleItemTypeReferenceBox.prototype = new BoxParser.Box,
BoxParser.SingleItemTypeReferenceBox.prototype.parse = function(t) {
	this.from_item_ID = t.readUint16();
	var e = t.readUint16();
	this.references = [];
	for (var i = 0; i < e; i++) this.references[i] = {},
	this.references[i].to_item_ID = t.readUint16()
},
BoxParser.SingleItemTypeReferenceBoxLarge = function(t, e, i, r) {
	BoxParser.Box.call(this, t, e),
	this.hdr_size = i,
	this.start = r
},
BoxParser.SingleItemTypeReferenceBoxLarge.prototype = new BoxParser.Box,
BoxParser.SingleItemTypeReferenceBoxLarge.prototype.parse = function(t) {
	this.from_item_ID = t.readUint32();
	var e = t.readUint16();
	this.references = [];
	for (var i = 0; i < e; i++) this.references[i] = {},
	this.references[i].to_item_ID = t.readUint32()
},
BoxParser.createFullBoxCtor("SmDm", "SMPTE2086MasteringDisplayMetadataBox",
function(t) {
	this.primaryRChromaticity_x = t.readUint16(),
	this.primaryRChromaticity_y = t.readUint16(),
	this.primaryGChromaticity_x = t.readUint16(),
	this.primaryGChromaticity_y = t.readUint16(),
	this.primaryBChromaticity_x = t.readUint16(),
	this.primaryBChromaticity_y = t.readUint16(),
	this.whitePointChromaticity_x = t.readUint16(),
	this.whitePointChromaticity_y = t.readUint16(),
	this.luminanceMax = t.readUint32(),
	this.luminanceMin = t.readUint32()
}),
BoxParser.createFullBoxCtor("smhd", "SoundMediaHeaderBox",
function(t) {
	this.balance = t.readUint16(),
	t.readUint16()
}),
BoxParser.createFullBoxCtor("ssix", "CompressedSubsegmentIndexBox",
function(t) {
	this.subsegments = [];
	for (var e = t.readUint32(), i = 0; i < e; i++) {
		var r = {};
		this.subsegments.push(r),
		r.ranges = [];
		for (var s = t.readUint32(), a = 0; a < s; a++) {
			var n = {};
			r.ranges.push(n),
			n.level = t.readUint8(),
			n.range_size = t.readUint24()
		}
	}
}),
BoxParser.createFullBoxCtor("stco", "ChunkOffsetBox",
function(t) {
	var e = t.readUint32();
	if (this.chunk_offsets = [], 0 === this.version) for (var i = 0; i < e; i++) this.chunk_offsets.push(t.readUint32())
}),
BoxParser.createFullBoxCtor("stdp", "DegradationPriorityBox",
function(t) {
	var e = (this.size - this.hdr_size) / 2;
	this.priority = [];
	for (var i = 0; i < e; i++) this.priority[i] = t.readUint16()
}),
BoxParser.createFullBoxCtor("sthd", "SubtitleMediaHeaderBox"),
BoxParser.createFullBoxCtor("stri", "SubTrackInformationBox",
function(t) {
	this.switch_group = t.readUint16(),
	this.alternate_group = t.readUint16(),
	this.sub_track_id = t.readUint32();
	var e = (this.size - this.hdr_size - 8) / 4;
	this.attribute_list = [];
	for (var i = 0; i < e; i++) this.attribute_list[i] = t.readUint32()
}),
BoxParser.createFullBoxCtor("stsc", "SampleToChunkBox",
function(t) {
	var e, i = t.readUint32();
	if (this.first_chunk = [], this.samples_per_chunk = [], this.sample_description_index = [], 0 === this.version) for (e = 0; e < i; e++) this.first_chunk.push(t.readUint32()),
	this.samples_per_chunk.push(t.readUint32()),
	this.sample_description_index.push(t.readUint32())
}),
BoxParser.createFullBoxCtor("stsd", "SampleDescriptionBox",
function(t) {
	var e, i, r, s;
	for (this.entries = [], r = t.readUint32(), e = 1; e <= r; e++) {
		if ((i = BoxParser.parseOneBox(t, !0, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return;
		BoxParser[i.type + "SampleEntry"] ? ((s = new BoxParser[i.type + "SampleEntry"](i.size)).hdr_size = i.hdr_size, s.start = i.start) : (Log.warn("BoxParser", "Unknown sample entry type: " + i.type), s = new BoxParser.SampleEntry(i.type, i.size, i.hdr_size, i.start)),
		s.write === BoxParser.SampleEntry.prototype.write && (Log.info("BoxParser", "SampleEntry " + s.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), s.parseDataAndRewind(t)),
		s.parse(t),
		this.entries.push(s)
	}
}),
BoxParser.createFullBoxCtor("stsg", "SubTrackSampleGroupBox",
function(t) {
	this.grouping_type = t.readUint32();
	var e = t.readUint16();
	this.group_description_index = [];
	for (var i = 0; i < e; i++) this.group_description_index[i] = t.readUint32()
}),
BoxParser.createFullBoxCtor("stsh", "ShadowSyncSampleBox",
function(t) {
	var e, i = t.readUint32();
	if (this.shadowed_sample_numbers = [], this.sync_sample_numbers = [], 0 === this.version) for (e = 0; e < i; e++) this.shadowed_sample_numbers.push(t.readUint32()),
	this.sync_sample_numbers.push(t.readUint32())
}),
BoxParser.createFullBoxCtor("stss", "SyncSampleBox",
function(t) {
	var e, i = t.readUint32();
	if (0 === this.version) for (this.sample_numbers = [], e = 0; e < i; e++) this.sample_numbers.push(t.readUint32())
}),
BoxParser.createFullBoxCtor("stsz", "SampleSizeBox",
function(t) {
	var e;
	if (this.sample_sizes = [], 0 === this.version) for (this.sample_size = t.readUint32(), this.sample_count = t.readUint32(), e = 0; e < this.sample_count; e++) 0 === this.sample_size ? this.sample_sizes.push(t.readUint32()) : this.sample_sizes[e] = this.sample_size
}),
BoxParser.createFullBoxCtor("stts", "TimeToSampleBox",
function(t) {
	var e, i, r = t.readUint32();
	if (this.sample_counts = [], this.sample_deltas = [], 0 === this.version) for (e = 0; e < r; e++) this.sample_counts.push(t.readUint32()),
	(i = t.readInt32()) < 0 && (Log.warn("BoxParser", "File uses negative stts sample delta, using value 1 instead, sync may be lost!"), i = 1),
	this.sample_deltas.push(i)
}),
BoxParser.createFullBoxCtor("stvi", "StereoVideoBox",
function(t) {
	var e = t.readUint32();
	this.single_view_allowed = 3 & e,
	this.stereo_scheme = t.readUint32();
	var i, e = t.readUint32();
	for (this.stereo_indication_type = t.readString(e), this.boxes = []; t.getPosition() < this.start + this.size;) {
		if ((i = BoxParser.parseOneBox(t, !1, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return;
		i = i.box,
		this.boxes.push(i),
		this[i.type] = i
	}
}),
BoxParser.createBoxCtor("styp", "SegmentTypeBox",
function(t) {
	BoxParser.ftypBox.prototype.parse.call(this, t)
}),
BoxParser.createFullBoxCtor("stz2", "CompactSampleSizeBox",
function(t) {
	var e, i;
	if (this.sample_sizes = [], 0 === this.version) if (this.reserved = t.readUint24(), this.field_size = t.readUint8(), i = t.readUint32(), 4 === this.field_size) for (e = 0; e < i; e += 2) {
		var r = t.readUint8();
		this.sample_sizes[e] = r >> 4 & 15,
		this.sample_sizes[e + 1] = 15 & r
	} else if (8 === this.field_size) for (e = 0; e < i; e++) this.sample_sizes[e] = t.readUint8();
	else if (16 === this.field_size) for (e = 0; e < i; e++) this.sample_sizes[e] = t.readUint16();
	else Log.error("BoxParser", "Error in length field in stz2 box")
}),
BoxParser.createFullBoxCtor("subs", "SubSampleInformationBox",
function(t) {
	var e, i, r, s = t.readUint32();
	for (this.entries = [], e = 0; e < s; e++) {
		var a = {};
		if ((this.entries[e] = a).sample_delta = t.readUint32(), a.subsamples = [], 0 < (r = t.readUint16())) for (i = 0; i < r; i++) {
			var n = {};
			a.subsamples.push(n),
			1 == this.version ? n.size = t.readUint32() : n.size = t.readUint16(),
			n.priority = t.readUint8(),
			n.discardable = t.readUint8(),
			n.codec_specific_parameters = t.readUint32()
		}
	}
}),
BoxParser.createFullBoxCtor("tenc", "TrackEncryptionBox",
function(t) {
	var e;
	t.readUint8(),
	0 === this.version ? t.readUint8() : (e = t.readUint8(), this.default_crypt_byte_block = e >> 4 & 15, this.default_skip_byte_block = 15 & e),
	this.default_isProtected = t.readUint8(),
	this.default_Per_Sample_IV_Size = t.readUint8(),
	this.default_KID = BoxParser.parseHex16(t),
	1 === this.default_isProtected && 0 === this.default_Per_Sample_IV_Size && (this.default_constant_IV_size = t.readUint8(), this.default_constant_IV = t.readUint8Array(this.default_constant_IV_size))
}),
BoxParser.createFullBoxCtor("tfdt", "TrackFragmentBaseMediaDecodeTimeBox",
function(t) {
	1 == this.version ? this.baseMediaDecodeTime = t.readUint64() : this.baseMediaDecodeTime = t.readUint32()
}),
BoxParser.createFullBoxCtor("tfhd", "TrackFragmentHeaderBox",
function(t) {
	var e = 0;
	this.track_id = t.readUint32(),
	this.size - this.hdr_size > e && this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET ? (this.base_data_offset = t.readUint64(), e += 8) : this.base_data_offset = 0,
	this.size - this.hdr_size > e && this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC ? (this.default_sample_description_index = t.readUint32(), e += 4) : this.default_sample_description_index = 0,
	this.size - this.hdr_size > e && this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR ? (this.default_sample_duration = t.readUint32(), e += 4) : this.default_sample_duration = 0,
	this.size - this.hdr_size > e && this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE ? (this.default_sample_size = t.readUint32(), e += 4) : this.default_sample_size = 0,
	this.size - this.hdr_size > e && this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS ? (this.default_sample_flags = t.readUint32(), e += 4) : this.default_sample_flags = 0
}),
BoxParser.createFullBoxCtor("tfra", "TrackFragmentRandomAccessBox",
function(t) {
	this.track_ID = t.readUint32(),
	t.readUint24();
	var e = t.readUint8();
	this.length_size_of_traf_num = e >> 4 & 3,
	this.length_size_of_trun_num = e >> 2 & 3,
	this.length_size_of_sample_num = 3 & e,
	this.entries = [];
	for (var i = t.readUint32(), r = 0; r < i; r++) 1 === this.version ? (this.time = t.readUint64(), this.moof_offset = t.readUint64()) : (this.time = t.readUint32(), this.moof_offset = t.readUint32()),
	this.traf_number = t["readUint" + 8 * (this.length_size_of_traf_num + 1)](),
	this.trun_number = t["readUint" + 8 * (this.length_size_of_trun_num + 1)](),
	this.sample_number = t["readUint" + 8 * (this.length_size_of_sample_num + 1)]()
}),
BoxParser.createFullBoxCtor("tkhd", "TrackHeaderBox",
function(t) {
	1 == this.version ? (this.creation_time = t.readUint64(), this.modification_time = t.readUint64(), this.track_id = t.readUint32(), t.readUint32(), this.duration = t.readUint64()) : (this.creation_time = t.readUint32(), this.modification_time = t.readUint32(), this.track_id = t.readUint32(), t.readUint32(), this.duration = t.readUint32()),
	t.readUint32Array(2),
	this.layer = t.readInt16(),
	this.alternate_group = t.readInt16(),
	this.volume = t.readInt16() >> 8,
	t.readUint16(),
	this.matrix = t.readInt32Array(9),
	this.width = t.readUint32(),
	this.height = t.readUint32()
}),
BoxParser.createBoxCtor("tmax", "hintmaxrelativetime",
function(t) {
	this.time = t.readUint32()
}),
BoxParser.createBoxCtor("tmin", "hintminrelativetime",
function(t) {
	this.time = t.readUint32()
}),
BoxParser.createBoxCtor("totl", "hintBytesSent",
function(t) {
	this.bytessent = t.readUint32()
}),
BoxParser.createBoxCtor("tpay", "hintBytesSent",
function(t) {
	this.bytessent = t.readUint32()
}),
BoxParser.createBoxCtor("tpyl", "hintBytesSent",
function(t) {
	this.bytessent = t.readUint64()
}),
BoxParser.TrackGroupTypeBox.prototype.parse = function(t) {
	this.parseFullHeader(t),
	this.track_group_id = t.readUint32()
},
BoxParser.createTrackGroupCtor("msrc"),
BoxParser.TrackReferenceTypeBox = function(t, e, i, r) {
	BoxParser.Box.call(this, t, e),
	this.hdr_size = i,
	this.start = r
},
BoxParser.TrackReferenceTypeBox.prototype = new BoxParser.Box,
BoxParser.TrackReferenceTypeBox.prototype.parse = function(t) {
	this.track_ids = t.readUint32Array((this.size - this.hdr_size) / 4)
},
BoxParser.trefBox.prototype.parse = function(t) {
	for (var e; t.getPosition() < this.start + this.size;) {
		if ((e = BoxParser.parseOneBox(t, !0, this.size - (t.getPosition() - this.start))).code !== BoxParser.OK) return; (e = new BoxParser.TrackReferenceTypeBox(e.type, e.size, e.hdr_size, e.start)).write === BoxParser.Box.prototype.write && "mdat" !== e.type && (Log.info("BoxParser", "TrackReference " + e.type + " box writing not yet implemented, keeping unparsed data in memory for later write"), e.parseDataAndRewind(t)),
		e.parse(t),
		this.boxes.push(e)
	}
},
BoxParser.createFullBoxCtor("trep", "TrackExtensionPropertiesBox",
function(t) {
	for (this.track_ID = t.readUint32(), this.boxes = []; t.getPosition() < this.start + this.size;) {
		if (ret = BoxParser.parseOneBox(t, !1, this.size - (t.getPosition() - this.start)), ret.code !== BoxParser.OK) return;
		box = ret.box,
		this.boxes.push(box)
	}
}),
BoxParser.createFullBoxCtor("trex", "TrackExtendsBox",
function(t) {
	this.track_id = t.readUint32(),
	this.default_sample_description_index = t.readUint32(),
	this.default_sample_duration = t.readUint32(),
	this.default_sample_size = t.readUint32(),
	this.default_sample_flags = t.readUint32()
}),
BoxParser.createBoxCtor("trpy", "hintBytesSent",
function(t) {
	this.bytessent = t.readUint64()
}),
BoxParser.createFullBoxCtor("trun", "TrackRunBox",
function(t) {
	var e = 0;
	if (this.sample_count = t.readUint32(), e += 4, this.size - this.hdr_size > e && this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET ? (this.data_offset = t.readInt32(), e += 4) : this.data_offset = 0, this.size - this.hdr_size > e && this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG ? (this.first_sample_flags = t.readUint32(), e += 4) : this.first_sample_flags = 0, this.sample_duration = [], this.sample_size = [], this.sample_flags = [], this.sample_composition_time_offset = [], this.size - this.hdr_size > e) for (var i = 0; i < this.sample_count; i++) this.flags & BoxParser.TRUN_FLAGS_DURATION && (this.sample_duration[i] = t.readUint32()),
	this.flags & BoxParser.TRUN_FLAGS_SIZE && (this.sample_size[i] = t.readUint32()),
	this.flags & BoxParser.TRUN_FLAGS_FLAGS && (this.sample_flags[i] = t.readUint32()),
	this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET && (0 === this.version ? this.sample_composition_time_offset[i] = t.readUint32() : this.sample_composition_time_offset[i] = t.readInt32())
}),
BoxParser.createFullBoxCtor("tsel", "TrackSelectionBox",
function(t) {
	this.switch_group = t.readUint32();
	var e = (this.size - this.hdr_size - 4) / 4;
	this.attribute_list = [];
	for (var i = 0; i < e; i++) this.attribute_list[i] = t.readUint32()
}),
BoxParser.createFullBoxCtor("txtC", "TextConfigBox",
function(t) {
	this.config = t.readCString()
}),
BoxParser.createBoxCtor("tyco", "TypeCombinationBox",
function(t) {
	var e = (this.size - this.hdr_size) / 4;
	this.compatible_brands = [];
	for (var i = 0; i < e; i++) this.compatible_brands[i] = t.readString(4)
}),
BoxParser.createFullBoxCtor("udes", "UserDescriptionProperty",
function(t) {
	this.lang = t.readCString(),
	this.name = t.readCString(),
	this.description = t.readCString(),
	this.tags = t.readCString()
}),
BoxParser.createFullBoxCtor("uncC", "UncompressedFrameConfigBox",
function(t) {
	var e;
	if (this.profile = t.readString(4), 1 != this.version && 0 == this.version) {
		for (this.component_count = t.readUint32(), this.component_index = [], this.component_bit_depth_minus_one = [], this.component_format = [], this.component_align_size = [], e = 0; e < this.component_count; e++) this.component_index.push(t.readUint16()),
		this.component_bit_depth_minus_one.push(t.readUint8()),
		this.component_format.push(t.readUint8()),
		this.component_align_size.push(t.readUint8());
		this.sampling_type = t.readUint8(),
		this.interleave_type = t.readUint8(),
		this.block_size = t.readUint8();
		var i = t.readUint8();
		this.component_little_endian = i >> 7 & 1,
		this.block_pad_lsb = i >> 6 & 1,
		this.block_little_endian = i >> 5 & 1,
		this.block_reversed = i >> 4 & 1,
		this.pad_unknown = i >> 3 & 1,
		this.pixel_size = t.readUint32(),
		this.row_align_size = t.readUint32(),
		this.tile_align_size = t.readUint32(),
		this.num_tile_cols_minus_one = t.readUint32(),
		this.num_tile_rows_minus_one = t.readUint32()
	}
}),
BoxParser.createFullBoxCtor("url ", "DataEntryUrlBox",
function(t) {
	1 !== this.flags && (this.location = t.readCString())
}),
BoxParser.createFullBoxCtor("urn ", "DataEntryUrnBox",
function(t) {
	this.name = t.readCString(),
	0 < this.size - this.hdr_size - this.name.length - 1 && (this.location = t.readCString())
}),
BoxParser.createUUIDBox("a5d40b30e81411ddba2f0800200c9a66", "LiveServerManifestBox", !0, !1,
function(t) {
	this.LiveServerManifest = t.readString(this.size - this.hdr_size).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}),
BoxParser.createUUIDBox("d08a4f1810f34a82b6c832d8aba183d3", "PiffProtectionSystemSpecificHeaderBox", !0, !1,
function(t) {
	this.system_id = BoxParser.parseHex16(t);
	var e = t.readUint32();
	0 < e && (this.data = t.readUint8Array(e))
}),
BoxParser.createUUIDBox("a2394f525a9b4f14a2446c427c648df4", "PiffSampleEncryptionBox", !0, !1),
BoxParser.createUUIDBox("8974dbce7be74c5184f97148f9882554", "PiffTrackEncryptionBox", !0, !1,
function(t) {
	this.default_AlgorithmID = t.readUint24(),
	this.default_IV_size = t.readUint8(),
	this.default_KID = BoxParser.parseHex16(t)
}),
BoxParser.createUUIDBox("d4807ef2ca3946958e5426cb9e46a79f", "TfrfBox", !0, !1,
function(t) {
	this.fragment_count = t.readUint8(),
	this.entries = [];
	for (var e = 0; e < this.fragment_count; e++) {
		var i = {},
		r = 0,
		s = 0,
		s = 1 === this.version ? (r = t.readUint64(), t.readUint64()) : (r = t.readUint32(), t.readUint32());
		i.absolute_time = r,
		i.absolute_duration = s,
		this.entries.push(i)
	}
}),
BoxParser.createUUIDBox("6d1d9b0542d544e680e2141daff757b2", "TfxdBox", !0, !1,
function(t) {
	1 === this.version ? (this.absolute_time = t.readUint64(), this.duration = t.readUint64()) : (this.absolute_time = t.readUint32(), this.duration = t.readUint32())
}),
BoxParser.createFullBoxCtor("vmhd", "VideoMediaHeaderBox",
function(t) {
	this.graphicsmode = t.readUint16(),
	this.opcolor = t.readUint16Array(3)
}),
BoxParser.createFullBoxCtor("vpcC", "VPCodecConfigurationRecord",
function(t) {
	var e;
	1 === this.version ? (this.profile = t.readUint8(), this.level = t.readUint8(), e = t.readUint8(), this.bitDepth = e >> 4, this.chromaSubsampling = e >> 1 & 7, this.videoFullRangeFlag = 1 & e, this.colourPrimaries = t.readUint8(), this.transferCharacteristics = t.readUint8(), this.matrixCoefficients = t.readUint8()) : (this.profile = t.readUint8(), this.level = t.readUint8(), e = t.readUint8(), this.bitDepth = e >> 4 & 15, this.colorSpace = 15 & e, e = t.readUint8(), this.chromaSubsampling = e >> 4 & 15, this.transferFunction = e >> 1 & 7, this.videoFullRangeFlag = 1 & e),
	this.codecIntializationDataSize = t.readUint16(),
	this.codecIntializationData = t.readUint8Array(this.codecIntializationDataSize)
}),
BoxParser.createBoxCtor("vttC", "WebVTTConfigurationBox",
function(t) {
	this.text = t.readString(this.size - this.hdr_size)
}),
BoxParser.createFullBoxCtor("vvcC", "VvcConfigurationBox",
function(t) {
	var e, i = {
		held_bits: void 0,
		num_held_bits: 0,
		stream_read_1_bytes: function(t) {
			this.held_bits = t.readUint8(),
			this.num_held_bits = 8
		},
		stream_read_2_bytes: function(t) {
			this.held_bits = t.readUint16(),
			this.num_held_bits = 16
		},
		extract_bits: function(t) {
			var e = this.held_bits >> this.num_held_bits - t & (1 << t) - 1;
			return this.num_held_bits -= t,
			e
		}
	};
	if (i.stream_read_1_bytes(t), i.extract_bits(5), this.lengthSizeMinusOne = i.extract_bits(2), this.ptl_present_flag = i.extract_bits(1), this.ptl_present_flag) {
		if (i.stream_read_2_bytes(t), this.ols_idx = i.extract_bits(9), this.num_sublayers = i.extract_bits(3), this.constant_frame_rate = i.extract_bits(2), this.chroma_format_idc = i.extract_bits(2), i.stream_read_1_bytes(t), this.bit_depth_minus8 = i.extract_bits(3), i.extract_bits(5), i.stream_read_2_bytes(t), i.extract_bits(2), this.num_bytes_constraint_info = i.extract_bits(6), this.general_profile_idc = i.extract_bits(7), this.general_tier_flag = i.extract_bits(1), this.general_level_idc = t.readUint8(), i.stream_read_1_bytes(t), this.ptl_frame_only_constraint_flag = i.extract_bits(1), this.ptl_multilayer_enabled_flag = i.extract_bits(1), this.general_constraint_info = new Uint8Array(this.num_bytes_constraint_info), this.num_bytes_constraint_info) {
			for (o = 0; o < this.num_bytes_constraint_info - 1; o++) {
				var r = i.extract_bits(6);
				i.stream_read_1_bytes(t);
				var s = i.extract_bits(2);
				this.general_constraint_info[o] = r << 2 | s
			}
			this.general_constraint_info[this.num_bytes_constraint_info - 1] = i.extract_bits(6)
		} else i.extract_bits(6);
		if (1 < this.num_sublayers) {
			for (i.stream_read_1_bytes(t), this.ptl_sublayer_present_mask = 0, e = this.num_sublayers - 2; 0 <= e; --e) {
				var a = i.extract_bits(1);
				this.ptl_sublayer_present_mask |= a << e
			}
			for (e = this.num_sublayers; e <= 8 && 1 < this.num_sublayers; ++e) i.extract_bits(1);
			for (this.sublayer_level_idc = [], e = this.num_sublayers - 2; 0 <= e; --e) this.ptl_sublayer_present_mask & 1 << e && (this.sublayer_level_idc[e] = t.readUint8())
		}
		if (this.ptl_num_sub_profiles = t.readUint8(), this.general_sub_profile_idc = [], this.ptl_num_sub_profiles) for (o = 0; o < this.ptl_num_sub_profiles; o++) this.general_sub_profile_idc.push(t.readUint32());
		this.max_picture_width = t.readUint16(),
		this.max_picture_height = t.readUint16(),
		this.avg_frame_rate = t.readUint16()
	}
	this.nalu_arrays = [];
	for (var n = t.readUint8(), o = 0; o < n; o++) {
		var h = [];
		this.nalu_arrays.push(h),
		i.stream_read_1_bytes(t),
		h.completeness = i.extract_bits(1),
		i.extract_bits(2),
		h.nalu_type = i.extract_bits(5);
		var d = 1;
		for (13 != h.nalu_type && 12 != h.nalu_type && (d = t.readUint16()), e = 0; e < d; e++) {
			var l = t.readUint16();
			h.push({
				data: t.readUint8Array(l),
				length: l
			})
		}
	}
}),
BoxParser.createFullBoxCtor("vvnC", "VvcNALUConfigBox",
function(t) {
	var e = strm.readUint8();
	this.lengthSizeMinusOne = 3 & e
}),
BoxParser.SampleEntry.prototype.isVideo = function() {
	return ! 1
},
BoxParser.SampleEntry.prototype.isAudio = function() {
	return ! 1
},
BoxParser.SampleEntry.prototype.isSubtitle = function() {
	return ! 1
},
BoxParser.SampleEntry.prototype.isMetadata = function() {
	return ! 1
},
BoxParser.SampleEntry.prototype.isHint = function() {
	return ! 1
},
BoxParser.SampleEntry.prototype.getCodec = function() {
	return this.type.replace(".", "")
},
BoxParser.SampleEntry.prototype.getWidth = function() {
	return ""
},
BoxParser.SampleEntry.prototype.getHeight = function() {
	return ""
},
BoxParser.SampleEntry.prototype.getChannelCount = function() {
	return ""
},
BoxParser.SampleEntry.prototype.getSampleRate = function() {
	return ""
},
BoxParser.SampleEntry.prototype.getSampleSize = function() {
	return ""
},
BoxParser.VisualSampleEntry.prototype.isVideo = function() {
	return ! 0
},
BoxParser.VisualSampleEntry.prototype.getWidth = function() {
	return this.width
},
BoxParser.VisualSampleEntry.prototype.getHeight = function() {
	return this.height
},
BoxParser.AudioSampleEntry.prototype.isAudio = function() {
	return ! 0
},
BoxParser.AudioSampleEntry.prototype.getChannelCount = function() {
	return this.channel_count
},
BoxParser.AudioSampleEntry.prototype.getSampleRate = function() {
	return this.samplerate
},
BoxParser.AudioSampleEntry.prototype.getSampleSize = function() {
	return this.samplesize
},
BoxParser.SubtitleSampleEntry.prototype.isSubtitle = function() {
	return ! 0
},
BoxParser.MetadataSampleEntry.prototype.isMetadata = function() {
	return ! 0
},
BoxParser.decimalToHex = function(t, e) {
	var i = Number(t).toString(16);
	for (e = null == e ? e = 2 : e; i.length < e;) i = "0" + i;
	return i
},
BoxParser.avc1SampleEntry.prototype.getCodec = BoxParser.avc2SampleEntry.prototype.getCodec = BoxParser.avc3SampleEntry.prototype.getCodec = BoxParser.avc4SampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this);
	return this.avcC ? t + "." + BoxParser.decimalToHex(this.avcC.AVCProfileIndication) + BoxParser.decimalToHex(this.avcC.profile_compatibility) + BoxParser.decimalToHex(this.avcC.AVCLevelIndication) : t
},
BoxParser.hev1SampleEntry.prototype.getCodec = BoxParser.hvc1SampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.hvcC) {
		switch (t += ".", this.hvcC.general_profile_space) {
		case 0:
			t += "";
			break;
		case 1:
			t += "A";
			break;
		case 2:
			t += "B";
			break;
		case 3:
			t += "C"
		}
		t += this.hvcC.general_profile_idc,
		t += ".";
		for (var e = this.hvcC.general_profile_compatibility,
		i = 0,
		r = 0; r < 32 && (i |= 1 & e, 31 != r); r++) i <<= 1,
		e >>= 1;
		t += BoxParser.decimalToHex(i, 0),
		t += ".",
		0 === this.hvcC.general_tier_flag ? t += "L": t += "H",
		t += this.hvcC.general_level_idc;
		var s = !1,
		a = "";
		for (r = 5; 0 <= r; r--)(this.hvcC.general_constraint_indicator[r] || s) && (a = "." + BoxParser.decimalToHex(this.hvcC.general_constraint_indicator[r], 0) + a, s = !0);
		t += a
	}
	return t
},
BoxParser.vvc1SampleEntry.prototype.getCodec = BoxParser.vvi1SampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.vvcC) {
		t += "." + this.vvcC.general_profile_idc,
		this.vvcC.general_tier_flag ? t += ".H": t += ".L",
		t += this.vvcC.general_level_idc;
		var e = "";
		if (this.vvcC.general_constraint_info) {
			var i, r = [],
			s = 0;
			for (s |= this.vvcC.ptl_frame_only_constraint << 7, s |= this.vvcC.ptl_multilayer_enabled << 6, h = 0; h < this.vvcC.general_constraint_info.length; ++h) s |= this.vvcC.general_constraint_info[h] >> 2 & 63,
			r.push(s),
			s && (i = h),
			s = this.vvcC.general_constraint_info[h] >> 2 & 3;
			if (void 0 === i) e = ".CA";
			else {
				e = ".C";
				for (var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
				n = 0,
				o = 0,
				h = 0; h <= i; ++h) for (n = n << 8 | r[h], o += 8; 5 <= o;) e += a[n >> o - 5 & 31],
				n &= (1 << (o -= 5)) - 1;
				o && (e += a[31 & (n <<= 5 - o)])
			}
		}
		t += e
	}
	return t
},
BoxParser.mp4aSampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this);
	if (this.esds && this.esds.esd) {
		var e = this.esds.esd.getOTI(),
		i = this.esds.esd.getAudioConfig();
		return t + "." + BoxParser.decimalToHex(e) + (i ? "." + i: "")
	}
	return t
},
BoxParser.stxtSampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this);
	return this.mime_format ? t + "." + this.mime_format: t
},
BoxParser.vp08SampleEntry.prototype.getCodec = BoxParser.vp09SampleEntry.prototype.getCodec = function() {
	var t = BoxParser.SampleEntry.prototype.getCodec.call(this),
	e = this.vpcC.level;
	0 == e && (e = "00");
	var i = this.vpcC.bitDepth;
	return 8 == i && (i = "08"),
	t + ".0" + this.vpcC.profile + "." + e + "." + i
},
BoxParser.av01SampleEntry.prototype.getCodec = function() {
	var t, e = BoxParser.SampleEntry.prototype.getCodec.call(this),
	i = this.av1C.seq_level_idx_0;
	return i < 10 && (i = "0" + i),
	2 === this.av1C.seq_profile && 1 === this.av1C.high_bitdepth ? t = 1 === this.av1C.twelve_bit ? "12": "10": this.av1C.seq_profile <= 2 && (t = 1 === this.av1C.high_bitdepth ? "10": "08"),
	e + "." + this.av1C.seq_profile + "." + i + (this.av1C.seq_tier_0 ? "H": "M") + "." + t
},
BoxParser.Box.prototype.writeHeader = function(t, e) {
	this.size += 8,
	this.size > MAX_SIZE && (this.size += 8),
	"uuid" === this.type && (this.size += 16),
	Log.debug("BoxWriter", "Writing box " + this.type + " of size: " + this.size + " at position " + t.getPosition() + (e || "")),
	this.size > MAX_SIZE ? t.writeUint32(1) : (this.sizePosition = t.getPosition(), t.writeUint32(this.size)),
	t.writeString(this.type, null, 4),
	"uuid" === this.type && t.writeUint8Array(this.uuid),
	this.size > MAX_SIZE && t.writeUint64(this.size)
},
BoxParser.FullBox.prototype.writeHeader = function(t) {
	this.size += 4,
	BoxParser.Box.prototype.writeHeader.call(this, t, " v=" + this.version + " f=" + this.flags),
	t.writeUint8(this.version),
	t.writeUint24(this.flags)
},
BoxParser.Box.prototype.write = function(t) {
	"mdat" === this.type ? this.data && (this.size = this.data.length, this.writeHeader(t), t.writeUint8Array(this.data)) : (this.size = this.data ? this.data.length: 0, this.writeHeader(t), this.data && t.writeUint8Array(this.data))
},
BoxParser.ContainerBox.prototype.write = function(t) {
	this.size = 0,
	this.writeHeader(t);
	for (var e = 0; e < this.boxes.length; e++) this.boxes[e] && (this.boxes[e].write(t), this.size += this.boxes[e].size);
	Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size),
	t.adjustUint32(this.sizePosition, this.size)
},
BoxParser.TrackReferenceTypeBox.prototype.write = function(t) {
	this.size = 4 * this.track_ids.length,
	this.writeHeader(t),
	t.writeUint32Array(this.track_ids)
},
BoxParser.avcCBox.prototype.write = function(t) {
	var e;
	for (this.size = 7, e = 0; e < this.SPS.length; e++) this.size += 2 + this.SPS[e].length;
	for (e = 0; e < this.PPS.length; e++) this.size += 2 + this.PPS[e].length;
	for (this.ext && (this.size += this.ext.length), this.writeHeader(t), t.writeUint8(this.configurationVersion), t.writeUint8(this.AVCProfileIndication), t.writeUint8(this.profile_compatibility), t.writeUint8(this.AVCLevelIndication), t.writeUint8(this.lengthSizeMinusOne + 252), t.writeUint8(this.SPS.length + 224), e = 0; e < this.SPS.length; e++) t.writeUint16(this.SPS[e].length),
	t.writeUint8Array(this.SPS[e].nalu);
	for (t.writeUint8(this.PPS.length), e = 0; e < this.PPS.length; e++) t.writeUint16(this.PPS[e].length),
	t.writeUint8Array(this.PPS[e].nalu);
	this.ext && t.writeUint8Array(this.ext)
},
BoxParser.co64Box.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.chunk_offsets.length, this.writeHeader(t), t.writeUint32(this.chunk_offsets.length), e = 0; e < this.chunk_offsets.length; e++) t.writeUint64(this.chunk_offsets[e])
},
BoxParser.cslgBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 20,
	this.writeHeader(t),
	t.writeInt32(this.compositionToDTSShift),
	t.writeInt32(this.leastDecodeToDisplayDelta),
	t.writeInt32(this.greatestDecodeToDisplayDelta),
	t.writeInt32(this.compositionStartTime),
	t.writeInt32(this.compositionEndTime)
},
BoxParser.cttsBox.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.sample_counts.length, this.writeHeader(t), t.writeUint32(this.sample_counts.length), e = 0; e < this.sample_counts.length; e++) t.writeUint32(this.sample_counts[e]),
	1 === this.version ? t.writeInt32(this.sample_offsets[e]) : t.writeUint32(this.sample_offsets[e])
},
BoxParser.drefBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4,
	this.writeHeader(t),
	t.writeUint32(this.entries.length);
	for (var e = 0; e < this.entries.length; e++) this.entries[e].write(t),
	this.size += this.entries[e].size;
	Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size),
	t.adjustUint32(this.sizePosition, this.size)
},
BoxParser.elngBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = this.extended_language.length,
	this.writeHeader(t),
	t.writeString(this.extended_language)
},
BoxParser.elstBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4 + 12 * this.entries.length,
	this.writeHeader(t),
	t.writeUint32(this.entries.length);
	for (var e = 0; e < this.entries.length; e++) {
		var i = this.entries[e];
		t.writeUint32(i.segment_duration),
		t.writeInt32(i.media_time),
		t.writeInt16(i.media_rate_integer),
		t.writeInt16(i.media_rate_fraction)
	}
},
BoxParser.emsgBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 16 + this.message_data.length + (this.scheme_id_uri.length + 1) + (this.value.length + 1),
	this.writeHeader(t),
	t.writeCString(this.scheme_id_uri),
	t.writeCString(this.value),
	t.writeUint32(this.timescale),
	t.writeUint32(this.presentation_time_delta),
	t.writeUint32(this.event_duration),
	t.writeUint32(this.id),
	t.writeUint8Array(this.message_data)
},
BoxParser.ftypBox.prototype.write = function(t) {
	this.size = 8 + 4 * this.compatible_brands.length,
	this.writeHeader(t),
	t.writeString(this.major_brand, null, 4),
	t.writeUint32(this.minor_version);
	for (var e = 0; e < this.compatible_brands.length; e++) t.writeString(this.compatible_brands[e], null, 4)
},
BoxParser.hdlrBox.prototype.write = function(t) {
	this.size = 20 + this.name.length + 1,
	this.version = 0,
	this.flags = 0,
	this.writeHeader(t),
	t.writeUint32(0),
	t.writeString(this.handler, null, 4),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeCString(this.name)
},
BoxParser.hvcCBox.prototype.write = function(t) {
	var e, i;
	for (this.size = 23, e = 0; e < this.nalu_arrays.length; e++) for (this.size += 3, i = 0; i < this.nalu_arrays[e].length; i++) this.size += 2 + this.nalu_arrays[e][i].data.length;
	for (this.writeHeader(t), t.writeUint8(this.configurationVersion), t.writeUint8((this.general_profile_space << 6) + (this.general_tier_flag << 5) + this.general_profile_idc), t.writeUint32(this.general_profile_compatibility), t.writeUint8Array(this.general_constraint_indicator), t.writeUint8(this.general_level_idc), t.writeUint16(this.min_spatial_segmentation_idc + (15 << 24)), t.writeUint8(this.parallelismType + 252), t.writeUint8(this.chroma_format_idc + 252), t.writeUint8(this.bit_depth_luma_minus8 + 248), t.writeUint8(this.bit_depth_chroma_minus8 + 248), t.writeUint16(this.avgFrameRate), t.writeUint8((this.constantFrameRate << 6) + (this.numTemporalLayers << 3) + (this.temporalIdNested << 2) + this.lengthSizeMinusOne), t.writeUint8(this.nalu_arrays.length), e = 0; e < this.nalu_arrays.length; e++) for (t.writeUint8((this.nalu_arrays[e].completeness << 7) + this.nalu_arrays[e].nalu_type), t.writeUint16(this.nalu_arrays[e].length), i = 0; i < this.nalu_arrays[e].length; i++) t.writeUint16(this.nalu_arrays[e][i].data.length),
	t.writeUint8Array(this.nalu_arrays[e][i].data)
},
BoxParser.kindBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = this.schemeURI.length + 1 + (this.value.length + 1),
	this.writeHeader(t),
	t.writeCString(this.schemeURI),
	t.writeCString(this.value)
},
BoxParser.mdhdBox.prototype.write = function(t) {
	this.size = 20,
	this.flags = 0,
	this.version = 0,
	this.writeHeader(t),
	t.writeUint32(this.creation_time),
	t.writeUint32(this.modification_time),
	t.writeUint32(this.timescale),
	t.writeUint32(this.duration),
	t.writeUint16(this.language),
	t.writeUint16(0)
},
BoxParser.mehdBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4,
	this.writeHeader(t),
	t.writeUint32(this.fragment_duration)
},
BoxParser.mfhdBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4,
	this.writeHeader(t),
	t.writeUint32(this.sequence_number)
},
BoxParser.mvhdBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 96,
	this.writeHeader(t),
	t.writeUint32(this.creation_time),
	t.writeUint32(this.modification_time),
	t.writeUint32(this.timescale),
	t.writeUint32(this.duration),
	t.writeUint32(this.rate),
	t.writeUint16(this.volume << 8),
	t.writeUint16(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32Array(this.matrix),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(this.next_track_id)
},
BoxParser.SampleEntry.prototype.writeHeader = function(t) {
	this.size = 8,
	BoxParser.Box.prototype.writeHeader.call(this, t),
	t.writeUint8(0),
	t.writeUint8(0),
	t.writeUint8(0),
	t.writeUint8(0),
	t.writeUint8(0),
	t.writeUint8(0),
	t.writeUint16(this.data_reference_index)
},
BoxParser.SampleEntry.prototype.writeFooter = function(t) {
	for (var e = 0; e < this.boxes.length; e++) this.boxes[e].write(t),
	this.size += this.boxes[e].size;
	Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size),
	t.adjustUint32(this.sizePosition, this.size)
},
BoxParser.SampleEntry.prototype.write = function(t) {
	this.writeHeader(t),
	t.writeUint8Array(this.data),
	this.size += this.data.length,
	Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size),
	t.adjustUint32(this.sizePosition, this.size)
},
BoxParser.VisualSampleEntry.prototype.write = function(t) {
	this.writeHeader(t),
	this.size += 70,
	t.writeUint16(0),
	t.writeUint16(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint16(this.width),
	t.writeUint16(this.height),
	t.writeUint32(this.horizresolution),
	t.writeUint32(this.vertresolution),
	t.writeUint32(0),
	t.writeUint16(this.frame_count),
	t.writeUint8(Math.min(31, this.compressorname.length)),
	t.writeString(this.compressorname, null, 31),
	t.writeUint16(this.depth),
	t.writeInt16(-1),
	this.writeFooter(t)
},
BoxParser.AudioSampleEntry.prototype.write = function(t) {
	this.writeHeader(t),
	this.size += 20,
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeUint16(this.channel_count),
	t.writeUint16(this.samplesize),
	t.writeUint16(0),
	t.writeUint16(0),
	t.writeUint32(this.samplerate << 16),
	this.writeFooter(t)
},
BoxParser.stppSampleEntry.prototype.write = function(t) {
	this.writeHeader(t),
	this.size += this.namespace.length + 1 + this.schema_location.length + 1 + this.auxiliary_mime_types.length + 1,
	t.writeCString(this.namespace),
	t.writeCString(this.schema_location),
	t.writeCString(this.auxiliary_mime_types),
	this.writeFooter(t)
},
BoxParser.SampleGroupEntry.prototype.write = function(t) {
	t.writeUint8Array(this.data)
},
BoxParser.sbgpBox.prototype.write = function(t) {
	this.version = 1,
	this.flags = 0,
	this.size = 12 + 8 * this.entries.length,
	this.writeHeader(t),
	t.writeString(this.grouping_type, null, 4),
	t.writeUint32(this.grouping_type_parameter),
	t.writeUint32(this.entries.length);
	for (var e = 0; e < this.entries.length; e++) {
		var i = this.entries[e];
		t.writeInt32(i.sample_count),
		t.writeInt32(i.group_description_index)
	}
},
BoxParser.sgpdBox.prototype.write = function(t) {
	var e, i;
	for (this.flags = 0, this.size = 12, e = 0; e < this.entries.length; e++) i = this.entries[e],
	1 === this.version && (0 === this.default_length && (this.size += 4), this.size += i.data.length);
	for (this.writeHeader(t), t.writeString(this.grouping_type, null, 4), 1 === this.version && t.writeUint32(this.default_length), 2 <= this.version && t.writeUint32(this.default_sample_description_index), t.writeUint32(this.entries.length), e = 0; e < this.entries.length; e++) i = this.entries[e],
	1 === this.version && 0 === this.default_length && t.writeUint32(i.description_length),
	i.write(t)
},
BoxParser.sidxBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 20 + 12 * this.references.length,
	this.writeHeader(t),
	t.writeUint32(this.reference_ID),
	t.writeUint32(this.timescale),
	t.writeUint32(this.earliest_presentation_time),
	t.writeUint32(this.first_offset),
	t.writeUint16(0),
	t.writeUint16(this.references.length);
	for (var e = 0; e < this.references.length; e++) {
		var i = this.references[e];
		t.writeUint32(i.reference_type << 31 | i.referenced_size),
		t.writeUint32(i.subsegment_duration),
		t.writeUint32(i.starts_with_SAP << 31 | i.SAP_type << 28 | i.SAP_delta_time)
	}
},
BoxParser.smhdBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 1,
	this.size = 4,
	this.writeHeader(t),
	t.writeUint16(this.balance),
	t.writeUint16(0)
},
BoxParser.stcoBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4 + 4 * this.chunk_offsets.length,
	this.writeHeader(t),
	t.writeUint32(this.chunk_offsets.length),
	t.writeUint32Array(this.chunk_offsets)
},
BoxParser.stscBox.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 4 + 12 * this.first_chunk.length, this.writeHeader(t), t.writeUint32(this.first_chunk.length), e = 0; e < this.first_chunk.length; e++) t.writeUint32(this.first_chunk[e]),
	t.writeUint32(this.samples_per_chunk[e]),
	t.writeUint32(this.sample_description_index[e])
},
BoxParser.stsdBox.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 0, this.writeHeader(t), t.writeUint32(this.entries.length), this.size += 4, e = 0; e < this.entries.length; e++) this.entries[e].write(t),
	this.size += this.entries[e].size;
	Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size),
	t.adjustUint32(this.sizePosition, this.size)
},
BoxParser.stshBox.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.shadowed_sample_numbers.length, this.writeHeader(t), t.writeUint32(this.shadowed_sample_numbers.length), e = 0; e < this.shadowed_sample_numbers.length; e++) t.writeUint32(this.shadowed_sample_numbers[e]),
	t.writeUint32(this.sync_sample_numbers[e])
},
BoxParser.stssBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 4 + 4 * this.sample_numbers.length,
	this.writeHeader(t),
	t.writeUint32(this.sample_numbers.length),
	t.writeUint32Array(this.sample_numbers)
},
BoxParser.stszBox.prototype.write = function(t) {
	var e, i = !0;
	if (this.version = 0, (this.flags = 0) < this.sample_sizes.length) for (e = 0; e + 1 < this.sample_sizes.length;) {
		if (this.sample_sizes[e + 1] !== this.sample_sizes[0]) {
			i = !1;
			break
		}
		e++
	} else i = !1;
	this.size = 8,
	i || (this.size += 4 * this.sample_sizes.length),
	this.writeHeader(t),
	i ? t.writeUint32(this.sample_sizes[0]) : t.writeUint32(0),
	t.writeUint32(this.sample_sizes.length),
	i || t.writeUint32Array(this.sample_sizes)
},
BoxParser.sttsBox.prototype.write = function(t) {
	var e;
	for (this.version = 0, this.flags = 0, this.size = 4 + 8 * this.sample_counts.length, this.writeHeader(t), t.writeUint32(this.sample_counts.length), e = 0; e < this.sample_counts.length; e++) t.writeUint32(this.sample_counts[e]),
	t.writeUint32(this.sample_deltas[e])
},
BoxParser.tfdtBox.prototype.write = function(t) {
	var e = Math.pow(2, 32) - 1;
	this.version = this.baseMediaDecodeTime > e ? 1 : 0,
	this.flags = 0,
	this.size = 4,
	1 === this.version && (this.size += 4),
	this.writeHeader(t),
	1 === this.version ? t.writeUint64(this.baseMediaDecodeTime) : t.writeUint32(this.baseMediaDecodeTime)
},
BoxParser.tfhdBox.prototype.write = function(t) {
	this.version = 0,
	this.size = 4,
	this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET && (this.size += 8),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC && (this.size += 4),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR && (this.size += 4),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE && (this.size += 4),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS && (this.size += 4),
	this.writeHeader(t),
	t.writeUint32(this.track_id),
	this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET && t.writeUint64(this.base_data_offset),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC && t.writeUint32(this.default_sample_description_index),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR && t.writeUint32(this.default_sample_duration),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE && t.writeUint32(this.default_sample_size),
	this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS && t.writeUint32(this.default_sample_flags)
},
BoxParser.tkhdBox.prototype.write = function(t) {
	this.version = 0,
	this.size = 80,
	this.writeHeader(t),
	t.writeUint32(this.creation_time),
	t.writeUint32(this.modification_time),
	t.writeUint32(this.track_id),
	t.writeUint32(0),
	t.writeUint32(this.duration),
	t.writeUint32(0),
	t.writeUint32(0),
	t.writeInt16(this.layer),
	t.writeInt16(this.alternate_group),
	t.writeInt16(this.volume << 8),
	t.writeUint16(0),
	t.writeInt32Array(this.matrix),
	t.writeUint32(this.width),
	t.writeUint32(this.height)
},
BoxParser.trexBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = 20,
	this.writeHeader(t),
	t.writeUint32(this.track_id),
	t.writeUint32(this.default_sample_description_index),
	t.writeUint32(this.default_sample_duration),
	t.writeUint32(this.default_sample_size),
	t.writeUint32(this.default_sample_flags)
},
BoxParser.trunBox.prototype.write = function(t) {
	this.version = 0,
	this.size = 4,
	this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET && (this.size += 4),
	this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG && (this.size += 4),
	this.flags & BoxParser.TRUN_FLAGS_DURATION && (this.size += 4 * this.sample_duration.length),
	this.flags & BoxParser.TRUN_FLAGS_SIZE && (this.size += 4 * this.sample_size.length),
	this.flags & BoxParser.TRUN_FLAGS_FLAGS && (this.size += 4 * this.sample_flags.length),
	this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET && (this.size += 4 * this.sample_composition_time_offset.length),
	this.writeHeader(t),
	t.writeUint32(this.sample_count),
	this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET && (this.data_offset_position = t.getPosition(), t.writeInt32(this.data_offset)),
	this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG && t.writeUint32(this.first_sample_flags);
	for (var e = 0; e < this.sample_count; e++) this.flags & BoxParser.TRUN_FLAGS_DURATION && t.writeUint32(this.sample_duration[e]),
	this.flags & BoxParser.TRUN_FLAGS_SIZE && t.writeUint32(this.sample_size[e]),
	this.flags & BoxParser.TRUN_FLAGS_FLAGS && t.writeUint32(this.sample_flags[e]),
	this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET && (0 === this.version ? t.writeUint32(this.sample_composition_time_offset[e]) : t.writeInt32(this.sample_composition_time_offset[e]))
},
BoxParser["url Box"].prototype.write = function(t) {
	this.version = 0,
	this.location ? (this.flags = 0, this.size = this.location.length + 1) : (this.flags = 1, this.size = 0),
	this.writeHeader(t),
	this.location && t.writeCString(this.location)
},
BoxParser["urn Box"].prototype.write = function(t) {
	this.version = 0,
	this.flags = 0,
	this.size = this.name.length + 1 + (this.location ? this.location.length + 1 : 0),
	this.writeHeader(t),
	t.writeCString(this.name),
	this.location && t.writeCString(this.location)
},
BoxParser.vmhdBox.prototype.write = function(t) {
	this.version = 0,
	this.flags = 1,
	this.size = 8,
	this.writeHeader(t),
	t.writeUint16(this.graphicsmode),
	t.writeUint16Array(this.opcolor)
},
BoxParser.cttsBox.prototype.unpack = function(t) {
	for (var e, i = 0,
	r = 0; r < this.sample_counts.length; r++) for (e = 0; e < this.sample_counts[r]; e++) t[i].pts = t[i].dts + this.sample_offsets[r],
	i++
},
BoxParser.sttsBox.prototype.unpack = function(t) {
	for (var e, i = 0,
	r = 0; r < this.sample_counts.length; r++) for (e = 0; e < this.sample_counts[r]; e++) t[i].dts = 0 === i ? 0 : t[i - 1].dts + this.sample_deltas[r],
	i++
},
BoxParser.stcoBox.prototype.unpack = function(t) {
	for (var e = 0; e < this.chunk_offsets.length; e++) t[e].offset = this.chunk_offsets[e]
},
BoxParser.stscBox.prototype.unpack = function(t) {
	for (var e, i, r = 0,
	s = 0,
	a = 0; a < this.first_chunk.length; a++) for (e = 0; e < (a + 1 < this.first_chunk.length ? this.first_chunk[a + 1] : 1 / 0); e++) for (s++, i = 0; i < this.samples_per_chunk[a]; i++) {
		if (!t[r]) return;
		t[r].description_index = this.sample_description_index[a],
		t[r].chunk_index = s,
		r++
	}
},
BoxParser.stszBox.prototype.unpack = function(t) {
	for (var e = 0; e < this.sample_sizes.length; e++) t[e].size = this.sample_sizes[e]
},
BoxParser.DIFF_BOXES_PROP_NAMES = ["boxes", "entries", "references", "subsamples", "items", "item_infos", "extents", "associations", "subsegments", "ranges", "seekLists", "seekPoints", "esd", "levels"],
BoxParser.DIFF_PRIMITIVE_ARRAY_PROP_NAMES = ["compatible_brands", "matrix", "opcolor", "sample_counts", "sample_deltas", "first_chunk", "samples_per_chunk", "sample_sizes", "chunk_offsets", "sample_offsets", "sample_description_index", "sample_duration"],
BoxParser.boxEqualFields = function(t, e) {
	if (t && !e) return ! 1;
	for (var i in t) if (! (-1 < BoxParser.DIFF_BOXES_PROP_NAMES.indexOf(i) || t[i] instanceof BoxParser.Box || e[i] instanceof BoxParser.Box || void 0 === t[i] || void 0 === e[i] || "function" == typeof t[i] || "function" == typeof e[i] || t.subBoxNames && -1 < t.subBoxNames.indexOf(i.slice(0, 4)) || e.subBoxNames && -1 < e.subBoxNames.indexOf(i.slice(0, 4)) || "data" === i || "start" === i || "size" === i || "creation_time" === i || "modification_time" === i || -1 < BoxParser.DIFF_PRIMITIVE_ARRAY_PROP_NAMES.indexOf(i) || t[i] === e[i])) return ! 1;
	return ! 0
},
BoxParser.boxEqual = function(t, e) {
	if (!BoxParser.boxEqualFields(t, e)) return ! 1;
	for (var i = 0; i < BoxParser.DIFF_BOXES_PROP_NAMES.length; i++) {
		var r = BoxParser.DIFF_BOXES_PROP_NAMES[i];
		if (t[r] && e[r] && !BoxParser.boxEqual(t[r], e[r])) return ! 1
	}
	return ! 0
};
var VTTin4Parser = function() {};
VTTin4Parser.prototype.parseSample = function(t) {
	for (var e, i = new MP4BoxStream(t.buffer), r = []; ! i.isEos();)(e = BoxParser.parseOneBox(i, !1)).code === BoxParser.OK && "vttc" === e.box.type && r.push(e.box);
	return r
},
VTTin4Parser.prototype.getText = function(t, e, i) {
	function s(t, e, i) {
		return i = i || "0",
		(t += "").length >= e ? t: new Array(e - t.length + 1).join(i) + t
	}
	function r(t) {
		var e = Math.floor(t / 3600),
		i = Math.floor((t - 3600 * e) / 60),
		r = Math.floor(t - 3600 * e - 60 * i),
		t = Math.floor(1e3 * (t - 3600 * e - 60 * i - r));
		return s(e, 2) + ":" + s(i, 2) + ":" + s(r, 2) + "." + s(t, 3)
	}
	for (var a = this.parseSample(i), n = "", o = 0; o < a.length; o++) {
		var h = a[o];
		n += r(t) + " --\\x3e " + r(e) + "\\r\\n",
		n += h.payl.text
	}
	return n
};
var XMLSubtitlein4Parser = function() {};
XMLSubtitlein4Parser.prototype.parseSample = function(t) {
	var e, i = {
		resources: []
	},
	r = new MP4BoxStream(t.data.buffer);
	if (t.subsamples && 0 !== t.subsamples.length) {
		if (i.documentString = r.readString(t.subsamples[0].size), 1 < t.subsamples.length) for (e = 1; e < t.subsamples.length; e++) i.resources[e] = r.readUint8Array(t.subsamples[e].size)
	} else i.documentString = r.readString(t.data.length);
	return "undefined" != typeof DOMParser && (i.document = (new DOMParser).parseFromString(i.documentString, "application/xml")),
	i
};
var Textin4Parser = function() {};
Textin4Parser.prototype.parseSample = function(t) {
	return new MP4BoxStream(t.data.buffer).readString(t.data.length)
},
Textin4Parser.prototype.parseConfig = function(t) {
	t = new MP4BoxStream(t.buffer);
	return t.readUint32(),
	t.readCString()
},
"undefined" != typeof exports && (exports.VTTin4Parser = VTTin4Parser, exports.XMLSubtitlein4Parser = XMLSubtitlein4Parser, exports.Textin4Parser = Textin4Parser);
var ISOFile = function(t) {
	this.stream = t || new MultiBufferStream,
	this.boxes = [],
	this.mdats = [],
	this.moofs = [],
	this.isProgressive = !1,
	this.moovStartFound = !1,
	this.onMoovStart = null,
	this.moovStartSent = !1,
	this.onReady = null,
	this.readySent = !1,
	this.onSegment = null,
	this.onSamples = null,
	this.onError = null,
	this.sampleListBuilt = !1,
	this.fragmentedTracks = [],
	this.extractedTracks = [],
	this.isFragmentationInitialized = !1,
	this.sampleProcessingStarted = !1,
	this.nextMoofNumber = 0,
	this.itemListBuilt = !1,
	this.items = [],
	this.entity_groups = [],
	this.onSidx = null,
	this.sidxSent = !1
};
ISOFile.prototype.setSegmentOptions = function(t, e, i) {
	var r, s = this.getTrackById(t);
	s && (r = {},
	this.fragmentedTracks.push(r), r.id = t, r.user = e, (r.trak = s).nextSample = 0, r.segmentStream = null, r.nb_samples = 1e3, r.rapAlignement = !0, i && (i.nbSamples && (r.nb_samples = i.nbSamples), i.rapAlignement && (r.rapAlignement = i.rapAlignement)))
},
ISOFile.prototype.unsetSegmentOptions = function(t) {
	for (var e = -1,
	i = 0; i < this.fragmentedTracks.length; i++) this.fragmentedTracks[i].id == t && (e = i); - 1 < e && this.fragmentedTracks.splice(e, 1)
},
ISOFile.prototype.setExtractionOptions = function(t, e, i) {
	var r, s = this.getTrackById(t);
	s && (r = {},
	this.extractedTracks.push(r), r.id = t, r.user = e, (r.trak = s).nextSample = 0, r.nb_samples = 1e3, r.samples = [], i && i.nbSamples && (r.nb_samples = i.nbSamples))
},
ISOFile.prototype.unsetExtractionOptions = function(t) {
	for (var e = -1,
	i = 0; i < this.extractedTracks.length; i++) this.extractedTracks[i].id == t && (e = i); - 1 < e && this.extractedTracks.splice(e, 1)
},
ISOFile.prototype.parse = function() {
	var t;
	if (!this.restoreParsePosition || this.restoreParsePosition()) for (;;) if (this.hasIncompleteMdat && this.hasIncompleteMdat()) {
		if (!this.processIncompleteMdat()) return
	} else if (this.saveParsePosition && this.saveParsePosition(), (t = BoxParser.parseOneBox(this.stream, !1)).code === BoxParser.ERR_NOT_ENOUGH_DATA) {
		if (!this.processIncompleteBox) return;
		if (!this.processIncompleteBox(t)) return
	} else {
		var e, i = "uuid" !== (e = t.box).type ? e.type: e.uuid;
		switch (this.boxes.push(e), i) {
		case "mdat":
			this.mdats.push(e);
			break;
		case "moof":
			this.moofs.push(e);
			break;
		case "moov":
			this.moovStartFound = !0,
			0 === this.mdats.length && (this.isProgressive = !0);
		default:
			void 0 !== this[i] && Log.warn("ISOFile", "Duplicate Box of type: " + i + ", overriding previous occurrence"),
			this[i] = e
		}
		this.updateUsedBytes && this.updateUsedBytes(e, t)
	}
},
ISOFile.prototype.checkBuffer = function(t) {
	if (null == t) throw "Buffer must be defined and non empty";
	if (void 0 === t.fileStart) throw "Buffer must have a fileStart property";
	return 0 === t.byteLength ? (Log.warn("ISOFile", "Ignoring empty buffer (fileStart: " + t.fileStart + ")"), this.stream.logBufferLevel(), !1) : (Log.info("ISOFile", "Processing buffer (fileStart: " + t.fileStart + ")"), t.usedBytes = 0, this.stream.insertBuffer(t), this.stream.logBufferLevel(), !!this.stream.initialized() || (Log.warn("ISOFile", "Not ready to start parsing"), !1))
},
ISOFile.prototype.appendBuffer = function(t, e) {
	var i;
	if (this.checkBuffer(t)) return this.parse(),
	this.moovStartFound && !this.moovStartSent && (this.moovStartSent = !0, this.onMoovStart && this.onMoovStart()),
	this.moov ? (this.sampleListBuilt || (this.buildSampleLists(), this.sampleListBuilt = !0), this.updateSampleLists(), this.onReady && !this.readySent && (this.readySent = !0, this.onReady(this.getInfo())), this.processSamples(e), this.nextSeekPosition ? (i = this.nextSeekPosition, this.nextSeekPosition = void 0) : i = this.nextParsePosition, this.stream.getEndFilePositionAfter && (i = this.stream.getEndFilePositionAfter(i))) : i = this.nextParsePosition || 0,
	this.sidx && this.onSidx && !this.sidxSent && (this.onSidx(this.sidx), this.sidxSent = !0),
	this.meta && (this.flattenItemInfo && !this.itemListBuilt && (this.flattenItemInfo(), this.itemListBuilt = !0), this.processItems && this.processItems(this.onItem)),
	this.stream.cleanBuffers && (Log.info("ISOFile", "Done processing buffer (fileStart: " + t.fileStart + ") - next buffer to fetch should have a fileStart position of " + i), this.stream.logBufferLevel(), this.stream.cleanBuffers(), this.stream.logBufferLevel(!0), Log.info("ISOFile", "Sample data size in memory: " + this.getAllocatedSampleDataSize())),
	i
},
ISOFile.prototype.getInfo = function() {
	var t, e, i, r, s, a, n = {},
	o = new Date("1904-01-01T00:00:00Z").getTime();
	if (this.moov) for (n.hasMoov = !0, n.duration = this.moov.mvhd.duration, n.timescale = this.moov.mvhd.timescale, n.isFragmented = null != this.moov.mvex, n.isFragmented && this.moov.mvex.mehd && (n.fragment_duration = this.moov.mvex.mehd.fragment_duration), n.isProgressive = this.isProgressive, n.hasIOD = null != this.moov.iods, n.brands = [], n.brands.push(this.ftyp.major_brand), n.brands = n.brands.concat(this.ftyp.compatible_brands), n.created = new Date(o + 1e3 * this.moov.mvhd.creation_time), n.modified = new Date(o + 1e3 * this.moov.mvhd.modification_time), n.tracks = [], n.audioTracks = [], n.videoTracks = [], n.subtitleTracks = [], n.metadataTracks = [], n.hintTracks = [], n.otherTracks = [], t = 0; t < this.moov.traks.length; t++) {
		if (a = (i = this.moov.traks[t]).mdia.minf.stbl.stsd.entries[0], r = {},
		n.tracks.push(r), r.id = i.tkhd.track_id, r.name = i.mdia.hdlr.name, r.references = [], i.tref) for (e = 0; e < i.tref.boxes.length; e++) s = {},
		r.references.push(s),
		s.type = i.tref.boxes[e].type,
		s.track_ids = i.tref.boxes[e].track_ids;
		i.edts && (r.edits = i.edts.elst.entries),
		r.created = new Date(o + 1e3 * i.tkhd.creation_time),
		r.modified = new Date(o + 1e3 * i.tkhd.modification_time),
		r.movie_duration = i.tkhd.duration,
		r.movie_timescale = n.timescale,
		r.layer = i.tkhd.layer,
		r.alternate_group = i.tkhd.alternate_group,
		r.volume = i.tkhd.volume,
		r.matrix = i.tkhd.matrix,
		r.track_width = i.tkhd.width / 65536,
		r.track_height = i.tkhd.height / 65536,
		r.timescale = i.mdia.mdhd.timescale,
		r.cts_shift = i.mdia.minf.stbl.cslg,
		r.duration = i.mdia.mdhd.duration,
		r.samples_duration = i.samples_duration,
		r.codec = a.getCodec(),
		r.kind = i.udta && i.udta.kinds.length ? i.udta.kinds[0] : {
			schemeURI: "",
			value: ""
		},
		r.language = i.mdia.elng ? i.mdia.elng.extended_language: i.mdia.mdhd.languageString,
		r.nb_samples = i.samples.length,
		r.size = i.samples_size,
		r.bitrate = 8 * r.size * r.timescale / r.samples_duration,
		a.isAudio() ? (r.type = "audio", n.audioTracks.push(r), r.audio = {},
		r.audio.sample_rate = a.getSampleRate(), r.audio.channel_count = a.getChannelCount(), r.audio.sample_size = a.getSampleSize()) : a.isVideo() ? (r.type = "video", n.videoTracks.push(r), r.video = {},
		r.video.width = a.getWidth(), r.video.height = a.getHeight()) : a.isSubtitle() ? (r.type = "subtitles", n.subtitleTracks.push(r)) : a.isHint() ? (r.type = "metadata", n.hintTracks.push(r)) : a.isMetadata() ? (r.type = "metadata", n.metadataTracks.push(r)) : (r.type = "metadata", n.otherTracks.push(r))
	} else n.hasMoov = !1;
	if (n.mime = "", n.hasMoov && n.tracks) {
		for (n.videoTracks && 0 < n.videoTracks.length ? n.mime += 'video/mp4; codecs="': n.audioTracks && 0 < n.audioTracks.length ? n.mime += 'audio/mp4; codecs="': n.mime += 'application/mp4; codecs="', t = 0; t < n.tracks.length; t++) 0 !== t && (n.mime += ","),
		n.mime += n.tracks[t].codec;
		n.mime += '"; profiles="',
		n.mime += this.ftyp.compatible_brands.join(),
		n.mime += '"'
	}
	return n
},
ISOFile.prototype.setNextSeekPositionFromSample = function(t) {
	t && (this.nextSeekPosition ? this.nextSeekPosition = Math.min(t.offset + t.alreadyRead, this.nextSeekPosition) : this.nextSeekPosition = t.offset + t.alreadyRead)
},
ISOFile.prototype.processSamples = function(t) {
	var e;
	if (this.sampleProcessingStarted) {
		if (this.isFragmentationInitialized && null !== this.onSegment) for (e = 0; e < this.fragmentedTracks.length; e++) for (var i = this.fragmentedTracks[e], r = i.trak; r.nextSample < r.samples.length && this.sampleProcessingStarted;) {
			Log.debug("ISOFile", "Creating media fragment on track #" + i.id + " for sample " + r.nextSample);
			var s = this.createFragment(i.id, r.nextSample, i.segmentStream);
			if (!s) break;
			if (i.segmentStream = s, r.nextSample++, (r.nextSample % i.nb_samples == 0 || t || r.nextSample >= r.samples.length) && (Log.info("ISOFile", "Sending fragmented data on track #" + i.id + " for samples [" + Math.max(0, r.nextSample - i.nb_samples) + "," + (r.nextSample - 1) + "]"), Log.info("ISOFile", "Sample data size in memory: " + this.getAllocatedSampleDataSize()), this.onSegment && this.onSegment(i.id, i.user, i.segmentStream.buffer, r.nextSample, t || r.nextSample >= r.samples.length), i.segmentStream = null, i !== this.fragmentedTracks[e])) break
		}
		if (null !== this.onSamples) for (e = 0; e < this.extractedTracks.length; e++) {
			var a = this.extractedTracks[e];
			for (r = a.trak; r.nextSample < r.samples.length && this.sampleProcessingStarted;) {
				Log.debug("ISOFile", "Exporting on track #" + a.id + " sample #" + r.nextSample);
				var n = this.getSample(r, r.nextSample);
				if (!n) {
					this.setNextSeekPositionFromSample(r.samples[r.nextSample]);
					break
				}
				if (r.nextSample++, a.samples.push(n), (r.nextSample % a.nb_samples == 0 || r.nextSample >= r.samples.length) && (Log.debug("ISOFile", "Sending samples on track #" + a.id + " for sample " + r.nextSample), this.onSamples && this.onSamples(a.id, a.user, a.samples), a.samples = [], a !== this.extractedTracks[e])) break
			}
		}
	}
},
ISOFile.prototype.getBox = function(t) {
	t = this.getBoxes(t, !0);
	return t.length ? t[0] : null
},
ISOFile.prototype.getBoxes = function(t, e) {
	var i = [];
	return ISOFile._sweep.call(this, t, i, e),
	i
},
ISOFile._sweep = function(t, e, i) {
	for (var r in this.type && this.type == t && e.push(this), this.boxes) {
		if (e.length && i) return;
		ISOFile._sweep.call(this.boxes[r], t, e, i)
	}
},
ISOFile.prototype.getTrackSamplesInfo = function(t) {
	t = this.getTrackById(t);
	if (t) return t.samples
},
ISOFile.prototype.getTrackSample = function(t, e) {
	t = this.getTrackById(t);
	return this.getSample(t, e)
},
ISOFile.prototype.releaseUsedSamples = function(t, e) {
	var i = 0,
	r = this.getTrackById(t);
	r.lastValidSample || (r.lastValidSample = 0);
	for (var s = r.lastValidSample; s < e; s++) i += this.releaseSample(r, s);
	Log.info("ISOFile", "Track #" + t + " released samples up to " + e + " (released size: " + i + ", remaining: " + this.samplesDataSize + ")"),
	r.lastValidSample = e
},
ISOFile.prototype.start = function() {
	this.sampleProcessingStarted = !0,
	this.processSamples(!1)
},
ISOFile.prototype.stop = function() {
	this.sampleProcessingStarted = !1
},
ISOFile.prototype.flush = function() {
	Log.info("ISOFile", "Flushing remaining samples"),
	this.updateSampleLists(),
	this.processSamples(!0),
	this.stream.cleanBuffers(),
	this.stream.logBufferLevel(!0)
},
ISOFile.prototype.seekTrack = function(t, e, i) {
	var r, s, a, n, o = 0,
	h = 0;
	if (0 === i.samples.length) return Log.info("ISOFile", "No sample in track, cannot seek! Using time " + Log.getDurationString(0, 1) + " and offset: 0"),
	{
		offset: 0,
		time: 0
	};
	for (r = 0; r < i.samples.length; r++) {
		if (s = i.samples[r], 0 === r) h = 0,
		n = s.timescale;
		else if (s.cts > t * s.timescale) {
			h = r - 1;
			break
		}
		e && s.is_sync && (o = r)
	}
	for (e && (h = o), t = i.samples[h].cts, i.nextSample = h; i.samples[h].alreadyRead === i.samples[h].size && i.samples[h + 1];) h++;
	return a = i.samples[h].offset + i.samples[h].alreadyRead,
	Log.info("ISOFile", "Seeking to " + (e ? "RAP": "") + " sample #" + i.nextSample + " on track " + i.tkhd.track_id + ", time " + Log.getDurationString(t, n) + " and offset: " + a),
	{
		offset: a,
		time: t / n
	}
},
ISOFile.prototype.getTrackDuration = function(t) {
	return t.samples ? ((t = t.samples[t.samples.length - 1]).cts + t.duration) / t.timescale: 1 / 0
},
ISOFile.prototype.seek = function(t, e) {
	var i, r, s = this.moov,
	a = {
		offset: 1 / 0,
		time: 1 / 0
	};
	if (this.moov) {
		for (r = 0; r < s.traks.length; r++) i = s.traks[r],
		t > this.getTrackDuration(i) || ((i = this.seekTrack(t, e, i)).offset < a.offset && (a.offset = i.offset), i.time < a.time && (a.time = i.time));
		return Log.info("ISOFile", "Seeking at time " + Log.getDurationString(a.time, 1) + " needs a buffer with a fileStart position of " + a.offset),
		a.offset === 1 / 0 ? a = {
			offset: this.nextParsePosition,
			time: 0
		}: a.offset = this.stream.getEndFilePositionAfter(a.offset),
		Log.info("ISOFile", "Adjusted seek position (after checking data already in buffer): " + a.offset),
		a
	}
	throw "Cannot seek: moov not received!"
},
ISOFile.prototype.equal = function(t) {
	for (var e = 0; e < this.boxes.length && e < t.boxes.length;) {
		var i = this.boxes[e],
		r = t.boxes[e];
		if (!BoxParser.boxEqual(i, r)) return ! 1;
		e++
	}
	return ! 0
},
"undefined" != typeof exports && (exports.ISOFile = ISOFile),
ISOFile.prototype.lastBoxStartPosition = 0,
ISOFile.prototype.parsingMdat = null,
ISOFile.prototype.nextParsePosition = 0,
ISOFile.prototype.discardMdatData = !1,
ISOFile.prototype.processIncompleteBox = function(t) {
	var e;
	return "mdat" === t.type ? (e = new BoxParser[t.type + "Box"](t.size), this.parsingMdat = e, this.boxes.push(e), this.mdats.push(e), e.start = t.start, e.hdr_size = t.hdr_size, this.stream.addUsedBytes(e.hdr_size), this.lastBoxStartPosition = e.start + e.size, this.stream.seek(e.start + e.size, !1, this.discardMdatData) ? !(this.parsingMdat = null) : (this.moovStartFound ? this.nextParsePosition = this.stream.findEndContiguousBuf() : this.nextParsePosition = e.start + e.size, !1)) : ("moov" === t.type && (this.moovStartFound = !0, 0 === this.mdats.length && (this.isProgressive = !0)), !!this.stream.mergeNextBuffer && this.stream.mergeNextBuffer() ? (this.nextParsePosition = this.stream.getEndPosition(), !0) : (!t.type || this.moovStartFound ? this.nextParsePosition = this.stream.getEndPosition() : this.nextParsePosition = this.stream.getPosition() + t.size, !1))
},
ISOFile.prototype.hasIncompleteMdat = function() {
	return null !== this.parsingMdat
},
ISOFile.prototype.processIncompleteMdat = function() {
	var t = this.parsingMdat;
	return this.stream.seek(t.start + t.size, !1, this.discardMdatData) ? (Log.debug("ISOFile", "Found 'mdat' end in buffered data"), !(this.parsingMdat = null)) : (this.nextParsePosition = this.stream.findEndContiguousBuf(), !1)
},
ISOFile.prototype.restoreParsePosition = function() {
	return this.stream.seek(this.lastBoxStartPosition, !0, this.discardMdatData)
},
ISOFile.prototype.saveParsePosition = function() {
	this.lastBoxStartPosition = this.stream.getPosition()
},
ISOFile.prototype.updateUsedBytes = function(t, e) {
	this.stream.addUsedBytes && ("mdat" === t.type ? (this.stream.addUsedBytes(t.hdr_size), this.discardMdatData && this.stream.addUsedBytes(t.size - t.hdr_size)) : this.stream.addUsedBytes(t.size))
},
ISOFile.prototype.add = BoxParser.Box.prototype.add,
ISOFile.prototype.addBox = BoxParser.Box.prototype.addBox,
ISOFile.prototype.init = function(t) {
	var e = t || {},
	t = (this.add("ftyp").set("major_brand", e.brands && e.brands[0] || "iso4").set("minor_version", 0).set("compatible_brands", e.brands || ["iso4"]), this.add("moov"));
	return t.add("mvhd").set("timescale", e.timescale || 600).set("rate", e.rate || 65536).set("creation_time", 0).set("modification_time", 0).set("duration", e.duration || 0).set("volume", e.width ? 0 : 256).set("matrix", [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]).set("next_track_id", 1),
	t.add("mvex"),
	this
},
ISOFile.prototype.addTrack = function(t) {
	this.moov || this.init(t);
	var e = t || {};
	e.width = e.width || 320,
	e.height = e.height || 320,
	e.id = e.id || this.moov.mvhd.next_track_id,
	e.type = e.type || "avc1";
	var i = this.moov.add("trak");
	this.moov.mvhd.next_track_id = e.id + 1,
	i.add("tkhd").set("flags", BoxParser.TKHD_FLAG_ENABLED | BoxParser.TKHD_FLAG_IN_MOVIE | BoxParser.TKHD_FLAG_IN_PREVIEW).set("creation_time", 0).set("modification_time", 0).set("track_id", e.id).set("duration", e.duration || 0).set("layer", e.layer || 0).set("alternate_group", 0).set("volume", 1).set("matrix", [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]).set("width", e.width << 16).set("height", e.height << 16);
	t = i.add("mdia");
	t.add("mdhd").set("creation_time", 0).set("modification_time", 0).set("timescale", e.timescale || 1).set("duration", e.media_duration || 0).set("language", e.language || "und"),
	t.add("hdlr").set("handler", e.hdlr || "vide").set("name", e.name || "Track created with MP4Box.js"),
	t.add("elng").set("extended_language", e.language || "fr-FR");
	var r = t.add("minf");
	if (void 0 !== BoxParser[e.type + "SampleEntry"]) {
		var s = new BoxParser[e.type + "SampleEntry"];
		s.data_reference_index = 1;
		var a, n, o = "";
		for (a in BoxParser.sampleEntryCodes) for (var h = BoxParser.sampleEntryCodes[a], d = 0; d < h.length; d++) if (-1 < h.indexOf(e.type)) {
			o = a;
			break
		}
		switch (o) {
		case "Visual":
			r.add("vmhd").set("graphicsmode", 0).set("opcolor", [0, 0, 0]),
			s.set("width", e.width).set("height", e.height).set("horizresolution", 72 << 16).set("vertresolution", 72 << 16).set("frame_count", 1).set("compressorname", e.type + " Compressor").set("depth", 24),
			e.avcDecoderConfigRecord ? ((n = new BoxParser.avcCBox).parse(new MP4BoxStream(e.avcDecoderConfigRecord)), s.addBox(n)) : e.hevcDecoderConfigRecord && ((n = new BoxParser.hvcCBox).parse(new MP4BoxStream(e.hevcDecoderConfigRecord)), s.addBox(n));
			break;
		case "Audio":
			r.add("smhd").set("balance", e.balance || 0),
			s.set("channel_count", e.channel_count || 2).set("samplesize", e.samplesize || 16).set("samplerate", e.samplerate || 65536);
			break;
		case "Hint":
			r.add("hmhd");
			break;
		case "Subtitle":
			r.add("sthd"),
			"stpp" === e.type && s.set("namespace", e.namespace || "nonamespace").set("schema_location", e.schema_location || "").set("auxiliary_mime_types", e.auxiliary_mime_types || "");
			break;
		case "Metadata":
		case "System":
		default:
			r.add("nmhd")
		}
		e.description && s.addBox(e.description),
		e.description_boxes && e.description_boxes.forEach(function(t) {
			s.addBox(t)
		}),
		r.add("dinf").add("dref").addEntry((new BoxParser["url Box"]).set("flags", 1));
		t = r.add("stbl");
		return t.add("stsd").addEntry(s),
		t.add("stts").set("sample_counts", []).set("sample_deltas", []),
		t.add("stsc").set("first_chunk", []).set("samples_per_chunk", []).set("sample_description_index", []),
		t.add("stco").set("chunk_offsets", []),
		t.add("stsz").set("sample_sizes", []),
		this.moov.mvex.add("trex").set("track_id", e.id).set("default_sample_description_index", e.default_sample_description_index || 1).set("default_sample_duration", e.default_sample_duration || 0).set("default_sample_size", e.default_sample_size || 0).set("default_sample_flags", e.default_sample_flags || 0),
		this.buildTrakSampleLists(i),
		e.id
	}
},
BoxParser.Box.prototype.computeSize = function(t) {
	t = t || new DataStream;
	t.endianness = DataStream.BIG_ENDIAN,
	this.write(t)
},
ISOFile.prototype.addSample = function(t, e, i) {
	var r = i || {},
	i = {},
	t = this.getTrackById(t);
	if (null !== t) {
		i.number = t.samples.length,
		i.track_id = t.tkhd.track_id,
		i.timescale = t.mdia.mdhd.timescale,
		i.description_index = r.sample_description_index ? r.sample_description_index - 1 : 0,
		i.description = t.mdia.minf.stbl.stsd.entries[i.description_index],
		i.data = e,
		i.size = e.byteLength,
		i.alreadyRead = i.size,
		i.duration = r.duration || 1,
		i.cts = r.cts || 0,
		i.dts = r.dts || 0,
		i.is_sync = r.is_sync || !1,
		i.is_leading = r.is_leading || 0,
		i.depends_on = r.depends_on || 0,
		i.is_depended_on = r.is_depended_on || 0,
		i.has_redundancy = r.has_redundancy || 0,
		i.degradation_priority = r.degradation_priority || 0,
		i.offset = 0,
		i.subsamples = r.subsamples,
		t.samples.push(i),
		t.samples_size += i.size,
		t.samples_duration += i.duration,
		void 0 === t.first_dts && (t.first_dts = r.dts),
		this.processSamples();
		r = this.createSingleSampleMoof(i);
		return this.addBox(r),
		r.computeSize(),
		r.trafs[0].truns[0].data_offset = r.size + 8,
		this.add("mdat").data = new Uint8Array(e),
		i
	}
},
ISOFile.prototype.createSingleSampleMoof = function(t) {
	var e = 0,
	e = t.is_sync ? 1 << 25 : 65536,
	i = new BoxParser.moofBox;
	i.add("mfhd").set("sequence_number", this.nextMoofNumber),
	this.nextMoofNumber++;
	var r = i.add("traf"),
	s = this.getTrackById(t.track_id);
	return r.add("tfhd").set("track_id", t.track_id).set("flags", BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF),
	r.add("tfdt").set("baseMediaDecodeTime", t.dts - (s.first_dts || 0)),
	r.add("trun").set("flags", BoxParser.TRUN_FLAGS_DATA_OFFSET | BoxParser.TRUN_FLAGS_DURATION | BoxParser.TRUN_FLAGS_SIZE | BoxParser.TRUN_FLAGS_FLAGS | BoxParser.TRUN_FLAGS_CTS_OFFSET).set("data_offset", 0).set("first_sample_flags", 0).set("sample_count", 1).set("sample_duration", [t.duration]).set("sample_size", [t.size]).set("sample_flags", [e]).set("sample_composition_time_offset", [t.cts - t.dts]),
	i
},
ISOFile.prototype.lastMoofIndex = 0,
ISOFile.prototype.samplesDataSize = 0,
ISOFile.prototype.resetTables = function() {
	var t, e;
	for (this.initial_duration = this.moov.mvhd.duration, t = this.moov.mvhd.duration = 0; t < this.moov.traks.length; t++) { (e = this.moov.traks[t]).tkhd.duration = 0,
		e.mdia.mdhd.duration = 0,
		(e.mdia.minf.stbl.stco || e.mdia.minf.stbl.co64).chunk_offsets = [],
		(i = e.mdia.minf.stbl.stsc).first_chunk = [],
		i.samples_per_chunk = [],
		i.sample_description_index = [],
		(e.mdia.minf.stbl.stsz || e.mdia.minf.stbl.stz2).sample_sizes = [],
		(i = e.mdia.minf.stbl.stts).sample_counts = [],
		i.sample_deltas = [],
		(i = e.mdia.minf.stbl.ctts) && (i.sample_counts = [], i.sample_offsets = []),
		i = e.mdia.minf.stbl.stss;
		var i = e.mdia.minf.stbl.boxes.indexOf(i); - 1 != i && (e.mdia.minf.stbl.boxes[i] = null)
	}
},
ISOFile.initSampleGroups = function(t, e, i, r, s) {
	var a, n, o, h;
	function d(t, e, i) {
		this.grouping_type = t,
		this.grouping_type_parameter = e,
		this.sbgp = i,
		this.last_sample_in_run = -1,
		this.entry_index = -1
	}
	for (e && (e.sample_groups_info = []), t.sample_groups_info || (t.sample_groups_info = []), n = 0; n < i.length; n++) {
		for (h = i[n].grouping_type + "/" + i[n].grouping_type_parameter, o = new d(i[n].grouping_type, i[n].grouping_type_parameter, i[n]), e && (e.sample_groups_info[h] = o), t.sample_groups_info[h] || (t.sample_groups_info[h] = o), a = 0; a < r.length; a++) r[a].grouping_type === i[n].grouping_type && (o.description = r[a], o.description.used = !0);
		if (s) for (a = 0; a < s.length; a++) s[a].grouping_type === i[n].grouping_type && (o.fragment_description = s[a], o.fragment_description.used = !0, o.is_fragment = !0)
	}
	if (e) {
		if (s) for (n = 0; n < s.length; n++) ! s[n].used && 2 <= s[n].version && (h = s[n].grouping_type + "/0", (o = new d(s[n].grouping_type, 0)).is_fragment = !0, e.sample_groups_info[h] || (e.sample_groups_info[h] = o))
	} else for (n = 0; n < r.length; n++) ! r[n].used && 2 <= r[n].version && (h = r[n].grouping_type + "/0", o = new d(r[n].grouping_type, 0), t.sample_groups_info[h] || (t.sample_groups_info[h] = o))
},
ISOFile.setSampleGroupProperties = function(t, e, i, r) {
	var s, a, n;
	for (s in e.sample_groups = [], r) e.sample_groups[s] = {},
	e.sample_groups[s].grouping_type = r[s].grouping_type,
	e.sample_groups[s].grouping_type_parameter = r[s].grouping_type_parameter,
	i >= r[s].last_sample_in_run && (r[s].last_sample_in_run < 0 && (r[s].last_sample_in_run = 0), r[s].entry_index++, r[s].entry_index <= r[s].sbgp.entries.length - 1 && (r[s].last_sample_in_run += r[s].sbgp.entries[r[s].entry_index].sample_count)),
	r[s].entry_index <= r[s].sbgp.entries.length - 1 ? e.sample_groups[s].group_description_index = r[s].sbgp.entries[r[s].entry_index].group_description_index: e.sample_groups[s].group_description_index = -1,
	0 !== e.sample_groups[s].group_description_index && (n = r[s].fragment_description || r[s].description, 0 < e.sample_groups[s].group_description_index ? (a = 65535 < e.sample_groups[s].group_description_index ? (e.sample_groups[s].group_description_index >> 16) - 1 : e.sample_groups[s].group_description_index - 1, n && 0 <= a && (e.sample_groups[s].description = n.entries[a])) : n && 2 <= n.version && 0 < n.default_group_description_index && (e.sample_groups[s].description = n.entries[n.default_group_description_index - 1]))
},
ISOFile.process_sdtp = function(t, e, i) {
	e && (t ? (e.is_leading = t.is_leading[i], e.depends_on = t.sample_depends_on[i], e.is_depended_on = t.sample_is_depended_on[i], e.has_redundancy = t.sample_has_redundancy[i]) : (e.is_leading = 0, e.depends_on = 0, e.is_depended_on = 0, e.has_redundancy = 0))
},
ISOFile.prototype.buildSampleLists = function() {
	for (var t, e = 0; e < this.moov.traks.length; e++) t = this.moov.traks[e],
	this.buildTrakSampleLists(t)
},
ISOFile.prototype.buildTrakSampleLists = function(t) {
	var e, i, r, s, a, n, o, h, d, l, p, f, u, _, c, m, x, g, y, B, S, P, U, b;
	if (t.samples = [], t.samples_duration = 0, t.samples_size = 0, i = t.mdia.minf.stbl.stco || t.mdia.minf.stbl.co64, r = t.mdia.minf.stbl.stsc, s = t.mdia.minf.stbl.stsz || t.mdia.minf.stbl.stz2, a = t.mdia.minf.stbl.stts, n = t.mdia.minf.stbl.ctts, o = t.mdia.minf.stbl.stss, h = t.mdia.minf.stbl.stsd, d = t.mdia.minf.stbl.subs, f = t.mdia.minf.stbl.stdp, l = t.mdia.minf.stbl.sbgps, p = t.mdia.minf.stbl.sgpds, S = B = y = g = -1, b = U = P = 0, ISOFile.initSampleGroups(t, null, l, p), void 0 !== s) {
		for (e = 0; e < s.sample_sizes.length; e++) {
			var v = {};
			v.number = e,
			v.track_id = t.tkhd.track_id,
			v.timescale = t.mdia.mdhd.timescale,
			v.alreadyRead = 0,
			(t.samples[e] = v).size = s.sample_sizes[e],
			t.samples_size += v.size,
			0 === e ? (_ = 1, u = 0, v.chunk_index = _, v.chunk_run_index = u, x = r.samples_per_chunk[u], m = 0, c = u + 1 < r.first_chunk.length ? r.first_chunk[u + 1] - 1 : 1 / 0) : e < x ? (v.chunk_index = _, v.chunk_run_index = u) : (_++, m = 0, (v.chunk_index = _) <= c || (c = ++u + 1 < r.first_chunk.length ? r.first_chunk[u + 1] - 1 : 1 / 0), v.chunk_run_index = u, x += r.samples_per_chunk[u]),
			v.description_index = r.sample_description_index[v.chunk_run_index] - 1,
			v.description = h.entries[v.description_index],
			v.offset = i.chunk_offsets[v.chunk_index - 1] + m,
			m += v.size,
			g < e && (y++, g < 0 && (g = 0), g += a.sample_counts[y]),
			0 < e ? (t.samples[e - 1].duration = a.sample_deltas[y], t.samples_duration += t.samples[e - 1].duration, v.dts = t.samples[e - 1].dts + t.samples[e - 1].duration) : v.dts = 0,
			n ? (B <= e && (S++, B < 0 && (B = 0), B += n.sample_counts[S]), v.cts = t.samples[e].dts + n.sample_offsets[S]) : v.cts = v.dts,
			o ? (e == o.sample_numbers[P] - 1 ? (v.is_sync = !0, P++) : (v.is_sync = !1, v.degradation_priority = 0), d && d.entries[U].sample_delta + b == e + 1 && (v.subsamples = d.entries[U].subsamples, b += d.entries[U].sample_delta, U++)) : v.is_sync = !0,
			ISOFile.process_sdtp(t.mdia.minf.stbl.sdtp, v, v.number),
			v.degradation_priority = f ? f.priority[e] : 0,
			d && d.entries[U].sample_delta + b == e && (v.subsamples = d.entries[U].subsamples, b += d.entries[U].sample_delta),
			(0 < l.length || 0 < p.length) && ISOFile.setSampleGroupProperties(t, v, e, t.sample_groups_info)
		}
		0 < e && (t.samples[e - 1].duration = Math.max(t.mdia.mdhd.duration - t.samples[e - 1].dts, 0), t.samples_duration += t.samples[e - 1].duration)
	}
},
ISOFile.prototype.updateSampleLists = function() {
	var t, e, i, r, s, a, n, o, h, d, l, p;
	if (void 0 !== this.moov) for (; this.lastMoofIndex < this.moofs.length;) if (n = this.moofs[this.lastMoofIndex], this.lastMoofIndex++, "moof" == n.type) for (o = n, t = 0; t < o.trafs.length; t++) {
		for (h = o.trafs[t], d = this.getTrackById(h.tfhd.track_id), l = this.getTrexById(h.tfhd.track_id), e = h.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC ? h.tfhd.default_sample_description_index: l ? l.default_sample_description_index: 1, i = h.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR ? h.tfhd.default_sample_duration: l ? l.default_sample_duration: 0, r = h.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE ? h.tfhd.default_sample_size: l ? l.default_sample_size: 0, s = h.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS ? h.tfhd.default_sample_flags: l ? l.default_sample_flags: 0, (h.sample_number = 0) < h.sbgps.length && ISOFile.initSampleGroups(d, h, h.sbgps, d.mdia.minf.stbl.sgpds, h.sgpds), y = 0; y < h.truns.length; y++) for (var f = h.truns[y], u = 0; u < f.sample_count; u++) { (p = {}).moof_number = this.lastMoofIndex,
			p.number_in_traf = h.sample_number,
			h.sample_number++,
			p.number = d.samples.length,
			h.first_sample_index = d.samples.length,
			d.samples.push(p),
			p.track_id = d.tkhd.track_id,
			p.timescale = d.mdia.mdhd.timescale,
			p.description_index = e - 1,
			p.description = d.mdia.minf.stbl.stsd.entries[p.description_index],
			p.size = r,
			f.flags & BoxParser.TRUN_FLAGS_SIZE && (p.size = f.sample_size[u]),
			d.samples_size += p.size,
			p.duration = i,
			f.flags & BoxParser.TRUN_FLAGS_DURATION && (p.duration = f.sample_duration[u]),
			d.samples_duration += p.duration,
			d.first_traf_merged || 0 < u ? p.dts = d.samples[d.samples.length - 2].dts + d.samples[d.samples.length - 2].duration: (h.tfdt ? p.dts = h.tfdt.baseMediaDecodeTime: p.dts = 0, d.first_traf_merged = !0),
			p.cts = p.dts,
			f.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET && (p.cts = p.dts + f.sample_composition_time_offset[u]),
			x = s,
			f.flags & BoxParser.TRUN_FLAGS_FLAGS ? x = f.sample_flags[u] : 0 === u && f.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG && (x = f.first_sample_flags),
			p.is_sync = !(x >> 16 & 1),
			p.is_leading = x >> 26 & 3,
			p.depends_on = x >> 24 & 3,
			p.is_depended_on = x >> 22 & 3,
			p.has_redundancy = x >> 20 & 3,
			p.degradation_priority = 65535 & x;
			var _ = !!(h.tfhd.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET),
			c = !!(h.tfhd.flags & BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF),
			m = !!(f.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET),
			x = 0,
			x = _ ? h.tfhd.base_data_offset: c || 0 === y ? o.start: a;
			p.offset = 0 === y && 0 === u ? m ? x + f.data_offset: x: a,
			a = p.offset + p.size,
			(0 < h.sbgps.length || 0 < h.sgpds.length || 0 < d.mdia.minf.stbl.sbgps.length || 0 < d.mdia.minf.stbl.sgpds.length) && ISOFile.setSampleGroupProperties(d, p, p.number_in_traf, h.sample_groups_info)
		}
		if (h.subs) {
			d.has_fragment_subsamples = !0;
			for (var g = h.first_sample_index,
			y = 0; y < h.subs.entries.length; y++) g += h.subs.entries[y].sample_delta,
			(p = d.samples[g - 1]).subsamples = h.subs.entries[y].subsamples
		}
	}
},
ISOFile.prototype.getSample = function(t, e) {
	var i, r = t.samples[e];
	if (!this.moov) return null;
	if (r.data) {
		if (r.alreadyRead == r.size) return r
	} else r.data = new Uint8Array(r.size),
	r.alreadyRead = 0,
	this.samplesDataSize += r.size,
	Log.debug("ISOFile", "Allocating sample #" + e + " on track #" + t.tkhd.track_id + " of size " + r.size + " (total: " + this.samplesDataSize + ")");
	for (;;) {
		var s = this.stream.findPosition(!0, r.offset + r.alreadyRead, !1);
		if (! (-1 < s)) return null;
		s = (i = this.stream.buffers[s]).byteLength - (r.offset + r.alreadyRead - i.fileStart);
		if (r.size - r.alreadyRead <= s) return Log.debug("ISOFile", "Getting sample #" + e + " data (alreadyRead: " + r.alreadyRead + " offset: " + (r.offset + r.alreadyRead - i.fileStart) + " read size: " + (r.size - r.alreadyRead) + " full size: " + r.size + ")"),
		DataStream.memcpy(r.data.buffer, r.alreadyRead, i, r.offset + r.alreadyRead - i.fileStart, r.size - r.alreadyRead),
		i.usedBytes += r.size - r.alreadyRead,
		this.stream.logBufferLevel(),
		r.alreadyRead = r.size,
		r;
		if (0 == s) return null;
		Log.debug("ISOFile", "Getting sample #" + e + " partial data (alreadyRead: " + r.alreadyRead + " offset: " + (r.offset + r.alreadyRead - i.fileStart) + " read size: " + s + " full size: " + r.size + ")"),
		DataStream.memcpy(r.data.buffer, r.alreadyRead, i, r.offset + r.alreadyRead - i.fileStart, s),
		r.alreadyRead += s,
		i.usedBytes += s,
		this.stream.logBufferLevel()
	}
},
ISOFile.prototype.releaseSample = function(t, e) {
	e = t.samples[e];
	return e.data ? (this.samplesDataSize -= e.size, e.data = null, e.alreadyRead = 0, e.size) : 0
},
ISOFile.prototype.getAllocatedSampleDataSize = function() {
	return this.samplesDataSize
},
ISOFile.prototype.getCodecs = function() {
	for (var t = "",
	e = 0; e < this.moov.traks.length; e++) 0 < e && (t += ","),
	t += this.moov.traks[e].mdia.minf.stbl.stsd.entries[0].getCodec();
	return t
},
ISOFile.prototype.getTrexById = function(t) {
	var e;
	if (!this.moov || !this.moov.mvex) return null;
	for (e = 0; e < this.moov.mvex.trexs.length; e++) {
		var i = this.moov.mvex.trexs[e];
		if (i.track_id == t) return i
	}
	return null
},
ISOFile.prototype.getTrackById = function(t) {
	if (void 0 === this.moov) return null;
	for (var e = 0; e < this.moov.traks.length; e++) {
		var i = this.moov.traks[e];
		if (i.tkhd.track_id == t) return i
	}
	return null
},
ISOFile.prototype.itemsDataSize = 0,
ISOFile.prototype.flattenItemInfo = function() {
	var t = this.items,
	e = this.entity_groups,
	i = this.meta;
	if (null != i && void 0 !== i.hdlr && void 0 !== i.iinf) {
		for (d = 0; d < i.iinf.item_infos.length; d++)(s = {}).id = i.iinf.item_infos[d].item_ID,
		(t[s.id] = s).ref_to = [],
		s.name = i.iinf.item_infos[d].item_name,
		0 < i.iinf.item_infos[d].protection_index && (s.protection = i.ipro.protections[i.iinf.item_infos[d].protection_index - 1]),
		i.iinf.item_infos[d].item_type ? s.type = i.iinf.item_infos[d].item_type: s.type = "mime",
		s.content_type = i.iinf.item_infos[d].content_type,
		s.content_encoding = i.iinf.item_infos[d].content_encoding,
		s.item_uri_type = i.iinf.item_infos[d].item_uri_type;
		if (i.grpl) for (d = 0; d < i.grpl.boxes.length; d++) entity_group = {},
		entity_group.id = i.grpl.boxes[d].group_id,
		entity_group.entity_ids = i.grpl.boxes[d].entity_ids,
		entity_group.type = i.grpl.boxes[d].type,
		e[entity_group.id] = entity_group;
		if (i.iloc) for (d = 0; d < i.iloc.items.length; d++) {
			var r = i.iloc.items[d],
			s = t[r.item_ID];
			switch (0 !== r.data_reference_index && (Log.warn("Item storage with reference to other files: not supported"), s.source = i.dinf.boxes[r.data_reference_index - 1]), r.construction_method) {
			case 0:
			case 1:
				break;
			case 2:
				Log.warn("Item storage with construction_method : not supported")
			}
			for (s.extents = [], n = s.size = 0; n < r.extents.length; n++) s.extents[n] = {},
			s.extents[n].offset = r.extents[n].extent_offset + r.base_offset,
			1 == r.construction_method && (s.extents[n].offset += i.idat.start + i.idat.hdr_size),
			s.extents[n].length = r.extents[n].extent_length,
			s.extents[n].alreadyRead = 0,
			s.size += s.extents[n].length
		}
		if (i.pitm && (t[i.pitm.item_id].primary = !0), i.iref) for (d = 0; d < i.iref.references.length; d++) for (var a = i.iref.references[d], n = 0; n < a.references.length; n++) t[a.from_item_ID].ref_to.push({
			type: a.type,
			id: a.references[n]
		});
		if (i.iprp) for (var o = 0; o < i.iprp.ipmas.length; o++) for (var h = i.iprp.ipmas[o], d = 0; d < h.associations.length; d++) {
			var l = h.associations[d];
			if (s = (s = t[l.id]) || e[l.id]) for (void 0 === s.properties && (s.properties = {},
			s.properties.boxes = []), n = 0; n < l.props.length; n++) {
				var p = l.props[n];
				0 < p.property_index && p.property_index - 1 < i.iprp.ipco.boxes.length && (p = i.iprp.ipco.boxes[p.property_index - 1], s.properties[p.type] = p, s.properties.boxes.push(p))
			}
		}
	}
},
ISOFile.prototype.getItem = function(t) {
	var e, i;
	if (!this.meta) return null;
	if (! (i = this.items[t]).data && i.size) i.data = new Uint8Array(i.size),
	i.alreadyRead = 0,
	this.itemsDataSize += i.size,
	Log.debug("ISOFile", "Allocating item #" + t + " of size " + i.size + " (total: " + this.itemsDataSize + ")");
	else if (i.alreadyRead === i.size) return i;
	for (var r = 0; r < i.extents.length; r++) {
		var s = i.extents[r];
		if (s.alreadyRead !== s.length) {
			var a = this.stream.findPosition(!0, s.offset + s.alreadyRead, !1);
			if (! (-1 < a)) return null;
			a = (e = this.stream.buffers[a]).byteLength - (s.offset + s.alreadyRead - e.fileStart);
			if (! (s.length - s.alreadyRead <= a)) return Log.debug("ISOFile", "Getting item #" + t + " extent #" + r + " partial data (alreadyRead: " + s.alreadyRead + " offset: " + (s.offset + s.alreadyRead - e.fileStart) + " read size: " + a + " full extent size: " + s.length + " full item size: " + i.size + ")"),
			DataStream.memcpy(i.data.buffer, i.alreadyRead, e, s.offset + s.alreadyRead - e.fileStart, a),
			s.alreadyRead += a,
			i.alreadyRead += a,
			e.usedBytes += a,
			this.stream.logBufferLevel(),
			null;
			Log.debug("ISOFile", "Getting item #" + t + " extent #" + r + " data (alreadyRead: " + s.alreadyRead + " offset: " + (s.offset + s.alreadyRead - e.fileStart) + " read size: " + (s.length - s.alreadyRead) + " full extent size: " + s.length + " full item size: " + i.size + ")"),
			DataStream.memcpy(i.data.buffer, i.alreadyRead, e, s.offset + s.alreadyRead - e.fileStart, s.length - s.alreadyRead),
			e.usedBytes += s.length - s.alreadyRead,
			this.stream.logBufferLevel(),
			i.alreadyRead += s.length - s.alreadyRead,
			s.alreadyRead = s.length
		}
	}
	return i.alreadyRead === i.size ? i: null
},
ISOFile.prototype.releaseItem = function(t) {
	var e = this.items[t];
	if (e.data) {
		this.itemsDataSize -= e.size,
		e.data = null;
		for (var i = e.alreadyRead = 0; i < e.extents.length; i++) e.extents[i].alreadyRead = 0;
		return e.size
	}
	return 0
},
ISOFile.prototype.processItems = function(t) {
	for (var e in this.items) {
		var i = this.items[e];
		this.getItem(i.id),
		t && !i.sent && (t(i), i.sent = !0, i.data = null)
	}
},
ISOFile.prototype.hasItem = function(t) {
	for (var e in this.items) {
		var i = this.items[e];
		if (i.name === t) return i.id
	}
	return - 1
},
ISOFile.prototype.getMetaHandler = function() {
	return this.meta ? this.meta.hdlr.handler: null
},
ISOFile.prototype.getPrimaryItem = function() {
	return this.meta && this.meta.pitm ? this.getItem(this.meta.pitm.item_id) : null
},
ISOFile.prototype.itemToFragmentedTrackFile = function(t) {
	var e = t || {},
	i = null;
	if (null == (i = e.itemId ? this.getItem(e.itemId) : this.getPrimaryItem())) return null;
	t = new ISOFile;
	t.discardMdatData = !1;
	e = {
		type: i.type,
		description_boxes: i.properties.boxes
	};
	i.properties.ispe && (e.width = i.properties.ispe.image_width, e.height = i.properties.ispe.image_height);
	e = t.addTrack(e);
	return e ? (t.addSample(e, i.data), t) : null
},
ISOFile.prototype.write = function(t) {
	for (var e = 0; e < this.boxes.length; e++) this.boxes[e].write(t)
},
ISOFile.prototype.createFragment = function(t, e, i) {
	var r = this.getTrackById(t),
	t = this.getSample(r, e);
	if (null == t) return this.setNextSeekPositionFromSample(r.samples[e]),
	null;
	e = i || new DataStream;
	e.endianness = DataStream.BIG_ENDIAN;
	i = this.createSingleSampleMoof(t);
	i.write(e),
	i.trafs[0].truns[0].data_offset = i.size + 8,
	Log.debug("MP4Box", "Adjusting data_offset with new value " + i.trafs[0].truns[0].data_offset),
	e.adjustUint32(i.trafs[0].truns[0].data_offset_position, i.trafs[0].truns[0].data_offset);
	i = new BoxParser.mdatBox;
	return i.data = t.data,
	i.write(e),
	e
},
ISOFile.writeInitializationSegment = function(t, e, i, r) {
	var s;
	Log.debug("ISOFile", "Generating initialization segment");
	var a = new DataStream;
	a.endianness = DataStream.BIG_ENDIAN,
	t.write(a);
	var n = e.add("mvex");
	for (i && n.add("mehd").set("fragment_duration", i), s = 0; s < e.traks.length; s++) n.add("trex").set("track_id", e.traks[s].tkhd.track_id).set("default_sample_description_index", 1).set("default_sample_duration", r).set("default_sample_size", 0).set("default_sample_flags", 65536);
	return e.write(a),
	a.buffer
},
ISOFile.prototype.save = function(t) {
	var e = new DataStream;
	e.endianness = DataStream.BIG_ENDIAN,
	this.write(e),
	e.save(t)
},
ISOFile.prototype.getBuffer = function() {
	var t = new DataStream;
	return t.endianness = DataStream.BIG_ENDIAN,
	this.write(t),
	t.buffer
},
ISOFile.prototype.initializeSegmentation = function() {
	var t, e, i, r;
	for (null === this.onSegment && Log.warn("MP4Box", "No segmentation callback set!"), this.isFragmentationInitialized || (this.isFragmentationInitialized = !0, this.nextMoofNumber = 0, this.resetTables()), e = [], t = 0; t < this.fragmentedTracks.length; t++) {
		var s = new BoxParser.moovBox;
		s.mvhd = this.moov.mvhd,
		s.boxes.push(s.mvhd),
		i = this.getTrackById(this.fragmentedTracks[t].id),
		s.boxes.push(i),
		s.traks.push(i),
		(r = {}).id = i.tkhd.track_id,
		r.user = this.fragmentedTracks[t].user,
		r.buffer = ISOFile.writeInitializationSegment(this.ftyp, s, this.moov.mvex && this.moov.mvex.mehd ? this.moov.mvex.mehd.fragment_duration: void 0, 0 < this.moov.traks[t].samples.length ? this.moov.traks[t].samples[0].duration: 0),
		e.push(r)
	}
	return e
},
BoxParser.Box.prototype.printHeader = function(t) {
	this.size += 8,
	this.size > MAX_SIZE && (this.size += 8),
	"uuid" === this.type && (this.size += 16),
	t.log(t.indent + "size:" + this.size),
	t.log(t.indent + "type:" + this.type)
},
BoxParser.FullBox.prototype.printHeader = function(t) {
	this.size += 4,
	BoxParser.Box.prototype.printHeader.call(this, t),
	t.log(t.indent + "version:" + this.version),
	t.log(t.indent + "flags:" + this.flags)
},
BoxParser.Box.prototype.print = function(t) {
	this.printHeader(t)
},
BoxParser.ContainerBox.prototype.print = function(t) {
	this.printHeader(t);
	for (var e, i = 0; i < this.boxes.length; i++) this.boxes[i] && (e = t.indent, t.indent += " ", this.boxes[i].print(t), t.indent = e)
},
ISOFile.prototype.print = function(t) {
	t.indent = "";
	for (var e = 0; e < this.boxes.length; e++) this.boxes[e] && this.boxes[e].print(t)
},
BoxParser.mvhdBox.prototype.print = function(t) {
	BoxParser.FullBox.prototype.printHeader.call(this, t),
	t.log(t.indent + "creation_time: " + this.creation_time),
	t.log(t.indent + "modification_time: " + this.modification_time),
	t.log(t.indent + "timescale: " + this.timescale),
	t.log(t.indent + "duration: " + this.duration),
	t.log(t.indent + "rate: " + this.rate),
	t.log(t.indent + "volume: " + (this.volume >> 8)),
	t.log(t.indent + "matrix: " + this.matrix.join(", ")),
	t.log(t.indent + "next_track_id: " + this.next_track_id)
},
BoxParser.tkhdBox.prototype.print = function(t) {
	BoxParser.FullBox.prototype.printHeader.call(this, t),
	t.log(t.indent + "creation_time: " + this.creation_time),
	t.log(t.indent + "modification_time: " + this.modification_time),
	t.log(t.indent + "track_id: " + this.track_id),
	t.log(t.indent + "duration: " + this.duration),
	t.log(t.indent + "volume: " + (this.volume >> 8)),
	t.log(t.indent + "matrix: " + this.matrix.join(", ")),
	t.log(t.indent + "layer: " + this.layer),
	t.log(t.indent + "alternate_group: " + this.alternate_group),
	t.log(t.indent + "width: " + this.width),
	t.log(t.indent + "height: " + this.height)
};
var MP4Box = {
	createFile: function(t, e) {
		t = void 0 === t || t,
		e = new ISOFile(e);
		return e.discardMdatData = !t,
		e
	}
};
"undefined" != typeof exports && (exports.createFile = MP4Box.createFile);
`;
const workerLogic = `
// 显式将变量绑定到self上，确保全局可访问
self.abortFlag = false;
self.mp4boxfile = null;
self.videoDecoder = null;
self.samplesInRange = [];
self.videoTrack = null;
self.arrayBuffer = null;

onmessage = function(e) {
  if (e.data.type === 'decode') {
    self.abortFlag = false;
    decodeFile(e.data.file, e.data.start, e.data.end, e.data.hardwareAcceleration);
  } else if (e.data.type === 'abort') {
    self.abortFlag = true;
    // 主动销毁所有大对象和引用
    if (self.videoDecoder) {
      try {
        self.videoDecoder.flush();
        self.videoDecoder.reset();
        self.videoDecoder.close();
      } catch (err) {}
      self.videoDecoder = null;
    }
    if (self.mp4boxfile) {
      try { self.mp4boxfile.flush(); } catch (err) {}
      self.mp4boxfile = null;
    }
    self.samplesInRange = [];
    self.videoTrack = null;
    self.arrayBuffer = null;
    // 关闭worker
    self.close();
  }
};

function decodeFile(file, startFrame, endFrame, hardwareAcceleration) {
  self.arrayBuffer = file.data;
  self.mp4boxfile = MP4Box.createFile();
  self.videoTrack = null;
  let nbSampleTotal = 0;
  self.samplesInRange = [];
  self.videoDecoder = null;
  let frameIndex = 0;
  let totalFrames = 0;
  self.mp4boxfile.onReady = function(info) {
    self.videoTrack = info.videoTracks[0];
    nbSampleTotal = self.videoTrack.nb_samples;
    self.mp4boxfile.setExtractionOptions(self.videoTrack.id, null, {
      nbSamples: nbSampleTotal,
      rapAlignement: true
    });
    self.mp4boxfile.start();
  };
  self.mp4boxfile.onSamples = async function(trackId, ref, samples) {
    if (self.abortFlag) return; // 确保使用self访问
    // 自动对齐到区间内第一个关键帧
    let startIdx = Math.min(0, startFrame); // 修复Math.min, 因为仅有第一帧是关键帧
    let endIdx = Math.min(samples.length - 1, endFrame);
    while (startIdx <= endIdx && !samples[startIdx].is_sync) {
      startIdx++;
    }
    if (startIdx > endIdx) {
      // 区间内没有关键帧，直接done
      postMessage({ type: 'done' });
      return;
    }
    self.samplesInRange = samples.slice(0, endIdx + 1);
    totalFrames = self.samplesInRange.length;
    if (!self.videoDecoder) {
      self.videoDecoder = new VideoDecoder({
        output: handleFrame,
        error: err => {
          postMessage({ type: 'error', error: err.message })
        }
      });
      const entry = self.mp4boxfile.moov.traks[0].mdia.minf.stbl.stsd.entries[0];
      const box = entry.avcC ?? entry.hvcC ?? entry.vpcC;
      let description = undefined;
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
        box.write(stream);
        description = new Uint8Array(stream.buffer.slice(8));
      }
		const isIOS = /(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent);
		const isAndroid = /Android/i.test(navigator.userAgent);
		const defaultConfig = {
			codec: self.videoTrack.codec,
			codedWidth: self.videoTrack.track_width,
			codedHeight: self.videoTrack.track_height,
			description,
		}
		// Android 系统下，默认配置为 prefer-software 以避免硬件解码问题
		let config = isAndroid ? { ...defaultConfig, hardwareAcceleration: 'prefer-software' } : hardwareAcceleration === 'default' ? defaultConfig	: {
			...defaultConfig,
			hardwareAcceleration: hardwareAcceleration,
		}
		// let config = hardwareAcceleration === 'default' ? defaultConfig	: {
		// 	...defaultConfig,
		// 	hardwareAcceleration: hardwareAcceleration,
		// }
		const configSupport = (await VideoDecoder.isConfigSupported(config));
		const isConfigSupported = configSupport.supported;
		postMessage({ type: 'configSupport', configSupport: { config, configSupport}});
		let isDefaultConfigSupported = false;
		if(!isConfigSupported) {
			const defaultConfigSupport = await VideoDecoder.isConfigSupported(defaultConfig);
			postMessage({ type: 'configSupport', configSupport: { defaultConfig, configSupport: defaultConfigSupport}});
			isDefaultConfigSupported = defaultConfigSupport.supported;
		}
		if(isConfigSupported) {
			self.videoDecoder.configure(config);
		} else if(isDefaultConfigSupported) {
			self.videoDecoder.configure(defaultConfig);
		} else {
			postMessage({ type: 'error', error: '不支持的视频解码配置' });
		}
    }
    for (let i = 0; i < self.samplesInRange.length; i++) {
      if (self.abortFlag) break; // 确保使用self访问
      
      const sample = self.samplesInRange[i];
      const chunk = new EncodedVideoChunk({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp: sample.cts,
        duration: sample.duration,
        data: sample.data
      });
      self.videoDecoder.decode(chunk);
    }
    self.videoDecoder.flush().then(() => {
      postMessage({ type: 'done' });
    });
  };
  function handleFrame(videoFrame) {
    if (self.abortFlag) { // 确保使用self访问
      videoFrame.close();
      return;
    }
    postMessage({ type: 'frame', frame: videoFrame, index: frameIndex++, total: totalFrames }, [videoFrame]);
  }
  self.arrayBuffer.fileStart = 0;
  self.mp4boxfile.appendBuffer(self.arrayBuffer);
  self.mp4boxfile.flush();
}
`;
const fullWorkerScript = `
try {
  ${mp4boxSource}
  self.MP4Box = MP4Box;
  ${workerLogic}
} catch (error) {
  console.error('Worker初始化失败:', error);
  throw error;
}
`;
const blob = new Blob([fullWorkerScript], { type: "application/javascript" });
const workerURL = __createObjectURL(blob);

/**
 * 服务端 floats_to_scaled_int16_bytes 反向函数：Base64 → float32 数组
 * 供原 SDK ttsa/decoder 打包时解析
 */
function scaledInt16BytesToFloat32(base64Str) {
    try {
        const binaryString = atob(base64Str);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = [];
        for (let i = 0; i < int16Array.length; i++) {
            float32Array.push(int16Array[i] / 0x7FFF);
        }
        return float32Array;
    }
    catch (error) {
        console.error('[float32-decoder] 解码失败:', error);
        return [];
    }
}
function parseUint8ToFloat32(uint8Arr) {
    try {
        const int16Array = new Int16Array(uint8Arr.buffer);
        const float32Array = [];
        for (let i = 0; i < int16Array.length; i++) {
            float32Array.push(int16Array[i] / 0x7FFF);
        }
        return float32Array;
    }
    catch (error) {
        console.error('[float32-decoder] 解析失败:', error);
        return [];
    }
}

class FrameAnimationController {
    startTime; // 新增：开始时间
    currentFrame;
    speed;
    frameCallback;
    isPlaying;
    animationId;
    frameRate; // 新增：帧率
    constructor({ defaultSpeed = 1, frameRate = 24, frameCallback, } = {}) {
        this.startTime = null; // 初始化开始时间为null
        this.currentFrame = 1;
        this.speed = defaultSpeed;
        this.frameCallback = frameCallback || null;
        this.frameRate = frameRate; // 保存帧率
        this.isPlaying = false;
        this.animationId = null;
    }
    get playing() {
        return this.isPlaying;
    }
    // 启动动画
    play() {
        if (this.isPlaying)
            return;
        this.isPlaying = true;
        // 记录开始时间（如果还没有开始时间）
        if (this.startTime === null) {
            this.startTime = performance.now();
        }
        this.animationId = requestAnimationFrame(this._animate.bind(this));
    }
    // 暂停动画
    pause() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    // 重置动画
    reset() {
        this.pause();
        this.startTime = null; // 重置开始时间
        this.currentFrame = 1;
        this._updateFrame();
    }
    // 设置速度
    setSpeed(speed) {
        this.speed = speed;
    }
    // 跳转到指定帧
    gotoFrame(frameNumber) {
        if (frameNumber < 1)
            frameNumber = 1;
        this.currentFrame = frameNumber;
        this._updateFrame();
    }
    // 下一帧
    nextFrame() {
        this.currentFrame++;
        this._updateFrame();
    }
    // 上一帧
    prevFrame() {
        this.gotoFrame(this.currentFrame - 1);
    }
    // 清理资源，在组件销毁时调用
    destroy() {
        this.pause();
        this.frameCallback = null;
        this.startTime = null;
        this.currentFrame = 1;
        this.speed = 1;
    }
    // 动画循环
    _animate(timestamp) {
        if (!this.isPlaying)
            return;
        // 基于开始时间计算当前应该显示的帧数
        if (this.startTime !== null) {
            const elapsedTime = timestamp - this.startTime;
            // 使用1/48秒的计算速率来提高准确度，然后除以2来保持1/24秒的显示速率
            const calculatedFrame = Math.floor(Math.floor(elapsedTime / (1000 / (this.frameRate * 2))) / 2) + 1;
            // 如果计算出的帧号与当前帧号不同，更新帧号
            if (calculatedFrame !== this.currentFrame) {
                this.currentFrame = calculatedFrame;
                this._updateFrame();
            }
        }
        if (this.isPlaying) {
            this.animationId = requestAnimationFrame(this._animate.bind(this));
        }
    }
    // 更新帧 - 基于时间的帧计算
    _updateFrame() {
        if (this.frameCallback) {
            // 执行帧更新回调
            this.frameCallback(this.currentFrame);
        }
    }
    // 获取当前帧
    getCurrentFrame() {
        // 这里不能直接返回this.currentFrame，因为存在用户将游览器置到后台，
        // 游览器会暂停requestAnimationFrame，导致this.currentFrame不更新
        // 这里需要重新计算
        if (this.startTime !== null) {
            const elapsedTime = performance.now() - this.startTime;
            const calculatedFrame = Math.floor(Math.floor(elapsedTime / (1000 / (this.frameRate * 2))) / 2) + 1;
            return calculatedFrame;
        }
        return this.currentFrame;
    }
}

/**
 * 供 ttsa 等使用：从 protobufjs 挂到全局 protobuf
 * face_data_pb.js 依赖全局 protobuf
 */

if (typeof offline.commonjsGlobal !== 'undefined') offline.commonjsGlobal.protobuf = vendor.minimal;
if (typeof globalThis !== 'undefined') globalThis.protobuf = vendor.minimal;
if (typeof window !== 'undefined') window.protobuf = vendor.minimal;

/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function($protobuf) {

    // Common aliases
    var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
    
    // Exported root namespace
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});
    
    $root.MeshData = (function() {
    
        /**
         * Properties of a MeshData.
         * @exports IMeshData
         * @interface IMeshData
         * @property {number|null} [index] MeshData index
         * @property {Array.<number>|null} [weights] MeshData weights
         */
    
        /**
         * Constructs a new MeshData.
         * @exports MeshData
         * @classdesc Represents a MeshData.
         * @implements IMeshData
         * @constructor
         * @param {IMeshData=} [properties] Properties to set
         */
        function MeshData(properties) {
            this.weights = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }
    
        /**
         * MeshData index.
         * @member {number} index
         * @memberof MeshData
         * @instance
         */
        MeshData.prototype.index = 0;
    
        /**
         * MeshData weights.
         * @member {Array.<number>} weights
         * @memberof MeshData
         * @instance
         */
        MeshData.prototype.weights = $util.emptyArray;
    
        /**
         * Creates a new MeshData instance using the specified properties.
         * @function create
         * @memberof MeshData
         * @static
         * @param {IMeshData=} [properties] Properties to set
         * @returns {MeshData} MeshData instance
         */
        MeshData.create = function create(properties) {
            return new MeshData(properties);
        };
    
        /**
         * Encodes the specified MeshData message. Does not implicitly {@link MeshData.verify|verify} messages.
         * @function encode
         * @memberof MeshData
         * @static
         * @param {IMeshData} message MeshData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MeshData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.index != null && Object.hasOwnProperty.call(message, "index"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.index);
            if (message.weights != null && message.weights.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.weights.length; ++i)
                    writer.float(message.weights[i]);
                writer.ldelim();
            }
            return writer;
        };
    
        /**
         * Encodes the specified MeshData message, length delimited. Does not implicitly {@link MeshData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof MeshData
         * @static
         * @param {IMeshData} message MeshData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MeshData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };
    
        /**
         * Decodes a MeshData message from the specified reader or buffer.
         * @function decode
         * @memberof MeshData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {MeshData} MeshData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MeshData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.MeshData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.index = reader.int32();
                        break;
                    }
                case 2: {
                        if (!(message.weights && message.weights.length))
                            message.weights = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.weights.push(reader.float());
                        } else
                            message.weights.push(reader.float());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };
    
        /**
         * Decodes a MeshData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof MeshData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {MeshData} MeshData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MeshData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };
    
        /**
         * Verifies a MeshData message.
         * @function verify
         * @memberof MeshData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        MeshData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.index != null && message.hasOwnProperty("index"))
                if (!$util.isInteger(message.index))
                    return "index: integer expected";
            if (message.weights != null && message.hasOwnProperty("weights")) {
                if (!Array.isArray(message.weights))
                    return "weights: array expected";
                for (var i = 0; i < message.weights.length; ++i)
                    if (typeof message.weights[i] !== "number")
                        return "weights: number[] expected";
            }
            return null;
        };
    
        /**
         * Creates a MeshData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof MeshData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {MeshData} MeshData
         */
        MeshData.fromObject = function fromObject(object) {
            if (object instanceof $root.MeshData)
                return object;
            var message = new $root.MeshData();
            if (object.index != null)
                message.index = object.index | 0;
            if (object.weights) {
                if (!Array.isArray(object.weights))
                    throw TypeError(".MeshData.weights: array expected");
                message.weights = [];
                for (var i = 0; i < object.weights.length; ++i)
                    message.weights[i] = Number(object.weights[i]);
            }
            return message;
        };
    
        /**
         * Creates a plain object from a MeshData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof MeshData
         * @static
         * @param {MeshData} message MeshData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        MeshData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.weights = [];
            if (options.defaults)
                object.index = 0;
            if (message.index != null && message.hasOwnProperty("index"))
                object.index = message.index;
            if (message.weights && message.weights.length) {
                object.weights = [];
                for (var j = 0; j < message.weights.length; ++j)
                    object.weights[j] = options.json && !isFinite(message.weights[j]) ? String(message.weights[j]) : message.weights[j];
            }
            return object;
        };
    
        /**
         * Converts this MeshData to JSON.
         * @function toJSON
         * @memberof MeshData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        MeshData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };
    
        /**
         * Gets the default type url for MeshData
         * @function getTypeUrl
         * @memberof MeshData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        MeshData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/MeshData";
        };
    
        return MeshData;
    })();
    
    $root.JointData = (function() {
    
        /**
         * Properties of a JointData.
         * @exports IJointData
         * @interface IJointData
         * @property {Array.<number>|null} [translate] JointData translate
         * @property {Uint8Array|null} [rotate] JointData rotate
         */
    
        /**
         * Constructs a new JointData.
         * @exports JointData
         * @classdesc Represents a JointData.
         * @implements IJointData
         * @constructor
         * @param {IJointData=} [properties] Properties to set
         */
        function JointData(properties) {
            this.translate = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }
    
        /**
         * JointData translate.
         * @member {Array.<number>} translate
         * @memberof JointData
         * @instance
         */
        JointData.prototype.translate = $util.emptyArray;
    
        /**
         * JointData rotate.
         * @member {Uint8Array} rotate
         * @memberof JointData
         * @instance
         */
        JointData.prototype.rotate = $util.newBuffer([]);
    
        /**
         * Creates a new JointData instance using the specified properties.
         * @function create
         * @memberof JointData
         * @static
         * @param {IJointData=} [properties] Properties to set
         * @returns {JointData} JointData instance
         */
        JointData.create = function create(properties) {
            return new JointData(properties);
        };
    
        /**
         * Encodes the specified JointData message. Does not implicitly {@link JointData.verify|verify} messages.
         * @function encode
         * @memberof JointData
         * @static
         * @param {IJointData} message JointData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        JointData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.translate != null && message.translate.length) {
                writer.uint32(/* id 1, wireType 2 =*/10).fork();
                for (var i = 0; i < message.translate.length; ++i)
                    writer.float(message.translate[i]);
                writer.ldelim();
            }
            if (message.rotate != null && Object.hasOwnProperty.call(message, "rotate"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.rotate);
            return writer;
        };
    
        /**
         * Encodes the specified JointData message, length delimited. Does not implicitly {@link JointData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof JointData
         * @static
         * @param {IJointData} message JointData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        JointData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };
    
        /**
         * Decodes a JointData message from the specified reader or buffer.
         * @function decode
         * @memberof JointData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {JointData} JointData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        JointData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.JointData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.translate && message.translate.length))
                            message.translate = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.translate.push(reader.float());
                        } else
                            message.translate.push(reader.float());
                        break;
                    }
                case 2: {
                        message.rotate = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };
    
        /**
         * Decodes a JointData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof JointData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {JointData} JointData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        JointData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };
    
        /**
         * Verifies a JointData message.
         * @function verify
         * @memberof JointData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        JointData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.translate != null && message.hasOwnProperty("translate")) {
                if (!Array.isArray(message.translate))
                    return "translate: array expected";
                for (var i = 0; i < message.translate.length; ++i)
                    if (typeof message.translate[i] !== "number")
                        return "translate: number[] expected";
            }
            if (message.rotate != null && message.hasOwnProperty("rotate"))
                if (!(message.rotate && typeof message.rotate.length === "number" || $util.isString(message.rotate)))
                    return "rotate: buffer expected";
            return null;
        };
    
        /**
         * Creates a JointData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof JointData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {JointData} JointData
         */
        JointData.fromObject = function fromObject(object) {
            if (object instanceof $root.JointData)
                return object;
            var message = new $root.JointData();
            if (object.translate) {
                if (!Array.isArray(object.translate))
                    throw TypeError(".JointData.translate: array expected");
                message.translate = [];
                for (var i = 0; i < object.translate.length; ++i)
                    message.translate[i] = Number(object.translate[i]);
            }
            if (object.rotate != null)
                if (typeof object.rotate === "string")
                    $util.base64.decode(object.rotate, message.rotate = $util.newBuffer($util.base64.length(object.rotate)), 0);
                else if (object.rotate.length >= 0)
                    message.rotate = object.rotate;
            return message;
        };
    
        /**
         * Creates a plain object from a JointData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof JointData
         * @static
         * @param {JointData} message JointData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        JointData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.translate = [];
            if (options.defaults)
                if (options.bytes === String)
                    object.rotate = "";
                else {
                    object.rotate = [];
                    if (options.bytes !== Array)
                        object.rotate = $util.newBuffer(object.rotate);
                }
            if (message.translate && message.translate.length) {
                object.translate = [];
                for (var j = 0; j < message.translate.length; ++j)
                    object.translate[j] = options.json && !isFinite(message.translate[j]) ? String(message.translate[j]) : message.translate[j];
            }
            if (message.rotate != null && message.hasOwnProperty("rotate"))
                object.rotate = options.bytes === String ? $util.base64.encode(message.rotate, 0, message.rotate.length) : options.bytes === Array ? Array.prototype.slice.call(message.rotate) : message.rotate;
            return object;
        };
    
        /**
         * Converts this JointData to JSON.
         * @function toJSON
         * @memberof JointData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        JointData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };
    
        /**
         * Gets the default type url for JointData
         * @function getTypeUrl
         * @memberof JointData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        JointData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/JointData";
        };
    
        return JointData;
    })();
    
    $root.FaceFrameData = (function() {
    
        /**
         * Properties of a FaceFrameData.
         * @exports IFaceFrameData
         * @interface IFaceFrameData
         * @property {number|null} [id] FaceFrameData id
         * @property {string|null} [s] FaceFrameData s
         * @property {number|null} [sf] FaceFrameData sf
         * @property {number|null} [ef] FaceFrameData ef
         * @property {Uint8Array|null} [bsw] FaceFrameData bsw
         * @property {Uint8Array|null} [cs] FaceFrameData cs
         * @property {Array.<IJointData>|null} [js] FaceFrameData js
         * @property {Array.<IMeshData>|null} [ms] FaceFrameData ms
         * @property {number|null} [bodyId] FaceFrameData bodyId
         * @property {number|null} [faceFrameType] FaceFrameData faceFrameType
         */
    
        /**
         * Constructs a new FaceFrameData.
         * @exports FaceFrameData
         * @classdesc Represents a FaceFrameData.
         * @implements IFaceFrameData
         * @constructor
         * @param {IFaceFrameData=} [properties] Properties to set
         */
        function FaceFrameData(properties) {
            this.js = [];
            this.ms = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }
    
        /**
         * FaceFrameData id.
         * @member {number} id
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.id = 0;
    
        /**
         * FaceFrameData s.
         * @member {string} s
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.s = "";
    
        /**
         * FaceFrameData sf.
         * @member {number} sf
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.sf = 0;
    
        /**
         * FaceFrameData ef.
         * @member {number} ef
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.ef = 0;
    
        /**
         * FaceFrameData bsw.
         * @member {Uint8Array} bsw
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.bsw = $util.newBuffer([]);
    
        /**
         * FaceFrameData cs.
         * @member {Uint8Array} cs
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.cs = $util.newBuffer([]);
    
        /**
         * FaceFrameData js.
         * @member {Array.<IJointData>} js
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.js = $util.emptyArray;
    
        /**
         * FaceFrameData ms.
         * @member {Array.<IMeshData>} ms
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.ms = $util.emptyArray;
    
        /**
         * FaceFrameData bodyId.
         * @member {number} bodyId
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.bodyId = 0;
    
        /**
         * FaceFrameData faceFrameType.
         * @member {number} faceFrameType
         * @memberof FaceFrameData
         * @instance
         */
        FaceFrameData.prototype.faceFrameType = 0;
    
        /**
         * Creates a new FaceFrameData instance using the specified properties.
         * @function create
         * @memberof FaceFrameData
         * @static
         * @param {IFaceFrameData=} [properties] Properties to set
         * @returns {FaceFrameData} FaceFrameData instance
         */
        FaceFrameData.create = function create(properties) {
            return new FaceFrameData(properties);
        };
    
        /**
         * Encodes the specified FaceFrameData message. Does not implicitly {@link FaceFrameData.verify|verify} messages.
         * @function encode
         * @memberof FaceFrameData
         * @static
         * @param {IFaceFrameData} message FaceFrameData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FaceFrameData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.id);
            if (message.s != null && Object.hasOwnProperty.call(message, "s"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.s);
            if (message.sf != null && Object.hasOwnProperty.call(message, "sf"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.sf);
            if (message.ef != null && Object.hasOwnProperty.call(message, "ef"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.ef);
            if (message.bsw != null && Object.hasOwnProperty.call(message, "bsw"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.bsw);
            if (message.cs != null && Object.hasOwnProperty.call(message, "cs"))
                writer.uint32(/* id 11, wireType 2 =*/90).bytes(message.cs);
            if (message.js != null && message.js.length)
                for (var i = 0; i < message.js.length; ++i)
                    $root.JointData.encode(message.js[i], writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
            if (message.ms != null && message.ms.length)
                for (var i = 0; i < message.ms.length; ++i)
                    $root.MeshData.encode(message.ms[i], writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
            if (message.bodyId != null && Object.hasOwnProperty.call(message, "bodyId"))
                writer.uint32(/* id 14, wireType 0 =*/112).int32(message.bodyId);
            if (message.faceFrameType != null && Object.hasOwnProperty.call(message, "faceFrameType"))
                writer.uint32(/* id 15, wireType 0 =*/120).int32(message.faceFrameType);
            return writer;
        };
    
        /**
         * Encodes the specified FaceFrameData message, length delimited. Does not implicitly {@link FaceFrameData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof FaceFrameData
         * @static
         * @param {IFaceFrameData} message FaceFrameData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FaceFrameData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };
    
        /**
         * Decodes a FaceFrameData message from the specified reader or buffer.
         * @function decode
         * @memberof FaceFrameData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {FaceFrameData} FaceFrameData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FaceFrameData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.FaceFrameData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.int32();
                        break;
                    }
                case 2: {
                        message.s = reader.string();
                        break;
                    }
                case 3: {
                        message.sf = reader.int32();
                        break;
                    }
                case 4: {
                        message.ef = reader.int32();
                        break;
                    }
                case 5: {
                        message.bsw = reader.bytes();
                        break;
                    }
                case 11: {
                        message.cs = reader.bytes();
                        break;
                    }
                case 12: {
                        if (!(message.js && message.js.length))
                            message.js = [];
                        message.js.push($root.JointData.decode(reader, reader.uint32()));
                        break;
                    }
                case 13: {
                        if (!(message.ms && message.ms.length))
                            message.ms = [];
                        message.ms.push($root.MeshData.decode(reader, reader.uint32()));
                        break;
                    }
                case 14: {
                        message.bodyId = reader.int32();
                        break;
                    }
                case 15: {
                        message.faceFrameType = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };
    
        /**
         * Decodes a FaceFrameData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof FaceFrameData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {FaceFrameData} FaceFrameData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FaceFrameData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };
    
        /**
         * Verifies a FaceFrameData message.
         * @function verify
         * @memberof FaceFrameData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FaceFrameData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isInteger(message.id))
                    return "id: integer expected";
            if (message.s != null && message.hasOwnProperty("s"))
                if (!$util.isString(message.s))
                    return "s: string expected";
            if (message.sf != null && message.hasOwnProperty("sf"))
                if (!$util.isInteger(message.sf))
                    return "sf: integer expected";
            if (message.ef != null && message.hasOwnProperty("ef"))
                if (!$util.isInteger(message.ef))
                    return "ef: integer expected";
            if (message.bsw != null && message.hasOwnProperty("bsw"))
                if (!(message.bsw && typeof message.bsw.length === "number" || $util.isString(message.bsw)))
                    return "bsw: buffer expected";
            if (message.cs != null && message.hasOwnProperty("cs"))
                if (!(message.cs && typeof message.cs.length === "number" || $util.isString(message.cs)))
                    return "cs: buffer expected";
            if (message.js != null && message.hasOwnProperty("js")) {
                if (!Array.isArray(message.js))
                    return "js: array expected";
                for (var i = 0; i < message.js.length; ++i) {
                    var error = $root.JointData.verify(message.js[i]);
                    if (error)
                        return "js." + error;
                }
            }
            if (message.ms != null && message.hasOwnProperty("ms")) {
                if (!Array.isArray(message.ms))
                    return "ms: array expected";
                for (var i = 0; i < message.ms.length; ++i) {
                    var error = $root.MeshData.verify(message.ms[i]);
                    if (error)
                        return "ms." + error;
                }
            }
            if (message.bodyId != null && message.hasOwnProperty("bodyId"))
                if (!$util.isInteger(message.bodyId))
                    return "bodyId: integer expected";
            if (message.faceFrameType != null && message.hasOwnProperty("faceFrameType"))
                if (!$util.isInteger(message.faceFrameType))
                    return "faceFrameType: integer expected";
            return null;
        };
    
        /**
         * Creates a FaceFrameData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof FaceFrameData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {FaceFrameData} FaceFrameData
         */
        FaceFrameData.fromObject = function fromObject(object) {
            if (object instanceof $root.FaceFrameData)
                return object;
            var message = new $root.FaceFrameData();
            if (object.id != null)
                message.id = object.id | 0;
            if (object.s != null)
                message.s = String(object.s);
            if (object.sf != null)
                message.sf = object.sf | 0;
            if (object.ef != null)
                message.ef = object.ef | 0;
            if (object.bsw != null)
                if (typeof object.bsw === "string")
                    $util.base64.decode(object.bsw, message.bsw = $util.newBuffer($util.base64.length(object.bsw)), 0);
                else if (object.bsw.length >= 0)
                    message.bsw = object.bsw;
            if (object.cs != null)
                if (typeof object.cs === "string")
                    $util.base64.decode(object.cs, message.cs = $util.newBuffer($util.base64.length(object.cs)), 0);
                else if (object.cs.length >= 0)
                    message.cs = object.cs;
            if (object.js) {
                if (!Array.isArray(object.js))
                    throw TypeError(".FaceFrameData.js: array expected");
                message.js = [];
                for (var i = 0; i < object.js.length; ++i) {
                    if (typeof object.js[i] !== "object")
                        throw TypeError(".FaceFrameData.js: object expected");
                    message.js[i] = $root.JointData.fromObject(object.js[i]);
                }
            }
            if (object.ms) {
                if (!Array.isArray(object.ms))
                    throw TypeError(".FaceFrameData.ms: array expected");
                message.ms = [];
                for (var i = 0; i < object.ms.length; ++i) {
                    if (typeof object.ms[i] !== "object")
                        throw TypeError(".FaceFrameData.ms: object expected");
                    message.ms[i] = $root.MeshData.fromObject(object.ms[i]);
                }
            }
            if (object.bodyId != null)
                message.bodyId = object.bodyId | 0;
            if (object.faceFrameType != null)
                message.faceFrameType = object.faceFrameType | 0;
            return message;
        };
    
        /**
         * Creates a plain object from a FaceFrameData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof FaceFrameData
         * @static
         * @param {FaceFrameData} message FaceFrameData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FaceFrameData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.js = [];
                object.ms = [];
            }
            if (options.defaults) {
                object.id = 0;
                object.s = "";
                object.sf = 0;
                object.ef = 0;
                if (options.bytes === String)
                    object.bsw = "";
                else {
                    object.bsw = [];
                    if (options.bytes !== Array)
                        object.bsw = $util.newBuffer(object.bsw);
                }
                if (options.bytes === String)
                    object.cs = "";
                else {
                    object.cs = [];
                    if (options.bytes !== Array)
                        object.cs = $util.newBuffer(object.cs);
                }
                object.bodyId = 0;
                object.faceFrameType = 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.s != null && message.hasOwnProperty("s"))
                object.s = message.s;
            if (message.sf != null && message.hasOwnProperty("sf"))
                object.sf = message.sf;
            if (message.ef != null && message.hasOwnProperty("ef"))
                object.ef = message.ef;
            if (message.bsw != null && message.hasOwnProperty("bsw"))
                object.bsw = options.bytes === String ? $util.base64.encode(message.bsw, 0, message.bsw.length) : options.bytes === Array ? Array.prototype.slice.call(message.bsw) : message.bsw;
            if (message.cs != null && message.hasOwnProperty("cs"))
                object.cs = options.bytes === String ? $util.base64.encode(message.cs, 0, message.cs.length) : options.bytes === Array ? Array.prototype.slice.call(message.cs) : message.cs;
            if (message.js && message.js.length) {
                object.js = [];
                for (var j = 0; j < message.js.length; ++j)
                    object.js[j] = $root.JointData.toObject(message.js[j], options);
            }
            if (message.ms && message.ms.length) {
                object.ms = [];
                for (var j = 0; j < message.ms.length; ++j)
                    object.ms[j] = $root.MeshData.toObject(message.ms[j], options);
            }
            if (message.bodyId != null && message.hasOwnProperty("bodyId"))
                object.bodyId = message.bodyId;
            if (message.faceFrameType != null && message.hasOwnProperty("faceFrameType"))
                object.faceFrameType = message.faceFrameType;
            return object;
        };
    
        /**
         * Converts this FaceFrameData to JSON.
         * @function toJSON
         * @memberof FaceFrameData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FaceFrameData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };
    
        /**
         * Gets the default type url for FaceFrameData
         * @function getTypeUrl
         * @memberof FaceFrameData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FaceFrameData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/FaceFrameData";
        };
    
        return FaceFrameData;
    })();
    
    $root.FaceFrameDataList = (function() {
    
        /**
         * Properties of a FaceFrameDataList.
         * @exports IFaceFrameDataList
         * @interface IFaceFrameDataList
         * @property {Array.<IFaceFrameData>|null} [data] FaceFrameDataList data
         */
    
        /**
         * Constructs a new FaceFrameDataList.
         * @exports FaceFrameDataList
         * @classdesc Represents a FaceFrameDataList.
         * @implements IFaceFrameDataList
         * @constructor
         * @param {IFaceFrameDataList=} [properties] Properties to set
         */
        function FaceFrameDataList(properties) {
            this.data = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }
    
        /**
         * FaceFrameDataList data.
         * @member {Array.<IFaceFrameData>} data
         * @memberof FaceFrameDataList
         * @instance
         */
        FaceFrameDataList.prototype.data = $util.emptyArray;
    
        /**
         * Creates a new FaceFrameDataList instance using the specified properties.
         * @function create
         * @memberof FaceFrameDataList
         * @static
         * @param {IFaceFrameDataList=} [properties] Properties to set
         * @returns {FaceFrameDataList} FaceFrameDataList instance
         */
        FaceFrameDataList.create = function create(properties) {
            return new FaceFrameDataList(properties);
        };
    
        /**
         * Encodes the specified FaceFrameDataList message. Does not implicitly {@link FaceFrameDataList.verify|verify} messages.
         * @function encode
         * @memberof FaceFrameDataList
         * @static
         * @param {IFaceFrameDataList} message FaceFrameDataList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FaceFrameDataList.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.data != null && message.data.length)
                for (var i = 0; i < message.data.length; ++i)
                    $root.FaceFrameData.encode(message.data[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };
    
        /**
         * Encodes the specified FaceFrameDataList message, length delimited. Does not implicitly {@link FaceFrameDataList.verify|verify} messages.
         * @function encodeDelimited
         * @memberof FaceFrameDataList
         * @static
         * @param {IFaceFrameDataList} message FaceFrameDataList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FaceFrameDataList.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };
    
        /**
         * Decodes a FaceFrameDataList message from the specified reader or buffer.
         * @function decode
         * @memberof FaceFrameDataList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {FaceFrameDataList} FaceFrameDataList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FaceFrameDataList.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.FaceFrameDataList();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.data && message.data.length))
                            message.data = [];
                        message.data.push($root.FaceFrameData.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };
    
        /**
         * Decodes a FaceFrameDataList message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof FaceFrameDataList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {FaceFrameDataList} FaceFrameDataList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FaceFrameDataList.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };
    
        /**
         * Verifies a FaceFrameDataList message.
         * @function verify
         * @memberof FaceFrameDataList
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FaceFrameDataList.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.data != null && message.hasOwnProperty("data")) {
                if (!Array.isArray(message.data))
                    return "data: array expected";
                for (var i = 0; i < message.data.length; ++i) {
                    var error = $root.FaceFrameData.verify(message.data[i]);
                    if (error)
                        return "data." + error;
                }
            }
            return null;
        };
    
        /**
         * Creates a FaceFrameDataList message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof FaceFrameDataList
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {FaceFrameDataList} FaceFrameDataList
         */
        FaceFrameDataList.fromObject = function fromObject(object) {
            if (object instanceof $root.FaceFrameDataList)
                return object;
            var message = new $root.FaceFrameDataList();
            if (object.data) {
                if (!Array.isArray(object.data))
                    throw TypeError(".FaceFrameDataList.data: array expected");
                message.data = [];
                for (var i = 0; i < object.data.length; ++i) {
                    if (typeof object.data[i] !== "object")
                        throw TypeError(".FaceFrameDataList.data: object expected");
                    message.data[i] = $root.FaceFrameData.fromObject(object.data[i]);
                }
            }
            return message;
        };
    
        /**
         * Creates a plain object from a FaceFrameDataList message. Also converts values to other types if specified.
         * @function toObject
         * @memberof FaceFrameDataList
         * @static
         * @param {FaceFrameDataList} message FaceFrameDataList
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FaceFrameDataList.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.data = [];
            if (message.data && message.data.length) {
                object.data = [];
                for (var j = 0; j < message.data.length; ++j)
                    object.data[j] = $root.FaceFrameData.toObject(message.data[j], options);
            }
            return object;
        };
    
        /**
         * Converts this FaceFrameDataList to JSON.
         * @function toJSON
         * @memberof FaceFrameDataList
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FaceFrameDataList.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };
    
        /**
         * Gets the default type url for FaceFrameDataList
         * @function getTypeUrl
         * @memberof FaceFrameDataList
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FaceFrameDataList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/FaceFrameDataList";
        };
    
        return FaceFrameDataList;
    })();

    return $root;
})(protobuf);

exports.FrameAnimationController = FrameAnimationController;
exports.GLDevice = GLDevice;
exports.GLPipeline = GLPipeline;
exports.IBRAnimationFrameData_NN = IBRAnimationFrameData_NN;
exports.IBRAnimationGeneratorCharInfo_NN = IBRAnimationGeneratorCharInfo_NN;
exports.XMLRequest = XMLRequest;
exports.formatMJT = formatMJT;
exports.getPCATextures = getPCATextures;
exports.getStyleStr = getStyleStr;
exports.getVertices = getVertices;
exports.getWavefrontObjFromVertices = getWavefrontObjFromVertices;
exports.headersNeedSign = headersNeedSign;
exports.parseUint8ToFloat32 = parseUint8ToFloat32;
exports.performanceConstant = performanceConstant;
exports.request = request;
exports.scaledInt16BytesToFloat32 = scaledInt16BytesToFloat32;
exports.unpackIBRAnimation = unpackIBRAnimation;
exports.updateCanvasXOffset = updateCanvasXOffset;
exports.workerURL = workerURL;
//# sourceMappingURL=xmov-avatar-mp.heavy.offline2.js.map

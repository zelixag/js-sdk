/**
 * 服务端 floats_to_scaled_int16_bytes 反向函数：Base64 → float32 数组
 * 核心逻辑：Base64→int16字节流→int16数值（兼容round+clip）→÷0x7FFF→float32
 * @param base64Str 服务端返回的 Base64 编码字符串
 * @returns float32 精度的浮点数数组（与服务端原始 floats 一致）
 */
export function scaledInt16BytesToFloat32(base64Str) {
    try {
        // Base64 解码
        const binaryString = atob(base64Str);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        // 转换为 Int16Array
        const int16Array = new Int16Array(bytes.buffer);
        // 转换为 float32 数组
        const float32Array = [];
        for (let i = 0; i < int16Array.length; i++) {
            // int16 值除以 0x7FFF 得到 float32
            float32Array.push(int16Array[i] / 0x7FFF);
        }
        return float32Array;
    }
    catch (error) {
        console.error('[float32-decoder] 解码失败:', error);
        return [];
    }
}
/**
 * 可选：带平滑滤波的版本（解决"脸色闪"问题，优化视觉效果）
 * @param base64Str 服务端 Base64 字符串
 * @param lastData 上一帧数据（用于平滑）
 * @param alpha 平滑系数（0~1，默认0.2，越大响应越快，越小越平滑）
 * @returns 平滑后的 float32 数组
 */
export function scaledInt16BytesToSmoothFloat32(base64Str, lastData, alpha = 0.2) {
    const currentData = scaledInt16BytesToFloat32(base64Str);
    if (!lastData || lastData.length !== currentData.length) {
        return currentData;
    }
    // 平滑处理
    return currentData.map((value, index) => {
        return alpha * value + (1 - alpha) * lastData[index];
    });
}
/**
 * 从 Uint8Array 解析出 float32 数组（核心修复版）
 * @param uint8Arr 后端传来的 Uint8Array 原始字节
 * @returns 解析后的浮点数组
 */
export function parseUint8ToFloat32(uint8Arr) {
    try {
        // 转换为 Int16Array
        const int16Array = new Int16Array(uint8Arr.buffer);
        // 转换为 float32 数组
        const float32Array = [];
        for (let i = 0; i < int16Array.length; i++) {
            // int16 值除以 0x7FFF 得到 float32
            float32Array.push(int16Array[i] / 0x7FFF);
        }
        return float32Array;
    }
    catch (error) {
        console.error('[float32-decoder] 解析失败:', error);
        return [];
    }
}

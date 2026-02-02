/**
 * 服务端 floats_to_scaled_int16_bytes 反向函数：Base64 → float32 数组
 * 供原 SDK ttsa/decoder 打包时解析
 */
export function scaledInt16BytesToFloat32(base64Str: string): number[] {
  try {
    const binaryString = atob(base64Str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array: number[] = [];
    for (let i = 0; i < int16Array.length; i++) {
      float32Array.push(int16Array[i] / 0x7FFF);
    }
    return float32Array;
  } catch (error) {
    console.error('[float32-decoder] 解码失败:', error);
    return [];
  }
}

export function scaledInt16BytesToSmoothFloat32(
  base64Str: string,
  lastData?: number[],
  alpha: number = 0.2
): number[] {
  const currentData = scaledInt16BytesToFloat32(base64Str);
  if (!lastData || lastData.length !== currentData.length) {
    return currentData;
  }
  return currentData.map((value, index) => {
    return alpha * value + (1 - alpha) * lastData[index];
  });
}

export function parseUint8ToFloat32(uint8Arr: Uint8Array): number[] {
  try {
    const int16Array = new Int16Array(uint8Arr.buffer);
    const float32Array: number[] = [];
    for (let i = 0; i < int16Array.length; i++) {
      float32Array.push(int16Array[i] / 0x7FFF);
    }
    return float32Array;
  } catch (error) {
    console.error('[float32-decoder] 解析失败:', error);
    return [];
  }
}

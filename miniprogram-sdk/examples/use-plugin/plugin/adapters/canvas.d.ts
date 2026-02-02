/**
 * Canvas 适配层 - 小程序版本
 * 适配小程序 Canvas API 和 WebGL
 */
/**
 * 获取 Canvas 节点
 */
export declare function getCanvasNode(canvasId: string): Promise<WechatMiniprogram.Canvas>;
/**
 * 创建 WebGL 上下文
 */
export declare function createWebGLContext(canvas: WechatMiniprogram.Canvas, options?: {
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
}): WebGL2RenderingContext | null;
/**
 * 设置 Canvas 尺寸
 */
export declare function setCanvasSize(canvasId: string, width: number, height: number): Promise<void>;
/**
 * 创建 Image 对象（兼容浏览器 API）
 * 返回类似 HTMLImageElement 的对象
 */
export declare function createImage(): {
    src: string;
    crossOrigin: string | null;
    onload: (() => void) | null;
    onerror: ((err: any) => void) | null;
    width: number;
    height: number;
    complete: boolean;
};
/**
 * 创建 ImageBitmap（如果支持）
 * 小程序可能不支持，需要降级处理
 */
export declare function createImageBitmap(source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | Blob | ImageBitmap | ArrayBuffer | Uint8Array, options?: {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: 'pixelated' | 'low' | 'medium' | 'high';
}): Promise<ImageBitmap>;

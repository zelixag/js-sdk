/**
 * Canvas 适配层 - 小程序版本
 * 适配小程序 Canvas API 和 WebGL
 */

/**
 * 获取 Canvas 节点
 */
export function getCanvasNode(canvasId: string): Promise<WechatMiniprogram.Canvas> {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          resolve(res[0].node);
        } else {
          reject(new Error(`Canvas node not found: ${canvasId}`));
        }
      });
  });
}

/**
 * 创建 WebGL 上下文
 */
export function createWebGLContext(
  canvas: WechatMiniprogram.Canvas,
  options?: {
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
  }
): WebGL2RenderingContext | null {
  // 小程序 Canvas 不支持 webgl2，会报 Invalid context type [webgl2]，直接用 webgl
  try {
    const gl = canvas.getContext('webgl') as WebGL2RenderingContext | null;
    return gl;
  } catch (err) {
    console.error('[Canvas] Create WebGL context error:', err);
    return null;
  }
}

/**
 * 设置 Canvas 尺寸
 */
export function setCanvasSize(
  canvasId: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          const canvas = res[0].node;
          const dpr = wx.getSystemInfoSync().pixelRatio;
          
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          
          // 设置样式尺寸
          wx.createSelectorQuery()
            .select(`#${canvasId}`)
            .boundingClientRect()
            .exec((rect) => {
              if (rect && rect[0]) {
                // 通过设置样式来控制显示尺寸
                // 注意：小程序中需要通过 CSS 或 style 属性设置
                resolve();
              } else {
                resolve();
              }
            });
        } else {
          reject(new Error(`Canvas node not found: ${canvasId}`));
        }
      });
  });
}

/**
 * 创建 Image 对象（兼容浏览器 API）
 * 返回类似 HTMLImageElement 的对象
 */
export function createImage(): {
  src: string;
  crossOrigin: string | null;
  onload: (() => void) | null;
  onerror: ((err: any) => void) | null;
  width: number;
  height: number;
  complete: boolean;
} {
  const image: any = {
    src: '',
    crossOrigin: null,
    onload: null,
    onerror: null,
    width: 0,
    height: 0,
    complete: false
  };

  // 小程序中使用 wx.getImageInfo 加载图片
  Object.defineProperty(image, 'src', {
    set: function(value: string) {
      this._src = value;
      this.complete = false;

      // 小程序中 crossOrigin 属性不影响加载，但保留以兼容 API
      wx.getImageInfo({
        src: value,
        success: (res) => {
          this.width = res.width;
          this.height = res.height;
          this.complete = true;
          if (this.onload) {
            this.onload();
          }
        },
        fail: (err) => {
          this.complete = false;
          if (this.onerror) {
            this.onerror(err);
          }
        }
      });
    },
    get: function() {
      return this._src || '';
    }
  });

  // 添加 crossOrigin 属性（小程序中不影响，但保留以兼容）
  Object.defineProperty(image, 'crossOrigin', {
    set: function(value: string | null) {
      this._crossOrigin = value;
    },
    get: function() {
      return this._crossOrigin || null;
    }
  });

  return image;
}

/**
 * 创建 ImageBitmap（如果支持）
 * 小程序可能不支持，需要降级处理
 */
export function createImageBitmap(
  source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | Blob | ImageBitmap | ArrayBuffer | Uint8Array,
  options?: {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: 'pixelated' | 'low' | 'medium' | 'high';
  }
): Promise<ImageBitmap> {
  // 小程序可能不支持 ImageBitmap，需要转换为 Canvas
  // 这里返回一个兼容的对象
  return Promise.resolve({
    width: 0,
    height: 0,
    close: () => {}
  } as any);
}

import { SDKError, ErrorCode, CanvasConfig } from '@/types';

/**
 * Canvas适配器
 * 封装小程序Canvas API，提供统一的Canvas操作接口
 */
export class CanvasAdapter {
  private canvasId: string;
  private canvas: WechatMiniprogram.Canvas | null = null;
  private context: WebGLRenderingContext | CanvasRenderingContext2D | null = null;
  private canvasType: 'webgl' | '2d';
  private width: number;
  private height: number;
  private pixelRatio: number;

  constructor(config: CanvasConfig) {
    this.canvasId = config.id;
    this.canvasType = config.type || 'webgl';
    this.width = config.width || 375;
    this.height = config.height || 667;
    this.pixelRatio = config.pixelRatio || wx.getSystemInfoSync().pixelRatio || 2;
  }

  /**
   * 初始化Canvas
   */
  async init(): Promise<void> {
    try {
      console.log('[CanvasAdapter] Initializing canvas:', this.canvasId);
      
      // 获取Canvas节点
      this.canvas = await this.getCanvasNode();
      
      if (!this.canvas) {
        throw new SDKError(
          ErrorCode.CANVAS_NOT_FOUND,
          `Canvas not found: ${this.canvasId}`
        );
      }

      // 设置Canvas尺寸
      this.setSize(this.width, this.height);

      // 创建渲染上下文
      if (this.canvasType === 'webgl') {
        this.context = this.createWebGLContext();
      } else {
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
      }

      if (!this.context) {
        throw new SDKError(
          ErrorCode.WEBGL_NOT_SUPPORT,
          'Failed to create canvas context'
        );
      }

      console.log('[CanvasAdapter] Canvas initialized successfully');
    } catch (error) {
      console.error('[CanvasAdapter] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 获取Canvas节点
   */
  private async getCanvasNode(): Promise<WechatMiniprogram.Canvas> {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query
        .select(`#${this.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            resolve(res[0].node);
          } else {
            reject(new SDKError(
              ErrorCode.CANVAS_NOT_FOUND,
              `Canvas node not found: ${this.canvasId}`
            ));
          }
        });
    });
  }

  /**
   * 创建WebGL上下文
   */
  private createWebGLContext(): WebGLRenderingContext | null {
    if (!this.canvas) {
      return null;
    }

    try {
      const gl = this.canvas.getContext('webgl') as WebGLRenderingContext;

      if (!gl) {
        throw new SDKError(
          ErrorCode.WEBGL_NOT_SUPPORT,
          'WebGL not supported'
        );
      }

      // 设置视口
      gl.viewport(0, 0, this.width * this.pixelRatio, this.height * this.pixelRatio);

      // 启用深度测试
      gl.enable(gl.DEPTH_TEST);

      // 启用混合
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      console.log('[CanvasAdapter] WebGL context created');
      return gl;
    } catch (error) {
      console.error('[CanvasAdapter] Failed to create WebGL context:', error);
      throw error;
    }
  }

  /**
   * 设置Canvas尺寸
   */
  setSize(width: number, height: number): void {
    if (!this.canvas) {
      return;
    }

    this.width = width;
    this.height = height;

    // 设置Canvas的实际渲染尺寸
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;

    console.log(`[CanvasAdapter] Canvas size set to ${width}x${height} (${this.canvas.width}x${this.canvas.height})`);

    // 更新WebGL视口
    if (this.context && this.canvasType === 'webgl') {
      const gl = this.context as WebGLRenderingContext;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 清空Canvas
   */
  clear(color?: string): void {
    if (!this.context) {
      return;
    }

    if (this.canvasType === 'webgl') {
      const gl = this.context as WebGLRenderingContext;
      
      // 解析颜色
      const rgba = this.parseColor(color || '#000000');
      gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      const ctx = this.context as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, this.width * this.pixelRatio, this.height * this.pixelRatio);
      
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.width * this.pixelRatio, this.height * this.pixelRatio);
      }
    }
  }

  /**
   * 获取Canvas对象
   */
  getCanvas(): WechatMiniprogram.Canvas | null {
    return this.canvas;
  }

  /**
   * 获取渲染上下文
   */
  getContext(): WebGLRenderingContext | CanvasRenderingContext2D | null {
    return this.context;
  }

  /**
   * 获取WebGL上下文
   */
  getWebGLContext(): WebGLRenderingContext | null {
    if (this.canvasType === 'webgl') {
      return this.context as WebGLRenderingContext;
    }
    return null;
  }

  /**
   * 获取2D上下文
   */
  get2DContext(): CanvasRenderingContext2D | null {
    if (this.canvasType === '2d') {
      return this.context as CanvasRenderingContext2D;
    }
    return null;
  }

  /**
   * 获取Canvas尺寸
   */
  getSize(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   * 获取像素比
   */
  getPixelRatio(): number {
    return this.pixelRatio;
  }

  /**
   * 截图
   */
  async toDataURL(type: string = 'image/png', quality: number = 1.0): Promise<string> {
    if (!this.canvas) {
      throw new SDKError(ErrorCode.CANVAS_NOT_FOUND, 'Canvas not initialized');
    }

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: this.canvas!,
        fileType: type.replace('image/', '') as 'png' | 'jpg',
        quality,
        success: (res: WechatMiniprogram.CanvasToTempFilePathSuccessCallbackResult) => {
          resolve(res.tempFilePath);
        },
        fail: (error: any) => {
          reject(new SDKError(
            ErrorCode.RENDER_FAILED,
            'Failed to export canvas',
            error
          ));
        },
      });
    });
  }

  /**
   * 解析颜色字符串为RGBA数组
   */
  private parseColor(color: string): [number, number, number, number] {
    // 默认黑色
    let r = 0, g = 0, b = 0, a = 1;

    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
      } else if (hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
        a = parseInt(hex.slice(6, 8), 16) / 255;
      }
    }

    return [r, g, b, a];
  }

  /**
   * 销毁Canvas适配器
   */
  destroy(): void {
    this.context = null;
    this.canvas = null;
    console.log('[CanvasAdapter] Canvas adapter destroyed');
  }
}

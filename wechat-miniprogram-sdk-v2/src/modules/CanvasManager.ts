/**
 * Canvas管理器
 * 负责Canvas节点获取和WebGL上下文创建
 */

import { Logger } from '../utils/Logger';

export interface CanvasOptions {
  id: string;
  width?: number;
  height?: number;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
}

export class CanvasManager {
  private logger: Logger;
  private canvasId: string;
  private canvas: WechatMiniprogram.Canvas | null = null;
  private context: WebGLRenderingContext | CanvasRenderingContext2D | null = null;
  private contextType: '2d' | 'webgl' | null = null;

  constructor(options: CanvasOptions, logger: Logger) {
    this.canvasId = options.id;
    this.logger = logger;
  }

  /**
   * 获取Canvas节点
   */
  async getCanvasNode(): Promise<WechatMiniprogram.Canvas> {
    if (this.canvas) {
      return this.canvas;
    }

    this.logger.info(`[CanvasManager] Getting canvas node: ${this.canvasId}`);

    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      
      query
        .select(`#${this.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            const error = new Error(`Canvas node not found: ${this.canvasId}`);
            this.logger.error('[CanvasManager] Failed to get canvas node', error);
            reject(error);
            return;
          }

          const canvas = res[0].node;
          
          // 设置Canvas尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;

          this.canvas = canvas;
          this.logger.info(`[CanvasManager] Canvas node obtained: ${canvas.width}x${canvas.height}`);
          resolve(canvas);
        });
    });
  }

  /**
   * 创建WebGL上下文
   */
  async createWebGLContext(options: {
    antialias?: boolean;
    preserveDrawingBuffer?: boolean;
  } = {}): Promise<WebGLRenderingContext> {
    if (!this.canvas) {
      await this.getCanvasNode();
    }

    if (!this.canvas) {
      throw new Error('Canvas node not available');
    }

    this.logger.info('[CanvasManager] Creating WebGL context...');

    const gl = this.canvas.getContext('webgl') as WebGLRenderingContext;

    if (!gl) {
      throw new Error('Failed to create WebGL context');
    }

    this.context = gl;
    this.contextType = 'webgl';

    // 设置视口
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // 清空画布
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.logger.info('[CanvasManager] WebGL context created successfully');
    return gl;
  }

  /**
   * 创建2D上下文
   */
  async create2DContext(): Promise<CanvasRenderingContext2D> {
    if (!this.canvas) {
      await this.getCanvasNode();
    }

    if (!this.canvas) {
      throw new Error('Canvas node not available');
    }

    this.logger.info('[CanvasManager] Creating 2D context...');

    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    if (!ctx) {
      throw new Error('Failed to create 2D context');
    }

    this.context = ctx;
    this.contextType = '2d';

    // 设置缩放
    const dpr = wx.getSystemInfoSync().pixelRatio;
    ctx.scale(dpr, dpr);

    this.logger.info('[CanvasManager] 2D context created successfully');
    return ctx;
  }

  /**
   * 获取Canvas实例
   */
  getCanvas(): WechatMiniprogram.Canvas | null {
    return this.canvas;
  }

  /**
   * 获取上下文
   */
  getContext(): WebGLRenderingContext | CanvasRenderingContext2D | null {
    return this.context;
  }

  /**
   * 获取上下文类型
   */
  getContextType(): '2d' | 'webgl' | null {
    return this.contextType;
  }

  /**
   * 清空画布
   */
  clear(): void {
    if (!this.context) {
      return;
    }

    if (this.contextType === 'webgl') {
      const gl = this.context as WebGLRenderingContext;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else if (this.contextType === '2d') {
      const ctx = this.context as CanvasRenderingContext2D;
      if (this.canvas) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /**
   * 销毁Canvas管理器
   */
  destroy(): void {
    this.clear();
    this.canvas = null;
    this.context = null;
    this.contextType = null;
    this.logger.info('[CanvasManager] Canvas manager destroyed');
  }
}

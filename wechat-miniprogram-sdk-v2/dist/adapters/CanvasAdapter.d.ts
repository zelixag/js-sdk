import { CanvasConfig } from '@/types';
/**
 * Canvas适配器
 * 封装小程序Canvas API，提供统一的Canvas操作接口
 */
export declare class CanvasAdapter {
    private canvasId;
    private canvas;
    private context;
    private canvasType;
    private width;
    private height;
    private pixelRatio;
    constructor(config: CanvasConfig);
    /**
     * 初始化Canvas
     */
    init(): Promise<void>;
    /**
     * 获取Canvas节点
     */
    private getCanvasNode;
    /**
     * 创建WebGL上下文
     */
    private createWebGLContext;
    /**
     * 设置Canvas尺寸
     */
    setSize(width: number, height: number): void;
    /**
     * 清空Canvas
     */
    clear(color?: string): void;
    /**
     * 获取Canvas对象
     */
    getCanvas(): WechatMiniprogram.Canvas | null;
    /**
     * 获取渲染上下文
     */
    getContext(): WebGLRenderingContext | CanvasRenderingContext2D | null;
    /**
     * 获取WebGL上下文
     */
    getWebGLContext(): WebGLRenderingContext | null;
    /**
     * 获取2D上下文
     */
    get2DContext(): CanvasRenderingContext2D | null;
    /**
     * 获取Canvas尺寸
     */
    getSize(): {
        width: number;
        height: number;
    };
    /**
     * 获取像素比
     */
    getPixelRatio(): number;
    /**
     * 截图
     */
    toDataURL(type?: string, quality?: number): Promise<string>;
    /**
     * 解析颜色字符串为RGBA数组
     */
    private parseColor;
    /**
     * 销毁Canvas适配器
     */
    destroy(): void;
}
//# sourceMappingURL=CanvasAdapter.d.ts.map
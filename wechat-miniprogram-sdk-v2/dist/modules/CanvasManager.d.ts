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
export declare class CanvasManager {
    private logger;
    private canvasId;
    private canvas;
    private context;
    private contextType;
    constructor(options: CanvasOptions, logger: Logger);
    /**
     * 获取Canvas节点
     */
    getCanvasNode(): Promise<WechatMiniprogram.Canvas>;
    /**
     * 创建WebGL上下文
     */
    createWebGLContext(options?: {
        antialias?: boolean;
        preserveDrawingBuffer?: boolean;
    }): Promise<WebGLRenderingContext>;
    /**
     * 创建2D上下文
     */
    create2DContext(): Promise<CanvasRenderingContext2D>;
    /**
     * 获取Canvas实例
     */
    getCanvas(): WechatMiniprogram.Canvas | null;
    /**
     * 获取上下文
     */
    getContext(): WebGLRenderingContext | CanvasRenderingContext2D | null;
    /**
     * 获取上下文类型
     */
    getContextType(): '2d' | 'webgl' | null;
    /**
     * 清空画布
     */
    clear(): void;
    /**
     * 销毁Canvas管理器
     */
    destroy(): void;
}
//# sourceMappingURL=CanvasManager.d.ts.map
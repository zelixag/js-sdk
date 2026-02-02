/**
 * Canvas 替换工具
 * 用于在创建 AvatarRenderer 后替换其 canvas 属性
 */
/**
 * 替换 AvatarRenderer 的 canvas
 * @param avatarRenderer AvatarRenderer 实例
 * @param canvas 真实的 Canvas 对象（小程序通过 getCanvasNode 获取）
 * @param gl WebGL 上下文（可选）
 */
export declare function replaceAvatarRendererCanvas(avatarRenderer: any, canvas: WechatMiniprogram.Canvas | HTMLCanvasElement, gl?: WebGL2RenderingContext | WebGLRenderingContext | null): void;

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
export function replaceAvatarRendererCanvas(
  avatarRenderer: any,
  canvas: WechatMiniprogram.Canvas | HTMLCanvasElement,
  gl?: WebGL2RenderingContext | WebGLRenderingContext | null
): void {
  if (!avatarRenderer) {
    console.warn('[Canvas Replacement] AvatarRenderer 不存在');
    return;
  }

  // 替换 canvas
  avatarRenderer.canvas = canvas;

  // 如果 device 已创建，也需要更新
  if (avatarRenderer.device) {
    avatarRenderer.device.canvas = canvas;
    if (gl && avatarRenderer.device.gl) {
      avatarRenderer.device.gl = gl;
    }
  }

  console.log('[Canvas Replacement] Canvas 已替换为真实对象');
}

/**
 * 小程序单文件 500KB 限制：将“重”逻辑单独打成 xmov-avatar-mp.heavy.js，
 * 入口只做 init + require(heavy) + re-export，避免 eval。
 */
import XmovAvatarMP from './core/XmovAvatarMP';
import {
  getCanvasNode,
  createWebGLContext,
  setCanvasSize,
  createImage,
} from './adapters/canvas';

export { XmovAvatarMP, getCanvasNode, createWebGLContext, setCanvasSize, createImage };
export default XmovAvatarMP;

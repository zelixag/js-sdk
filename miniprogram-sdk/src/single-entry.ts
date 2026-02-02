/**
 * 单文件入口：先执行 init，再 require(heavy) 并 re-export（小程序单文件 500KB 限制，不能打成一坨）
 * 用法：const { XmovAvatarMP, getCanvasNode, createWebGLContext } = require('./xmov-avatar-mp.js');
 */

// 1. 先执行适配层初始化（必须最先执行）
import './index-init';

// 2. 从 heavy 包取 API（heavy 单独打成 xmov-avatar-mp.heavy.js，入口保持小体积）
const heavy = require('./xmov-avatar-mp.heavy.js');

export const XmovAvatarMP = heavy.default;
export const getCanvasNode = heavy.getCanvasNode;
export const createWebGLContext = heavy.createWebGLContext;
export const setCanvasSize = heavy.setCanvasSize;
export const createImage = heavy.createImage;
export default heavy.default;

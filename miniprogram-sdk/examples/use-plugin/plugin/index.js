/**
 * 微信小程序插件入口文件
 * 导出 SDK 核心功能供插件使用者调用
 */

// 初始化适配层
require('./index-init.js');

// 导出核心类
const XmovAvatarMP = require('./core/XmovAvatarMP.js').default;

// 导出工具函数
const { getCanvasNode, createWebGLContext } = require('./adapters/canvas.js');
const { isMiniProgram } = require('./utils/env.js');

module.exports = {
  XmovAvatarMP,
  getCanvasNode,
  createWebGLContext,
  isMiniProgram
};

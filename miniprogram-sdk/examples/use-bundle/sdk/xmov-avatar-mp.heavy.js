'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('./xmov-avatar-mp.heavy.core.js');
require('./xmov-avatar-mp.heavy.offline2.js');
require('./xmov-avatar-mp.heavy.vendor.js');
require('./xmov-avatar-mp.heavy.offline.js');
require('./xmov-avatar-mp.heavy.offline1.js');

/**
 * 小程序单文件 500KB 限制：将“重”逻辑单独打成 xmov-avatar-mp.heavy.js，
 * 入口只做 init + require(heavy) + re-export，避免 eval。
 */

exports.XmovAvatarMP = core.XmovAvatarMP;
exports.createImage = core.createImage;
exports.createWebGLContext = core.createWebGLContext;
exports["default"] = core.XmovAvatarMP;
exports.getCanvasNode = core.getCanvasNode;
exports.setCanvasSize = core.setCanvasSize;
//# sourceMappingURL=xmov-avatar-mp.heavy.js.map

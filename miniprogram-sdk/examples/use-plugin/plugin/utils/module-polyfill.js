/**
 * 模块 Polyfill - 替换原 SDK 中使用的浏览器特定模块
 * 这个文件需要在导入原 SDK 之前执行
 */
import { isMiniProgram } from './env';
import { createImage } from '../adapters/canvas';
import { getDocument } from './dom-adapter';
// 如果在小程序环境中，替换全局模块
if (isMiniProgram()) {
    // 替换 Image 构造函数
    if (typeof globalThis !== 'undefined') {
        // @ts-ignore
        globalThis.Image = function () {
            return createImage();
        };
        // 也替换 window.Image（如果存在）
        if (globalThis.window) {
            globalThis.window.Image = globalThis.Image;
        }
    }
    // 替换 document.createElement，使其支持创建 canvas
    // 注意：小程序中的 canvas 需要通过 getCanvasNode 获取，这里创建一个模拟的
    const originalDocument = getDocument();
    if (originalDocument && typeof originalDocument.createElement === 'function') {
        const originalCreateElement = originalDocument.createElement.bind(originalDocument);
        originalDocument.createElement = function (tagName, options) {
            if (tagName.toLowerCase() === 'canvas') {
                // 返回一个模拟的 canvas 对象
                // 实际使用时，需要通过 getCanvasNode 获取真实的 canvas
                // 这个模拟对象会被 XmovAvatarMP 中的真实 canvas 替换
                return {
                    width: 0,
                    height: 0,
                    getContext: (type) => null,
                    setAttribute: () => { },
                    style: {},
                    addEventListener: () => { },
                    removeEventListener: () => { },
                    remove: () => { },
                };
            }
            return originalCreateElement(tagName, options);
        };
    }
    // 尝试替换 socket.io-client 模块（如果可能）
    // 注意：这需要在构建时通过 resolve.alias 来完全替换
    // 这里只是提供一个运行时备用方案
    if (typeof globalThis !== 'undefined') {
        // 存储适配器引用，供模块系统使用
        globalThis.__socketIOAdapter = require('../utils/socket-io-adapter');
    }
}

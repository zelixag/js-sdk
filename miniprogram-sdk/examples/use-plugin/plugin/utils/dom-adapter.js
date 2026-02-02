/**
 * DOM 适配器 - 在小程序环境中模拟 DOM API
 * 让原 SDK 的 DOM 操作可以在小程序中运行
 */
import { isMiniProgram } from './env';
import { getCanvasNode } from '../adapters/canvas';
/**
 * 模拟 HTMLElement
 */
class MiniProgramHTMLElement {
    constructor(canvasId) {
        this.canvas = null;
        this.attributes = new Map();
        this.children = [];
        this.canvasId = canvasId;
        this.style = this._createStyleProxy();
    }
    _createStyleProxy() {
        const styles = {};
        return new Proxy(styles, {
            get: (target, prop) => {
                return target[prop] || '';
            },
            set: (target, prop, value) => {
                target[prop] = value;
                // 在小程序中应用样式
                this._applyStyle(prop, value);
                return true;
            }
        });
    }
    _applyStyle(prop, value) {
        // 小程序中需要通过其他方式应用样式
        // 这里只是模拟，实际可能需要通过 CSS 类或内联样式
    }
    async getCanvas() {
        if (!this.canvas) {
            this.canvas = await getCanvasNode(this.canvasId);
        }
        return this.canvas;
    }
    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
    getAttribute(name) {
        return this.attributes.get(name) || null;
    }
    appendChild(child) {
        this.children.push(child);
    }
    querySelector(selector) {
        // 简单的选择器匹配
        if (selector === this.canvasId || selector === `#${this.canvasId}`) {
            return this;
        }
        return null;
    }
    createElement(tagName) {
        // 创建子元素
        const element = new MiniProgramHTMLElement(`${this.canvasId}-${tagName}`);
        return element;
    }
}
/**
 * 模拟 document 对象
 */
class MiniProgramDocument {
    constructor() {
        this.elements = new Map();
    }
    querySelector(selector) {
        // 移除 # 前缀
        const id = selector.replace(/^#/, '');
        if (this.elements.has(id)) {
            return this.elements.get(id);
        }
        // 创建新元素
        const element = new MiniProgramHTMLElement(id);
        this.elements.set(id, element);
        return element;
    }
    createElement(tagName) {
        const id = `${tagName}-${Date.now()}`;
        const element = new MiniProgramHTMLElement(id);
        this.elements.set(id, element);
        return element;
    }
}
/**
 * 初始化 DOM 适配
 * 在小程序环境中，将 document 和 window 的相关 API 替换为适配版本
 */
export function initDOMAdapter() {
    if (!isMiniProgram()) {
        return; // 浏览器环境不需要适配
    }
    // 创建适配的 document 对象
    const mpDocument = new MiniProgramDocument();
    // 替换全局 document（如果可能）
    // 注意：小程序环境中可能没有全局 document，需要根据实际情况处理
    const globalObj = typeof globalThis !== 'undefined' ? globalThis :
        (typeof window !== 'undefined' ? window : {});
    if (globalObj) {
        globalObj.document = mpDocument;
    }
    // 创建适配的 window 对象（如果需要）
    if (globalObj && !globalObj.window) {
        globalObj.window = {
            document: mpDocument,
            addEventListener: () => { },
            removeEventListener: () => { },
            // 其他需要的 window API
        };
    }
}
/**
 * 获取适配的 document 对象
 */
export function getDocument() {
    if (isMiniProgram()) {
        const globalObj = typeof globalThis !== 'undefined' ? globalThis :
            (typeof window !== 'undefined' ? window : {});
        if (globalObj && globalObj.document) {
            return globalObj.document;
        }
        return new MiniProgramDocument();
    }
    return document;
}

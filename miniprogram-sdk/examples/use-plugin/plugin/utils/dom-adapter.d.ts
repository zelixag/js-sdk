/**
 * DOM 适配器 - 在小程序环境中模拟 DOM API
 * 让原 SDK 的 DOM 操作可以在小程序中运行
 */
/**
 * 模拟 HTMLElement
 */
declare class MiniProgramHTMLElement {
    private canvasId;
    private canvas;
    private style;
    private attributes;
    private children;
    constructor(canvasId: string);
    private _createStyleProxy;
    private _applyStyle;
    getCanvas(): Promise<WechatMiniprogram.Canvas>;
    setAttribute(name: string, value: string): void;
    getAttribute(name: string): string | null;
    appendChild(child: MiniProgramHTMLElement): void;
    querySelector(selector: string): MiniProgramHTMLElement | null;
    createElement(tagName: string): MiniProgramHTMLElement;
}
/**
 * 模拟 document 对象
 */
declare class MiniProgramDocument {
    private elements;
    querySelector(selector: string): MiniProgramHTMLElement | null;
    createElement(tagName: string): MiniProgramHTMLElement;
}
/**
 * 初始化 DOM 适配
 * 在小程序环境中，将 document 和 window 的相关 API 替换为适配版本
 */
export declare function initDOMAdapter(): void;
/**
 * 获取适配的 document 对象
 */
export declare function getDocument(): MiniProgramDocument | Document;
export {};

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
  private canvasId: string;
  private canvas: WechatMiniprogram.Canvas | null = null;
  private style: CSSStyleDeclaration;
  private attributes: Map<string, string> = new Map();
  private children: MiniProgramHTMLElement[] = [];

  constructor(canvasId: string) {
    this.canvasId = canvasId;
    this.style = this._createStyleProxy();
  }

  private _createStyleProxy(): CSSStyleDeclaration {
    const styles: any = {};
    return new Proxy(styles, {
      get: (target, prop: string) => {
        return target[prop] || '';
      },
      set: (target, prop: string, value: any) => {
        target[prop] = value;
        // 在小程序中应用样式
        this._applyStyle(prop, value);
        return true;
      }
    }) as CSSStyleDeclaration;
  }

  private _applyStyle(prop: string, value: any): void {
    // 小程序中需要通过其他方式应用样式
    // 这里只是模拟，实际可能需要通过 CSS 类或内联样式
  }

  async getCanvas(): Promise<WechatMiniprogram.Canvas> {
    if (!this.canvas) {
      this.canvas = await getCanvasNode(this.canvasId);
    }
    return this.canvas;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  appendChild(child: MiniProgramHTMLElement): void {
    this.children.push(child);
  }

  querySelector(selector: string): MiniProgramHTMLElement | null {
    // 简单的选择器匹配
    if (selector === this.canvasId || selector === `#${this.canvasId}`) {
      return this;
    }
    return null;
  }

  createElement(tagName: string): MiniProgramHTMLElement {
    // 创建子元素
    const element = new MiniProgramHTMLElement(`${this.canvasId}-${tagName}`);
    return element;
  }
}

/**
 * 模拟 document 对象
 */
class MiniProgramDocument {
  private elements: Map<string, MiniProgramHTMLElement> = new Map();

  querySelector(selector: string): MiniProgramHTMLElement | null {
    // 移除 # 前缀
    const id = selector.replace(/^#/, '');
    
    if (this.elements.has(id)) {
      return this.elements.get(id)!;
    }

    // 创建新元素
    const element = new MiniProgramHTMLElement(id);
    this.elements.set(id, element);
    return element;
  }

  createElement(tagName: string): MiniProgramHTMLElement {
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
export function initDOMAdapter(): void {
  if (!isMiniProgram()) {
    return; // 浏览器环境不需要适配
  }

  // 创建适配的 document 对象
  const mpDocument = new MiniProgramDocument();

  // 替换全局 document（如果可能）
  // 注意：小程序环境中可能没有全局 document，需要特殊处理（可能是只读的）
  const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                   (typeof window !== 'undefined' ? window : {});
  if (globalObj) {
    try {
      // 先尝试直接设置
      if (!(globalObj as any).document) {
        (globalObj as any).document = mpDocument;
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty
      try {
        const desc = Object.getOwnPropertyDescriptor(globalObj, 'document');
        if (desc && desc.configurable) {
          delete (globalObj as any).document;
        }
        // 定义新的 document
        Object.defineProperty(globalObj, 'document', {
          value: mpDocument,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试替换 window.document（如果 window 存在）
        try {
          if ((globalObj as any).window && (globalObj as any).window !== globalObj) {
            Object.defineProperty((globalObj as any).window, 'document', {
              value: mpDocument,
              writable: true,
              configurable: true,
              enumerable: true
            });
          }
        } catch (e2) {
          // 最后的手段：至少确保可以通过 getDocument() 访问
          console.warn('[dom-adapter] 无法设置 globalThis.document，但 getDocument() 仍然可用');
          // 将 document 存储在其他地方，供需要时使用
          (globalObj as any).__document = mpDocument;
        }
      }
    }
  }

  // 创建适配的 window 对象（如果需要）
  if (globalObj && !(globalObj as any).window) {
    (globalObj as any).window = {
      document: mpDocument,
      addEventListener: () => {},
      removeEventListener: () => {},
      // 其他需要的 window API
    };
  }
}

/**
 * 获取适配的 document 对象
 */
export function getDocument(): MiniProgramDocument | Document {
  if (isMiniProgram()) {
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     (typeof window !== 'undefined' ? window : {});
    if (globalObj && (globalObj as any).document) {
      return (globalObj as any).document;
    }
    return new MiniProgramDocument();
  }
  return document;
}

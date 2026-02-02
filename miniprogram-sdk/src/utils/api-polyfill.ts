/**
 * API Polyfill - 在小程序环境中替换浏览器 API
 * 这个文件需要在导入原 SDK 之前执行
 */

import { isMiniProgram } from './env';
import { request as mpRequest } from '../adapters/network';
import { getDocument } from './dom-adapter';
import { onNetworkStatusChange } from './env';

// 如果在小程序环境中，设置全局 API 替换
if (isMiniProgram()) {
  // 替换 fetch API
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    globalThis.fetch = async (url: string, options?: any) => {
      const method = options?.method || 'GET';
      const headers = options?.headers || {};
      const body = options?.body;
      
      const data = body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined;
      
      const response = await mpRequest({
        url,
        method: method as any,
        data,
        headers,
      });
      
      // 返回类似 fetch 的 Response 对象
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText || '',
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        arrayBuffer: async () => {
          if (response.data instanceof ArrayBuffer) {
            return response.data;
          }
          // 转换为 ArrayBuffer
          const str = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          return new TextEncoder().encode(str).buffer;
        },
        headers: new Headers(response.headers || {}),
      } as Response;
    };
  }

  // 替换 document
  // 注意：在小程序中，window.document 可能是只读的，需要特殊处理
  if (typeof globalThis !== 'undefined') {
    const doc = getDocument();
    try {
      // 先尝试直接设置
      // @ts-ignore
      if (!globalThis.document) {
        // @ts-ignore
        globalThis.document = doc;
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty
      try {
        // 删除现有的 document（如果存在且可配置）
        const desc = Object.getOwnPropertyDescriptor(globalThis, 'document');
        if (desc && desc.configurable) {
          delete (globalThis as any).document;
        }
        // 定义新的 document
        Object.defineProperty(globalThis, 'document', {
          value: doc,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试替换 window.document（如果 window 存在）
        try {
          if ((globalThis as any).window && (globalThis as any).window !== globalThis) {
            Object.defineProperty((globalThis as any).window, 'document', {
              value: doc,
              writable: true,
              configurable: true,
              enumerable: true
            });
          }
        } catch (e2) {
          // 最后的手段：至少确保可以通过 getDocument() 访问
          console.warn('[api-polyfill] 无法设置 globalThis.document，但 getDocument() 仍然可用');
          // 将 document 存储在其他地方，供需要时使用
          (globalThis as any).__document = doc;
        }
      }
    }
  }

  // 替换 navigator.onLine
  // 注意：在小程序中，navigator 可能是只读的，需要特殊处理
  if (typeof globalThis !== 'undefined') {
    try {
      // 先尝试直接设置
      const existingNavigator = (globalThis as any).navigator;
      if (!existingNavigator) {
        // 即使 navigator 不存在，也使用 Object.defineProperty 来避免只读属性问题
        try {
          Object.defineProperty(globalThis, 'navigator', {
            value: {
              onLine: true, // 初始值，会通过网络监听更新
            },
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          // 如果定义失败，创建备用对象
          const nav = { onLine: true };
          (globalThis as any).__navigator = nav;
          console.warn('[api-polyfill] 无法设置 globalThis.navigator，但 __navigator 仍然可用');
        }
      } else {
        // 如果 navigator 已存在，尝试添加 onLine 属性
        try {
          // @ts-ignore
          globalThis.navigator.onLine = true;
        } catch (e) {
          // 如果直接设置失败，使用 Object.defineProperty
          Object.defineProperty(globalThis.navigator, 'onLine', {
            value: true,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty 创建新的 navigator
      try {
        const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
        if (desc && desc.configurable) {
          delete (globalThis as any).navigator;
        }
        // 定义新的 navigator
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...((globalThis as any).navigator || {}),
            onLine: true,
          },
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试在现有 navigator 上定义 onLine 属性
        try {
          const existingNavigator = (globalThis as any).navigator;
          if (existingNavigator) {
            Object.defineProperty(existingNavigator, 'onLine', {
              value: true,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } else {
            // 最后的手段：创建一个新的 navigator 对象并存储在其他地方
            const nav = { onLine: true };
            (globalThis as any).__navigator = nav;
            console.warn('[api-polyfill] 无法设置 globalThis.navigator，但 __navigator 仍然可用');
          }
        } catch (e2) {
          console.warn('[api-polyfill] 无法设置 navigator.onLine，网络状态监听可能不可用');
        }
      }
    }
    
    // 监听网络状态变化
    onNetworkStatusChange((res: { isConnected: boolean; networkType: string }) => {
      const nav = (globalThis as any).navigator || (globalThis as any).__navigator;
      if (nav) {
        try {
          nav.onLine = res.isConnected;
        } catch (e) {
          // 如果设置失败，尝试使用 defineProperty
          try {
            Object.defineProperty(nav, 'onLine', {
              value: res.isConnected,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e2) {
            // 忽略错误，网络状态更新失败不影响主要功能
          }
        }
        // 触发 online/offline 事件
        if (typeof globalThis.dispatchEvent === 'function') {
          globalThis.dispatchEvent(new Event(res.isConnected ? 'online' : 'offline'));
        }
      }
    });
  }

  // 替换 window（原 SDK 用 window.performanceTracker，小程序无 window 会报错）
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (!g.window || g.window === undefined) {
      try {
        g.window = globalThis;
      } catch {
        try {
          Object.defineProperty(globalThis, 'window', {
            value: globalThis,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (_e) { /* 忽略 */ }
      }
    }
  }
}

export {};

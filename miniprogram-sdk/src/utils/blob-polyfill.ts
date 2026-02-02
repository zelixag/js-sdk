/**
 * 小程序没有 Blob 和 URL.createObjectURL，在此做最小 polyfill，避免 ReferenceError。
 * 必须在原 SDK 任何使用 Blob 的代码之前执行（在 index-init 里尽早 import）。
 */
const g = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {} as any);

if (typeof g.Blob === 'undefined') {
  (function () {
    function BlobPolyfill(parts?: ArrayBuffer[] | Uint8Array[], options?: { type?: string }) {
      const p = parts || [];
      (this as any)._parts = p;
      this.type = (options && options.type) || '';
      let size = 0;
      for (let i = 0; i < p.length; i++) {
        const part = p[i];
        if (part != null) {
          const p = part as { byteLength?: number; length?: number };
          size += p.byteLength ?? p.length ?? 0;
        }
      }
      (this as any).size = size;
    }
    (BlobPolyfill as any).prototype.arrayBuffer = function (this: { _parts: (ArrayBuffer | Uint8Array)[]; size: number }) {
      const buf = new Uint8Array(this.size);
      let off = 0;
      for (let i = 0; i < this._parts.length; i++) {
        const part = this._parts[i];
        if (part == null) continue;
        const ab = part instanceof ArrayBuffer ? part : (part as Uint8Array).buffer;
        const len = part instanceof ArrayBuffer ? part.byteLength : (part as Uint8Array).byteLength;
        buf.set(new Uint8Array(ab, part instanceof ArrayBuffer ? 0 : (part as Uint8Array).byteOffset, len), off);
        off += len;
      }
      return buf.buffer;
    };
    (BlobPolyfill as any).prototype.constructor = BlobPolyfill;
    g.Blob = BlobPolyfill as any;
  })();
}

// 始终挂载 __createObjectURL / __revokeObjectURL，接受任意类型（Blob/MediaSource 等），避免环境自带 URL 只认 Blob 导致 "Overload resolution failed"
let blobUrlCounter = 0;
const blobUrlMap = new Map<string, any>();
const __createObjectURL = function (obj: any) {
  const id = 'blob:mp/' + (++blobUrlCounter);
  blobUrlMap.set(id, obj);
  return id;
};
const __revokeObjectURL = function (url: string) {
  blobUrlMap.delete(url);
};
(g as any).__createObjectURL = __createObjectURL;
(g as any).__revokeObjectURL = __revokeObjectURL;
if (typeof (g as any).window !== 'undefined') {
  (g as any).window.__createObjectURL = __createObjectURL;
  (g as any).window.__revokeObjectURL = __revokeObjectURL;
}

// 再按需 polyfill 整个 URL 对象（无 URL 或无 createObjectURL 时）
const needUrlPolyfill = !(g as any).URL || typeof (g as any).URL.createObjectURL !== 'function';
if (needUrlPolyfill) {
  const urlObj = { createObjectURL: __createObjectURL, revokeObjectURL: __revokeObjectURL };
  (g as any).URL = urlObj;
  if (typeof (g as any).window !== 'undefined') (g as any).window.URL = urlObj;
  if (typeof (g as any).global !== 'undefined' && (g as any).global !== g) (g as any).global.URL = urlObj;
}

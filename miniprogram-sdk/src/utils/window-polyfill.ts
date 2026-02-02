/**
 * 最早执行：让 window 指向 globalThis，避免原 SDK 里 window.performanceTracker 报错
 * 必须在 index-init 里第一个 import，保证在原 SDK 任何代码之前运行
 */
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (g.window === undefined || g.window === null) {
    try {
      g.window = globalThis;
    } catch {
      try {
        Object.defineProperty(globalThis, 'window', {
          value: globalThis,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (_) {}
    }
  }
}

/**
 * 环境检测工具
 */

/**
 * 检测是否在小程序环境
 */
export function isMiniProgram(): boolean {
  return typeof wx !== 'undefined' && 
         typeof wx.getSystemInfoSync === 'function';
}

/**
 * 检测是否在浏览器环境
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined';
}

/**
 * 获取平台信息
 */
export function getPlatform(): 'miniprogram' | 'browser' | 'unknown' {
  if (isMiniProgram()) {
    return 'miniprogram';
  }
  if (isBrowser()) {
    return 'browser';
  }
  return 'unknown';
}

/**
 * 获取小程序系统信息
 */
export function getSystemInfo(): WechatMiniprogram.SystemInfo | null {
  if (isMiniProgram()) {
    try {
      return wx.getSystemInfoSync();
    } catch (err) {
      console.error('[Env] Get system info error:', err);
      return null;
    }
  }
  return null;
}

/**
 * 检测网络状态（小程序）
 */
export function getNetworkType(): Promise<string> {
  if (isMiniProgram()) {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: (res) => {
          resolve(res.networkType);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
  // 浏览器环境
  if (isBrowser() && 'onLine' in navigator) {
    return Promise.resolve(navigator.onLine ? 'wifi' : 'none');
  }
  return Promise.resolve('unknown');
}

/**
 * 监听网络状态变化（小程序）
 */
export function onNetworkStatusChange(
  callback: (res: { isConnected: boolean; networkType: string }) => void
): () => void {
  if (isMiniProgram()) {
    wx.onNetworkStatusChange(callback);
    return () => {
      // 小程序无法取消监听，返回空函数
    };
  }
  
  // 浏览器环境
  if (isBrowser()) {
    const onlineHandler = () => callback({ isConnected: true, networkType: 'online' });
    const offlineHandler = () => callback({ isConnected: false, networkType: 'offline' });
    
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }
  
  return () => {};
}

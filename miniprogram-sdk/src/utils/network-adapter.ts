/**
 * 网络监控适配器 - 统一浏览器和小程序的网络状态监听
 */

import { isMiniProgram, onNetworkStatusChange } from './env';

export interface NetworkMonitorOptions {
  offlineCallback: (message: string) => void;
  onlineCallback: (message: string) => void;
}

/**
 * 网络监控类（适配版）
 */
export class NetworkMonitor {
  private offlineCallback: (message: string) => void;
  private onlineCallback: (message: string) => void;
  private unsubscribe: (() => void) | null = null;
  private isOnline = true;

  constructor(options: NetworkMonitorOptions) {
    this.offlineCallback = options.offlineCallback;
    this.onlineCallback = options.onlineCallback;
    this._init();
  }

  private _init(): void {
    if (isMiniProgram()) {
      // 小程序环境
      this.unsubscribe = onNetworkStatusChange((res) => {
        const wasOnline = this.isOnline;
        this.isOnline = res.isConnected;

        if (!wasOnline && this.isOnline) {
          // 从离线变为在线
          this.onlineCallback('网络已恢复');
        } else if (wasOnline && !this.isOnline) {
          // 从在线变为离线
          this.offlineCallback('网络已断开');
        }
      });
    } else {
      // 浏览器环境
      this.isOnline = navigator.onLine;

      const onlineHandler = () => {
        if (!this.isOnline) {
          this.isOnline = true;
          this.onlineCallback('网络已恢复');
        }
      };

      const offlineHandler = () => {
        if (this.isOnline) {
          this.isOnline = false;
          this.offlineCallback('网络已断开');
        }
      };

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      this.unsubscribe = () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    }
  }

  /**
   * 销毁网络监控
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * 检查当前网络状态
   */
  isOnlineNow(): boolean {
    return this.isOnline;
  }
}

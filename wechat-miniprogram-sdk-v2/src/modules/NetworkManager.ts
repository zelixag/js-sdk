/**
 * 网络管理器
 * 负责HTTP请求和网络状态监控
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../utils/Logger';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  timeout?: number;
  dataType?: string;
}

export interface NetworkStatus {
  isConnected: boolean;
  networkType: string;
  timestamp: number;
}

export class NetworkManager {
  private eventBus: EventBus;
  private logger: Logger;
  private networkStatus: NetworkStatus;
  private monitorTimer: number | null = null;

  constructor(eventBus: EventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
    
    this.networkStatus = {
      isConnected: true,
      networkType: 'unknown',
      timestamp: Date.now()
    };

    this.startNetworkMonitor();
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      data,
      header = {},
      timeout = 30000,
      dataType = 'json'
    } = options;

    this.logger.debug(`[NetworkManager] ${method} ${url}`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      wx.request({
        url,
        method,
        data,
        header,
        timeout,
        dataType: dataType as any,
        success: (res) => {
          clearTimeout(timer);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.debug(`[NetworkManager] Request success: ${url}`);
            resolve(res.data as T);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.errMsg}`);
            this.logger.error(`[NetworkManager] Request failed: ${url}`, error);
            reject(error);
          }
        },
        fail: (error) => {
          clearTimeout(timer);
          const err = new Error(error.errMsg || 'Request failed');
          this.logger.error(`[NetworkManager] Request failed: ${url}`, err);
          reject(err);
        }
      });
    });
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', data });
  }

  /**
   * 启动网络监控
   */
  private startNetworkMonitor(): void {
    // 获取初始网络状态
    this.updateNetworkStatus();

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.logger.info(`[NetworkManager] Network status changed: ${res.networkType}, connected: ${res.isConnected}`);
      
      const wasConnected = this.networkStatus.isConnected;
      
      this.networkStatus = {
        isConnected: res.isConnected,
        networkType: res.networkType,
        timestamp: Date.now()
      };

      // 触发事件
      if (res.isConnected && !wasConnected) {
        this.eventBus.emit('network:online', this.networkStatus);
      } else if (!res.isConnected && wasConnected) {
        this.eventBus.emit('network:offline', this.networkStatus);
      }

      this.eventBus.emit('network:change', this.networkStatus);
    });

    // 定期检查网络状态
    this.monitorTimer = setInterval(() => {
      this.updateNetworkStatus();
    }, 30000) as unknown as number; // 每30秒检查一次
  }

  /**
   * 更新网络状态
   */
  private updateNetworkStatus(): void {
    wx.getNetworkType({
      success: (res) => {
        const isConnected = res.networkType !== 'none';
        
        if (isConnected !== this.networkStatus.isConnected) {
          this.logger.info(`[NetworkManager] Network status updated: ${res.networkType}`);
        }

        this.networkStatus = {
          isConnected,
          networkType: res.networkType,
          timestamp: Date.now()
        };
      },
      fail: (error) => {
        this.logger.error('[NetworkManager] Failed to get network type', error);
      }
    });
  }

  /**
   * 获取当前网络状态
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * 检查网络是否连接
   */
  isConnected(): boolean {
    return this.networkStatus.isConnected;
  }

  /**
   * 停止网络监控
   */
  stopNetworkMonitor(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    wx.offNetworkStatusChange(() => {});
    this.logger.info('[NetworkManager] Network monitor stopped');
  }

  /**
   * 销毁网络管理器
   */
  destroy(): void {
    this.stopNetworkMonitor();
    this.logger.info('[NetworkManager] Network manager destroyed');
  }
}

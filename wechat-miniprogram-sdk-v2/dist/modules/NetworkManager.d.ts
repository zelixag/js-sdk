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
export declare class NetworkManager {
    private eventBus;
    private logger;
    private networkStatus;
    private monitorTimer;
    constructor(eventBus: EventBus, logger: Logger);
    /**
     * 发送HTTP请求
     */
    request<T = any>(url: string, options?: RequestOptions): Promise<T>;
    /**
     * GET请求
     */
    get<T = any>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T>;
    /**
     * POST请求
     */
    post<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'data'>): Promise<T>;
    /**
     * 启动网络监控
     */
    private startNetworkMonitor;
    /**
     * 更新网络状态
     */
    private updateNetworkStatus;
    /**
     * 获取当前网络状态
     */
    getNetworkStatus(): NetworkStatus;
    /**
     * 检查网络是否连接
     */
    isConnected(): boolean;
    /**
     * 停止网络监控
     */
    stopNetworkMonitor(): void;
    /**
     * 销毁网络管理器
     */
    destroy(): void;
}
//# sourceMappingURL=NetworkManager.d.ts.map
/**
 * 网络监控适配器 - 统一浏览器和小程序的网络状态监听
 */
export interface NetworkMonitorOptions {
    offlineCallback: (message: string) => void;
    onlineCallback: (message: string) => void;
}
/**
 * 网络监控类（适配版）
 */
export declare class NetworkMonitor {
    private offlineCallback;
    private onlineCallback;
    private unsubscribe;
    private isOnline;
    constructor(options: NetworkMonitorOptions);
    private _init;
    /**
     * 销毁网络监控
     */
    destroy(): void;
    /**
     * 检查当前网络状态
     */
    isOnlineNow(): boolean;
}

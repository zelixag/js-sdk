/**
 * 环境检测工具
 */
/**
 * 检测是否在小程序环境
 */
export declare function isMiniProgram(): boolean;
/**
 * 检测是否在浏览器环境
 */
export declare function isBrowser(): boolean;
/**
 * 获取平台信息
 */
export declare function getPlatform(): 'miniprogram' | 'browser' | 'unknown';
/**
 * 获取小程序系统信息
 */
export declare function getSystemInfo(): WechatMiniprogram.SystemInfo | null;
/**
 * 检测网络状态（小程序）
 */
export declare function getNetworkType(): Promise<string>;
/**
 * 监听网络状态变化（小程序）
 */
export declare function onNetworkStatusChange(callback: (res: {
    isConnected: boolean;
    networkType: string;
}) => void): () => void;

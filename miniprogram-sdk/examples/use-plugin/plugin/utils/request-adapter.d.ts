/**
 * 请求适配器 - 统一浏览器和小程序的网络请求
 */
/**
 * 统一的请求函数
 * 根据环境自动选择使用小程序 API 或浏览器 API
 */
export declare function request(url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
}): Promise<Response | any>;
/**
 * XMLHttpRequest 适配（用于带进度的下载）
 */
export declare function XMLRequest(options: {
    url: string;
    cache?: {
        enable: boolean;
    };
    onProgress: (progress: number) => void;
}): Promise<[boolean, ArrayBuffer | string]>;

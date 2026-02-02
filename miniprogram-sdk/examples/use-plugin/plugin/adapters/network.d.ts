/**
 * 网络请求适配层 - 小程序版本
 * 使用 wx.request 替代 fetch
 */
export interface RequestOptions {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
}
export interface RequestResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}
/**
 * 小程序网络请求封装
 */
export declare function request<T = any>(options: RequestOptions): Promise<RequestResponse<T>>;
/**
 * 下载文件（用于资源下载）
 */
export declare function downloadFile(url: string, filePath?: string): Promise<string>;
/**
 * 读取文件为 ArrayBuffer
 */
export declare function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer>;

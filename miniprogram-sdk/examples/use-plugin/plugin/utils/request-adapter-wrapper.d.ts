/**
 * Request 适配器包装器
 * 这个文件替换原 SDK 的 request.ts，使用小程序适配层
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
interface RequestOptions {
    method?: HttpMethod;
    data?: Record<string, any>;
    headers?: Record<string, string>;
}
/**
 * 适配的 request 函数
 * 在小程序环境中使用小程序 API，在浏览器中使用 fetch
 */
export default function request(url: string, options?: RequestOptions): Promise<Response>;
/**
 * XMLHttpRequest 适配器
 * 用于资源下载，支持进度回调
 */
export declare function XMLRequest(options: {
    url: string;
    cache?: {
        enable: boolean;
    };
    onProgress: (progress: number) => void;
}): Promise<[boolean, ArrayBuffer | string]>;
export {};

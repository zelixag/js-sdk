/**
 * Request 适配器包装器
 * 这个文件替换原 SDK 的 request.ts，使用小程序适配层
 */

import { request as mpRequest, downloadFile } from '../adapters/network';
import { isMiniProgram } from './env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';

interface RequestOptions {
  method?: HttpMethod;
  data?: Record<string, any>;
  headers?: Record<string, string>;
}

interface ErrorResponse {
  status: number;
  statusText: string;
  message: string;
}

const TAG = '[REQUEST-ADAPTER]';

/**
 * 适配的 request 函数
 * 在小程序环境中使用小程序 API，在浏览器中使用 fetch
 */
export default async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { method = 'GET', data, headers = {} } = options;

  if (isMiniProgram()) {
    // 小程序环境：使用小程序网络 API
    try {
      const response = await mpRequest({
        url,
        method: method as any,
        data,
        headers,
      });

      // 返回类似 fetch 的 Response 对象
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText || '',
        json: async () => {
          if (typeof response.data === 'string') {
            return JSON.parse(response.data);
          }
          return response.data;
        },
        text: async () => {
          if (typeof response.data === 'string') {
            return response.data;
          }
          return JSON.stringify(response.data);
        },
        arrayBuffer: async () => {
          if (response.data instanceof ArrayBuffer) {
            return response.data;
          }
          // 转换为 ArrayBuffer
          const str = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data);
          return new TextEncoder().encode(str).buffer;
        },
        headers: new Headers(response.headers || {}),
      } as Response;
    } catch (error: any) {
      const errorResponse: ErrorResponse = {
        status: error.status || 500,
        statusText: error.statusText || 'Request Failed',
        message: error.message || 'Request failed',
      };
      throw errorResponse;
    }
  } else {
    // 浏览器环境：使用原生 fetch
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (method === 'GET' && data) {
      const params = new URLSearchParams(data as any).toString();
      url += `${url.includes('?') ? '&' : '?'}${params}`;
    }

    if (method !== 'GET' && data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error: ErrorResponse = {
          status: response.status,
          statusText: response.statusText,
          message: `HTTP error! status: ${response.status}`,
        };
        throw error;
      }
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          status: 500,
          statusText: 'Client Error',
        } as ErrorResponse;
      }
      throw error;
    }
  }
}

/**
 * XMLHttpRequest 适配器
 * 用于资源下载，支持进度回调
 */
export function XMLRequest(options: {
  url: string;
  cache?: {
    enable: boolean;
  };
  onProgress: (progress: number) => void;
}): Promise<[boolean, ArrayBuffer | string]> {
  return new Promise(async (resolve, reject) => {
    if (isMiniProgram()) {
      // 小程序环境：使用 downloadFile
      try {
        // 创建下载任务以监听进度
        const downloadTask = wx.downloadFile({
          url: options.url,
          success: async (res) => {
            if (res.statusCode === 200) {
              const filePath = res.tempFilePath || res.filePath || '';
              
              // 读取文件为 ArrayBuffer
              const fs = wx.getFileSystemManager();
              try {
                const readRes = fs.readFileSync(filePath) as ArrayBuffer;
                resolve([false, readRes]);
              } catch (readErr: any) {
                reject([true, readErr.message || 'Read file failed']);
              }
            } else {
              reject([true, `Download failed with status: ${res.statusCode}`]);
            }
          },
          fail: (err) => {
            reject([true, err.errMsg || 'Download failed']);
          }
        });
        
        // 监听下载进度
        downloadTask.onProgressUpdate((res) => {
          if (res.totalBytesExpectedToWrite > 0) {
            const percent = Math.round((res.totalBytesWritten / res.totalBytesExpectedToWrite) * 100);
            options.onProgress(percent);
          }
        });
      } catch (error: any) {
        reject([true, error.message || 'Download failed']);
      }
    } else {
      // 浏览器环境：使用 XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open('GET', options.url);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const arrayBuffer = xhr.response;
          resolve([false, arrayBuffer]);
        } else if (xhr.status !== 200) {
          reject([true, xhr.statusText]);
        }
      };
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress(percent);
        }
      };
      xhr.onerror = () => {
        reject([true, 'Network error']);
      };
      xhr.send();
    }
  });
}

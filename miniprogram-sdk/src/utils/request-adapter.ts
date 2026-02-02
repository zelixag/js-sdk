/**
 * 请求适配器 - 统一浏览器和小程序的网络请求
 */

import { isMiniProgram } from './env';

// 动态导入适配层
let mpRequest: any;
let browserRequest: any;

// 延迟加载，避免循环依赖
function getMpRequest() {
  if (!mpRequest) {
    try {
      mpRequest = require('../adapters/network').request;
    } catch (err) {
      // 适配层未加载
    }
  }
  return mpRequest;
}

function getBrowserRequest() {
  if (!browserRequest) {
    try {
      browserRequest = require('../../src/utils/request').default;
    } catch (err) {
      // 原 SDK 未加载
    }
  }
  return browserRequest;
}

/**
 * 统一的请求函数
 * 根据环境自动选择使用小程序 API 或浏览器 API
 */
export async function request(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<Response | any> {
  const mpReq = getMpRequest();
  const browserReq = getBrowserRequest();
  
  if (isMiniProgram() && mpReq) {
    // 小程序环境
    const response = await mpReq({
      url,
      method: options.method || 'GET',
      data: options.data,
      headers: options.headers
    });
    
    // 转换为类似 fetch Response 的格式
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: async () => response.data,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      arrayBuffer: async () => {
        if (response.data instanceof ArrayBuffer) {
          return response.data;
        }
        // 需要转换为 ArrayBuffer
        return new TextEncoder().encode(JSON.stringify(response.data)).buffer;
      },
      headers: new Map(Object.entries(response.headers || {}))
    };
  } else if (browserReq) {
    // 浏览器环境 - 使用原 SDK 的 request
    return browserReq(url, options);
  } else {
    // 降级到 fetch
    const { method = 'GET', data, headers = {} } = options;
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (method === 'GET' && data) {
      const params = new URLSearchParams(data).toString();
      url += `${url.includes('?') ? '&' : '?'}${params}`;
    }

    if (method !== 'GET' && data) {
      config.body = JSON.stringify(data);
    }

    return fetch(url, config);
  }
}

/**
 * XMLHttpRequest 适配（用于带进度的下载）
 */
export function XMLRequest(options: {
  url: string;
  cache?: {
    enable: boolean;
  };
  onProgress: (progress: number) => void;
}): Promise<[boolean, ArrayBuffer | string]> {
  if (isMiniProgram()) {
    // 小程序环境 - 使用 wx.downloadFile
    return new Promise((resolve, reject) => {
      const downloadTask = wx.downloadFile({
        url: options.url,
        success: (res) => {
          if (res.statusCode === 200) {
            // 读取文件为 ArrayBuffer
            const fs = wx.getFileSystemManager();
            fs.readFile({
              filePath: res.tempFilePath,
              success: (readRes) => {
                options.onProgress(100);
                resolve([false, readRes.data as ArrayBuffer]);
              },
              fail: (err) => {
                reject([true, err.errMsg || 'Read file failed']);
              }
            });
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
        const progress = Math.round((res.progress / 100) * 100);
        options.onProgress(progress);
      });
    });
  } else {
    // 浏览器环境 - 使用原 SDK 的 XMLRequest
    try {
      const { XMLRequest: browserXMLRequest } = require('../../src/utils/request');
      return browserXMLRequest(options);
    } catch (err) {
      // 降级实现
      return new Promise((resolve, reject) => {
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
        xhr.send();
      });
    }
  }
}

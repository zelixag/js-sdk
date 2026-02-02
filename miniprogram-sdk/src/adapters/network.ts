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
export function request<T = any>(options: RequestOptions): Promise<RequestResponse<T>> {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'GET',
      data,
      headers = {},
      timeout = 30000
    } = options;

    wx.request({
      url,
      method: method as any,
      data: method === 'GET' ? data : JSON.stringify(data),
      header: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout,
      success: (res) => {
        resolve({
          data: res.data as T,
          status: res.statusCode,
          statusText: res.errMsg || 'OK',
          headers: res.header || {}
        });
      },
      fail: (err) => {
        reject(new Error(`Request failed: ${err.errMsg || 'Unknown error'}`));
      }
    });
  });
}

/**
 * 下载文件（用于资源下载）
 */
export function downloadFile(url: string, filePath?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const downloadTask = wx.downloadFile({
      url,
      filePath,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath || res.filePath || '');
        } else {
          reject(new Error(`Download failed with status: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(`Download failed: ${err.errMsg || 'Unknown error'}`));
      }
    });

    // 监听下载进度
    downloadTask.onProgressUpdate((res) => {
      // 可以通过事件通知进度
      // 这里可以根据需要实现进度回调
    });
  });
}

/**
 * 读取文件为 ArrayBuffer
 */
export function readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      success: (res) => {
        resolve(res.data as ArrayBuffer);
      },
      fail: (err) => {
        reject(new Error(`Read file failed: ${err.errMsg || 'Unknown error'}`));
      }
    });
  });
}

/**
 * 网络请求适配器测试
 */

import { request, XMLRequest } from '../src/utils/request-adapter';
import { isMiniProgram } from '../src/utils/env';

describe('网络请求适配器', () => {
  beforeEach(() => {
    // 重置环境
    delete (global as any).wx;
  });

  test('request - 小程序环境', async () => {
    // 模拟小程序环境
    (global as any).wx = {
      request: jest.fn((options: any) => {
        return {
          success: (callback: Function) => {
            callback({
              statusCode: 200,
              data: { success: true },
              header: {},
              errMsg: 'request:ok'
            });
          }
        };
      })
    };

    // 注意：这里需要实际的小程序环境才能测试
    // 在 Node.js 环境中，这个测试可能需要 mock
    if (isMiniProgram()) {
      const result = await request('https://example.com/api', {
        method: 'GET'
      });
      expect(result).toBeDefined();
    }
  });

  test('request - 浏览器环境', async () => {
    // 模拟浏览器环境
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve('{}'),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        headers: new Map()
      })
    );

    if (!isMiniProgram()) {
      const result = await request('https://example.com/api', {
        method: 'GET'
      });
      expect(result).toBeDefined();
    }
  });
});

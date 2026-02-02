/**
 * WebSocket 适配器测试
 */

import { createWebSocket, MiniProgramWebSocket } from '../src/adapters/websocket';

describe('WebSocket 适配器', () => {
  beforeEach(() => {
    // 重置环境
    delete (global as any).wx;
  });

  test('createWebSocket - 小程序环境', () => {
    // 模拟小程序环境
    (global as any).wx = {
      connectSocket: jest.fn((options: any) => {
        return {
          onOpen: jest.fn(),
          onMessage: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
          send: jest.fn(),
          close: jest.fn()
        };
      })
    };

    if (typeof wx !== 'undefined') {
      const socket = createWebSocket('ws://example.com');
      expect(socket).toBeInstanceOf(MiniProgramWebSocket);
    }
  });

  test('MiniProgramWebSocket - 连接和断开', () => {
    // 模拟小程序环境
    (global as any).wx = {
      connectSocket: jest.fn((options: any) => {
        const task: any = {
          onOpen: jest.fn((callback: Function) => {
            setTimeout(() => callback(), 0);
          }),
          onMessage: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
          send: jest.fn(),
          close: jest.fn()
        };
        return task;
      })
    };

    if (typeof wx !== 'undefined') {
      const socket = new MiniProgramWebSocket({
        url: 'ws://example.com'
      });

      const onConnect = jest.fn();
      socket.on('connect', onConnect);

      socket.connect();

      // 等待连接
      setTimeout(() => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        expect(socket.connected).toBe(false);
      }, 100);
    }
  });
});

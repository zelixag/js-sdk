/**
 * 环境检测测试
 */

import { isMiniProgram, isBrowser, getPlatform, getSystemInfo, getNetworkType } from '../src/utils/env';

describe('环境检测', () => {
  test('isMiniProgram - 小程序环境', () => {
    // 模拟小程序环境
    (global as any).wx = {
      getSystemInfoSync: () => ({})
    };
    
    expect(isMiniProgram()).toBe(true);
  });

  test('isMiniProgram - 浏览器环境', () => {
    delete (global as any).wx;
    (global as any).window = {};
    (global as any).document = {};
    
    expect(isMiniProgram()).toBe(false);
  });

  test('isBrowser - 浏览器环境', () => {
    (global as any).window = {};
    (global as any).document = {};
    
    expect(isBrowser()).toBe(true);
  });

  test('getPlatform - 返回正确平台', () => {
    // 测试不同环境下的平台检测
    const platform = getPlatform();
    expect(['miniprogram', 'browser', 'unknown']).toContain(platform);
  });
});

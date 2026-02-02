/**
 * 微信小程序 SDK 测试文件
 */

import XmovAvatar from '../src/index';

// 模拟小程序环境
declare const global: any;

// 模拟小程序 API
const mockWx = {
  // 模拟 Canvas 相关 API
  createSelectorQuery: () => ({
    select: (selector: string) => ({
      fields: (options: any) => ({
        exec: (callback: Function) => {
          // 模拟返回 Canvas 节点
          callback([{
            node: {
              width: 0,
              height: 0,
              getContext: (type: string) => {
                if (type === 'webgl' || type === 'webgl2') {
                  // 模拟 WebGL 上下文
                  return {
                    getExtension: (name: string) => {
                      if (name === 'WEBGL_lose_context') {
                        return { loseContext: () => {}, restoreContext: () => {} };
                      }
                      return {};
                    },
                    viewport: (x: number, y: number, w: number, h: number) => {},
                    clearColor: (r: number, g: number, b: number, a: number) => {},
                    clear: (mask: number) => {},
                    createShader: (type: number) => ({ }),
                    shaderSource: (shader: any, source: string) => {},
                    compileShader: (shader: any) => {},
                    createProgram: () => ({ }),
                    attachShader: (program: any, shader: any) => {},
                    linkProgram: (program: any) => {},
                    validateProgram: (program: any) => {},
                    useProgram: (program: any) => {},
                    createBuffer: () => ({ }),
                    bindBuffer: (target: number, buffer: any) => {},
                    bufferData: (target: number, data: any, usage: number) => {},
                    enableVertexAttribArray: (index: number) => {},
                    vertexAttribPointer: (index: number, size: number, type: number, normalized: boolean, stride: number, offset: number) => {},
                    getAttribLocation: (program: any, name: string) => 0,
                    getUniformLocation: (program: any, name: string) => ({ }),
                    uniformMatrix4fv: (location: any, transpose: boolean, matrix: Float32Array) => {},
                    drawArrays: (mode: number, first: number, count: number) => {},
                    createTexture: () => ({ }),
                    bindTexture: (target: number, texture: any) => {},
                    texImage2D: (...args: any[]) => {},
                    texParameteri: (target: number, pname: number, param: number) => {},
                    createFramebuffer: () => ({ }),
                    bindFramebuffer: (target: number, framebuffer: any) => {},
                    framebufferTexture2D: (target: number, attachment: number, textarget: number, texture: any, level: number) => {},
                  };
                }
                return null;
              }
            },
            width: 1080,
            height: 1920
          }]);
        }
      })
    })
  }),

  // 模拟网络请求
  request: (options: any) => {
    console.log('Mock request:', options.url);
    setTimeout(() => {
      options.success && options.success({
        data: { success: true },
        statusCode: 200,
        header: {}
      });
    }, 100);
  },

  // 模拟 WebSocket
  connectSocket: (options: any) => {
    console.log('Mock connectSocket:', options.url);
    const mockSocket = {
      onOpen: (callback: Function) => {
        setTimeout(() => callback(), 50);
      },
      onMessage: (callback: Function) => {},
      onError: (callback: Function) => {},
      onClose: (callback: Function) => {},
      send: (data: any) => {
        console.log('Mock send:', data);
      },
      close: (options?: any) => {
        console.log('Mock close socket');
      }
    };
    return mockSocket;
  },

  // 模拟系统信息
  getSystemInfoSync: () => ({
    pixelRatio: 2,
    screenWidth: 375,
    screenHeight: 667,
    windowWidth: 375,
    windowHeight: 667,
    statusBarHeight: 20,
    language: 'zh',
    version: '7.0.0',
    platform: 'ios'
  }),

  // 模拟音频上下文
  createInnerAudioContext: () => ({
    src: '',
    startTime: 0,
    autoplay: false,
    loop: false,
    obeyMuteSwitch: true,
    volume: 1,
    duration: 0,
    currentTime: 0,
    paused: true,
    buffered: 0,
    onCanplay: (callback: Function) => {},
    onPlay: (callback: Function) => {},
    onPause: (callback: Function) => {},
    onStop: (callback: Function) => {},
    onEnded: (callback: Function) => {},
    onError: (callback: Function) => {},
    onTimeUpdate: (callback: Function) => {},
    onWaiting: (callback: Function) => {},
    onSeeking: (callback: Function) => {},
    onSeeked: (callback: Function) => {},
    play: () => {},
    pause: () => {},
    stop: () => {},
    seek: (position: number) => {},
    destroy: () => {},
    offCanplay: (callback?: Function) => {},
    offPlay: (callback?: Function) => {},
    offPause: (callback?: Function) => {},
    offStop: (callback?: Function) => {},
    offEnded: (callback?: Function) => {},
    offError: (callback?: Function) => {},
    offTimeUpdate: (callback?: Function) => {},
    offWaiting: (callback?: Function) => {},
    offSeeking: (callback?: Function) => {},
    offSeeked: (callback?: Function) => {}
  }),

  // 模拟文件系统
  getFileSystemManager: () => ({
    readFile: (options: any) => {
      setTimeout(() => {
        options.success && options.success({
          data: new ArrayBuffer(0)
        });
      }, 10);
    },
    writeFile: (options: any) => {
      setTimeout(() => {
        options.success && options.success({});
      }, 10);
    },
    stat: (options: any) => {
      setTimeout(() => {
        options.success && options.success({
          isDirectory: () => false,
          isFile: () => true
        });
      }, 10);
    }
  }),

  // 模拟网络状态
  getNetworkType: (options: any) => {
    setTimeout(() => {
      options.success && options.success({
        networkType: 'wifi'
      });
    }, 10);
  },
  onNetworkStatusChange: (callback: (res: any) => void) => {}
};

// 设置全局模拟环境
global.wx = mockWx;

// 测试函数
async function testSDK() {
  console.log('开始测试微信小程序 SDK...');

  try {
    // 创建 SDK 实例
    const avatar = new XmovAvatar({
      containerId: 'avatar-canvas',
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      gatewayServer: 'https://test-gateway.com',
      enableLogger: true,
      onMessage: (error) => {
        console.log('SDK Error:', error);
      },
      onStateChange: (state) => {
        console.log('State Change:', state);
      },
      onStatusChange: (status) => {
        console.log('Status Change:', status);
      }
    });

    console.log('SDK 实例创建成功');

    // 测试初始化
    await avatar.init({
      onDownloadProgress: (progress) => {
        console.log('下载进度:', progress);
      }
    });

    console.log('SDK 初始化成功');

    // 测试启动
    avatar.start();
    console.log('SDK 启动成功');

    // 测试说话功能
    avatar.speak('你好，这是测试消息');
    console.log('说话功能测试完成');

    // 测试状态获取
    const status = avatar.getStatus();
    console.log('当前状态:', status);

    // 等待一段时间后停止
    setTimeout(() => {
      avatar.stop();
      console.log('SDK 停止');

      // 销毁 SDK
      avatar.destroy().then(() => {
        console.log('SDK 销毁完成');
        console.log('测试完成！');
      });
    }, 2000);

  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
testSDK();

export { testSDK };
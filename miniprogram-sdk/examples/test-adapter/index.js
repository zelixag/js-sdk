// 小程序测试页面 - 测试适配层功能
// 注意：需要先构建 SDK (npm run build)，然后使用 dist 目录中的文件

Page({
  data: {
    testResults: [],
    isTesting: false,
    errorMessage: '',
    modulesLoaded: false
  },

  onLoad() {
    console.log('[Test] 页面加载，开始测试适配层');
    this.loadModules();
  },

  /**
   * 加载模块
   */
  loadModules() {
    try {
      console.log('[Test] 开始加载模块...');
      
      // 尝试加载模块
      // 优先使用本地的 sdk 目录（如果已复制）
      // 否则尝试使用相对路径
      let envModule, requestModule, websocketModule, canvasModule, audioModule;
      
      try {
        // 尝试从本地 sdk 目录加载
        envModule = require('./sdk/utils/env.js');
        requestModule = require('./sdk/utils/request-adapter.js');
        websocketModule = require('./sdk/adapters/websocket.js');
        canvasModule = require('./sdk/adapters/canvas.js');
        audioModule = require('./sdk/adapters/audio.js');
        console.log('[Test] 从本地 sdk 目录加载模块');
      } catch (localErr) {
        // 如果本地加载失败，尝试从相对路径加载
        console.log('[Test] 本地 sdk 目录不存在，尝试从相对路径加载...');
        envModule = require('../../dist/utils/env.js');
        requestModule = require('../../dist/utils/request-adapter.js');
        websocketModule = require('../../dist/adapters/websocket.js');
        canvasModule = require('../../dist/adapters/canvas.js');
        audioModule = require('../../dist/adapters/audio.js');
        console.log('[Test] 从相对路径加载模块');
      }
      
      // 保存到 this 上供测试使用
      this.modules = {
        isMiniProgram: envModule.isMiniProgram,
        getPlatform: envModule.getPlatform,
        getNetworkType: envModule.getNetworkType,
        request: requestModule.request,
        createWebSocket: websocketModule.createWebSocket,
        getCanvasNode: canvasModule.getCanvasNode,
        createWebGLContext: canvasModule.createWebGLContext,
        MiniProgramAudioPlayer: audioModule.MiniProgramAudioPlayer
      };
      
      console.log('[Test] 模块加载成功');
      this.setData({ modulesLoaded: true });
      this.runTests();
    } catch (err) {
      console.error('[Test] 模块加载失败:', err);
      this.setData({
        errorMessage: `模块加载失败: ${err.message}`,
        testResults: [{
          name: '模块加载',
          status: 'error',
          message: `加载失败: ${err.message}。请确保已运行 npm run build`
        }]
      });
    }
  },

  /**
   * 运行所有测试
   */
  async runTests() {
    if (!this.modules) {
      console.error('[Test] 模块未加载，无法运行测试');
      return;
    }

    this.setData({ isTesting: true, testResults: [], errorMessage: '' });

    const results = [];
    const { isMiniProgram, getPlatform, getNetworkType, request, createWebSocket, getCanvasNode, createWebGLContext, MiniProgramAudioPlayer } = this.modules;

    // 测试 1: 环境检测
    try {
      const platform = getPlatform();
      const isMP = isMiniProgram();
      results.push({
        name: '环境检测',
        status: 'success',
        message: `平台: ${platform}, 是否小程序: ${isMP}`
      });
      console.log('[Test] 环境检测通过:', platform, isMP);
    } catch (err) {
      console.error('[Test] 环境检测失败:', err);
      results.push({
        name: '环境检测',
        status: 'error',
        message: err.message || '未知错误'
      });
    }

    // 测试 2: 网络请求
    try {
      // 注意：这里需要配置合法域名
      const response = await request('https://www.baidu.com', { method: 'GET' });
      console.log('[Test] 网络请求响应:', response);
      results.push({
        name: '网络请求',
        status: 'skip',
        message: '需要配置合法域名才能测试'
      });
    } catch (err) {
      results.push({
        name: '网络请求',
        status: 'error',
        message: err.message
      });
    }

    // 测试 3: WebSocket
    try {
      // 注意：这里需要配置 socket 合法域名
      // const socket = createWebSocket('wss://example.com');
      results.push({
        name: 'WebSocket',
        status: 'skip',
        message: '需要配置 socket 合法域名才能测试'
      });
    } catch (err) {
      results.push({
        name: 'WebSocket',
        status: 'error',
        message: err.message
      });
    }

    // 测试 4: Canvas
    try {
      // 等待 Canvas 准备就绪
      await new Promise((resolve) => {
        const query = wx.createSelectorQuery();
        query.select('#test-canvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res && res[0] && res[0].node) {
              resolve(res[0].node);
            } else {
              // 延迟重试
              setTimeout(() => {
                query.select('#test-canvas')
                  .fields({ node: true, size: true })
                  .exec((res2) => {
                    resolve(res2 && res2[0] ? res2[0].node : null);
                  });
              }, 500);
            }
          });
      });

      const canvas = await getCanvasNode('test-canvas');
      if (canvas) {
        const gl = createWebGLContext(canvas);
        if (gl) {
          results.push({
            name: 'Canvas/WebGL',
            status: 'success',
            message: 'Canvas 和 WebGL 上下文创建成功'
          });
        } else {
          results.push({
            name: 'Canvas/WebGL',
            status: 'warning',
            message: 'Canvas 创建成功，但 WebGL 上下文创建失败（可能设备不支持）'
          });
        }
      } else {
        results.push({
          name: 'Canvas/WebGL',
          status: 'error',
          message: 'Canvas 节点未找到，请检查 WXML 中的 Canvas 标签'
        });
      }
    } catch (err) {
      results.push({
        name: 'Canvas/WebGL',
        status: 'error',
        message: err.message || 'Canvas 测试失败'
      });
    }

    // 测试 5: 音频
    try {
      const audioPlayer = new MiniProgramAudioPlayer();
      results.push({
        name: '音频播放器',
        status: 'success',
        message: '音频播放器创建成功'
      });
      console.log('[Test] 音频播放器测试通过');
    } catch (err) {
      console.error('[Test] 音频播放器测试失败:', err);
      results.push({
        name: '音频播放器',
        status: 'error',
        message: err.message || '未知错误'
      });
    }

    // 测试 6: 网络状态
    try {
      const networkType = await getNetworkType();
      results.push({
        name: '网络状态',
        status: 'success',
        message: `网络类型: ${networkType}`
      });
      console.log('[Test] 网络状态测试通过:', networkType);
    } catch (err) {
      console.error('[Test] 网络状态测试失败:', err);
      results.push({
        name: '网络状态',
        status: 'error',
        message: err.message || '未知错误'
      });
    }

    // 更新页面数据
    this.setData({
      testResults: results,
      isTesting: false
    });

    console.log('[Test] 测试完成，共', results.length, '项测试');
    console.log('[Test] 测试结果:', results);
    
    // 如果没有结果，显示提示
    if (results.length === 0) {
      this.setData({
        errorMessage: '没有运行任何测试，请检查控制台错误'
      });
    }
  },

  /**
   * 重新运行测试
   */
  rerunTests() {
    if (!this.modules) {
      this.loadModules();
    } else {
      this.runTests();
    }
  },

  /**
   * 页面准备就绪
   */
  onReady() {
    console.log('[Test] 页面准备就绪');
    // 如果模块已加载，可以在这里运行测试
    if (this.modules) {
      // 延迟一点运行测试，确保 Canvas 已准备好
      setTimeout(() => {
        this.runTests();
      }, 100);
    }
  }
});

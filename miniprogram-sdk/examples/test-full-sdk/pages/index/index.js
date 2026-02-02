// pages/index/index.js
// 测试删除重复文件后的完整 SDK 功能

// 注意：小程序支持 ES6 模块（基础库 >= 2.2.1）
// 但由于 Page() 中不能直接使用 import，我们使用 require
// 如果编译后的文件是 ES6 格式，require 会失败
// 解决方案：1) 将 tsconfig.json 的 module 改为 CommonJS 2) 使用构建工具转换

Page({
  data: {
    status: '未初始化',
    progress: 0,
    isInitialized: false,
    errorMessage: '',
    testResults: []
  },

  onLoad() {
    console.log('[Test] 页面加载，准备测试完整 SDK');
    this.testSDKIntegration();
  },

  /**
   * 测试 SDK 集成
   */
  async testSDKIntegration() {
    const results = [];
    
    try {
      // 测试 1: 检查适配层初始化
      console.log('[Test] 1. 检查适配层初始化');
      try {
        // 先初始化适配层
        // 注意：小程序支持 ES6 模块，但编译后的文件可能还是 ES6 格式
        // 如果 require 失败，说明文件是 ES6 格式，需要使用其他方式加载
        let indexInit;
        let loadError = null;
        
        try {
          // 尝试使用 require（如果文件是 CommonJS 格式）
          indexInit = require('../../sdk/index-init.js');
          console.log('[Test] 使用 require 加载成功');
        } catch (e1) {
          loadError = e1;
          console.warn('[Test] require 失败，文件可能是 ES6 格式:', e1.message);
          
          // 在小程序中，ES6 模块需要使用 import，但 Page() 中不能直接使用
          // 我们可以尝试直接执行文件（如果它只是执行副作用代码）
          try {
            // 尝试直接执行（如果文件只是初始化代码）
            // 注意：这需要文件是自执行的
            console.log('[Test] 尝试其他加载方式...');
            // 由于无法在运行时动态 import，我们标记为警告
            throw new Error('文件是 ES6 格式，需要在小程序配置中启用 ES6 模块支持，或使用构建工具转换为 CommonJS');
          } catch (e2) {
            throw new Error('无法加载 index-init.js。可能原因：1) 文件路径错误 2) 文件格式不兼容。请检查是否运行了 copy-sdk.cjs。错误: ' + (loadError.message || loadError));
          }
        }
        
        // 检查全局 polyfill
        const hasFetch = typeof globalThis.fetch === 'function';
        const hasImage = typeof globalThis.Image === 'function';
        const hasDocument = typeof globalThis.document === 'object';
        
        results.push({
          name: '适配层初始化',
          status: hasFetch && hasImage && hasDocument ? 'success' : 'warning',
          message: `fetch: ${hasFetch ? '✅' : '❌'}, Image: ${hasImage ? '✅' : '❌'}, document: ${hasDocument ? '✅' : '❌'}`
        });
        console.log('[Test] 适配层检查完成');
      } catch (err) {
        results.push({
          name: '适配层初始化',
          status: 'error',
          message: `初始化失败: ${(err && err.message) || err || '未知错误'}`
        });
      }

      // 测试 2: 加载 XmovAvatarMP
      console.log('[Test] 2. 加载 XmovAvatarMP');
      try {
        let XmovAvatarMP;
        try {
          // 尝试相对路径
          XmovAvatarMP = require('../../sdk/core/XmovAvatarMP.js').default;
        } catch (e1) {
          try {
            // 尝试绝对路径
            XmovAvatarMP = require('/sdk/core/XmovAvatarMP.js').default;
          } catch (e2) {
            console.error('[Test] 路径尝试失败:', e1.message, e2.message);
            throw new Error('无法找到 XmovAvatarMP.js，请先运行: node copy-sdk.cjs。错误: ' + (e1.message || e1));
          }
        }
        
        if (XmovAvatarMP) {
          results.push({
            name: 'XmovAvatarMP 加载',
            status: 'success',
            message: '✅ 模块加载成功'
          });
          console.log('[Test] XmovAvatarMP 加载成功');
          
          // 保存到 this 供后续使用
          this.XmovAvatarMP = XmovAvatarMP;
        } else {
          results.push({
            name: 'XmovAvatarMP 加载',
            status: 'error',
            message: '❌ 模块未导出'
          });
        }
      } catch (err) {
        results.push({
          name: 'XmovAvatarMP 加载',
          status: 'error',
          message: `加载失败: ${(err && err.message) || err || '未知错误'}`
        });
        console.error('[Test] XmovAvatarMP 加载失败:', err);
      }

      // 测试 3: 检查原 SDK 模块路径
      console.log('[Test] 3. 检查原 SDK 模块路径');
      try {
        // 尝试 require 原 SDK 模块（会通过适配层）
        const ResourceManager = require('../../../../src/modules/ResourceManager.js').default;
        const RenderScheduler = require('../../../../src/control/RenderScheduler.js').default;
        const Ttsa = require('../../../../src/control/ttsa.js').default;
        
        if (ResourceManager && RenderScheduler && Ttsa) {
          results.push({
            name: '原 SDK 模块路径',
            status: 'success',
            message: '✅ 所有模块路径正确'
          });
          console.log('[Test] 原 SDK 模块路径检查通过');
        } else {
          results.push({
            name: '原 SDK 模块路径',
            status: 'warning',
            message: '⚠️ 部分模块未找到'
          });
        }
      } catch (err) {
        results.push({
          name: '原 SDK 模块路径',
          status: 'warning',
          message: `检查失败（可能需要编译）: ${(err && err.message) || err || '未知错误'}`
        });
        console.warn('[Test] 原 SDK 模块路径检查失败（这是正常的，因为需要编译）:', (err && err.message) || err);
      }

      // 测试 4: Canvas 初始化
      console.log('[Test] 4. Canvas 初始化');
      try {
        let canvasModule;
        try {
          // 尝试相对路径
          canvasModule = require('../../sdk/adapters/canvas.js');
        } catch (e1) {
          try {
            // 尝试绝对路径
            canvasModule = require('/sdk/adapters/canvas.js');
          } catch (e2) {
            console.error('[Test] 路径尝试失败:', e1.message, e2.message);
            throw new Error('无法找到 canvas.js，请先运行: node copy-sdk.cjs。错误: ' + (e1.message || e1));
          }
        }
        const { getCanvasNode, createWebGLContext } = canvasModule;
        
        // 等待 Canvas 准备就绪
        await new Promise((resolve) => {
          const query = wx.createSelectorQuery();
          query.select('#avatar-canvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (res && res[0] && res[0].node) {
                resolve(res[0].node);
              } else {
                setTimeout(() => {
                  query.select('#avatar-canvas')
                    .fields({ node: true, size: true })
                    .exec((res2) => {
                      resolve(res2 && res2[0] ? res2[0].node : null);
                    });
                }, 500);
              }
            });
        });

        const canvas = await getCanvasNode('avatar-canvas');
        if (canvas) {
          const gl = createWebGLContext(canvas);
          if (gl) {
            results.push({
              name: 'Canvas/WebGL 初始化',
              status: 'success',
              message: '✅ Canvas 和 WebGL 上下文创建成功'
            });
            console.log('[Test] Canvas/WebGL 初始化成功');
            this.canvas = canvas;
            this.gl = gl;
          } else {
            results.push({
              name: 'Canvas/WebGL 初始化',
              status: 'warning',
              message: '⚠️ Canvas 创建成功，但 WebGL 上下文创建失败'
            });
          }
        } else {
          results.push({
            name: 'Canvas/WebGL 初始化',
            status: 'error',
            message: '❌ Canvas 节点未找到'
          });
        }
      } catch (err) {
        results.push({
          name: 'Canvas/WebGL 初始化',
          status: 'error',
          message: `初始化失败: ${(err && err.message) || err || '未知错误'}`
        });
        console.error('[Test] Canvas 初始化失败:', err);
      }

    } catch (err) {
      console.error('[Test] 测试过程出错:', err);
      results.push({
        name: '测试过程',
        status: 'error',
        message: `测试出错: ${(err && err.message) || err || '未知错误'}`
      });
    }

    // 更新页面数据
    this.setData({
      testResults: results,
      status: '测试完成'
    });

    console.log('[Test] 测试完成，结果:', results);
  },

  /**
   * 初始化 SDK（需要配置真实的 appId、appSecret 等）
   */
  async initSDK() {
    if (!this.XmovAvatarMP) {
      wx.showToast({
        title: 'SDK 未加载',
        icon: 'none'
      });
      return;
    }

    if (!this.canvas || !this.gl) {
      wx.showToast({
        title: 'Canvas 未初始化',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '初始化中...' });

      // 创建 SDK 实例
      this.avatar = new this.XmovAvatarMP({
        canvasId: 'avatar-canvas',
        canvas: this.canvas,
        gl: this.gl,
        appId: 'your-app-id', // 替换为真实的 appId
        appSecret: 'your-app-secret', // 替换为真实的 appSecret
        gatewayServer: 'https://your-gateway.com', // 替换为真实的网关地址
        enableLogger: true,
        onMessage: (error) => {
          console.error('[SDK] 错误:', error);
          this.setData({
            errorMessage: error.message || '未知错误'
          });
        },
        onStateChange: (state) => {
          console.log('[SDK] 状态变化:', state);
          this.setData({ status: state });
        },
        onStatusChange: (status) => {
          console.log('[SDK] 状态码变化:', status);
        }
      });

      // 初始化
      await this.avatar.init({
        onDownloadProgress: (progress) => {
          console.log('[SDK] 下载进度:', progress);
          this.setData({ progress });
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '初始化成功',
        icon: 'success'
      });

      this.setData({
        isInitialized: true,
        status: '已初始化'
      });

    } catch (err) {
      wx.hideLoading();
      console.error('[SDK] 初始化失败:', err);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
      this.setData({
        errorMessage: (err && err.message) || '初始化失败'
      });
    }
  },

  /**
   * 启动 SDK
   */
  startSDK() {
    if (!this.avatar) {
      wx.showToast({
        title: 'SDK 未初始化',
        icon: 'none'
      });
      return;
    }

    try {
      this.avatar.start();
      this.setData({ status: '运行中' });
    } catch (err) {
      console.error('[SDK] 启动失败:', err);
      wx.showToast({
        title: '启动失败',
        icon: 'none'
      });
    }
  },

  /**
   * 销毁 SDK
   */
  async destroySDK() {
    if (!this.avatar) {
      return;
    }

    try {
      await this.avatar.destroy();
      this.avatar = null;
      this.setData({
        isInitialized: false,
        status: '已销毁'
      });
    } catch (err) {
      console.error('[SDK] 销毁失败:', err);
    }
  },

  onUnload() {
    if (this.avatar) {
      this.destroySDK();
    }
  }
});

// pages/index/index.js
// 使用单文件 SDK（与 Web 一样：一个 JS），先 npm run build，再 node copy-bundle.cjs

Page({
  data: {
    status: '未初始化',
    progress: 0,
    isInitialized: false,
    errorMessage: ''
  },

  onLoad() {
    console.log('[Demo] 页面加载');
    this.initSDK();
  },

  async initSDK() {
    try {
      // 拆包后入口很小，主包 require 即可
      const { XmovAvatarMP, getCanvasNode, createWebGLContext } = require('../../sdk/xmov-avatar-mp');

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
      const gl = createWebGLContext(canvas);

      if (!canvas || !gl) {
        throw new Error('Canvas 或 WebGL 初始化失败');
      }

      this.avatar = new XmovAvatarMP({
        canvasId: 'avatar-canvas',
        canvas: canvas,
        gl: gl,
        appId: 'your-app-id',
        appSecret: 'your-app-secret',
        gatewayServer: 'https://your-gateway.com',
        enableLogger: true,
        onMessage: (error) => {
          console.error('[SDK] 错误:', error);
          this.setData({ errorMessage: error.message || '未知错误' });
        },
        onStateChange: (state) => {
          this.setData({ status: state });
        },
        onStatusChange: (status) => {
          console.log('[SDK] 状态码:', status);
        }
      });

      wx.showLoading({ title: '初始化中...' });
      await this.avatar.init({
        onDownloadProgress: (progress) => this.setData({ progress })
      });
      wx.hideLoading();
      wx.showToast({ title: '初始化成功', icon: 'success' });
      this.setData({ isInitialized: true, status: '已初始化' });
    } catch (err) {
      console.error('[Demo] 初始化失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '初始化失败', icon: 'none' });
      this.setData({ errorMessage: (err && err.message) || '初始化失败' });
    }
  },

  startSDK() {
    if (!this.avatar) {
      wx.showToast({ title: 'SDK 未初始化', icon: 'none' });
      return;
    }
    try {
      this.avatar.start();
      this.setData({ status: '运行中' });
    } catch (err) {
      wx.showToast({ title: '启动失败', icon: 'none' });
    }
  },

  async destroySDK() {
    if (!this.avatar) return;
    try {
      await this.avatar.destroy();
      this.avatar = null;
      this.setData({ isInitialized: false, status: '已销毁' });
    } catch (err) {
      console.error('[SDK] 销毁失败:', err);
    }
  },

  onUnload() {
    if (this.avatar) this.destroySDK();
  }
});

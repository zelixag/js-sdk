// pages/index/index.js
// 使用插件方式

Page({
  data: {
    status: '未初始化',
    progress: 0,
    isInitialized: false,
    errorMessage: '',
    avatarConfig: {
      appId: 'your-app-id',  // 替换为真实的 appId
      appSecret: 'your-app-secret',  // 替换为真实的 appSecret
      gatewayServer: 'https://your-gateway.com',  // 替换为真实的网关地址
      enableLogger: true
    }
  },

  onLoad() {
    console.log('[Demo] 页面加载，使用插件方式');
  },

  /**
   * 数字人初始化完成
   */
  onAvatarReady() {
    console.log('[Demo] 数字人初始化完成');
    this.setData({
      isInitialized: true,
      status: '已初始化'
    });
    wx.showToast({
      title: '初始化成功',
      icon: 'success'
    });
  },

  /**
   * 数字人错误
   */
  onAvatarError(e) {
    console.error('[Demo] 数字人错误:', e.detail.error);
    this.setData({
      errorMessage: (e.detail.error && e.detail.error.message) || '未知错误'
    });
    wx.showToast({
      title: '发生错误',
      icon: 'none'
    });
  },

  /**
   * 状态变化
   */
  onStateChange(e) {
    console.log('[Demo] 状态变化:', e.detail.state);
    this.setData({
      status: e.detail.state
    });
  },

  /**
   * 状态码变化
   */
  onStatusChange(e) {
    console.log('[Demo] 状态码变化:', e.detail.status);
  },

  /**
   * 下载进度
   */
  onProgress(e) {
    console.log('[Demo] 下载进度:', e.detail.progress);
    this.setData({
      progress: e.detail.progress
    });
  },

  /**
   * 启动数字人
   */
  startAvatar() {
    // 通过组件引用调用方法
    const avatarComponent = this.selectComponent('#avatar-component');
    if (avatarComponent) {
      avatarComponent.start();
    }
  },

  /**
   * 停止数字人
   */
  stopAvatar() {
    const avatarComponent = this.selectComponent('#avatar-component');
    if (avatarComponent) {
      avatarComponent.stop();
    }
  },

  /**
   * 使用插件 API（直接使用 SDK）
   */
  async usePluginAPI() {
    try {
      // 获取插件实例
      const plugin = requirePlugin('xmov-avatar');
      const { XmovAvatarMP, getCanvasNode, createWebGLContext } = plugin;

      // 获取 Canvas
      const canvas = await getCanvasNode('avatar-canvas-api');
      const gl = createWebGLContext(canvas);

      // 创建 SDK 实例
      const avatar = new XmovAvatarMP({
        canvasId: 'avatar-canvas-api',
        canvas: canvas,
        gl: gl,
        ...this.data.avatarConfig,
        onStateChange: (state) => {
          console.log('[Plugin API] 状态变化:', state);
        }
      });

      // 初始化
      await avatar.init();
      console.log('[Plugin API] 初始化成功');

      // 启动
      avatar.start();
    } catch (err) {
      console.error('[Plugin API] 错误:', err);
    }
  }
});

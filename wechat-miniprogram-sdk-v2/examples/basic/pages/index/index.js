// pages/index/index.js
// 注意：这里直接引入构建后的SDK文件
// 在实际使用中，应该通过npm安装后引入

// 由于小程序环境限制，我们需要模拟SDK的基本功能
// 实际项目中应该使用: import AvatarSDK from '@xmov/avatar-miniprogram-v2'

Page({
  data: {
    sdk: null,
    sdkState: 'uninitialized',
    connectionStatus: 'disconnected',
    errorMessage: '',
    showLog: false,
    logs: []
  },

  onLoad() {
    this.addLog('页面加载');
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.addLog(`设备信息: ${systemInfo.model}, ${systemInfo.system}`);
  },

  onReady() {
    this.addLog('页面渲染完成');
    this.addLog('提示: 点击"初始化"按钮开始');
  },

  onUnload() {
    this.addLog('页面卸载');
    if (this.data.sdk) {
      this.onDestroy();
    }
  },

  // 初始化SDK
  onInit() {
    this.addLog('开始初始化SDK...');
    
    try {
      // 创建模拟的SDK实例
      // 实际使用时应该是:
      // const sdk = new AvatarSDK({
      //   appId: 'YOUR_APP_ID',
      //   appSecret: 'YOUR_APP_SECRET',
      //   serverUrl: 'wss://your-server.com',
      //   canvas: { id: 'avatar-canvas' }
      // });
      
      const sdk = this.createMockSDK();
      
      this.setData({ 
        sdk,
        sdkState: 'initializing',
        errorMessage: ''
      });
      
      // 模拟初始化过程
      setTimeout(() => {
        this.setData({ sdkState: 'initialized' });
        this.addLog('SDK初始化成功');
        
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
      }, 1000);
      
    } catch (error) {
      this.addLog(`初始化失败: ${error.message}`);
      this.setData({
        sdkState: 'error',
        errorMessage: error.message
      });
      
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  // 启动SDK
  onStart() {
    this.addLog('启动SDK...');
    
    this.setData({ sdkState: 'connecting' });
    
    // 模拟连接过程
    setTimeout(() => {
      this.setData({ 
        sdkState: 'connected',
        connectionStatus: 'connected'
      });
      this.addLog('连接成功');
      
      // 开始运行
      setTimeout(() => {
        this.setData({ sdkState: 'running' });
        this.addLog('SDK运行中');
        this.initCanvas();
        
        wx.showToast({
          title: '启动成功',
          icon: 'success'
        });
      }, 500);
    }, 1000);
  },

  // 暂停SDK
  onPause() {
    this.addLog('暂停SDK...');
    
    this.setData({ sdkState: 'paused' });
    this.addLog('SDK已暂停');
    
    wx.showToast({
      title: '已暂停',
      icon: 'success'
    });
  },

  // 恢复SDK
  onResume() {
    this.addLog('恢复SDK...');
    
    this.setData({ sdkState: 'running' });
    this.addLog('SDK已恢复');
    
    wx.showToast({
      title: '已恢复',
      icon: 'success'
    });
  },

  // 销毁SDK
  onDestroy() {
    this.addLog('销毁SDK...');
    
    this.setData({ 
      sdkState: 'destroyed',
      connectionStatus: 'disconnected',
      sdk: null
    });
    
    this.addLog('SDK已销毁');
    
    wx.showToast({
      title: '已销毁',
      icon: 'success'
    });
  },

  // 初始化Canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#avatar-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置Canvas尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          this.addLog(`Canvas初始化: ${canvas.width}x${canvas.height}`);
          
          // 绘制示例内容
          this.drawDemo(ctx, res[0].width, res[0].height);
        }
      });
  },

  // 绘制示例内容
  drawDemo(ctx, width, height) {
    // 清空画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3460';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#1890ff';
    ctx.fill();
    
    // 绘制文字
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('数字人SDK', width / 2, height / 2 - 10);
    ctx.font = '14px sans-serif';
    ctx.fillText('v2.0', width / 2, height / 2 + 15);
    
    this.addLog('Canvas绘制完成');
  },

  // 创建模拟SDK
  createMockSDK() {
    return {
      state: 'uninitialized',
      init: () => Promise.resolve(),
      start: () => Promise.resolve(),
      pause: () => Promise.resolve(),
      resume: () => Promise.resolve(),
      destroy: () => Promise.resolve()
    };
  },

  // 添加日志
  addLog(message) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const logs = this.data.logs;
    logs.unshift({ time, message });
    
    // 限制日志数量
    if (logs.length > 50) {
      logs.pop();
    }
    
    this.setData({ logs });
    console.log(`[${time}] ${message}`);
  },

  // 切换日志显示
  toggleLog() {
    this.setData({
      showLog: !this.data.showLog
    });
  }
});

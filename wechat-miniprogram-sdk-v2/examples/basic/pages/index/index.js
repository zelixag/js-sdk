// pages/index/index.js
// 引入SDK
const AvatarSDKModule = require('../../../utils/avatar-sdk.js');
const AvatarSDK = AvatarSDKModule.default || AvatarSDKModule;
const { SDKState, ConnectionStatus } = AvatarSDKModule;

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
      // 创建SDK实例
      const sdk = new AvatarSDK({
        appId: 'demo-app-id',
        appSecret: 'demo-app-secret',
        serverUrl: 'wss://demo-server.com',
        canvas: {
          id: 'avatar-canvas'
        },
        logger: {
          level: 'debug',
          console: true
        },
        onReady: () => {
          this.addLog('SDK onReady回调触发');
        },
        onError: (error) => {
          this.addLog(`SDK onError回调: ${error.message}`);
          this.setData({
            errorMessage: error.message
          });
        },
        onStateChange: (state) => {
          this.addLog(`SDK onStateChange回调: ${state}`);
          this.updateStatus();
        }
      });
      
      this.setData({ 
        sdk,
        sdkState: 'initializing',
        errorMessage: ''
      });
      
      this.addLog('SDK实例创建成功');
      
      // 监听SDK事件
      sdk.on('ready', () => {
        this.addLog('SDK事件: ready');
        this.updateStatus();
      });
      
      sdk.on('error', (error) => {
        this.addLog(`SDK事件: error - ${error.message}`);
        this.updateStatus();
      });
      
      sdk.on('connected', () => {
        this.addLog('SDK事件: connected');
        this.updateStatus();
      });
      
      sdk.on('disconnected', () => {
        this.addLog('SDK事件: disconnected');
        this.updateStatus();
      });
      
      // 初始化SDK
      sdk.init()
        .then(() => {
          this.addLog('SDK初始化成功');
          this.setData({ sdkState: 'initialized' });
          this.updateStatus();
          
          wx.showToast({
            title: '初始化成功',
            icon: 'success'
          });
        })
        .catch((error) => {
          this.addLog(`SDK初始化失败: ${error.message}`);
          this.setData({
            sdkState: 'error',
            errorMessage: error.message
          });
          
          wx.showToast({
            title: '初始化失败',
            icon: 'none'
          });
        });
      
    } catch (error) {
      this.addLog(`创建SDK实例失败: ${error.message}`);
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
    if (!this.data.sdk) {
      wx.showToast({
        title: '请先初始化SDK',
        icon: 'none'
      });
      return;
    }
    
    this.addLog('启动SDK...');
    
    this.data.sdk.start()
      .then(() => {
        this.addLog('SDK启动成功');
        this.updateStatus();
        this.initCanvas();
        
        wx.showToast({
          title: '启动成功',
          icon: 'success'
        });
      })
      .catch((error) => {
        this.addLog(`SDK启动失败: ${error.message}`);
        this.setData({
          errorMessage: error.message
        });
        
        wx.showToast({
          title: '启动失败',
          icon: 'none'
        });
      });
  },

  // 暂停SDK
  onPause() {
    if (!this.data.sdk) return;
    
    this.addLog('暂停SDK...');
    
    this.data.sdk.pause()
      .then(() => {
        this.addLog('SDK已暂停');
        this.updateStatus();
        
        wx.showToast({
          title: '已暂停',
          icon: 'success'
        });
      })
      .catch((error) => {
        this.addLog(`暂停失败: ${error.message}`);
      });
  },

  // 恢复SDK
  onResume() {
    if (!this.data.sdk) return;
    
    this.addLog('恢复SDK...');
    
    this.data.sdk.resume()
      .then(() => {
        this.addLog('SDK已恢复');
        this.updateStatus();
        
        wx.showToast({
          title: '已恢复',
          icon: 'success'
        });
      })
      .catch((error) => {
        this.addLog(`恢复失败: ${error.message}`);
      });
  },

  // 销毁SDK
  onDestroy() {
    if (!this.data.sdk) return;
    
    this.addLog('销毁SDK...');
    
    this.data.sdk.destroy()
      .then(() => {
        this.addLog('SDK已销毁');
        this.setData({ 
          sdk: null,
          sdkState: 'destroyed',
          connectionStatus: 'disconnected'
        });
        
        wx.showToast({
          title: '已销毁',
          icon: 'success'
        });
      })
      .catch((error) => {
        this.addLog(`销毁失败: ${error.message}`);
      });
  },

  // 更新状态显示
  updateStatus() {
    if (this.data.sdk) {
      const state = this.data.sdk.getState();
      const status = this.data.sdk.getStatus ? this.data.sdk.getStatus() : 'unknown';
      
      this.setData({
        sdkState: state || 'unknown',
        connectionStatus: status
      });
      
      this.addLog(`状态更新: SDK=${state}, Connection=${status}`);
    }
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
    ctx.fillText('数字人SDK v2.0', width / 2, height / 2 - 10);
    ctx.font = '14px sans-serif';
    ctx.fillText('真实SDK已加载', width / 2, height / 2 + 15);
    
    this.addLog('Canvas绘制完成');
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

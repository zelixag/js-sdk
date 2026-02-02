// pages/index/index.js
import SimpleAvatar from '../../../dist/index';

Page({
  data: {
    avatarStatus: '未初始化',
    connectStatus: '未连接',
    volume: 0.8,
    speakingText: '你好，我是微信小程序中的数字人',
    isSpeaking: false,
    isConnected: false,
    progress: 0,
    showAdvancedControls: false
  },

  onLoad() {
    console.log('页面加载完成');
  },

  async initAvatar() {
    try {
      // 显示加载提示
      wx.showLoading({
        title: '初始化中...'
      });

      // 初始化数字人 SDK
      this.avatar = new SimpleAvatar({
        containerId: 'avatar-canvas', // canvas-id
        appId: 'your-app-id',
        appSecret: 'your-app-secret',
        gatewayServer: 'wss://your-gateway-server.com',
        cacheServer: 'https://your-cache-server.com',
        enableLogger: true,
        
        // 状态变更回调
        onStatusChange: (status) => {
          let statusText = '未知';
          switch(status) {
            case 0: statusText = '关闭'; break;
            case 1: statusText = '在线'; break;
            case 2: statusText = '离线'; break;
            case 3: statusText = '隐身'; break;
            case 4: statusText = '可见'; break;
          }
          this.setData({ avatarStatus: statusText });
          console.log('数字人状态变更:', statusText);
        },
        
        // 消息回调
        onMessage: (error) => {
          console.error('SDK 错误:', error);
          wx.showToast({
            title: `错误: ${error.message}`,
            icon: 'error'
          });
        },
        
        // 网络信息回调
        onNetworkInfo: (networkInfo) => {
          console.log('网络信息:', networkInfo);
          this.setData({ isConnected: networkInfo.isOnline });
        },
        
        // 语音状态回调
        onVoiceStateChange: (state, duration) => {
          console.log('语音状态:', state, '持续时间:', duration);
          this.setData({ isSpeaking: state === 'speaking' });
        },
        
        // 渲染状态回调
        onRenderChange: (state) => {
          console.log('渲染状态变更:', state);
        }
      });

      // 设置回调
      this.avatar.onStatusChange = (status) => {
        console.log('状态变化:', status);
      };

      this.avatar.onMessage = (error) => {
        console.error('收到消息:', error);
      };

      this.avatar.onDownloadProgress = (progress) => {
        this.setData({ progress });
        console.log('下载进度:', progress + '%');
      };

      // 初始化 SDK
      await this.avatar.init({
        onDownloadProgress: (progress) => {
          this.setData({ progress });
          console.log('资源加载进度:', progress + '%');
        }
      });

      console.log('数字人 SDK 初始化成功');
      wx.hideLoading();
      wx.showToast({
        title: '初始化成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('初始化失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '初始化失败: ' + error.message,
        icon: 'error'
      });
    }
  },

  async startAvatar() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    try {
      this.avatar.start();
      console.log('数字人已启动');
      wx.showToast({
        title: '启动成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('启动失败:', error);
      wx.showToast({
        title: '启动失败',
        icon: 'error'
      });
    }
  },

  async speakText() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    const text = this.data.speakingText;
    if (!text.trim()) {
      wx.showToast({
        title: '请输入要播放的文字',
        icon: 'none'
      });
      return;
    }

    try {
      // 让数字人说话
      this.avatar.speak(text);
      
      console.log('发送说话指令:', text);
      wx.showToast({
        title: '正在说话...',
        icon: 'loading',
        duration: 2000
      });
    } catch (error) {
      console.error('说话失败:', error);
      wx.showToast({
        title: '说话失败',
        icon: 'error'
      });
    }
  },

  async stopAvatar() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    try {
      this.avatar.stop();
      console.log('数字人已停止');
      wx.showToast({
        title: '已停止',
        icon: 'success'
      });
    } catch (error) {
      console.error('停止失败:', error);
      wx.showToast({
        title: '停止失败',
        icon: 'error'
      });
    }
  },

  async destroyAvatar() {
    if (!this.avatar) {
      wx.showToast({
        title: '尚未初始化',
        icon: 'none'
      });
      return;
    }

    try {
      await this.avatar.destroy();
      this.avatar = null;
      console.log('数字人已销毁');
      this.setData({ 
        avatarStatus: '已销毁',
        progress: 0,
        isConnected: false,
        isSpeaking: false
      });
      wx.showToast({
        title: '已销毁',
        icon: 'success'
      });
    } catch (error) {
      console.error('销毁失败:', error);
      wx.showToast({
        title: '销毁失败',
        icon: 'error'
      });
    }
  },

  // 设置音量
  setVolume(e) {
    const volume = e.detail.value;
    this.setData({ volume });
    
    if (this.avatar) {
      this.avatar.setVolume(volume);
    }
  },

  // 输入说话文字
  inputText(e) {
    this.setData({ speakingText: e.detail.value });
  },

  // 进入隐身模式
  setInvisible() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    this.avatar.setInvisibleMode();
    wx.showToast({
      title: '进入隐身模式',
      icon: 'none'
    });
  },

  // 退出隐身模式
  exitInvisible() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    this.avatar.exitInvisibleMode();
    wx.showToast({
      title: '退出隐身模式',
      icon: 'none'
    });
  },

  // 切换高级控制面板
  toggleAdvancedControls() {
    this.setData({
      showAdvancedControls: !this.data.showAdvancedControls
    });
  },

  // 更改布局
  changeLayout() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    // 示例布局配置
    const layoutConfig = {
      cameraPosition: { x: 0, y: 0, z: 2 },
      lighting: { intensity: 1.0 },
      animation: 'idle'
    };

    this.avatar.changeLayout(layoutConfig);
    wx.showToast({
      title: '布局已更改',
      icon: 'none'
    });
  },

  // 播放动画
  playAnimation() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    const animationName = 'wave'; // 示例动画名称
    this.avatar.playAnimation(animationName, {
      duration: 2000, // 2秒
      loop: false,
      speed: 1.0
    });

    wx.showToast({
      title: `播放动画: ${animationName}`,
      icon: 'none'
    });
  },

  // 停止动画
  stopAnimation() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    const animationName = 'wave'; // 示例动画名称
    this.avatar.stopAnimation(animationName);

    wx.showToast({
      title: `停止动画: ${animationName}`,
      icon: 'none'
    });
  },

  // 加载资源
  loadResource() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    // 示例资源URL
    const resourceUrl = 'https://example.com/models/sample.glb';
    
    this.avatar.loadResource(resourceUrl, 'model')
      .then(success => {
        if (success) {
          wx.showToast({
            title: '资源加载成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '资源加载失败',
            icon: 'error'
          });
        }
      })
      .catch(error => {
        console.error('资源加载错误:', error);
        wx.showToast({
          title: '资源加载失败',
          icon: 'error'
        });
      });
  },

  // 获取会话ID
  getSessionId() {
    if (!this.avatar) {
      wx.showToast({
        title: '请先初始化',
        icon: 'none'
      });
      return;
    }

    const sessionId = this.avatar.getSessionId();
    wx.setClipboardData({
      data: sessionId,
      success: () => {
        wx.showToast({
          title: '会话ID已复制',
          icon: 'success'
        });
      }
    });
  },

  onUnload() {
    // 页面卸载时销毁 SDK
    if (this.avatar) {
      this.avatar.destroy();
    }
  }
});
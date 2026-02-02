// pages/avatar/index.js
import XmovAvatar from '../../src/index';

Page({
  data: {
    progress: 0,
    status: '未初始化',
    isPlaying: false
  },

  onLoad() {
    console.log('Avatar page loaded');
    
    // 初始化 SDK
    this.avatar = new XmovAvatar({
      containerId: 'avatar-canvas', // Canvas ID
      appId: 'your-app-id',
      appSecret: 'your-app-secret',
      gatewayServer: 'https://your-gateway.com',
      enableLogger: true,
      onMessage: (error) => {
        console.error('SDK Error:', error);
        wx.showToast({
          title: `错误: ${error.message}`,
          icon: 'none'
        });
      },
      onStateChange: (state) => {
        console.log('State:', state);
        this.setData({
          status: state
        });
      },
      onStatusChange: (status) => {
        console.log('Status:', status);
        this.setData({
          status: this.getStatusText(status)
        });
      }
    });

    // 初始化
    this.avatar.init({
      onDownloadProgress: (progress) => {
        this.setData({
          progress
        });
        console.log('下载进度:', progress);
      }
    }).then(() => {
      console.log('SDK 初始化成功');
      wx.showToast({
        title: '初始化成功',
        icon: 'success'
      });
    }).catch(err => {
      console.error('初始化失败:', err);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    });
  },

  onUnload() {
    // 销毁 SDK
    if (this.avatar) {
      this.avatar.destroy();
    }
  },

  // 开始会话
  startSession() {
    this.avatar?.start();
    this.setData({
      isPlaying: true
    });
  },

  // 说话
  speak() {
    this.avatar?.speak('你好，我是数字人');
  },

  // 停止
  stop() {
    this.avatar?.stop();
    this.setData({
      isPlaying: false
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      '-1': '未初始化',
      0: '关闭',
      1: '在线',
      2: '离线',
      3: '隐身',
      4: '可见'
    };
    return statusMap[status] || status;
  }
});
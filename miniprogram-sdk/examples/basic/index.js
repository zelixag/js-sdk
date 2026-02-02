// 小程序页面 JS
import XmovAvatar from '@xmov/avatar-miniprogram';

Page({
  data: {
    progress: 0
  },

  onLoad() {
    // 初始化 SDK
    this.avatar = new XmovAvatar({
      containerId: 'avatar-canvas',
      appId: 'your-app-id',
      appSecret: 'your-app-secret',
      gatewayServer: 'https://your-gateway.com',
      enableLogger: true
    });

    // 初始化
    this.avatar.init({
      onDownloadProgress: (progress) => {
        this.setData({
          progress
        });
        console.log('下载进度:', progress);
      }
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
  }
});

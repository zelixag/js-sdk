import AvatarSDK, { SDKState, ConnectionStatus } from '../../../../dist/index.esm.js';

Page({
  data: {
    sdk: null,
    sdkState: SDKState.UNINITIALIZED,
    connectionStatus: ConnectionStatus.DISCONNECTED,
  },

  onReady() {
    const config = {
      appId: 'YOUR_APP_ID',
      appSecret: 'YOUR_APP_SECRET',
      serverUrl: 'wss://your-server-url.com',
      canvas: {
        id: 'avatar-canvas',
      },
      onReady: () => {
        console.log('SDK is ready!');
        this.updateStatus();
      },
      onError: (error) => {
        console.error('SDK Error:', error);
        wx.showToast({
          title: `SDK错误: ${error.message}`,
          icon: 'none',
        });
        this.updateStatus();
      },
      onStateChange: (state) => {
        console.log('SDK state changed to:', state);
        this.updateStatus();
      },
    };

    const sdk = new AvatarSDK(config);
    this.setData({ sdk });

    sdk.init().catch(error => {
      console.error('SDK initialization failed:', error);
    });

    // 监听连接状态变化
    sdk.on('connected', () => this.updateStatus());
    sdk.on('disconnected', () => this.updateStatus());
    sdk.on('reconnecting', () => this.updateStatus());
  },

  onUnload() {
    if (this.data.sdk) {
      this.data.sdk.destroy();
    }
  },

  updateStatus() {
    if (this.data.sdk) {
      this.setData({
        sdkState: this.data.sdk.getState(),
        connectionStatus: this.data.sdk.getStatus(),
      });
    }
  },

  onStart() {
    if (this.data.sdk) {
      this.data.sdk.start().catch(e => console.error(e));
    }
  },

  onPause() {
    if (this.data.sdk) {
      this.data.sdk.pause().catch(e => console.error(e));
    }
  },

  onResume() {
    if (this.data.sdk) {
      this.data.sdk.resume().catch(e => console.error(e));
    }
  },

  onStop() {
    if (this.data.sdk) {
      // 假设有一个stop方法，或者通过destroy实现
      this.data.sdk.destroy().then(() => {
        console.log('SDK stopped and destroyed');
        this.onReady(); // 重新初始化以便再次启动
      });
    }
  },

  handleTouchStart(e) {
    console.log('touch start', e);
    // 可用于实现摄像头控制等交互
  },

  handleTouchMove(e) {
    console.log('touch move', e);
  },

  handleTouchEnd(e) {
    console.log('touch end', e);
  },
});

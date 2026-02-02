// app.js
App({
  onLaunch() {
    console.log('小程序启动');
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    console.log('系统信息:', systemInfo);
    
    // 保存到全局
    this.globalData.systemInfo = systemInfo;
  },
  
  globalData: {
    systemInfo: null
  }
});

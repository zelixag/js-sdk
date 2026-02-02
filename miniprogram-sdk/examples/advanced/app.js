// app.js
App({
  onLaunch() {
    console.log('应用启动');
  },
  
  onShow() {
    console.log('应用显示');
  },
  
  onHide() {
    console.log('应用隐藏');
  },
  
  globalData: {
    avatarInstance: null
  }
});
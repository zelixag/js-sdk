// 小程序入口文件
App({
  onLaunch() {
    console.log('[App] 小程序启动');
    
    // 检查 SDK 是否可用
    try {
      const { isMiniProgram } = require('../../dist/utils/env.js');
      console.log('[App] SDK 环境检测:', isMiniProgram());
    } catch (err) {
      console.error('[App] SDK 加载失败:', err);
    }
  },

  onShow() {
    console.log('[App] 小程序显示');
  },

  onHide() {
    console.log('[App] 小程序隐藏');
  }
});

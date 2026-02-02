/**
 * 运行适配层测试的脚本
 * 可以在 Node.js 环境中运行基础测试
 */

async function runTests() {
  console.log('=== 适配层基础测试 ===\n');

  // 测试环境检测
  console.log('1. 环境检测测试');
  try {
    const envModule = await import('../dist/utils/env.js');
    console.log('   isMiniProgram():', envModule.isMiniProgram());
    console.log('   isBrowser():', envModule.isBrowser());
    console.log('   getPlatform():', envModule.getPlatform());
  } catch (err) {
    console.log('   环境检测模块加载失败:', err.message);
  }
  console.log('');

  // 测试网络请求适配器
  console.log('2. 网络请求适配器测试');
  try {
    const { request } = await import('../dist/utils/request-adapter.js');
    console.log('   request 函数已导出:', typeof request === 'function');
  } catch (err) {
    console.log('   request 函数加载失败:', err.message);
  }
  console.log('');

  // 测试 WebSocket 适配器
  console.log('3. WebSocket 适配器测试');
  try {
    const { createWebSocket, MiniProgramWebSocket } = await import('../dist/adapters/websocket.js');
    console.log('   createWebSocket 函数已导出:', typeof createWebSocket === 'function');
    console.log('   MiniProgramWebSocket 类已导出:', typeof MiniProgramWebSocket === 'function');
  } catch (err) {
    console.log('   WebSocket 适配器加载失败:', err.message);
  }
  console.log('');

  // 测试 Canvas 适配器
  console.log('4. Canvas 适配器测试');
  try {
    const { getCanvasNode, createWebGLContext, setCanvasSize, createImage } = await import('../dist/adapters/canvas.js');
    console.log('   getCanvasNode 函数已导出:', typeof getCanvasNode === 'function');
    console.log('   createWebGLContext 函数已导出:', typeof createWebGLContext === 'function');
    console.log('   setCanvasSize 函数已导出:', typeof setCanvasSize === 'function');
    console.log('   createImage 函数已导出:', typeof createImage === 'function');
  } catch (err) {
    console.log('   Canvas 适配器加载失败:', err.message);
  }
  console.log('');

  // 测试音频适配器
  console.log('5. 音频适配器测试');
  try {
    const { MiniProgramAudioPlayer, MiniProgramPCMPlayer } = await import('../dist/adapters/audio.js');
    console.log('   MiniProgramAudioPlayer 类已导出:', typeof MiniProgramAudioPlayer === 'function');
    console.log('   MiniProgramPCMPlayer 类已导出:', typeof MiniProgramPCMPlayer === 'function');
  } catch (err) {
    console.log('   音频适配器加载失败:', err.message);
  }
  console.log('');

  console.log('=== 测试完成 ===');
}

// 运行测试
runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});

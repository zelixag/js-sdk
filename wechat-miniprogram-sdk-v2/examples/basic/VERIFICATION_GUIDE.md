# SDK 集成验证指南

## ✅ 已完成的修复

现在小程序示例已经**真正引入并使用了SDK代码**，不再是模拟版本！

### 修改内容

1. **复制SDK文件**: 将构建后的SDK复制到 `utils/avatar-sdk.js`
2. **引入SDK**: 在 `pages/index/index.js` 中使用 `require()` 引入真实SDK
3. **创建SDK实例**: 使用 `new AvatarSDK()` 创建真实的SDK实例
4. **事件监听**: 添加了完整的SDK事件监听
5. **生命周期**: 所有按钮现在都调用真实的SDK方法

## 🚀 如何验证

### 方法1: 在微信开发者工具中运行

1. **打开项目**
   ```
   微信开发者工具 -> 导入项目
   项目目录: wechat-miniprogram-sdk-v2/examples/basic
   AppID: 选择"测试号"
   ```

2. **查看控制台**
   - 打开"调试器"标签
   - 查看Console输出
   - 应该能看到SDK的初始化日志

3. **测试流程**
   - 点击"初始化"按钮
   - 观察控制台是否有SDK日志输出
   - 查看状态面板是否更新
   - 点击"启动"按钮
   - 观察Canvas是否渲染

### 方法2: 查看代码确认

打开 `pages/index/index.js`，确认：

```javascript
// 第2-4行：引入SDK
const AvatarSDKModule = require('../../../utils/avatar-sdk.js');
const AvatarSDK = AvatarSDKModule.default || AvatarSDKModule;
const { SDKState, ConnectionStatus } = AvatarSDKModule;

// 第37行：创建真实SDK实例
const sdk = new AvatarSDK({
  appId: 'demo-app-id',
  appSecret: 'demo-app-secret',
  serverUrl: 'wss://demo-server.com',
  // ...配置项
});
```

## 📋 预期行为

### 初始化时

控制台应该输出类似：
```
[17:28:04] 页面加载
[17:28:04] 设备信息: iPhone 12/13 Pro, iOS 10.0.1
[17:28:04] 页面渲染完成
[17:28:04] 提示: 点击"初始化"按钮开始
```

### 点击"初始化"后

控制台应该输出类似：
```
[17:28:56] 开始初始化SDK...
[17:28:56] SDK实例创建成功
[AvatarSDK] Initializing...
[EventBus] Event emitted: init
[StateManager] State changed: uninitialized -> initializing
[17:28:57] SDK初始化成功
[17:28:57] 状态更新: SDK=initialized, Connection=disconnected
```

### 点击"启动"后

控制台应该输出类似：
```
[17:29:00] 启动SDK...
[AvatarSDK] Starting...
[WebSocketAdapter] Connecting to: wss://demo-server.com
[17:29:01] Canvas初始化: 1170x2532
[17:29:01] Canvas绘制完成
```

## ⚠️ 可能遇到的问题

### 问题1: 找不到模块

**错误信息**: `module "utils/avatar-sdk.js" is not defined`

**解决方法**:
1. 确认 `utils/avatar-sdk.js` 文件存在
2. 检查路径是否正确（相对路径）
3. 重新编译项目

### 问题2: SDK方法不存在

**错误信息**: `sdk.init is not a function`

**原因**: SDK文件可能没有正确导出

**解决方法**:
1. 检查SDK文件是否是UMD格式
2. 确认引入方式：`const AvatarSDK = AvatarSDKModule.default || AvatarSDKModule;`

### 问题3: WebSocket连接失败

**错误信息**: `WebSocket connection failed`

**原因**: 这是**正常的**！因为我们使用的是demo服务器地址

**说明**: 
- SDK会尝试连接 `wss://demo-server.com`
- 这个地址不存在，所以会连接失败
- 但SDK的初始化、状态管理、事件系统都是正常工作的
- 要真正连接，需要替换为真实的服务器地址

### 问题4: Canvas不显示

**原因**: Canvas类型设置为2d，但没有WebGL上下文

**解决方法**:
- 当前使用2d Canvas绘制示例图形
- 如需WebGL渲染，修改 `index.wxml` 中的 `<canvas type="webgl">`

## 🔧 如何使用真实服务器

修改 `pages/index/index.js` 第38-40行：

```javascript
const sdk = new AvatarSDK({
  appId: 'YOUR_REAL_APP_ID',        // 替换为真实AppID
  appSecret: 'YOUR_REAL_APP_SECRET', // 替换为真实AppSecret
  serverUrl: 'wss://your-real-server.com', // 替换为真实服务器地址
  canvas: {
    id: 'avatar-canvas'
  }
});
```

## 📊 验证清单

- [ ] 能在微信开发者工具中打开项目
- [ ] 控制台能看到SDK日志输出
- [ ] 点击"初始化"按钮，状态变为"initialized"
- [ ] 点击"启动"按钮，Canvas显示内容
- [ ] 状态面板正确显示SDK状态
- [ ] 日志面板能显示详细日志
- [ ] 所有按钮根据状态正确启用/禁用

## 📝 验证结果反馈

如果你在验证过程中遇到任何问题，请提供：

1. **错误截图**: 包括控制台错误信息
2. **操作步骤**: 你做了什么操作导致错误
3. **环境信息**: 
   - 微信开发者工具版本
   - 基础库版本
   - 操作系统

## 🎉 成功标志

如果你看到：
- ✅ 控制台有 `[AvatarSDK]` 开头的日志
- ✅ 状态面板显示状态变化
- ✅ Canvas显示"数字人SDK v2.0 真实SDK已加载"
- ✅ 日志面板记录了所有操作

**恭喜！SDK已经成功集成并运行！** 🎊

## 下一步

1. 配置真实的服务器地址
2. 测试WebSocket连接
3. 测试数字人渲染
4. 添加更多交互功能

---

**更新时间**: 2026-02-02  
**SDK版本**: v2.0.0-alpha.1  
**Commit**: 8589549

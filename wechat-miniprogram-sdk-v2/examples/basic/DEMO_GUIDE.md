# 小程序示例运行指南

## 快速开始

### 1. 打开微信开发者工具

下载地址: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目

1. 打开微信开发者工具
2. 点击"+"号，选择"导入项目"
3. 项目目录选择: `wechat-miniprogram-sdk-v2/examples/basic`
4. AppID选择"测试号"
5. 点击"导入"

### 3. 运行效果

#### 初始状态
- SDK状态: uninitialized
- 连接状态: disconnected
- 只有"初始化"按钮可用

#### 点击"初始化"后
- SDK状态变为: initializing -> initialized
- "启动"按钮变为可用

#### 点击"启动"后
- SDK状态变为: connecting -> connected -> running
- 连接状态变为: connected
- Canvas显示渐变背景和"数字人SDK v2.0"文字
- "暂停"按钮变为可用

#### 点击"暂停"后
- SDK状态变为: paused
- "恢复"按钮变为可用

#### 点击"恢复"后
- SDK状态变为: running

#### 点击"销毁"后
- SDK状态变为: destroyed
- 连接状态变为: disconnected
- 回到初始状态

### 4. 日志功能

点击右下角"显示日志"按钮可以查看详细日志：
- 页面加载
- 设备信息
- SDK初始化过程
- 连接过程
- Canvas绘制信息
- 所有操作记录

### 5. 界面说明

```
┌─────────────────────────────────┐
│ 状态面板                         │
│ SDK状态: running                 │
│ 连接状态: connected              │
└─────────────────────────────────┘

         Canvas渲染区域
      (显示数字人内容)

┌─────────────────────────────────┐
│ 控制按钮                         │
│ [初始化] [启动] [暂停]           │
│ [恢复] [销毁]                    │
└─────────────────────────────────┘

           [显示日志] 按钮
```

## 注意事项

### 当前实现
✅ 完整的UI界面
✅ 状态管理和显示
✅ 生命周期演示
✅ Canvas初始化
✅ 日志系统
✅ 交互流程

### 待集成
⏳ 真实的SDK功能（需要服务器）
⏳ WebSocket连接（需要配置）
⏳ 数字人渲染（需要模型数据）
⏳ 音频播放（需要音频数据）

## 集成真实SDK

### 方法1: npm安装（推荐）

```bash
# 在项目根目录
npm install @xmov/avatar-miniprogram-v2

# 在微信开发者工具中
# 工具 -> 构建npm
```

### 方法2: 本地引入

```javascript
// 复制SDK文件到项目
// 在index.js中引入
const AvatarSDK = require('../../utils/avatar-sdk.js');

// 替换createMockSDK()为真实SDK
const sdk = new AvatarSDK({
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  serverUrl: 'wss://your-server.com',
  canvas: { id: 'avatar-canvas' }
});
```

## 开发建议

1. **先在模拟器测试**: 验证UI和交互流程
2. **真机调试**: 测试Canvas和WebGL性能
3. **配置服务器**: 准备好后端服务和认证信息
4. **逐步集成**: 先测试连接，再测试渲染，最后测试完整功能

## 常见问题

### Q: 模拟器无法显示Canvas？
A: 某些模拟器不支持Canvas，建议使用真机调试

### Q: 如何修改Canvas类型？
A: 在index.wxml中修改`<canvas type="2d">`为`type="webgl"`

### Q: 按钮点击无反应？
A: 检查按钮的disabled状态，只有在特定状态下按钮才可用

### Q: 如何查看详细日志？
A: 点击右下角"显示日志"按钮，或在开发者工具控制台查看

## 下一步

1. 配置真实的服务器地址和认证信息
2. 集成完整的SDK功能模块
3. 测试数字人渲染效果
4. 优化性能和用户体验
5. 添加更多交互功能

## 技术支持

- GitHub: https://github.com/zelixag/js-sdk
- Issues: https://github.com/zelixag/js-sdk/issues

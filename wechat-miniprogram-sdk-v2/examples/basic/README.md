# 微信小程序数字人SDK v2.0 基础示例

这是一个完整的微信小程序示例项目，展示了如何使用数字人SDK v2.0。

## 运行方法

### 1. 使用微信开发者工具打开

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具
3. 选择"导入项目"
4. 选择当前目录（`examples/basic`）作为项目目录
5. AppID选择"测试号"或使用自己的AppID
6. 点击"导入"

### 2. 项目结构

```
basic/
├── pages/              # 页面目录
│   └── index/         # 首页
│       ├── index.js   # 页面逻辑
│       ├── index.wxml # 页面结构
│       ├── index.wxss # 页面样式
│       └── index.json # 页面配置
├── app.js             # 小程序逻辑
├── app.json           # 小程序配置
├── app.wxss           # 小程序样式
├── project.config.json # 项目配置
└── sitemap.json       # 站点地图
```

### 3. 功能说明

#### 状态面板
显示SDK的当前状态和连接状态：
- **SDK状态**: uninitialized, initializing, initialized, connecting, connected, running, paused, destroyed, error
- **连接状态**: disconnected, connecting, connected, reconnecting, failed

#### 控制按钮
- **初始化**: 初始化SDK实例
- **启动**: 启动SDK并建立连接
- **暂停**: 暂停SDK运行
- **恢复**: 恢复SDK运行
- **销毁**: 销毁SDK实例并释放资源

#### 日志面板
- 点击右下角"显示日志"按钮可以查看详细日志
- 日志记录了SDK的所有操作和状态变化
- 最多保留50条日志记录

#### Canvas渲染区域
- 占据整个屏幕
- 使用2D Canvas渲染
- 示例中绘制了简单的图形作为演示

### 4. 当前实现说明

**注意**: 当前示例使用的是**模拟SDK**，因为：

1. SDK的完整功能模块（渲染、音频、动画等）还在开发中
2. 需要配置真实的服务器地址和认证信息
3. 小程序环境需要特殊的模块加载方式

示例展示了：
- ✅ 完整的UI界面和交互流程
- ✅ SDK的生命周期管理
- ✅ 状态管理和显示
- ✅ 日志系统
- ✅ Canvas初始化和基本绘制
- ⏳ 真实的数字人渲染（需要服务器支持）
- ⏳ WebSocket连接（需要服务器地址）
- ⏳ 音频播放（需要音频数据）

### 5. 集成真实SDK

要使用真实的SDK，需要：

#### 方法1: 通过npm安装（推荐）

```bash
# 在小程序项目根目录执行
npm install @xmov/avatar-miniprogram-v2

# 在微信开发者工具中点击: 工具 -> 构建npm
```

然后在代码中引入：

```javascript
import AvatarSDK from '@xmov/avatar-miniprogram-v2';

const sdk = new AvatarSDK({
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  serverUrl: 'wss://your-server.com',
  canvas: {
    id: 'avatar-canvas'
  }
});

await sdk.init();
await sdk.start();
```

#### 方法2: 手动复制文件

1. 将构建后的SDK文件复制到小程序项目：
   ```bash
   cp ../../dist/index.js ./utils/avatar-sdk.js
   ```

2. 在代码中引入：
   ```javascript
   const AvatarSDK = require('../../utils/avatar-sdk.js');
   ```

### 6. 配置说明

修改 `pages/index/index.js` 中的配置：

```javascript
const sdk = new AvatarSDK({
  // 必填：应用ID
  appId: 'YOUR_APP_ID',
  
  // 必填：应用密钥
  appSecret: 'YOUR_APP_SECRET',
  
  // 必填：服务器地址
  serverUrl: 'wss://your-server.com',
  
  // 必填：Canvas配置
  canvas: {
    id: 'avatar-canvas'
  },
  
  // 可选：渲染配置
  render: {
    quality: 'auto',
    fps: 30
  },
  
  // 可选：音频配置
  audio: {
    enabled: true,
    volume: 1.0
  },
  
  // 可选：网络配置
  network: {
    timeout: 30000,
    retryTimes: 3,
    autoReconnect: true
  }
});
```

### 7. 注意事项

1. **Canvas类型**: 示例使用`type="2d"`，如需WebGL渲染，改为`type="webgl"`
2. **网络权限**: 在`app.json`中配置服务器域名白名单
3. **基础库版本**: 需要微信小程序基础库 >= 2.9.0
4. **真机调试**: 建议在真机上测试，模拟器可能不支持某些功能

### 8. 常见问题

#### Q: Canvas不显示内容？
A: 检查Canvas的type是否正确，确保在onReady中初始化

#### Q: 提示"模块未找到"？
A: 确保已经构建npm，并且路径正确

#### Q: WebSocket连接失败？
A: 检查服务器地址是否正确，是否在小程序后台配置了域名白名单

#### Q: 如何调试？
A: 打开"显示日志"面板查看详细日志，或在开发者工具的控制台查看

### 9. 更多资源

- [SDK文档](../../README.md)
- [使用指南](../../USAGE.md)
- [架构设计](../../ARCHITECTURE.md)
- [GitHub仓库](https://github.com/zelixag/js-sdk)

## 联系我们

如有问题，请提交[Issue](https://github.com/zelixag/js-sdk/issues)。

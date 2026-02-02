# 微信小程序数字人 SDK v2.0

[![version](https://img.shields.io/npm/v/@xmov/avatar-miniprogram-v2.svg)](https://www.npmjs.com/package/@xmov/avatar-miniprogram-v2)
[![license](https://img.shields.io/npm/l/@xmov/avatar-miniprogram-v2.svg)](https://www.npmjs.com/package/@xmov/avatar-miniprogram-v2)

**`@xmov/avatar-miniprogram-v2`** 是一款专为微信小程序设计的全新数字人SDK。它采用了现代化、模块化和插件化的架构，旨在提供高性能、易于集成和扩展的数字人解决方案。

## ✨ 特性

- **🚀 高性能渲染**: 基于 WebGL，实现流畅、高质量的数字人渲染。
- **🧩 模块化设计**: 清晰的模块划分（核心、渲染、音频、连接等），易于维护和扩展。
- **🔌 插件化架构**: 核心功能轻量，可通过插件按需引入高级功能，有效控制包体积。
- **🔒 类型安全**: 完全使用 TypeScript 编写，提供完整的类型定义。
- **🔧 易于使用**: 简洁的 API 设计和详细的文档，降低集成成本。
- **🔄 自动重连**: 内置 WebSocket 断线自动重连和心跳机制。
- **📊 状态管理**: 统一的状态管理器，轻松追踪 SDK 生命周期。
- **📢 事件驱动**: 强大的事件系统，方便监听和响应各种状态变化。

## 📦 安装

通过 npm 或 yarn 安装：

```bash
npm install @xmov/avatar-miniprogram-v2
# 或者
yarn add @xmov/avatar-miniprogram-v2
```

安装后，在微信开发者工具中点击 **工具 -> 构建 npm**。

## 快速上手

下面是一个简单的使用示例，展示了如何初始化和启动数字人。

### 1. WXML 文件

在你的页面 `.wxml` 文件中，添加一个 `<canvas>` 组件用于渲染数字人。

```html
<!-- pages/index/index.wxml -->
<view class="container">
  <canvas
    type="webgl"
    id="avatar-canvas"
    style="width: 100vw; height: 100vh;"
  ></canvas>
</view>
```

### 2. JS 文件

在对应的 `.js` 文件中，引入并初始化 SDK。

```javascript
// pages/index/index.js
import AvatarSDK from '@xmov/avatar-miniprogram-v2';

Page({
  data: {
    sdk: null,
  },

  onReady() {
    // 1. 定义SDK配置
    const config = {
      appId: 'YOUR_APP_ID',       // 替换为你的App ID
      appSecret: 'YOUR_APP_SECRET', // 替换为你的App Secret
      serverUrl: 'wss://your-server-url.com', // 替换为你的服务器地址
      canvas: {
        id: 'avatar-canvas', // WXML中canvas组件的ID
      },
      // 事件回调
      onReady: () => {
        console.log('SDK is ready!');
        // SDK准备就绪后，可以开始播放
        this.data.sdk.start();
      },
      onError: (error) => {
        console.error('SDK Error:', error);
        wx.showToast({
          title: `SDK错误: ${error.message}`,
          icon: 'none',
        });
      },
      onStateChange: (state) => {
        console.log('SDK state changed to:', state);
      },
    };

    // 2. 创建SDK实例
    const sdk = new AvatarSDK(config);
    this.setData({ sdk });

    // 3. 初始化SDK
    sdk.init().catch(error => {
      console.error('SDK initialization failed:', error);
    });
  },

  onUnload() {
    // 4. 页面销毁时，销毁SDK实例
    if (this.data.sdk) {
      this.data.sdk.destroy();
    }
  },
});
```

## 📚 文档

- [**架构设计**](./ARCHITECTURE.md): 深入了解 SDK 的分层架构和模块设计。
- [**API参考**](./USAGE.md): (即将推出) 详细的 API 文档和配置选项。
- [**示例代码**](./examples): 查看 `examples` 目录获取更完整的使用案例。

## 🤝 贡献

我们欢迎任何形式的贡献！如果你有任何建议或问题，请随时提交 [Issues](https://github.com/zelixag/js-sdk/issues)。

## 📄 开源许可

本项目基于 [MIT](LICENSE) 许可。

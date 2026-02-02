# 使用指南

本文档详细介绍了如何使用微信小程序数字人 SDK v2.0 的各项功能。

## 目录

- [安装与配置](#安装与配置)
- [初始化SDK](#初始化sdk)
- [配置选项](#配置选项)
- [生命周期管理](#生命周期管理)
- [事件系统](#事件系统)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 安装与配置

### 安装SDK

通过 npm 安装 SDK：

```bash
npm install @xmov/avatar-miniprogram-v2
```

在微信开发者工具中，点击 **工具 -> 构建 npm** 来构建依赖。

### 小程序配置

在 `app.json` 中，确保启用了相关权限：

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "用于提供更好的数字人体验"
    }
  },
  "requiredPrivateInfos": [
    "getLocation"
  ]
}
```

## 初始化SDK

### 基础初始化

```javascript
import AvatarSDK from '@xmov/avatar-miniprogram-v2';

Page({
  data: {
    sdk: null
  },

  onReady() {
    const sdk = new AvatarSDK({
      appId: 'YOUR_APP_ID',
      appSecret: 'YOUR_APP_SECRET',
      serverUrl: 'wss://your-server.com',
      canvas: {
        id: 'avatar-canvas'
      }
    });

    this.setData({ sdk });

    sdk.init().then(() => {
      console.log('SDK initialized');
      return sdk.start();
    }).catch(error => {
      console.error('SDK error:', error);
    });
  },

  onUnload() {
    if (this.data.sdk) {
      this.data.sdk.destroy();
    }
  }
});
```

### WXML 配置

```html
<canvas
  type="webgl"
  id="avatar-canvas"
  style="width: 100vw; height: 100vh;"
></canvas>
```

## 配置选项

### 完整配置示例

```javascript
const config = {
  // 必填项
  appId: 'YOUR_APP_ID',
  appSecret: 'YOUR_APP_SECRET',
  serverUrl: 'wss://your-server.com',
  
  // Canvas配置
  canvas: {
    id: 'avatar-canvas',
    width: 375,
    height: 667,
    pixelRatio: 2,
    type: 'webgl' // 'webgl' 或 '2d'
  },
  
  // 渲染配置
  render: {
    quality: 'auto', // 'low' | 'medium' | 'high' | 'auto'
    fps: 30,
    enableOptimization: true,
    backgroundColor: '#000000',
    antialias: true
  },
  
  // 音频配置
  audio: {
    enabled: true,
    volume: 1.0,
    autoPlay: true,
    format: 'mp3' // 'mp3' | 'pcm' | 'aac'
  },
  
  // 网络配置
  network: {
    timeout: 30000,
    retryTimes: 3,
    heartbeatInterval: 30000,
    autoReconnect: true,
    reconnectDelay: 3000
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    maxSize: 50, // MB
    ttl: 3600000, // ms
    strategy: 'hybrid' // 'memory' | 'storage' | 'hybrid'
  },
  
  // 日志配置
  logger: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    upload: false,
    uploadUrl: 'https://your-log-server.com',
    console: true
  },
  
  // 事件回调
  onReady: () => {
    console.log('SDK ready');
  },
  onError: (error) => {
    console.error('SDK error:', error);
  },
  onStateChange: (state) => {
    console.log('State changed:', state);
  }
};
```

### 配置项说明

#### Canvas配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `string` | - | Canvas组件的ID（必填） |
| `width` | `number` | `375` | Canvas宽度（逻辑像素） |
| `height` | `number` | `667` | Canvas高度（逻辑像素） |
| `pixelRatio` | `number` | `2` | 像素比，影响渲染清晰度 |
| `type` | `'webgl' \| '2d'` | `'webgl'` | Canvas类型 |

#### 渲染配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `quality` | `'low' \| 'medium' \| 'high' \| 'auto'` | `'auto'` | 渲染质量 |
| `fps` | `number` | `30` | 目标帧率 |
| `enableOptimization` | `boolean` | `true` | 是否启用性能优化 |
| `backgroundColor` | `string` | `'#000000'` | 背景颜色 |
| `antialias` | `boolean` | `true` | 是否启用抗锯齿 |

#### 音频配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | `boolean` | `true` | 是否启用音频 |
| `volume` | `number` | `1.0` | 音量（0-1） |
| `autoPlay` | `boolean` | `true` | 是否自动播放 |
| `format` | `'mp3' \| 'pcm' \| 'aac'` | `'mp3'` | 音频格式 |

#### 网络配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `timeout` | `number` | `30000` | 请求超时时间（毫秒） |
| `retryTimes` | `number` | `3` | 重试次数 |
| `heartbeatInterval` | `number` | `30000` | 心跳间隔（毫秒） |
| `autoReconnect` | `boolean` | `true` | 是否自动重连 |
| `reconnectDelay` | `number` | `3000` | 重连延迟（毫秒） |

## 生命周期管理

SDK提供了完整的生命周期管理方法：

```javascript
// 初始化
await sdk.init();

// 启动
await sdk.start();

// 暂停
await sdk.pause();

// 恢复
await sdk.resume();

// 销毁
await sdk.destroy();
```

### 生命周期状态

SDK在不同阶段会处于不同的状态：

| 状态 | 说明 |
|------|------|
| `UNINITIALIZED` | 未初始化 |
| `INITIALIZING` | 初始化中 |
| `INITIALIZED` | 已初始化 |
| `CONNECTING` | 连接中 |
| `CONNECTED` | 已连接 |
| `RUNNING` | 运行中 |
| `PAUSED` | 已暂停 |
| `DISCONNECTED` | 断开连接 |
| `DESTROYED` | 已销毁 |
| `ERROR` | 错误状态 |

获取当前状态：

```javascript
const state = sdk.getState();
console.log('Current state:', state);
```

## 事件系统

SDK提供了丰富的事件系统，方便监听各种状态变化。

### 监听事件

```javascript
// 监听事件
sdk.on('ready', () => {
  console.log('SDK is ready');
});

// 监听一次
sdk.once('connected', () => {
  console.log('Connected to server');
});

// 移除监听
const handler = (error) => {
  console.error('Error:', error);
};
sdk.on('error', handler);
sdk.off('error', handler);
```

### 事件列表

#### 生命周期事件

```javascript
sdk.on('ready', () => {
  // SDK已准备就绪
});

sdk.on('destroy', () => {
  // SDK已销毁
});
```

#### 连接事件

```javascript
sdk.on('connected', () => {
  // WebSocket已连接
});

sdk.on('disconnected', () => {
  // WebSocket已断开
});

sdk.on('reconnecting', () => {
  // 正在重连
});
```

#### 渲染事件

```javascript
sdk.on('render-start', () => {
  // 渲染开始
});

sdk.on('render-end', () => {
  // 渲染结束
});

sdk.on('render-error', (error) => {
  // 渲染错误
});
```

#### 音频事件

```javascript
sdk.on('audio-start', () => {
  // 音频播放开始
});

sdk.on('audio-end', () => {
  // 音频播放结束
});

sdk.on('audio-error', (error) => {
  // 音频播放错误
});
```

#### 动画事件

```javascript
sdk.on('animation-start', (name) => {
  // 动画开始播放
  console.log('Animation started:', name);
});

sdk.on('animation-end', (name) => {
  // 动画播放结束
  console.log('Animation ended:', name);
});
```

#### 资源事件

```javascript
sdk.on('resource-loading', (progress) => {
  // 资源加载中
  console.log('Loading progress:', progress);
});

sdk.on('resource-loaded', () => {
  // 资源加载完成
});

sdk.on('resource-error', (error) => {
  // 资源加载错误
});
```

#### 状态事件

```javascript
sdk.on('state-change', (data) => {
  // 状态变更
  console.log('State changed from', data.previous, 'to', data.current);
});
```

#### 性能事件

```javascript
sdk.on('performance', (metrics) => {
  // 性能指标
  console.log('FPS:', metrics.fps);
  console.log('Memory:', metrics.memory);
  console.log('Latency:', metrics.latency);
});
```

## API参考

### AvatarSDK

#### 构造函数

```typescript
constructor(config: SDKConfig)
```

创建SDK实例。

#### 方法

##### init()

```typescript
async init(): Promise<void>
```

初始化SDK。必须在使用其他功能前调用。

**示例：**

```javascript
await sdk.init();
```

##### start()

```typescript
async start(): Promise<void>
```

启动SDK。

**示例：**

```javascript
await sdk.start();
```

##### pause()

```typescript
async pause(): Promise<void>
```

暂停SDK。

**示例：**

```javascript
await sdk.pause();
```

##### resume()

```typescript
async resume(): Promise<void>
```

恢复SDK。

**示例：**

```javascript
await sdk.resume();
```

##### destroy()

```typescript
async destroy(): Promise<void>
```

销毁SDK，释放所有资源。

**示例：**

```javascript
await sdk.destroy();
```

##### speak()

```typescript
async speak(text: string, options?: SpeakOptions): Promise<void>
```

让数字人说话。

**参数：**

- `text`: 要说的文本
- `options`: 可选配置
  - `speed`: 语速（0.5-2.0）
  - `volume`: 音量（0-1）
  - `pitch`: 音调（0.5-2.0）
  - `voice`: 语音人ID
  - `interrupt`: 是否打断当前语音

**示例：**

```javascript
await sdk.speak('你好，我是数字人', {
  speed: 1.0,
  volume: 0.8,
  interrupt: true
});
```

##### playAnimation()

```typescript
async playAnimation(name: string, options?: AnimationOptions): Promise<void>
```

播放动画。

**参数：**

- `name`: 动画名称
- `options`: 可选配置
  - `loop`: 是否循环
  - `speed`: 播放速度
  - `delay`: 延迟播放（毫秒）
  - `transition`: 过渡时间（毫秒）

**示例：**

```javascript
await sdk.playAnimation('wave', {
  loop: false,
  speed: 1.0
});
```

##### stopAnimation()

```typescript
async stopAnimation(): Promise<void>
```

停止当前动画。

**示例：**

```javascript
await sdk.stopAnimation();
```

##### getState()

```typescript
getState(): SDKState
```

获取当前SDK状态。

**返回值：** `SDKState` 枚举值

**示例：**

```javascript
const state = sdk.getState();
console.log('Current state:', state);
```

##### getStatus()

```typescript
getStatus(): ConnectionStatus
```

获取连接状态。

**返回值：** `ConnectionStatus` 枚举值

**示例：**

```javascript
const status = sdk.getStatus();
console.log('Connection status:', status);
```

##### on()

```typescript
on(event: EventType | string, handler: Function): void
```

监听事件。

**参数：**

- `event`: 事件名称
- `handler`: 事件处理函数

**示例：**

```javascript
sdk.on('ready', () => {
  console.log('SDK is ready');
});
```

##### once()

```typescript
once(event: EventType | string, handler: Function): void
```

监听一次事件。

**参数：**

- `event`: 事件名称
- `handler`: 事件处理函数

**示例：**

```javascript
sdk.once('connected', () => {
  console.log('Connected');
});
```

##### off()

```typescript
off(event: EventType | string, handler?: Function): void
```

移除事件监听。

**参数：**

- `event`: 事件名称
- `handler`: 可选的事件处理函数，不传则移除该事件的所有监听

**示例：**

```javascript
sdk.off('error', errorHandler);
```

##### use()

```typescript
use(plugin: Plugin): void
```

使用插件。

**参数：**

- `plugin`: 插件对象

**示例：**

```javascript
import AnimationPlugin from '@xmov/avatar-mp-animation';
sdk.use(AnimationPlugin);
```

## 最佳实践

### 1. 错误处理

始终使用 try-catch 或 Promise 的 catch 方法处理错误：

```javascript
try {
  await sdk.init();
  await sdk.start();
} catch (error) {
  console.error('SDK error:', error);
  wx.showToast({
    title: '初始化失败',
    icon: 'none'
  });
}
```

### 2. 资源释放

在页面卸载时，务必销毁SDK实例：

```javascript
onUnload() {
  if (this.data.sdk) {
    this.data.sdk.destroy();
  }
}
```

### 3. 性能优化

根据设备性能调整渲染质量：

```javascript
const systemInfo = wx.getSystemInfoSync();
const quality = systemInfo.benchmarkLevel > 30 ? 'high' : 'medium';

const sdk = new AvatarSDK({
  // ...其他配置
  render: {
    quality: quality
  }
});
```

### 4. 网络状态监听

监听网络状态变化，及时提示用户：

```javascript
sdk.on('disconnected', () => {
  wx.showToast({
    title: '网络连接已断开',
    icon: 'none'
  });
});

sdk.on('reconnecting', () => {
  wx.showLoading({
    title: '正在重连...'
  });
});

sdk.on('connected', () => {
  wx.hideLoading();
  wx.showToast({
    title: '连接成功',
    icon: 'success'
  });
});
```

### 5. 日志管理

在开发环境启用详细日志，生产环境关闭：

```javascript
const isDev = process.env.NODE_ENV === 'development';

const sdk = new AvatarSDK({
  // ...其他配置
  logger: {
    level: isDev ? 'debug' : 'error',
    console: isDev,
    upload: !isDev
  }
});
```

## 常见问题

### Q: Canvas不显示内容？

**A:** 检查以下几点：

1. Canvas ID是否正确
2. Canvas type是否设置为 `webgl`
3. 是否在 `onReady` 生命周期中初始化SDK
4. 检查控制台是否有错误信息

### Q: WebSocket连接失败？

**A:** 可能的原因：

1. 服务器地址不正确
2. appId 或 appSecret 错误
3. 网络权限未配置
4. 服务器未启动或不可访问

### Q: 如何调试SDK？

**A:** 启用调试日志：

```javascript
const sdk = new AvatarSDK({
  // ...其他配置
  logger: {
    level: 'debug',
    console: true
  }
});
```

### Q: 性能优化建议？

**A:** 

1. 根据设备性能调整渲染质量
2. 启用性能优化选项
3. 合理设置帧率
4. 使用缓存策略
5. 及时释放不用的资源

### Q: 如何处理小程序前后台切换？

**A:** SDK已自动处理前后台切换，会在后台时暂停，前台时恢复。如需自定义行为，可监听相关事件：

```javascript
sdk.on('state-change', (data) => {
  if (data.current === 'PAUSED') {
    // 自定义暂停逻辑
  } else if (data.current === 'RUNNING') {
    // 自定义恢复逻辑
  }
});
```

## 更多资源

- [架构设计文档](./ARCHITECTURE.md)
- [示例代码](./examples)
- [GitHub仓库](https://github.com/zelixag/js-sdk)
- [问题反馈](https://github.com/zelixag/js-sdk/issues)

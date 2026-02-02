# 微信小程序数字人SDK v2.0 - API参考文档

本文档提供了微信小程序数字人SDK v2.0的详细API参考，包括所有功能、方法、事件和配置选项。

---

## 目录

1. [快速上手](#1-快速上手)
2. [核心概念](#2-核心概念)
   - [SDK生命周期](#sdk生命周期)
   - [事件驱动](#事件驱动)
   - [插件化架构](#插件化架构)
3. [配置 (SDKConfig)](#3-配置-sdkconfig)
   - [基础配置](#基础配置)
   - [渲染配置 (RenderConfig)](#渲染配置-renderconfig)
   - [音频配置 (AudioConfig)](#音频配置-audioconfig)
   - [网络配置 (NetworkConfig)](#网络配置-networkconfig)
   - [缓存配置 (CacheConfig)](#缓存配置-cacheconfig)
   - [日志配置 (LoggerConfig)](#日志配置-loggerconfig)
4. [核心方法](#4-核心方法)
   - [构造函数 (constructor)](#构造函数-constructor)
   - [init()](#init)
   - [start()](#start)
   - [pause()](#pause)
   - [resume()](#resume)
   - [destroy()](#destroy)
5. [数字人功能](#5-数字人功能)
   - [speak()](#speak)
   - [playAnimation()](#playanimation)
   - [stopAnimation()](#stopanimation)
6. [事件系统](#6-事件系统)
   - [on()](#on)
   - [once()](#once)
   - [off()](#off)
   - [事件列表 (EventType)](#事件列表-eventtype)
7. [状态与信息获取](#7-状态与信息获取)
   - [getState()](#getstate)
   - [getStatus()](#getstatus)
   - [getConfig()](#getconfig)
   - [getSessionId()](#getsessionid)
8. [高级功能](#8-高级功能)
   - [use() (插件)](#use-插件)
   - [registerModule()](#registermodule)
   - [getModule()](#getmodule)
9. [枚举与类型](#9-枚举与类型)
   - [SDKState](#sdkstate)
   - [ConnectionStatus](#connectionstatus)
   - [ErrorCode](#errorcode)
   - [SDKError](#sdkerror)

---

## 1. 快速上手

```javascript
import AvatarSDK from "./utils/avatar-sdk.js";

// 1. 创建SDK实例
const sdk = new AvatarSDK({
  appId: "YOUR_APP_ID",
  appSecret: "YOUR_APP_SECRET",
  serverUrl: "wss://your-server.com",
  canvas: { id: "avatar-canvas" },
});

// 2. 监听事件
sdk.on("ready", () => {
  console.log("SDK is ready!");
  sdk.start();
});

sdk.on("error", (error) => {
  console.error("SDK Error:", error);
});

// 3. 初始化SDK
async function initialize() {
  try {
    await sdk.init();
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}

initialize();
```

## 2. 核心概念

### SDK生命周期

SDK遵循一个清晰的生命周期，状态由 `SDKState` 枚举表示：

`UNINITIALIZED` → `INITIALIZING` → `INITIALIZED` → `RUNNING` ↔ `PAUSED` → `DESTROYED`

- **init()**: 启动初始化流程。
- **start()**: 开始渲染和交互。
- **pause() / resume()**: 暂停和恢复渲染。
- **destroy()**: 销毁实例，释放资源。

### 事件驱动

SDK采用事件驱动模型。你可以通过 `on()`、`once()` 和 `off()` 方法监听和管理SDK的各种事件，例如 `ready`、`error`、`connected` 等。

### 插件化架构

SDK支持通过插件扩展功能。你可以使用 `use()` 方法来安装插件，例如表情插件、服装插件等。

## 3. 配置 (SDKConfig)

在创建SDK实例时，你需要传入一个配置对象。

### 基础配置

| 属性 | 类型 | 必需 | 描述 |
| :--- | :--- | :--- | :--- |
| `appId` | `string` | 是 | 你的应用ID |
| `appSecret` | `string` | 是 | 你的应用密钥 |
| `serverUrl` | `string` | 是 | 数字人服务器的WebSocket地址 |
| `canvas` | `CanvasConfig` | 是 | Canvas配置对象 |
| `onReady` | `() => void` | 否 | SDK初始化成功时的回调 |
| `onError` | `(error: SDKError) => void` | 否 | 发生错误时的回调 |
| `onStateChange` | `(state: SDKState) => void` | 否 | SDK状态变化时的回调 |

### 渲染配置 (RenderConfig)

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `quality` | `string` | `auto` | 渲染质量 (`low`, `medium`, `high`, `auto`) |
| `fps` | `number` | `30` | 目标帧率 |
| `enableOptimization` | `boolean` | `true` | 是否启用性能优化 |
| `backgroundColor` | `string` | `#000000` | 画布背景颜色 |
| `antialias` | `boolean` | `true` | 是否开启抗锯齿 |

### 音频配置 (AudioConfig)

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 是否启用音频 |
| `volume` | `number` | `1.0` | 音量 (0-1) |
| `autoPlay` | `boolean` | `true` | 是否自动播放音频 |
| `format` | `string` | `mp3` | 音频格式 (`mp3`, `pcm`, `aac`) |

### 网络配置 (NetworkConfig)

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `timeout` | `number` | `30000` | 请求超时时间 (ms) |
| `retryTimes` | `number` | `3` | 失败重试次数 |
| `heartbeatInterval` | `number` | `30000` | 心跳间隔 (ms) |
| `autoReconnect` | `boolean` | `true` | 是否自动重连 |
| `reconnectDelay` | `number` | `3000` | 重连延迟 (ms) |

### 缓存配置 (CacheConfig)

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 是否启用资源缓存 |
| `maxSize` | `number` | `50` | 最大缓存大小 (MB) |
| `ttl` | `number` | `3600000` | 缓存过期时间 (ms) |
| `strategy` | `string` | `hybrid` | 缓存策略 (`memory`, `storage`, `hybrid`) |

### 日志配置 (LoggerConfig)

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `level` | `string` | `info` | 日志级别 (`debug`, `info`, `warn`, `error`) |
| `upload` | `boolean` | `false` | 是否上报日志 |
| `uploadUrl` | `string` | `undefined` | 日志上报地址 |
| `console` | `boolean` | `true` | 是否在控制台输出日志 |

---

## 4. 核心方法

### 构造函数 (constructor)

创建一个新的SDK实例。

```javascript
new AvatarSDK(config: SDKConfig)
```

- **参数**: `config` - SDK配置对象。
- **返回**: `AvatarSDK` 实例。

### init()

初始化SDK，包括获取Canvas、连接WebSocket、发送初始化消息等。

```javascript
async init(): Promise<void>
```

- **返回**: `Promise<void>` - 初始化成功时resolve，失败时reject。

### start()

启动SDK，开始渲染和交互。

```javascript
async start(): Promise<void>
```

### pause()

暂停SDK的渲染和交互。

```javascript
async pause(): Promise<void>
```

### resume()

恢复SDK的渲染和交互。

```javascript
async resume(): Promise<void>
```

### destroy()

销毁SDK实例，释放所有资源。

```javascript
async destroy(): Promise<void>
```

---

## 5. 数字人功能

### speak()

让数字人播报指定的文本。

```javascript
async speak(text: string, options?: SpeakOptions): Promise<void>
```

- **参数**:
  - `text`: 要播报的文本。
  - `options`: 播报选项 (见下表)。

**SpeakOptions**

| 属性 | 类型 | 描述 |
| :--- | :--- | :--- |
| `speed` | `number` | 语速 |
| `volume` | `number` | 音量 |
| `pitch` | `number` | 音调 |
| `voice` | `string` | 语音人名称 |
| `interrupt` | `boolean` | 是否打断当前播报 |

### playAnimation()

播放指定的动画。

```javascript
async playAnimation(name: string, options?: AnimationOptions): Promise<void>
```

- **参数**:
  - `name`: 动画名称。
  - `options`: 动画选项 (见下表)。

**AnimationOptions**

| 属性 | 类型 | 描述 |
| :--- | :--- | :--- |
| `loop` | `boolean` | 是否循环播放 |
| `speed` | `number` | 播放速度 |
| `delay` | `number` | 延迟播放 (ms) |
| `transition` | `number` | 过渡时间 (ms) |

### stopAnimation()

停止当前正在播放的动画。

```javascript
async stopAnimation(): Promise<void>
```

---

## 6. 事件系统

### on()

监听一个事件。

```javascript
on(event: EventType | string, handler: (...args: any[]) => void): void
```

### once()

只监听一次事件。

```javascript
once(event: EventType | string, handler: (...args: any[]) => void): void
```

### off()

移除事件监听。

```javascript
off(event: EventType | string, handler?: (...args: any[]) => void): void
```

### 事件列表 (EventType)

| 事件 | 描述 |
| :--- | :--- |
| `READY` | SDK初始化成功 |
| `DESTROY` | SDK已销毁 |
| `CONNECTED` | WebSocket连接成功 |
| `DISCONNECTED` | WebSocket连接断开 |
| `RECONNECTING` | WebSocket正在重连 |
| `RENDER_START` | 渲染开始 |
| `RENDER_END` | 渲染结束 |
| `AUDIO_START` | 音频播放开始 |
| `AUDIO_END` | 音频播放结束 |
| `ANIMATION_START` | 动画播放开始 |
| `ANIMATION_END` | 动画播放结束 |
| `STATE_CHANGE` | SDK状态变化 |
| `ERROR` | 发生错误 |

---

## 7. 状态与信息获取

### getState()

获取当前SDK的状态。

```javascript
getState(): SDKState
```

- **返回**: `SDKState` - 当前的SDK状态。

### getStatus()

获取当前WebSocket的连接状态。

```javascript
getStatus(): ConnectionStatus
```

- **返回**: `ConnectionStatus` - 当前的连接状态。

### getConfig()

获取当前的SDK配置。

```javascript
getConfig(): SDKConfig
```

### getSessionId()

获取当前会话的ID。

```javascript
getSessionId(): string
```

---

## 8. 高级功能

### use() (插件)

安装一个插件。

```javascript
use(plugin: Plugin): void
```

### registerModule()

注册一个自定义模块。

```javascript
registerModule(name: string, module: any): void
```

### getModule()

获取一个已注册的模块。

```javascript
getModule<T = any>(name: string): T | undefined
```

---

## 9. 枚举与类型

### SDKState

| 值 | 描述 |
| :--- | :--- |
| `UNINITIALIZED` | 未初始化 |
| `INITIALIZING` | 初始化中 |
| `INITIALIZED` | 已初始化 |
| `CONNECTING` | 连接中 |
| `CONNECTED` | 已连接 |
| `RUNNING` | 运行中 |
| `PAUSED` | 已暂停 |
| `DISCONNECTED` | 断开连接 |
| `DESTROYED` | 已销毁 |
| `ERROR` | 错误 |

### ConnectionStatus

| 值 | 描述 |
| :--- | :--- |
| `DISCONNECTED` | 断开 |
| `CONNECTING` | 连接中 |
| `CONNECTED` | 已连接 |
| `RECONNECTING` | 重连中 |
| `FAILED` | 连接失败 |

### ErrorCode

SDK可能抛出的错误码，分为不同类别：

- **1xxx**: 初始化错误
- **2xxx**: 连接错误
- **3xxx**: 渲染错误
- **4xxx**: 音频错误
- **5xxx**: 资源错误
- **6xxx**: 网络错误
- **7xxx**: 业务错误
- **9999**: 未知错误

### SDKError

SDK抛出的错误对象，包含以下属性：

- `code`: `ErrorCode` - 错误码
- `message`: `string` - 错误信息
- `details`: `any` - 原始错误对象
- `timestamp`: `number` - 错误时间戳

/**
 * 微信小程序数字人SDK v2.0
 * 全新架构 - 模块化、插件化、高性能
 */

// 核心模块
export { AvatarSDK } from './core/AvatarSDK';
export { EventBus } from './core/EventBus';
export { StateManager } from './core/StateManager';
export { LifecycleManager } from './core/LifecycleManager';

// 适配器
export { CanvasAdapter } from './adapters/CanvasAdapter';
export { WebSocketAdapter } from './adapters/WebSocketAdapter';

// 工具
export { Logger, logger } from './utils/Logger';

// 类型定义
export * from './types';

// 默认导出
export { AvatarSDK as default } from './core/AvatarSDK';

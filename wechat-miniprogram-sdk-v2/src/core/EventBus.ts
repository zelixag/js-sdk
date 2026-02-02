import EventEmitter from 'eventemitter3';
import { EventType } from '@/types';

/**
 * 事件总线
 * 提供全局事件分发和模块间通信
 */
export class EventBus {
  private emitter: EventEmitter;
  private eventHistory: Map<string, any[]>;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.emitter = new EventEmitter();
    this.eventHistory = new Map();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 监听事件
   */
  on(event: EventType | string, handler: (...args: any[]) => void, context?: any): void {
    this.emitter.on(event, handler, context);
  }

  /**
   * 监听一次事件
   */
  once(event: EventType | string, handler: (...args: any[]) => void, context?: any): void {
    this.emitter.once(event, handler, context);
  }

  /**
   * 移除事件监听
   */
  off(event: EventType | string, handler?: (...args: any[]) => void, context?: any): void {
    if (handler) {
      this.emitter.off(event, handler, context);
    } else {
      this.emitter.removeAllListeners(event);
    }
  }

  /**
   * 触发事件
   */
  emit(event: EventType | string, ...args: any[]): void {
    // 记录事件历史
    this.recordEvent(event, args);
    
    // 触发事件
    this.emitter.emit(event, ...args);
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: EventType | string): number {
    return this.emitter.listenerCount(event);
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): Array<EventType | string> {
    return this.emitter.eventNames() as Array<EventType | string>;
  }

  /**
   * 移除所有事件监听
   */
  removeAllListeners(event?: EventType | string): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * 记录事件历史
   */
  private recordEvent(event: string, args: any[]): void {
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }

    const history = this.eventHistory.get(event)!;
    history.push({
      timestamp: Date.now(),
      args,
    });

    // 限制历史记录大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * 获取事件历史
   */
  getEventHistory(event: string): any[] {
    return this.eventHistory.get(event) || [];
  }

  /**
   * 清空事件历史
   */
  clearEventHistory(event?: string): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }

  /**
   * 销毁事件总线
   */
  destroy(): void {
    this.removeAllListeners();
    this.eventHistory.clear();
  }
}

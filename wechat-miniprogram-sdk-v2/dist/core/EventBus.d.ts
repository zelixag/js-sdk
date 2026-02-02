import { EventType } from '@/types';
/**
 * 事件总线
 * 提供全局事件分发和模块间通信
 */
export declare class EventBus {
    private emitter;
    private eventHistory;
    private maxHistorySize;
    constructor(maxHistorySize?: number);
    /**
     * 监听事件
     */
    on(event: EventType | string, handler: (...args: any[]) => void, context?: any): void;
    /**
     * 监听一次事件
     */
    once(event: EventType | string, handler: (...args: any[]) => void, context?: any): void;
    /**
     * 移除事件监听
     */
    off(event: EventType | string, handler?: (...args: any[]) => void, context?: any): void;
    /**
     * 触发事件
     */
    emit(event: EventType | string, ...args: any[]): void;
    /**
     * 获取事件监听器数量
     */
    listenerCount(event: EventType | string): number;
    /**
     * 获取所有事件名称
     */
    eventNames(): Array<EventType | string>;
    /**
     * 移除所有事件监听
     */
    removeAllListeners(event?: EventType | string): void;
    /**
     * 记录事件历史
     */
    private recordEvent;
    /**
     * 获取事件历史
     */
    getEventHistory(event: string): any[];
    /**
     * 清空事件历史
     */
    clearEventHistory(event?: string): void;
    /**
     * 销毁事件总线
     */
    destroy(): void;
}
//# sourceMappingURL=EventBus.d.ts.map
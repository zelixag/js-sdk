import { EventBus } from './EventBus';
import { StateManager } from './StateManager';
/**
 * 生命周期钩子
 */
interface LifecycleHooks {
    onInit?: () => Promise<void>;
    onStart?: () => Promise<void>;
    onPause?: () => Promise<void>;
    onResume?: () => Promise<void>;
    onDestroy?: () => Promise<void>;
}
/**
 * 生命周期管理器
 * 管理SDK的初始化、启动、暂停、恢复、销毁流程
 */
export declare class LifecycleManager {
    private eventBus;
    private stateManager;
    private hooks;
    private isPageVisible;
    constructor(eventBus: EventBus, stateManager: StateManager);
    /**
     * 注册模块的生命周期钩子
     */
    registerHooks(moduleName: string, hooks: LifecycleHooks): void;
    /**
     * 注销模块的生命周期钩子
     */
    unregisterHooks(moduleName: string): void;
    /**
     * 初始化
     */
    init(): Promise<void>;
    /**
     * 启动
     */
    start(): Promise<void>;
    /**
     * 暂停
     */
    pause(): Promise<void>;
    /**
     * 恢复
     */
    resume(): Promise<void>;
    /**
     * 销毁
     */
    destroy(): Promise<void>;
    /**
     * 执行生命周期阶段
     */
    private executePhase;
    /**
     * 设置小程序生命周期监听
     */
    private setupMiniProgramLifecycle;
    /**
     * 获取页面可见性
     */
    getPageVisibility(): boolean;
}
export {};
//# sourceMappingURL=LifecycleManager.d.ts.map
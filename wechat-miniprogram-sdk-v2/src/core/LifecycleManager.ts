import { SDKState, SDKError, ErrorCode } from '@/types';
import { EventBus } from './EventBus';
import { StateManager } from './StateManager';

/**
 * 生命周期阶段
 */
enum LifecyclePhase {
  INIT = 'init',
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  DESTROY = 'destroy',
}

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
export class LifecycleManager {
  private eventBus: EventBus;
  private stateManager: StateManager;
  private hooks: Map<string, LifecycleHooks>;
  private isPageVisible: boolean;

  constructor(eventBus: EventBus, stateManager: StateManager) {
    this.eventBus = eventBus;
    this.stateManager = stateManager;
    this.hooks = new Map();
    this.isPageVisible = true;

    // 监听小程序生命周期
    this.setupMiniProgramLifecycle();
  }

  /**
   * 注册模块的生命周期钩子
   */
  registerHooks(moduleName: string, hooks: LifecycleHooks): void {
    this.hooks.set(moduleName, hooks);
    console.log(`[LifecycleManager] Registered hooks for module: ${moduleName}`);
  }

  /**
   * 注销模块的生命周期钩子
   */
  unregisterHooks(moduleName: string): void {
    this.hooks.delete(moduleName);
    console.log(`[LifecycleManager] Unregistered hooks for module: ${moduleName}`);
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.stateManager.isInitialized()) {
      throw new SDKError(ErrorCode.INIT_FAILED, 'SDK already initialized');
    }

    console.log('[LifecycleManager] Initializing...');
    this.stateManager.setState(SDKState.INITIALIZING);

    try {
      await this.executePhase(LifecyclePhase.INIT);
      this.stateManager.setState(SDKState.INITIALIZED);
      console.log('[LifecycleManager] Initialization completed');
    } catch (error) {
      this.stateManager.setState(SDKState.ERROR);
      throw new SDKError(
        ErrorCode.INIT_FAILED,
        'Initialization failed',
        error
      );
    }
  }

  /**
   * 启动
   */
  async start(): Promise<void> {
    if (!this.stateManager.isInitialized()) {
      throw new SDKError(ErrorCode.INIT_FAILED, 'SDK not initialized');
    }

    if (this.stateManager.isRunning()) {
      console.warn('[LifecycleManager] SDK already running');
      return;
    }

    console.log('[LifecycleManager] Starting...');

    try {
      await this.executePhase(LifecyclePhase.START);
      this.stateManager.setState(SDKState.RUNNING);
      console.log('[LifecycleManager] Started successfully');
    } catch (error) {
      this.stateManager.setState(SDKState.ERROR);
      throw new SDKError(
        ErrorCode.INIT_FAILED,
        'Start failed',
        error
      );
    }
  }

  /**
   * 暂停
   */
  async pause(): Promise<void> {
    if (!this.stateManager.isRunning()) {
      console.warn('[LifecycleManager] SDK not running');
      return;
    }

    console.log('[LifecycleManager] Pausing...');

    try {
      await this.executePhase(LifecyclePhase.PAUSE);
      this.stateManager.setState(SDKState.PAUSED);
      console.log('[LifecycleManager] Paused successfully');
    } catch (error) {
      console.error('[LifecycleManager] Pause failed:', error);
    }
  }

  /**
   * 恢复
   */
  async resume(): Promise<void> {
    if (this.stateManager.getState() !== SDKState.PAUSED) {
      console.warn('[LifecycleManager] SDK not paused');
      return;
    }

    console.log('[LifecycleManager] Resuming...');

    try {
      await this.executePhase(LifecyclePhase.RESUME);
      this.stateManager.setState(SDKState.RUNNING);
      console.log('[LifecycleManager] Resumed successfully');
    } catch (error) {
      console.error('[LifecycleManager] Resume failed:', error);
    }
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    if (this.stateManager.isDestroyed()) {
      console.warn('[LifecycleManager] SDK already destroyed');
      return;
    }

    console.log('[LifecycleManager] Destroying...');

    try {
      await this.executePhase(LifecyclePhase.DESTROY);
      this.stateManager.destroy();
      this.hooks.clear();
      console.log('[LifecycleManager] Destroyed successfully');
    } catch (error) {
      console.error('[LifecycleManager] Destroy failed:', error);
    }
  }

  /**
   * 执行生命周期阶段
   */
  private async executePhase(phase: LifecyclePhase): Promise<void> {
    const hookName = `on${phase.charAt(0).toUpperCase() + phase.slice(1)}` as keyof LifecycleHooks;
    
    const promises: Promise<void>[] = [];

    for (const [moduleName, hooks] of this.hooks) {
      const hook = hooks[hookName];
      if (hook) {
        console.log(`[LifecycleManager] Executing ${hookName} for ${moduleName}`);
        promises.push(
          hook().catch((error) => {
            console.error(`[LifecycleManager] ${hookName} failed for ${moduleName}:`, error);
            throw error;
          })
        );
      }
    }

    await Promise.all(promises);
  }

  /**
   * 设置小程序生命周期监听
   */
  private setupMiniProgramLifecycle(): void {
    // 监听页面显示
    if (typeof wx !== 'undefined') {
      wx.onAppShow?.(() => {
        console.log('[LifecycleManager] App show');
        this.isPageVisible = true;
        if (this.stateManager.getState() === SDKState.PAUSED) {
          this.resume().catch((error) => {
            console.error('[LifecycleManager] Auto resume failed:', error);
          });
        }
      });

      // 监听页面隐藏
      wx.onAppHide?.(() => {
        console.log('[LifecycleManager] App hide');
        this.isPageVisible = false;
        if (this.stateManager.isRunning()) {
          this.pause().catch((error) => {
            console.error('[LifecycleManager] Auto pause failed:', error);
          });
        }
      });
    }
  }

  /**
   * 获取页面可见性
   */
  getPageVisibility(): boolean {
    return this.isPageVisible;
  }
}

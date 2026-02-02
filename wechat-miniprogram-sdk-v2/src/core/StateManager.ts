import { SDKState, ConnectionStatus, EventType } from '@/types';
import { EventBus } from './EventBus';

/**
 * 状态管理器
 * 集中管理SDK状态和连接状态
 */
export class StateManager {
  private eventBus: EventBus;
  private sdkState: SDKState;
  private connectionStatus: ConnectionStatus;
  private stateHistory: Array<{ state: SDKState; timestamp: number }>;
  private maxHistorySize: number;

  constructor(eventBus: EventBus, maxHistorySize: number = 50) {
    this.eventBus = eventBus;
    this.sdkState = SDKState.UNINITIALIZED;
    this.connectionStatus = ConnectionStatus.DISCONNECTED;
    this.stateHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 获取当前SDK状态
   */
  getState(): SDKState {
    return this.sdkState;
  }

  /**
   * 设置SDK状态
   */
  setState(state: SDKState): void {
    if (this.sdkState === state) {
      return;
    }

    const previousState = this.sdkState;
    this.sdkState = state;

    // 记录状态历史
    this.recordStateHistory(state);

    // 触发状态变更事件
    this.eventBus.emit(EventType.STATE_CHANGE, {
      previous: previousState,
      current: state,
      timestamp: Date.now(),
    });

    console.log(`[StateManager] State changed: ${previousState} -> ${state}`);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 设置连接状态
   */
  setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) {
      return;
    }

    const previousStatus = this.connectionStatus;
    this.connectionStatus = status;

    console.log(`[StateManager] Connection status changed: ${previousStatus} -> ${status}`);

    // 根据连接状态触发相应事件
    switch (status) {
      case ConnectionStatus.CONNECTED:
        this.eventBus.emit(EventType.CONNECTED);
        break;
      case ConnectionStatus.DISCONNECTED:
        this.eventBus.emit(EventType.DISCONNECTED);
        break;
      case ConnectionStatus.RECONNECTING:
        this.eventBus.emit(EventType.RECONNECTING);
        break;
    }
  }

  /**
   * 检查是否可以执行操作
   */
  canOperate(): boolean {
    return (
      this.sdkState === SDKState.RUNNING ||
      this.sdkState === SDKState.PAUSED ||
      this.sdkState === SDKState.CONNECTED
    );
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.sdkState !== SDKState.UNINITIALIZED;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connectionStatus === ConnectionStatus.CONNECTED;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.sdkState === SDKState.RUNNING;
  }

  /**
   * 检查是否已销毁
   */
  isDestroyed(): boolean {
    return this.sdkState === SDKState.DESTROYED;
  }

  /**
   * 记录状态历史
   */
  private recordStateHistory(state: SDKState): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now(),
    });

    // 限制历史记录大小
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * 获取状态历史
   */
  getStateHistory(): Array<{ state: SDKState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * 获取状态持续时间
   */
  getStateDuration(): number {
    if (this.stateHistory.length === 0) {
      return 0;
    }

    const lastStateChange = this.stateHistory[this.stateHistory.length - 1];
    return Date.now() - lastStateChange.timestamp;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.sdkState = SDKState.UNINITIALIZED;
    this.connectionStatus = ConnectionStatus.DISCONNECTED;
    this.stateHistory = [];
  }

  /**
   * 销毁状态管理器
   */
  destroy(): void {
    this.setState(SDKState.DESTROYED);
    this.stateHistory = [];
  }
}

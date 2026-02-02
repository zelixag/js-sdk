import { SDKState, ConnectionStatus } from '@/types';
import { EventBus } from './EventBus';
/**
 * 状态管理器
 * 集中管理SDK状态和连接状态
 */
export declare class StateManager {
    private eventBus;
    private sdkState;
    private connectionStatus;
    private stateHistory;
    private maxHistorySize;
    constructor(eventBus: EventBus, maxHistorySize?: number);
    /**
     * 获取当前SDK状态
     */
    getState(): SDKState;
    /**
     * 设置SDK状态
     */
    setState(state: SDKState): void;
    /**
     * 获取连接状态
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * 设置连接状态
     */
    setConnectionStatus(status: ConnectionStatus): void;
    /**
     * 检查是否可以执行操作
     */
    canOperate(): boolean;
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean;
    /**
     * 检查是否已连接
     */
    isConnected(): boolean;
    /**
     * 检查是否正在运行
     */
    isRunning(): boolean;
    /**
     * 检查是否已销毁
     */
    isDestroyed(): boolean;
    /**
     * 记录状态历史
     */
    private recordStateHistory;
    /**
     * 获取状态历史
     */
    getStateHistory(): Array<{
        state: SDKState;
        timestamp: number;
    }>;
    /**
     * 获取状态持续时间
     */
    getStateDuration(): number;
    /**
     * 重置状态
     */
    reset(): void;
    /**
     * 销毁状态管理器
     */
    destroy(): void;
}
//# sourceMappingURL=StateManager.d.ts.map
/**
 * 资源管理器
 * 负责加载和管理数字人所需的各种资源
 */
import { EventBus } from '../core/EventBus';
import { Logger } from '../utils/Logger';
export interface ResourceItem {
    url: string;
    type: 'model' | 'texture' | 'audio' | 'animation' | 'data' | 'other';
    loaded: boolean;
    size?: number;
    data?: any;
    error?: string;
}
export interface ResourceLoadOptions {
    timeout?: number;
    retryTimes?: number;
    onProgress?: (progress: number) => void;
}
export declare class ResourceManager {
    private resources;
    private loadQueue;
    private eventBus;
    private logger;
    private isLoading;
    constructor(eventBus: EventBus, logger: Logger);
    /**
     * 添加资源到管理器
     */
    addResource(url: string, type: ResourceItem['type']): void;
    /**
     * 预加载资源列表
     */
    preloadResources(urls: string[], options?: ResourceLoadOptions): Promise<void>;
    /**
     * 加载单个资源
     */
    private loadResource;
    /**
     * 实际获取资源
     */
    private fetchResource;
    /**
     * 检测资源类型
     */
    private detectResourceType;
    /**
     * 获取资源
     */
    getResource(url: string): ResourceItem | undefined;
    /**
     * 检查资源是否已加载
     */
    isResourceLoaded(url: string): boolean;
    /**
     * 获取所有资源
     */
    getAllResources(): ResourceItem[];
    /**
     * 获取已加载的资源数量
     */
    getLoadedCount(): number;
    /**
     * 获取总资源数量
     */
    getTotalCount(): number;
    /**
     * 清空所有资源
     */
    clear(): void;
    /**
     * 销毁资源管理器
     */
    destroy(): void;
}
//# sourceMappingURL=ResourceManager.d.ts.map
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

export class ResourceManager {
  private resources: Map<string, ResourceItem> = new Map();
  private loadQueue: string[] = [];
  private eventBus: EventBus;
  private logger: Logger;
  private isLoading: boolean = false;

  constructor(eventBus: EventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * 添加资源到管理器
   */
  addResource(url: string, type: ResourceItem['type']): void {
    if (!this.resources.has(url)) {
      this.resources.set(url, {
        url,
        type,
        loaded: false
      });
      this.logger.debug(`[ResourceManager] Added resource: ${url} (${type})`);
    }
  }

  /**
   * 预加载资源列表
   */
  async preloadResources(
    urls: string[],
    options: ResourceLoadOptions = {}
  ): Promise<void> {
    this.logger.info(`[ResourceManager] Preloading ${urls.length} resources...`);
    
    const totalResources = urls.length;
    let loadedCount = 0;

    for (const url of urls) {
      try {
        await this.loadResource(url, options);
        loadedCount++;
        
        const progress = Math.floor((loadedCount / totalResources) * 100);
        if (options.onProgress) {
          options.onProgress(progress);
        }
        
        this.eventBus.emit('resource:progress', { loaded: loadedCount, total: totalResources, progress });
      } catch (error) {
        this.logger.error(`[ResourceManager] Failed to load resource: ${url}`, error);
        // 继续加载其他资源
      }
    }

    this.logger.info(`[ResourceManager] Preload complete: ${loadedCount}/${totalResources} resources loaded`);
  }

  /**
   * 加载单个资源
   */
  private async loadResource(
    url: string,
    options: ResourceLoadOptions = {}
  ): Promise<ResourceItem> {
    const { timeout = 30000, retryTimes = 3 } = options;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retryTimes; attempt++) {
      try {
        this.logger.debug(`[ResourceManager] Loading resource: ${url} (attempt ${attempt + 1}/${retryTimes})`);
        
        const resource = await this.fetchResource(url, timeout);
        
        // 更新资源状态
        this.resources.set(url, {
          ...resource,
          loaded: true
        });
        
        this.eventBus.emit('resource:loaded', resource);
        this.logger.info(`[ResourceManager] Resource loaded: ${url}`);
        
        return resource;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`[ResourceManager] Load attempt ${attempt + 1} failed for ${url}: ${lastError.message}`);
        
        if (attempt < retryTimes - 1) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // 所有重试都失败
    const failedResource: ResourceItem = {
      url,
      type: 'other',
      loaded: false,
      error: lastError?.message || 'Unknown error'
    };
    
    this.resources.set(url, failedResource);
    this.eventBus.emit('resource:error', failedResource);
    
    throw new Error(`Failed to load resource after ${retryTimes} attempts: ${url}`);
  }

  /**
   * 实际获取资源
   */
  private async fetchResource(url: string, timeout: number): Promise<ResourceItem> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Resource load timeout'));
      }, timeout);

      wx.request({
        url,
        method: 'GET',
        timeout,
        success: (res) => {
          clearTimeout(timer);
          
          if (res.statusCode === 200) {
            const resource: ResourceItem = {
              url,
              type: this.detectResourceType(url, res.data),
              loaded: true,
              size: JSON.stringify(res.data).length,
              data: res.data
            };
            resolve(resource);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`));
          }
        },
        fail: (error) => {
          clearTimeout(timer);
          reject(new Error(error.errMsg || 'Request failed'));
        }
      });
    });
  }

  /**
   * 检测资源类型
   */
  private detectResourceType(url: string, data: any): ResourceItem['type'] {
    const ext = url.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'gltf':
      case 'glb':
      case 'obj':
      case 'fbx':
        return 'model';
      
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return 'texture';
      
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
      
      case 'json':
        return 'data';
      
      case 'anim':
        return 'animation';
      
      default:
        return 'other';
    }
  }

  /**
   * 获取资源
   */
  getResource(url: string): ResourceItem | undefined {
    return this.resources.get(url);
  }

  /**
   * 检查资源是否已加载
   */
  isResourceLoaded(url: string): boolean {
    const resource = this.resources.get(url);
    return resource?.loaded || false;
  }

  /**
   * 获取所有资源
   */
  getAllResources(): ResourceItem[] {
    return Array.from(this.resources.values());
  }

  /**
   * 获取已加载的资源数量
   */
  getLoadedCount(): number {
    return Array.from(this.resources.values()).filter(r => r.loaded).length;
  }

  /**
   * 获取总资源数量
   */
  getTotalCount(): number {
    return this.resources.size;
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    this.resources.clear();
    this.loadQueue = [];
    this.isLoading = false;
    this.logger.info('[ResourceManager] All resources cleared');
  }

  /**
   * 销毁资源管理器
   */
  destroy(): void {
    this.clear();
    this.logger.info('[ResourceManager] Resource manager destroyed');
  }
}

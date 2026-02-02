import { LogLevel, LoggerConfig } from '@/types';

/**
 * 日志记录
 */
interface LogRecord {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  stack?: string;
}

/**
 * 日志工具类
 * 提供分级日志记录和日志上报功能
 */
export class Logger {
  private config: LoggerConfig;
  private logs: LogRecord[] = [];
  private maxLogs: number = 1000;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: 'info',
      upload: false,
      console: true,
      ...config,
    };
  }

  /**
   * Debug日志
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Info日志
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Warn日志
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Error日志
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (this.levelPriority[level] < this.levelPriority[this.config.level!]) {
      return;
    }

    const record: LogRecord = {
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    // 如果是错误，记录堆栈
    if (level === 'error' && data instanceof Error) {
      record.stack = data.stack;
    }

    // 存储日志
    this.logs.push(record);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 控制台输出
    if (this.config.console) {
      this.consoleLog(record);
    }

    // 上报日志
    if (this.config.upload && level === 'error') {
      this.uploadLog(record);
    }
  }

  /**
   * 控制台输出
   */
  private consoleLog(record: LogRecord): void {
    const prefix = `[${this.formatTime(record.timestamp)}] [${record.level.toUpperCase()}]`;
    const message = `${prefix} ${record.message}`;

    switch (record.level) {
      case 'debug':
        console.debug(message, record.data || '');
        break;
      case 'info':
        console.log(message, record.data || '');
        break;
      case 'warn':
        console.warn(message, record.data || '');
        break;
      case 'error':
        console.error(message, record.data || '');
        if (record.stack) {
          console.error(record.stack);
        }
        break;
    }
  }

  /**
   * 上报日志
   */
  private uploadLog(record: LogRecord): void {
    if (!this.config.uploadUrl) {
      return;
    }

    // 异步上报，不阻塞主流程
    wx.request({
      url: this.config.uploadUrl,
      method: 'POST',
      data: record,
      fail: (error) => {
        console.error('[Logger] Failed to upload log:', error);
      },
    });
  }

  /**
   * 获取所有日志
   */
  getLogs(level?: LogLevel): LogRecord[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 格式化时间
   */
  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 设置是否上报
   */
  setUpload(upload: boolean): void {
    this.config.upload = upload;
  }

  /**
   * 设置上报地址
   */
  setUploadUrl(url: string): void {
    this.config.uploadUrl = url;
  }
}

// 创建全局Logger实例
export const logger = new Logger();

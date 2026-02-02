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
export declare class Logger {
    private config;
    private logs;
    private maxLogs;
    private levelPriority;
    constructor(config?: LoggerConfig);
    /**
     * Debug日志
     */
    debug(message: string, data?: any): void;
    /**
     * Info日志
     */
    info(message: string, data?: any): void;
    /**
     * Warn日志
     */
    warn(message: string, data?: any): void;
    /**
     * Error日志
     */
    error(message: string, data?: any): void;
    /**
     * 记录日志
     */
    private log;
    /**
     * 控制台输出
     */
    private consoleLog;
    /**
     * 上报日志
     */
    private uploadLog;
    /**
     * 获取所有日志
     */
    getLogs(level?: LogLevel): LogRecord[];
    /**
     * 清空日志
     */
    clearLogs(): void;
    /**
     * 导出日志
     */
    exportLogs(): string;
    /**
     * 格式化时间
     */
    private formatTime;
    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void;
    /**
     * 设置是否上报
     */
    setUpload(upload: boolean): void;
    /**
     * 设置上报地址
     */
    setUploadUrl(url: string): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=Logger.d.ts.map
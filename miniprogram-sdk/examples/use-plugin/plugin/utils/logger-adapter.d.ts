/**
 * 日志适配器 - 统一浏览器和小程序的日志输出
 */
export declare function setLoggingEnabled(enabled: boolean): void;
declare const logger: {
    setEnabled: typeof setLoggingEnabled;
    log: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};
export default logger;

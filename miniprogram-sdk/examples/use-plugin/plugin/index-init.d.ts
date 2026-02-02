/**
 * SDK 初始化脚本
 * 在导入 SDK 之前运行，设置适配层
 *
 * 重要：这个文件必须在导入原 SDK 模块之前执行
 */
import './utils/logger-adapter';
import './utils/api-polyfill';
import './utils/module-polyfill';
export { isMiniProgram, getPlatform } from './utils/env';

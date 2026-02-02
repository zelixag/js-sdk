/**
 * 导入路径映射工具
 * 用于将原 SDK 的导入路径替换为适配层路径
 */
/**
 * 需要替换的导入路径映射
 */
export declare const IMPORT_MAPPINGS: Record<string, string>;
/**
 * 需要全局替换的 API
 */
export declare const GLOBAL_API_REPLACEMENTS: Record<string, string>;
/**
 * 检查并替换导入路径
 */
export declare function mapImportPath(originalPath: string): string;

/**
 * 保存和下载工具 - 小程序适配版本
 * 在小程序中，下载功能可能受限，这里提供一个简化版本
 */
export default class SaveAndDownload {
    fileName: string;
    enabled: boolean;
    data: any;
    constructor(fileName?: string, enabled?: boolean);
    writeFields(fields: any): void;
    appendMultipleToArray(fieldName: string, items: any[]): void;
    download(): void;
    generateJSContent(): string;
    downloadFile(content: any, fileName: string, contentType: string): void;
}

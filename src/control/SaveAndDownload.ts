/**
 * 保存和下载工具 - 小程序适配版本（供打包时原 SDK RenderScheduler 解析）
 * 在小程序中，下载功能可能受限，这里提供一个简化版本
 */
export default class SaveAndDownload {
  fileName: string;
  enabled: boolean;
  data: any = {};

  constructor(fileName: string = "avatarData.js", enabled: boolean = false) {
    this.fileName = fileName;
    this.enabled = enabled;
  }

  writeFields(fields: any): void {
    if (!this.enabled) return;
    Object.assign(this.data, fields);
  }

  appendMultipleToArray(fieldName: string, items: any[]): void {
    if (!this.enabled) return;
    if (!this.data[fieldName]) {
      this.data[fieldName] = [];
    }
    this.data[fieldName].push(...items);
  }

  download(): void {
    if (!this.enabled) return;
    console.log('[SaveAndDownload] 数据已保存到内存:', this.data);
  }

  generateJSContent(): string {
    return `export default ${JSON.stringify(this.data, null, 2)};`;
  }

  downloadFile(content: any, fileName: string, contentType: string): void {
    if (!this.enabled) return;
    console.log('[SaveAndDownload] 下载文件:', fileName, contentType);
  }
}

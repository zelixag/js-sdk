/**
 * 保存和下载工具 - 小程序适配版本
 * 在小程序中，下载功能可能受限，这里提供一个简化版本
 */
export default class SaveAndDownload {
    constructor(fileName = "avatarData.js", enabled = false) {
        this.data = {};
        this.fileName = fileName;
        this.enabled = enabled;
    }
    writeFields(fields) {
        if (!this.enabled)
            return;
        Object.assign(this.data, fields);
    }
    appendMultipleToArray(fieldName, items) {
        if (!this.enabled)
            return;
        if (!this.data[fieldName]) {
            this.data[fieldName] = [];
        }
        this.data[fieldName].push(...items);
    }
    download() {
        if (!this.enabled)
            return;
        // 小程序中下载功能受限，这里只记录日志
        console.log('[SaveAndDownload] 数据已保存到内存:', this.data);
    }
    generateJSContent() {
        return `export default ${JSON.stringify(this.data, null, 2)};`;
    }
    downloadFile(content, fileName, contentType) {
        if (!this.enabled)
            return;
        // 小程序中下载功能受限
        console.log('[SaveAndDownload] 下载文件:', fileName, contentType);
    }
}

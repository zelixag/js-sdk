/**
 * Canvas 适配层 - 小程序版本
 * 适配小程序 Canvas API 和 WebGL
 */
/**
 * 获取 Canvas 节点
 */
export function getCanvasNode(canvasId) {
    return new Promise((resolve, reject) => {
        const query = wx.createSelectorQuery();
        query.select(`#${canvasId}`)
            .fields({ node: true, size: true })
            .exec((res) => {
            if (res && res[0] && res[0].node) {
                resolve(res[0].node);
            }
            else {
                reject(new Error(`Canvas node not found: ${canvasId}`));
            }
        });
    });
}
/**
 * 创建 WebGL 上下文
 */
export function createWebGLContext(canvas, options) {
    try {
        // 小程序 Canvas 的 getContext 只接受一个参数（contextType）
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            // 尝试降级到 WebGL 1.0
            console.warn('[Canvas] WebGL2 not supported, falling back to WebGL1');
            return canvas.getContext('webgl');
        }
        return gl;
    }
    catch (err) {
        console.error('[Canvas] Create WebGL context error:', err);
        return null;
    }
}
/**
 * 设置 Canvas 尺寸
 */
export function setCanvasSize(canvasId, width, height) {
    return new Promise((resolve, reject) => {
        const query = wx.createSelectorQuery();
        query.select(`#${canvasId}`)
            .fields({ node: true, size: true })
            .exec((res) => {
            if (res && res[0] && res[0].node) {
                const canvas = res[0].node;
                const dpr = wx.getSystemInfoSync().pixelRatio;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                // 设置样式尺寸
                wx.createSelectorQuery()
                    .select(`#${canvasId}`)
                    .boundingClientRect()
                    .exec((rect) => {
                    if (rect && rect[0]) {
                        // 通过设置样式来控制显示尺寸
                        // 注意：小程序中需要通过 CSS 或 style 属性设置
                        resolve();
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                reject(new Error(`Canvas node not found: ${canvasId}`));
            }
        });
    });
}
/**
 * 创建 Image 对象（兼容浏览器 API）
 * 返回类似 HTMLImageElement 的对象
 */
export function createImage() {
    const image = {
        src: '',
        crossOrigin: null,
        onload: null,
        onerror: null,
        width: 0,
        height: 0,
        complete: false
    };
    // 小程序中使用 wx.getImageInfo 加载图片
    Object.defineProperty(image, 'src', {
        set: function (value) {
            this._src = value;
            this.complete = false;
            // 小程序中 crossOrigin 属性不影响加载，但保留以兼容 API
            wx.getImageInfo({
                src: value,
                success: (res) => {
                    this.width = res.width;
                    this.height = res.height;
                    this.complete = true;
                    if (this.onload) {
                        this.onload();
                    }
                },
                fail: (err) => {
                    this.complete = false;
                    if (this.onerror) {
                        this.onerror(err);
                    }
                }
            });
        },
        get: function () {
            return this._src || '';
        }
    });
    // 添加 crossOrigin 属性（小程序中不影响，但保留以兼容）
    Object.defineProperty(image, 'crossOrigin', {
        set: function (value) {
            this._crossOrigin = value;
        },
        get: function () {
            return this._crossOrigin || null;
        }
    });
    return image;
}
/**
 * 创建 ImageBitmap（如果支持）
 * 小程序可能不支持，需要降级处理
 */
export function createImageBitmap(source, options) {
    // 小程序可能不支持 ImageBitmap，需要转换为 Canvas
    // 这里返回一个兼容的对象
    return Promise.resolve({
        width: 0,
        height: 0,
        close: () => { }
    });
}

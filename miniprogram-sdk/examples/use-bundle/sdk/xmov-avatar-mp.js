/**
 * 最早执行：让 window 指向 globalThis，避免原 SDK 里 (typeof window !== "undefined" ? window : globalThis).performanceTracker 报错
 * 必须在 index-init 里第一个 import，保证在原 SDK 任何代码之前运行
 */
if (typeof globalThis !== 'undefined') {
  var g$2 = globalThis;
  if (g$2.window === undefined || g$2.window === null) {
    try {
      g$2.window = globalThis;
    } catch (_unused) {
      try {
        Object.defineProperty(globalThis, 'window', {
          value: globalThis,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (_) {}
    }
  }
}

/**
 * 小程序没有 Blob 和 URL.createObjectURL，在此做最小 polyfill，避免 ReferenceError。
 * 必须在原 SDK 任何使用 Blob 的代码之前执行（在 index-init 里尽早 import）。
 */
var g$1 = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : {};
if (typeof g$1.Blob === 'undefined') {
  (function () {
    function BlobPolyfill(parts, options) {
      var p = parts || [];
      this._parts = p;
      this.type = options && options.type || '';
      var size = 0;
      for (var i = 0; i < p.length; i++) {
        var part = p[i];
        if (part != null) {
          var _ref, _p$byteLength;
          var _p = part;
          size += (_ref = (_p$byteLength = _p.byteLength) != null ? _p$byteLength : _p.length) != null ? _ref : 0;
        }
      }
      this.size = size;
    }
    BlobPolyfill.prototype.arrayBuffer = function () {
      var buf = new Uint8Array(this.size);
      var off = 0;
      for (var i = 0; i < this._parts.length; i++) {
        var part = this._parts[i];
        if (part == null) continue;
        var ab = part instanceof ArrayBuffer ? part : part.buffer;
        var len = part instanceof ArrayBuffer ? part.byteLength : part.byteLength;
        buf.set(new Uint8Array(ab, part instanceof ArrayBuffer ? 0 : part.byteOffset, len), off);
        off += len;
      }
      return buf.buffer;
    };
    BlobPolyfill.prototype.constructor = BlobPolyfill;
    g$1.Blob = BlobPolyfill;
  })();
}
// 始终挂载 __createObjectURL / __revokeObjectURL，接受任意类型（Blob/MediaSource 等），避免环境自带 URL 只认 Blob 导致 "Overload resolution failed"
var blobUrlCounter = 0;
var blobUrlMap = new Map();
var __createObjectURL = function __createObjectURL(obj) {
  var id = 'blob:mp/' + ++blobUrlCounter;
  blobUrlMap.set(id, obj);
  return id;
};
var __revokeObjectURL = function __revokeObjectURL(url) {
  blobUrlMap["delete"](url);
};
g$1.__createObjectURL = __createObjectURL;
g$1.__revokeObjectURL = __revokeObjectURL;
if (typeof g$1.window !== 'undefined') {
  g$1.window.__createObjectURL = __createObjectURL;
  g$1.window.__revokeObjectURL = __revokeObjectURL;
}
// 再按需 polyfill 整个 URL 对象（无 URL 或无 createObjectURL 时）
var needUrlPolyfill = !g$1.URL || typeof g$1.URL.createObjectURL !== 'function';
if (needUrlPolyfill) {
  var urlObj = {
    createObjectURL: __createObjectURL,
    revokeObjectURL: __revokeObjectURL
  };
  g$1.URL = urlObj;
  if (typeof g$1.window !== 'undefined') g$1.window.URL = urlObj;
  if (typeof g$1.global !== 'undefined' && g$1.global !== g$1) g$1.global.URL = urlObj;
}

/**
 * 环境检测工具
 */
/**
 * 检测是否在小程序环境
 */
function isMiniProgram() {
  return typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
}
/**
 * 检测是否在浏览器环境
 */
function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
/**
 * 监听网络状态变化（小程序）
 */
function onNetworkStatusChange(callback) {
  if (isMiniProgram()) {
    wx.onNetworkStatusChange(callback);
    return function () {
      // 小程序无法取消监听，返回空函数
    };
  }
  // 浏览器环境
  if (isBrowser()) {
    var onlineHandler = function onlineHandler() {
      return callback({
        isConnected: true,
        networkType: 'online'
      });
    };
    var offlineHandler = function offlineHandler() {
      return callback({
        isConnected: false,
        networkType: 'offline'
      });
    };
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return function () {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }
  return function () {};
}

/**
 * Canvas 适配层 - 小程序版本
 * 适配小程序 Canvas API 和 WebGL
 */
/**
 * 获取 Canvas 节点
 */
function getCanvasNode$1(canvasId) {
  return new Promise(function (resolve, reject) {
    var query = wx.createSelectorQuery();
    query.select("#" + canvasId).fields({
      node: true,
      size: true
    }).exec(function (res) {
      if (res && res[0] && res[0].node) {
        resolve(res[0].node);
      } else {
        reject(new Error("Canvas node not found: " + canvasId));
      }
    });
  });
}
/**
 * 创建 Image 对象（兼容浏览器 API）
 * 返回类似 HTMLImageElement 的对象
 */
function createImage$1() {
  var image = {
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
    set: function set(value) {
      var _this = this;
      this._src = value;
      this.complete = false;
      // 小程序中 crossOrigin 属性不影响加载，但保留以兼容 API
      wx.getImageInfo({
        src: value,
        success: function success(res) {
          _this.width = res.width;
          _this.height = res.height;
          _this.complete = true;
          if (_this.onload) {
            _this.onload();
          }
        },
        fail: function fail(err) {
          _this.complete = false;
          if (_this.onerror) {
            _this.onerror(err);
          }
        }
      });
    },
    get: function get() {
      return this._src || '';
    }
  });
  // 添加 crossOrigin 属性（小程序中不影响，但保留以兼容）
  Object.defineProperty(image, 'crossOrigin', {
    set: function set(value) {
      this._crossOrigin = value;
    },
    get: function get() {
      return this._crossOrigin || null;
    }
  });
  return image;
}

/**
 * DOM 适配器 - 在小程序环境中模拟 DOM API
 * 让原 SDK 的 DOM 操作可以在小程序中运行
 */
/**
 * 模拟 HTMLElement
 */
var MiniProgramHTMLElement = /*#__PURE__*/function () {
  function MiniProgramHTMLElement(canvasId) {
    this.canvasId = void 0;
    this.canvas = null;
    this.style = void 0;
    this.attributes = new Map();
    this.children = [];
    this.canvasId = canvasId;
    this.style = this._createStyleProxy();
  }
  var _proto = MiniProgramHTMLElement.prototype;
  _proto._createStyleProxy = function _createStyleProxy() {
    var _this = this;
    var styles = {};
    return new Proxy(styles, {
      get: function get(target, prop) {
        return target[prop] || '';
      },
      set: function set(target, prop, value) {
        target[prop] = value;
        // 在小程序中应用样式
        _this._applyStyle(prop, value);
        return true;
      }
    });
  };
  _proto._applyStyle = function _applyStyle(prop, value) {
    // 小程序中需要通过其他方式应用样式
    // 这里只是模拟，实际可能需要通过 CSS 类或内联样式
  };
  _proto.getCanvas = function getCanvas() {
    try {
      var _temp2 = function _temp2() {
        return _this2.canvas;
      };
      var _this2 = this;
      var _temp = function () {
        if (!_this2.canvas) {
          return Promise.resolve(getCanvasNode$1(_this2.canvasId)).then(function (_getCanvasNode) {
            _this2.canvas = _getCanvasNode;
          });
        }
      }();
      return Promise.resolve(_temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.setAttribute = function setAttribute(name, value) {
    this.attributes.set(name, value);
  };
  _proto.getAttribute = function getAttribute(name) {
    return this.attributes.get(name) || null;
  };
  _proto.appendChild = function appendChild(child) {
    this.children.push(child);
  };
  _proto.querySelector = function querySelector(selector) {
    // 简单的选择器匹配
    if (selector === this.canvasId || selector === "#" + this.canvasId) {
      return this;
    }
    return null;
  };
  _proto.createElement = function createElement(tagName) {
    // 创建子元素
    var element = new MiniProgramHTMLElement(this.canvasId + "-" + tagName);
    return element;
  };
  return MiniProgramHTMLElement;
}();
/**
 * 模拟 document 对象
 */
var MiniProgramDocument = /*#__PURE__*/function () {
  function MiniProgramDocument() {
    this.elements = new Map();
  }
  var _proto2 = MiniProgramDocument.prototype;
  _proto2.querySelector = function querySelector(selector) {
    // 移除 # 前缀
    var id = selector.replace(/^#/, '');
    if (this.elements.has(id)) {
      return this.elements.get(id);
    }
    // 创建新元素
    var element = new MiniProgramHTMLElement(id);
    this.elements.set(id, element);
    return element;
  };
  _proto2.createElement = function createElement(tagName) {
    var id = tagName + "-" + Date.now();
    var element = new MiniProgramHTMLElement(id);
    this.elements.set(id, element);
    return element;
  };
  return MiniProgramDocument;
}();
/**
 * 初始化 DOM 适配
 * 在小程序环境中，将 document 和 window 的相关 API 替换为适配版本
 */
function initDOMAdapter() {
  if (!isMiniProgram()) {
    return; // 浏览器环境不需要适配
  }
  // 创建适配的 document 对象
  var mpDocument = new MiniProgramDocument();
  // 替换全局 document（如果可能）
  // 注意：小程序环境中可能没有全局 document，需要特殊处理（可能是只读的）
  var globalObj = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
  if (globalObj) {
    try {
      // 先尝试直接设置
      if (!globalObj.document) {
        globalObj.document = mpDocument;
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty
      try {
        var desc = Object.getOwnPropertyDescriptor(globalObj, 'document');
        if (desc && desc.configurable) {
          delete globalObj.document;
        }
        // 定义新的 document
        Object.defineProperty(globalObj, 'document', {
          value: mpDocument,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试替换 window.document（如果 window 存在）
        try {
          if (globalObj.window && globalObj.window !== globalObj) {
            Object.defineProperty(globalObj.window, 'document', {
              value: mpDocument,
              writable: true,
              configurable: true,
              enumerable: true
            });
          }
        } catch (e2) {
          // 最后的手段：至少确保可以通过 getDocument() 访问
          console.warn('[dom-adapter] 无法设置 globalThis.document，但 getDocument() 仍然可用');
          // 将 document 存储在其他地方，供需要时使用
          globalObj.__document = mpDocument;
        }
      }
    }
  }
  // 创建适配的 window 对象（如果需要）
  if (globalObj && !globalObj.window) {
    globalObj.window = {
      document: mpDocument,
      addEventListener: function addEventListener() {},
      removeEventListener: function removeEventListener() {}
      // 其他需要的 window API
    };
  }
}
/**
 * 获取适配的 document 对象
 */
function getDocument() {
  if (isMiniProgram()) {
    var globalObj = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
    if (globalObj && globalObj.document) {
      return globalObj.document;
    }
    return new MiniProgramDocument();
  }
  return document;
}

function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}

var isLoggingEnabled = false;
function executeLog(consoleMethod) {
  if (!isLoggingEnabled || typeof consoleMethod !== 'function') {
    return;
  }
  consoleMethod.apply(void 0, [].slice.call(arguments, 1));
}
var sdkLog = {
  log: function log() {
    return executeLog.apply(void 0, [console.log].concat([].slice.call(arguments)));
  },
  info: function info() {
    return executeLog.apply(void 0, [console.info].concat([].slice.call(arguments)));
  },
  warn: function warn() {
    return executeLog.apply(void 0, [console.warn].concat([].slice.call(arguments)));
  },
  error: function error() {
    return executeLog.apply(void 0, [console.error].concat([].slice.call(arguments)));
  }
};
function setLoggingEnabled(enabled) {
  isLoggingEnabled = enabled;
  if (!enabled) {
    console.log('[AVATAR SDK] 日志已禁用');
  } else {
    console.log('[AVATAR SDK] 日志已启用');
  }
}
// 创建全局日志对象（兼容原 SDK）
var logger = _extends({}, sdkLog, {
  setEnabled: setLoggingEnabled
});
// 在小程序环境中，挂载到全局对象
var globalObj = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
if (isMiniProgram()) {
  // 小程序环境
  globalObj.avatarSDKLogger = logger;
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.avatarSDKLogger = logger;
}

/**
 * 网络请求适配层 - 小程序版本
 * 使用 wx.request 替代 fetch
 */
/**
 * 小程序网络请求封装
 */
function request(options) {
  return new Promise(function (resolve, reject) {
    var url = options.url,
      _options$method = options.method,
      method = _options$method === void 0 ? 'GET' : _options$method,
      data = options.data,
      _options$headers = options.headers,
      headers = _options$headers === void 0 ? {} : _options$headers,
      _options$timeout = options.timeout,
      timeout = _options$timeout === void 0 ? 30000 : _options$timeout;
    wx.request({
      url: url,
      method: method,
      data: method === 'GET' ? data : JSON.stringify(data),
      header: _extends({
        'Content-Type': 'application/json'
      }, headers),
      timeout: timeout,
      success: function success(res) {
        resolve({
          data: res.data,
          status: res.statusCode,
          statusText: res.errMsg || 'OK',
          headers: res.header || {}
        });
      },
      fail: function fail(err) {
        reject(new Error("Request failed: " + (err.errMsg || 'Unknown error')));
      }
    });
  });
}

// 如果在小程序环境中，设置全局 API 替换
if (isMiniProgram()) {
  // 替换 fetch API
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    globalThis.fetch = function (url, options) {
      try {
        var method = (options == null ? void 0 : options.method) || 'GET';
        var headers = (options == null ? void 0 : options.headers) || {};
        var body = options == null ? void 0 : options.body;
        var data = body ? typeof body === 'string' ? JSON.parse(body) : body : undefined;
        return Promise.resolve(request({
          url: url,
          method: method,
          data: data,
          headers: headers
        })).then(function (response) {
          // 返回类似 fetch 的 Response 对象
          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText || '',
            json: function () {
              try {
                return Promise.resolve(response.data);
              } catch (e) {
                return Promise.reject(e);
              }
            },
            text: function () {
              try {
                return Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data));
              } catch (e) {
                return Promise.reject(e);
              }
            },
            arrayBuffer: function () {
              try {
                if (response.data instanceof ArrayBuffer) {
                  return Promise.resolve(response.data);
                }
                // 转换为 ArrayBuffer
                var str = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                return Promise.resolve(new TextEncoder().encode(str).buffer);
              } catch (e) {
                return Promise.reject(e);
              }
            },
            headers: new Headers(response.headers || {})
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }
  // 替换 document
  // 注意：在小程序中，window.document 可能是只读的，需要特殊处理
  if (typeof globalThis !== 'undefined') {
    var doc = getDocument();
    try {
      // 先尝试直接设置
      // @ts-ignore
      if (!globalThis.document) {
        // @ts-ignore
        globalThis.document = doc;
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty
      try {
        // 删除现有的 document（如果存在且可配置）
        var desc = Object.getOwnPropertyDescriptor(globalThis, 'document');
        if (desc && desc.configurable) {
          delete globalThis.document;
        }
        // 定义新的 document
        Object.defineProperty(globalThis, 'document', {
          value: doc,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试替换 window.document（如果 window 存在）
        try {
          if (globalThis.window && globalThis.window !== globalThis) {
            Object.defineProperty(globalThis.window, 'document', {
              value: doc,
              writable: true,
              configurable: true,
              enumerable: true
            });
          }
        } catch (e2) {
          // 最后的手段：至少确保可以通过 getDocument() 访问
          console.warn('[api-polyfill] 无法设置 globalThis.document，但 getDocument() 仍然可用');
          // 将 document 存储在其他地方，供需要时使用
          globalThis.__document = doc;
        }
      }
    }
  }
  // 替换 navigator.onLine
  // 注意：在小程序中，navigator 可能是只读的，需要特殊处理
  if (typeof globalThis !== 'undefined') {
    try {
      // 先尝试直接设置
      var existingNavigator = globalThis.navigator;
      if (!existingNavigator) {
        // 即使 navigator 不存在，也使用 Object.defineProperty 来避免只读属性问题
        try {
          Object.defineProperty(globalThis, 'navigator', {
            value: {
              onLine: true // 初始值，会通过网络监听更新
            },
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          // 如果定义失败，创建备用对象
          var nav = {
            onLine: true
          };
          globalThis.__navigator = nav;
          console.warn('[api-polyfill] 无法设置 globalThis.navigator，但 __navigator 仍然可用');
        }
      } else {
        // 如果 navigator 已存在，尝试添加 onLine 属性
        try {
          // @ts-ignore
          globalThis.navigator.onLine = true;
        } catch (e) {
          // 如果直接设置失败，使用 Object.defineProperty
          Object.defineProperty(globalThis.navigator, 'onLine', {
            value: true,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      }
    } catch (err) {
      // 如果直接设置失败，尝试使用 Object.defineProperty 创建新的 navigator
      try {
        var _desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
        if (_desc && _desc.configurable) {
          delete globalThis.navigator;
        }
        // 定义新的 navigator
        Object.defineProperty(globalThis, 'navigator', {
          value: _extends({}, globalThis.navigator || {}, {
            onLine: true
          }),
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        // 如果还是失败，尝试在现有 navigator 上定义 onLine 属性
        try {
          var _existingNavigator = globalThis.navigator;
          if (_existingNavigator) {
            Object.defineProperty(_existingNavigator, 'onLine', {
              value: true,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } else {
            // 最后的手段：创建一个新的 navigator 对象并存储在其他地方
            var _nav = {
              onLine: true
            };
            globalThis.__navigator = _nav;
            console.warn('[api-polyfill] 无法设置 globalThis.navigator，但 __navigator 仍然可用');
          }
        } catch (e2) {
          console.warn('[api-polyfill] 无法设置 navigator.onLine，网络状态监听可能不可用');
        }
      }
    }
    // 监听网络状态变化
    onNetworkStatusChange(function (res) {
      var nav = globalThis.navigator || globalThis.__navigator;
      if (nav) {
        try {
          nav.onLine = res.isConnected;
        } catch (e) {
          // 如果设置失败，尝试使用 defineProperty
          try {
            Object.defineProperty(nav, 'onLine', {
              value: res.isConnected,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e2) {
            // 忽略错误，网络状态更新失败不影响主要功能
          }
        }
        // 触发 online/offline 事件
        if (typeof globalThis.dispatchEvent === 'function') {
          globalThis.dispatchEvent(new Event(res.isConnected ? 'online' : 'offline'));
        }
      }
    });
  }
  // 替换 window（原 SDK 用 (typeof window !== "undefined" ? window : globalThis).performanceTracker，小程序无 window 会报错）
  if (typeof globalThis !== 'undefined') {
    var g = globalThis;
    if (!g.window || g.window === undefined) {
      try {
        g.window = globalThis;
      } catch (_unused) {
        try {
          Object.defineProperty(globalThis, 'window', {
            value: globalThis,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (_e) {/* 忽略 */}
      }
    }
  }
}

/**
 * WebSocket 适配层 - 小程序版本
 * 使用 wx.connectSocket 替代 socket.io-client
 */
/**
 * 小程序 WebSocket 封装
 * 兼容 socket.io 的部分 API
 */
var MiniProgramWebSocket = /*#__PURE__*/function () {
  function MiniProgramWebSocket(options) {
    this.socketTask = null;
    this.url = void 0;
    this.protocols = void 0;
    this.header = void 0;
    this.timeout = void 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.reconnectDelayMax = 5000;
    this.randomizationFactor = 0.5;
    this.reconnectTimer = null;
    this.isManualClose = false;
    this.listeners = new Map();
    this.anyListeners = new Set();
    // socket.io 的 onAny 监听器
    this.messageQueue = [];
    this.query = void 0;
    // 兼容 socket.io 的属性
    this.connected = false;
    this.disconnected = true;
    this.id = null;
    // 处理 query 参数，将其添加到 URL
    var url = options.url;
    if (options.query) {
      this.query = options.query;
      var queryString = Object.entries(options.query).map(function (_ref) {
        var key = _ref[0],
          value = _ref[1];
        return encodeURIComponent(key) + "=" + encodeURIComponent(value);
      }).join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    this.url = url;
    this.protocols = options.protocols;
    this.header = options.header;
    this.timeout = options.timeout || 30000;
    // socket.io 兼容选项
    if (options.reconnection !== undefined) {
      // 如果禁用重连，设置最大重连次数为 0
      if (!options.reconnection) {
        this.maxReconnectAttempts = 0;
      }
    }
    if (options.reconnectionAttempts !== undefined) {
      this.maxReconnectAttempts = options.reconnectionAttempts === Infinity ? 999999 : options.reconnectionAttempts;
    }
    if (options.reconnectionDelay !== undefined) {
      this.reconnectDelay = options.reconnectionDelay;
    }
    if (options.reconnectionDelayMax !== undefined) {
      this.reconnectDelayMax = options.reconnectionDelayMax;
    }
    if (options.randomizationFactor !== undefined) {
      this.randomizationFactor = options.randomizationFactor;
    }
  }
  /**
   * 连接 WebSocket
   */
  var _proto = MiniProgramWebSocket.prototype;
  _proto.connect = function connect() {
    this.isManualClose = false;
    this._connect();
  };
  _proto._connect = function _connect() {
    var _this = this;
    try {
      this.socketTask = wx.connectSocket({
        url: this.url,
        protocols: this.protocols,
        header: this.header,
        timeout: this.timeout
      });
      this.socketTask.onOpen(function () {
        _this.connected = true;
        _this.disconnected = false;
        _this.reconnectAttempts = 0;
        _this.id = Math.random().toString(36).substring(7);
        // 发送队列中的消息
        while (_this.messageQueue.length > 0) {
          var message = _this.messageQueue.shift();
          _this.send(message);
        }
        _this._emit('connect');
      });
      this.socketTask.onMessage(function (res) {
        try {
          // 尝试解析 JSON
          var data;
          if (typeof res.data === 'string') {
            data = JSON.parse(res.data);
          } else if (res.data instanceof ArrayBuffer) {
            // 处理二进制数据
            data = res.data;
          } else {
            data = res.data;
          }
          // 兼容 socket.io 的消息格式
          if (data && typeof data === 'object') {
            if (data.type) {
              _this._emit(data.type, data.data || data);
            } else if (Array.isArray(data) && data.length >= 2) {
              // socket.io 格式: [eventName, payload]
              _this._emit(data[0], data[1]);
            } else {
              _this._emit('message', data);
            }
          } else {
            _this._emit('message', data);
          }
        } catch (err) {
          console.error('[WebSocket] Parse message error:', err);
          _this.emit('message', res.data);
        }
      });
      this.socketTask.onError(function (err) {
        console.error('[WebSocket] Error:', err);
        _this._emit('error', err);
        _this._emit('connect_error', err); // socket.io 兼容
        _this._handleReconnect();
      });
      this.socketTask.onClose(function (res) {
        _this.connected = false;
        _this.disconnected = true;
        _this._emit('disconnect', res);
        if (!_this.isManualClose) {
          _this._handleReconnect();
        }
      });
    } catch (err) {
      console.error('[WebSocket] Connect error:', err);
      this._handleReconnect();
    }
  }
  /**
   * 重连处理
   */;
  _proto._handleReconnect = function _handleReconnect() {
    var _this2 = this;
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    this.reconnectAttempts++;
    // socket.io 兼容的重连延迟计算
    var baseDelay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.reconnectDelayMax);
    var randomDelay = baseDelay * (1 + Math.random() * this.randomizationFactor);
    var delay = Math.floor(randomDelay);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(function () {
      console.log("[WebSocket] Reconnecting... (" + _this2.reconnectAttempts + "/" + _this2.maxReconnectAttempts + ")");
      _this2._connect();
    }, delay);
  }
  /**
   * 发送消息
   */;
  _proto.send = function send(data) {
    if (!this.socketTask || !this.connected) {
      // 如果未连接，将消息加入队列
      this.messageQueue.push(data);
      return;
    }
    try {
      var message;
      if (typeof data === 'string') {
        message = data;
      } else if (data instanceof ArrayBuffer) {
        message = data;
      } else {
        message = JSON.stringify(data);
      }
      this.socketTask.send({
        data: message
      });
    } catch (err) {
      console.error('[WebSocket] Send error:', err);
    }
  }
  /**
   * 发送事件（兼容 socket.io）
   */;
  _proto.emit = function emit(event, data) {
    if (event === 'message') {
      this.send(data);
    } else {
      // socket.io 格式: [eventName, payload]
      this.send([event, data]);
    }
  }
  /**
   * 监听事件
   */;
  _proto.on = function on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }
  /**
   * 移除监听
   */;
  _proto.off = function off(event, callback) {
    if (!this.listeners.has(event)) return;
    if (callback) {
      this.listeners.get(event)["delete"](callback);
    } else {
      this.listeners["delete"](event);
    }
  }
  /**
   * 触发事件（内部方法）
   */;
  _proto._emit = function _emit(event, data) {
    // 触发 onAny 监听器
    this.anyListeners.forEach(function (callback) {
      try {
        callback(event, data);
      } catch (err) {
        console.error("[WebSocket] onAny handler error:", err);
      }
    });
    // 触发特定事件监听器
    var callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(function (callback) {
        try {
          callback(data);
        } catch (err) {
          console.error("[WebSocket] Event handler error (" + event + "):", err);
        }
      });
    }
  }
  /**
   * 监听所有事件（socket.io 兼容）
   */;
  _proto.onAny = function onAny(callback) {
    this.anyListeners.add(callback);
  }
  /**
   * 移除 onAny 监听器
   */;
  _proto.offAny = function offAny(callback) {
    if (callback) {
      this.anyListeners["delete"](callback);
    } else {
      this.anyListeners.clear();
    }
  }
  /**
   * 断开连接
   */;
  _proto.disconnect = function disconnect() {
    this.isManualClose = true;
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止重连
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socketTask) {
      this.socketTask.close({
        code: 1000,
        reason: 'Manual close'
      });
      this.socketTask = null;
    }
    this.connected = false;
    this.disconnected = true;
    this.listeners.clear();
    this.messageQueue = [];
  }
  /**
   * 关闭连接（别名）
   */;
  _proto.close = function close() {
    this.disconnect();
  };
  return MiniProgramWebSocket;
}();
/**
 * 创建 WebSocket 连接（兼容 socket.io 的 io() 函数）
 */
function createWebSocket(url, options) {
  var socket = new MiniProgramWebSocket(_extends({
    url: url
  }, options));
  socket.connect();
  return socket;
}
/**
 * socket.io 兼容的 io 函数
 */
function io$1(url, options) {
  return createWebSocket(url, options);
}

/**
 * socket.io-client 适配器
 * 用于替换原 SDK 中的 socket.io-client 导入
 */
// 导出兼容 socket.io-client 的 API
var io = io$1;

/**
 * 模块 Polyfill - 替换原 SDK 中使用的浏览器特定模块
 * 这个文件需要在导入原 SDK 之前执行
 */
// 如果在小程序环境中，替换全局模块
if (isMiniProgram()) {
  // 替换 Image 构造函数
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    globalThis.Image = function () {
      return createImage$1();
    };
    // 也替换 window.Image（如果存在）
    if (globalThis.window) {
      globalThis.window.Image = globalThis.Image;
    }
  }
  // 替换 document.createElement，使其支持创建 canvas
  // 注意：小程序中的 canvas 需要通过 getCanvasNode 获取，这里创建一个模拟的
  var originalDocument = getDocument();
  if (originalDocument && typeof originalDocument.createElement === 'function') {
    var originalCreateElement = originalDocument.createElement.bind(originalDocument);
    originalDocument.createElement = function (tagName, options) {
      if (tagName.toLowerCase() === 'canvas') {
        // 返回一个模拟的 canvas 对象
        // 实际使用时，需要通过 getCanvasNode 获取真实的 canvas
        // 这个模拟对象会被 XmovAvatarMP 中的真实 canvas 替换
        return {
          width: 0,
          height: 0,
          getContext: function getContext(type) {
            return null;
          },
          setAttribute: function setAttribute() {},
          style: {},
          addEventListener: function addEventListener() {},
          removeEventListener: function removeEventListener() {},
          remove: function remove() {}
        };
      }
      return originalCreateElement(tagName, options);
    };
  }
  // 替换 socket.io-client：用静态 import 打进去，避免打包后还有 require() 导致小程序找不到模块
  if (typeof globalThis !== 'undefined') {
    globalThis.__socketIOAdapter = io;
  }
}

/**
 * SDK 初始化脚本
 * 在导入 SDK 之前运行，设置适配层
 *
 * 重要：这个文件必须在导入原 SDK 模块之前执行
 */
// 在小程序环境中初始化适配层
if (isMiniProgram()) {
  console.log('[XmovAvatar] 初始化小程序适配层...');
  // 初始化 DOM 适配
  initDOMAdapter();
  // API polyfill 已经在 api-polyfill.ts 中自动执行
  // 模块 polyfill 已经在 module-polyfill.ts 中自动执行
  console.log('[XmovAvatar] 小程序适配层初始化完成');
}

/**
 * 单文件入口：先执行 init，再 require(heavy) 并 re-export（小程序单文件 500KB 限制，不能打成一坨）
 * 用法：const { XmovAvatarMP, getCanvasNode, createWebGLContext } = require('./xmov-avatar-mp.js');
 */
// 2. 从 heavy 包取 API（heavy 单独打成 xmov-avatar-mp.heavy.js，入口保持小体积）
var heavy = require('./xmov-avatar-mp.heavy.js');
var XmovAvatarMP = heavy["default"];
var getCanvasNode = heavy.getCanvasNode;
var createWebGLContext = heavy.createWebGLContext;
var setCanvasSize = heavy.setCanvasSize;
var createImage = heavy.createImage;
var singleEntry = heavy["default"];

exports.XmovAvatarMP = XmovAvatarMP;
exports.createImage = createImage;
exports.createWebGLContext = createWebGLContext;
exports["default"] = singleEntry;
exports.getCanvasNode = getCanvasNode;
exports.setCanvasSize = setCanvasSize;
//# sourceMappingURL=xmov-avatar-mp.js.map

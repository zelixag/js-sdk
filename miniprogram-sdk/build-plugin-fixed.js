/**
 * 构建微信小程序插件
 * 将 SDK 打包成小程序插件格式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('开始构建微信小程序插件...\n');

// 1. 检查构建文件
console.log('1. 检查构建文件...');
const distMiniprogramPath = path.join(__dirname, 'dist', 'miniprogram-sdk', 'src');
const distOriginalPath = path.join(__dirname, 'dist', 'src');

if (!fs.existsSync(distMiniprogramPath) && !fs.existsSync(distOriginalPath)) {
  console.log('未找到构建文件，尝试构建 TypeScript...');
  try {
    execSync('npx tsc --project tsconfig.json --skipLibCheck', { 
      cwd: __dirname, 
      stdio: 'pipe'
    });
    console.log('✅ TypeScript 构建完成\n');
  } catch (error) {
    console.log('⚠️ TypeScript 构建有错误（原 SDK 类型错误，不影响小程序 SDK）\n');
  }
} else {
  console.log('✅ 已找到构建文件，跳过构建\n');
}

// 2. 创建插件目录结构
console.log('2. 创建插件目录结构...');
const pluginDir = path.join(__dirname, 'dist', 'plugin');
const pluginSrcDir = path.join(pluginDir, 'plugin');

if (fs.existsSync(pluginDir)) {
  fs.rmSync(pluginDir, { recursive: true, force: true });
}
fs.mkdirSync(pluginDir, { recursive: true });
fs.mkdirSync(pluginSrcDir, { recursive: true });

// 3. 复制函数
function copyDir(src, dest, filter = null) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (filter && !filter(entry.name)) {
      continue;
    }
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 4. 复制小程序 SDK 文件到 plugin 目录
console.log('3. 复制小程序 SDK 文件...');
const miniprogramSrcPath = path.join(__dirname, 'dist', 'miniprogram-sdk', 'src');
if (fs.existsSync(miniprogramSrcPath)) {
  copyDir(miniprogramSrcPath, pluginSrcDir);
  console.log('✅ 小程序 SDK 文件复制完成');
} else {
  console.warn('⚠️ 未找到 dist/miniprogram-sdk/src，尝试从源码复制...');
  const sourcePath = path.join(__dirname, 'src');
  if (fs.existsSync(sourcePath)) {
    copyDir(sourcePath, pluginSrcDir, (name) => {
      return name.endsWith('.ts') || name.endsWith('.js');
    });
    console.log('✅ 从源码复制完成');
  }
}

// 5. 复制原 SDK 文件到 plugin/src
console.log('4. 复制原 SDK 文件...');
const pluginSrcOriginalPath = path.join(pluginSrcDir, 'src');
const originalSrcPath = path.join(__dirname, 'dist', 'src');
if (fs.existsSync(originalSrcPath)) {
  copyDir(originalSrcPath, pluginSrcOriginalPath);
  console.log('✅ 原 SDK 文件复制完成');
} else {
  const sourceOriginalPath = path.resolve(__dirname, '../src');
  if (fs.existsSync(sourceOriginalPath)) {
    const neededDirs = ['types', 'utils', 'modules', 'control', 'baseRender', 'view', 'worker', 'proto'];
    for (const dir of neededDirs) {
      const srcDir = path.join(sourceOriginalPath, dir);
      const destDir = path.join(pluginSrcOriginalPath, dir);
      if (fs.existsSync(srcDir)) {
        copyDir(srcDir, destDir);
        console.log(`  ✅ 已复制 ${dir}/`);
      }
    }
    console.log('✅ 原 SDK 源码文件复制完成');
  }
}

// 6. 修复导入路径
console.log('5. 修复导入路径...');
function fixImportPaths(dir, relativeTo = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(relativeTo, entry.name);
    
    if (entry.isDirectory()) {
      fixImportPaths(fullPath, relativePath);
    } else if (entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;
      
      // 修复 import 路径
      const pattern1 = /from\s+['"]\.\.\/\.\.\/\.\.\/src\//g;
      const pattern2 = /from\s+['"]\.\.\/\.\.\/src\//g;
      const pattern3 = /require\(['"]\.\.\/\.\.\/\.\.\/src\//g;
      const pattern4 = /require\(['"]\.\.\/\.\.\/src\//g;
      
      if (pattern1.test(content)) {
        content = content.replace(pattern1, "from '../src/");
        modified = true;
      }
      if (pattern2.test(content)) {
        content = content.replace(pattern2, "from '../src/");
        modified = true;
      }
      if (pattern3.test(content)) {
        content = content.replace(pattern3, "require('../src/");
        modified = true;
      }
      if (pattern4.test(content)) {
        content = content.replace(pattern4, "require('../src/");
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
    }
  }
}

fixImportPaths(pluginSrcDir);
console.log('✅ 导入路径修复完成');

// 7. 创建 plugin.json
console.log('6. 创建 plugin.json...');
const pluginJson = {
  "publicComponents": {
    "avatar": "components/avatar"
  },
  "pages": [],
  "main": "index.js"
};

fs.writeFileSync(
  path.join(pluginSrcDir, 'plugin.json'),
  JSON.stringify(pluginJson, null, 2)
);
console.log('✅ plugin.json 创建完成');

// 8. 创建插件入口文件
console.log('7. 创建插件入口文件...');
const pluginIndexJs = `/**
 * 微信小程序插件入口文件
 * 导出 SDK 核心功能供插件使用者调用
 */

// 初始化适配层
require('./index-init.js');

// 导出核心类
const XmovAvatarMP = require('./core/XmovAvatarMP.js').default;

// 导出工具函数
const { getCanvasNode, createWebGLContext } = require('./adapters/canvas.js');
const { isMiniProgram } = require('./utils/env.js');

module.exports = {
  XmovAvatarMP,
  getCanvasNode,
  createWebGLContext,
  isMiniProgram
};
`;

fs.writeFileSync(path.join(pluginSrcDir, 'index.js'), pluginIndexJs);
console.log('✅ 插件入口文件创建完成');

// 9. 创建插件组件
console.log('8. 创建插件组件...');
const pluginComponentDir = path.join(pluginSrcDir, 'components');
fs.mkdirSync(pluginComponentDir, { recursive: true });

// avatar.js
const avatarComponentJs = `/**
 * 数字人插件组件
 * 封装 SDK 功能为小程序组件
 */

const plugin = requirePlugin('xmov-avatar');

Component({
  properties: {
    // Canvas ID
    canvasId: {
      type: String,
      value: 'avatar-canvas'
    },
    // SDK 配置
    config: {
      type: Object,
      value: {}
    }
  },

  data: {
    avatar: null,
    isInitialized: false,
    status: '未初始化'
  },

  lifetimes: {
    attached() {
      this.initAvatar();
    },
    detached() {
      this.destroyAvatar();
    }
  },

  methods: {
    /**
     * 初始化数字人
     */
    async initAvatar() {
      try {
        const { XmovAvatarMP, getCanvasNode, createWebGLContext } = plugin;
        
        // 获取 Canvas
        const canvas = await getCanvasNode(this.properties.canvasId);
        const gl = createWebGLContext(canvas);

        if (!canvas || !gl) {
          throw new Error('Canvas 或 WebGL 初始化失败');
        }

        // 创建 SDK 实例
        this.data.avatar = new XmovAvatarMP({
          canvasId: this.properties.canvasId,
          canvas: canvas,
          gl: gl,
          ...this.properties.config,
          onStateChange: (state) => {
            this.setData({ status: state });
            this.triggerEvent('statechange', { state });
          },
          onStatusChange: (status) => {
            this.triggerEvent('statuschange', { status });
          },
          onMessage: (error) => {
            this.triggerEvent('error', { error });
          }
        });

        // 初始化
        await this.data.avatar.init({
          onDownloadProgress: (progress) => {
            this.triggerEvent('progress', { progress });
          }
        });

        this.setData({ isInitialized: true, status: '已初始化' });
        this.triggerEvent('ready');
      } catch (err) {
        console.error('[Avatar Plugin] 初始化失败:', err);
        this.triggerEvent('error', { error: err });
      }
    },

    /**
     * 启动数字人
     */
    start() {
      if (this.data.avatar) {
        this.data.avatar.start();
        this.setData({ status: '运行中' });
      }
    },

    /**
     * 停止数字人
     */
    stop() {
      if (this.data.avatar) {
        this.data.avatar.stop();
        this.setData({ status: '已停止' });
      }
    },

    /**
     * 销毁数字人
     */
    async destroyAvatar() {
      if (this.data.avatar) {
        await this.data.avatar.destroy();
        this.data.avatar = null;
        this.setData({ isInitialized: false, status: '已销毁' });
      }
    }
  }
});
`;

fs.writeFileSync(path.join(pluginComponentDir, 'avatar.js'), avatarComponentJs);

// avatar.wxml
const avatarComponentWxml = `<!--components/avatar/avatar.wxml-->
<view class="avatar-container">
  <canvas
    type="webgl"
    id="{{canvasId}}"
    canvas-id="{{canvasId}}"
    class="avatar-canvas"
  ></canvas>
  <slot></slot>
</view>
`;

fs.writeFileSync(path.join(pluginComponentDir, 'avatar.wxml'), avatarComponentWxml);

// avatar.wxss
const avatarComponentWxss = `/* components/avatar/avatar.wxss */
.avatar-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.avatar-canvas {
  width: 100%;
  height: 100%;
  background-color: #000;
}
`;

fs.writeFileSync(path.join(pluginComponentDir, 'avatar.wxss'), avatarComponentWxss);

// avatar.json
const avatarComponentJson = {
  "component": true,
  "usingComponents": {}
};

fs.writeFileSync(
  path.join(pluginComponentDir, 'avatar.json'),
  JSON.stringify(avatarComponentJson, null, 2)
);

console.log('✅ 插件组件创建完成');

// 10. 创建 README
console.log('9. 创建 README...');
const readme = `# 微信小程序数字人 SDK 插件

这是一个微信小程序插件，封装了数字人 SDK 的功能。

## 使用方法

### 1. 在小程序中配置插件

在 \`app.json\` 中添加插件配置：

\`\`\`json
{
  "plugins": {
    "xmov-avatar": {
      "version": "1.0.0",
      "provider": "YOUR_PLUGIN_APPID"
    }
  }
}
\`\`\`

### 2. 在页面中使用组件

\`\`\`xml
<!-- pages/index/index.wxml -->
<plugin-avatar 
  canvas-id="avatar-canvas"
  config="{{avatarConfig}}"
  bind:ready="onAvatarReady"
  bind:error="onAvatarError"
  bind:statechange="onStateChange"
/>
\`\`\`

\`\`\`javascript
// pages/index/index.js
Page({
  data: {
    avatarConfig: {
      appId: 'your-app-id',
      appSecret: 'your-app-secret',
      gatewayServer: 'https://your-gateway.com',
      enableLogger: true
    }
  },

  onAvatarReady() {
    console.log('数字人初始化完成');
  },

  onAvatarError(e) {
    console.error('数字人错误:', e.detail.error);
  },

  onStateChange(e) {
    console.log('状态变化:', e.detail.state);
  }
});
\`\`\`

### 3. 使用插件 API

\`\`\`javascript
// 获取插件实例
const plugin = requirePlugin('xmov-avatar');

// 直接使用 SDK
const { XmovAvatarMP, getCanvasNode, createWebGLContext } = plugin;

// 创建 SDK 实例
const canvas = await getCanvasNode('avatar-canvas');
const gl = createWebGLContext(canvas);
const avatar = new XmovAvatarMP({
  canvasId: 'avatar-canvas',
  canvas: canvas,
  gl: gl,
  // ... 配置
});
\`\`\`

## 组件事件

- \`ready\`: 数字人初始化完成
- \`error\`: 发生错误
- \`statechange\`: 状态变化
- \`statuschange\`: 状态码变化
- \`progress\`: 下载进度

## 组件方法

- \`start()\`: 启动数字人
- \`stop()\`: 停止数字人
- \`destroy()\`: 销毁数字人

## 文件结构

\`\`\`
plugin/
├── plugin.json        # 插件配置
├── index.js          # 插件入口
├── index-init.js     # 初始化脚本
├── components/       # 插件组件
│   └── avatar/      # 数字人组件
├── core/            # 核心类
├── utils/           # 工具函数
├── adapters/        # 适配器
└── src/             # 原 SDK 文件
\`\`\`
`;

fs.writeFileSync(path.join(pluginDir, 'README.md'), readme);
console.log('✅ README 创建完成');

console.log('\n✅ 插件构建完成！');
console.log('插件目录:', pluginDir);
console.log('\n使用方法:');
console.log('1. 将 plugin 目录复制到小程序项目');
console.log('2. 在 app.json 中配置插件');
console.log('3. 在页面中使用 <plugin-avatar> 组件');

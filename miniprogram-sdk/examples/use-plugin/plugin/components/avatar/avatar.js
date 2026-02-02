/**
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

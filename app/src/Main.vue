<template>
  <div class="main-container">
    <div v-if="loading" class="loading" />
    <!-- 帮助说明弹窗 -->
    <div class="help-modal" v-if="showHelp" @click="showHelp = false">
      <div class="help-content" @click.stop>
        <div class="help-header">
          <h3>操作说明</h3>
          <button class="help-close" @click="showHelp = false">×</button>
        </div>
        <div class="help-body">
          <p><strong>1.</strong> 点击 <code>init</code> 会直接运行虚拟人</p>
          <p>
            <strong>2.</strong> 点击 <code>stop</code> 会暂停虚拟人的当前动作
          </p>
          <p><strong>3.</strong> 点击 <code>destroy</code> 会销毁虚拟人</p>
          <p>
            <strong>4.</strong> 在销毁之后重新运行点击 <code>reload</code> 即可
          </p>
        </div>
      </div>
    </div>

    <!-- 左侧配置模块（带收缩功能） -->
    <div class="left-panel" :class="{ collapsed: isLeftCollapsed }">
      <!-- 左侧收缩按钮 -->
      <div class="panel-collapse-btn left-collapse-btn" @click="isLeftCollapsed = !isLeftCollapsed">
        {{ isLeftCollapsed ? '▶' : '◀' }}
      </div>
      <div class="panel-content">
        <div class="panel-header">
          <h3>配置设置</h3>
        </div>

        <!-- 配置JSON输入 -->
        <div class="config-section">
          <div class="config-selector">
            <label class="config-label">选择配置模板</label>
            <select v-model="selectedConfig" @change="applySelectedConfig" class="config-select">
              <option value="female">4k女生</option>
              <option value="male">4K男生</option>
              <option value="4k-small">4k--</option>
              <option value="1080p">1080p女生</option>
              <option value="robot">机器人</option>
              <option value="cartoon">卡通</option>
              <option value="walk">行走</option>
            </select>
          </div>
          <textarea v-model="configJson" class="config-textarea" placeholder="请输入配置JSON" rows="8"></textarea>
        </div>

        <!-- SDK连接配置 -->
        <div class="config-section">
          <div class="config-row">
            <label class="config-label">App ID</label>
            <input v-model="appId" class="config-input" placeholder="请输入App ID" type="text" />
          </div>
          <div class="config-row">
            <label class="config-label">App Secret</label>
            <input v-model="appSecret" class="config-input" placeholder="请输入App Secret" type="text" />
          </div>
          <div class="config-row">
            <label class="config-label">房间tag</label>
            <input v-model="tag" class="config-input" placeholder="请输入tag" type="text" />
          </div>
          <div class="config-row">
            <label class="config-label">Gateway Server</label>
            <input v-model="gatewayServer" class="config-input" placeholder="请输入Gateway Server" type="text" />
          </div>
        </div>

        <!-- 横竖屏切换 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">横屏模式</span>
            <div class="switch" :class="{ active: isLandscape }" @click="toggleOrientation">
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>

        <!-- 字幕开关 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">显示字幕</span>
            <div class="switch" :class="{ active: showSubtitle }" @click="toggleSubtitle">
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>
        <!-- 日志开关 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">展示日志</span>
            <div class="switch" :class="{ active: enableLogger }" @click="toggleLogger">
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>
        <!-- 调试开关 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">调试模式</span>
            <div class="switch" :class="{ active: enableDebugger }" @click="toggleDebugger">
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>
        <!-- 客户端中断开关 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">客户端中断</span>
            <div class="switch" :class="{ active: enableClientInterrupt }" @click="toggleClientInterrupt">
              <div class="switch-handle"></div>
            </div>
          </div>
        </div>
        <!-- 重放开关 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">重放模式</span>
            <input style="width: 170px" type="file" @change="uploadReplayData" />
          </div>
        </div>
        <!-- 音频模式切换 -->
        <div class="config-section">
          <div class="switch-group">
            <span class="switch-label">WebM 模式 (raw_audio=false)</span>
            <div class="switch" :class="{ active: isWebMMode }" @click="toggleWebMMode">
              <div class="switch-handle"></div>
            </div>
          </div>
          <p style="color: #999; font-size: 11px; text-align: left; margin-top: 4px;">
            开启后使用 WebM 音频，关闭使用 PCM 音频
          </p>
        </div>
        <div class="config-section">
          <button class="btn btn-primary btn-sm" @click="applyConfig">应用配置</button>
          <p style="color: #999; font-size: 12px; text-align: left; margin-top: 4px;">
            上述配置更新点击应用配置按钮即可，点击init无效
          </p>
        </div>
        <!-- 音量控制 -->
        <div class="config-section">
          <div class="volume-control">
            <input type="range" min="0" max="1" step="0.1" v-model="volume" @input="setVolume" class="volume-slider" />
            <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 中间播放模块 -->
    <div class="center-panel">
      <div class="canvas-container" :style="canvasStyle">
        <div id="sdk" style="width: 100%; height: 100%"></div>
        <!-- 字幕显示区域 -->
        <div class="subtitle-container" v-if="isSubtitleVisible && showSubtitle">
          <div class="subtitle-text">{{ subtitleText }}</div>
        </div>
        <!-- 全屏按钮移到canvas容器外部 -->
        <button class="btn btn-fullscreen btn-sm" v-if="!isFullScreen" @click="fullScreen">
          <span class="icon">⛶</span>
          全屏
        </button>
        <button class="btn btn-fullscreen btn-sm" v-else @click="exitFullScreen">
          <span class="icon">⛶</span>
          退出全屏
        </button>
      </div>
    </div>

    <!-- 右侧功能模块（带收缩功能） -->
    <div class="right-panel" :class="{ collapsed: isRightCollapsed }">
      <!-- 右侧收缩按钮 -->
      <div class="panel-collapse-btn right-collapse-btn" @click="isRightCollapsed = !isRightCollapsed">
        {{ isRightCollapsed ? '◀' : '▶' }}
      </div>
      <div class="panel-content">
        <div class="panel-header">
          <h3>功能控制</h3>
        </div>

        <!-- SDK运行状态控制 -->
        <div class="function-section">
          <div class="button-grid">
            <button class="btn btn-primary btn-sm" @click="reload">reload</button>
            <button class="btn btn-danger btn-sm" @click="destroy">destroy</button>
          </div>
        </div>

        <!-- 功能切换状态按钮 -->
        <div class="function-section">
          <div class="button-grid">
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.idle">idle</button>
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.listen">listen</button>
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.think">think</button>
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.interactiveidle">interactiveidle</button>
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.offlineMode">in_offline_idle</button>
            <button class="btn btn-secondary btn-sm" @click="LiteSDK?.onlineMode">out_offline_idle</button>
          </div>
        </div>

        <!-- 文本输入区域 -->
        <div class="function-section">
          <div class="input-group">
            <textarea v-model="speakText" class="text-input" placeholder="请输入要播放的文本..." rows="20"></textarea>
            <div class="config-selector">
              <label class="config-label">缓存状态</label>
              <select v-model="enable_speech_cache" class="config-select">
                <option value="default">默认</option>
                <option value="enable">开启缓存</option>
                <option value="disable">关闭缓存</option>
              </select>
            </div>
            <button class="btn btn-primary full-width" @click="speak">
              speak
            </button>
          </div>


          <!-- 自定义行走点位配置 -->
          <div class="function-section">
            <label class="config-label">自定义layout配置</label>
            <textarea v-model="layoutConfigJson" class="config-textarea" placeholder="请输入layout配置JSON"
              rows="6"></textarea>

            <label class="config-label">行走点位配置</label>
            <textarea v-model="walkConfigJson" class="config-textarea" placeholder="请输入行走点位JSON" rows="6"></textarea>
            <div class="button-grid" style="margin-top: 8px;">
              <button class="btn btn-primary btn-sm" @click="applyWalkConfig">应用点位</button>
              <button class="btn btn-secondary btn-sm" @click="resetWalkConfig">重置点位</button>
            </div>
          </div>

          <!-- Debug信息开关 -->
          <div class="function-section">
            <div class="button-grid">
              <button class="btn btn-info btn-sm" @click="LiteSDK?.showDebugInfo">showDebugInfo</button>
              <button class="btn btn-info btn-sm" @click="LiteSDK?.hideDebugInfo">hideDebugInfo</button>
            </div>
          </div>
          <!-- 启动行走测试 -->
          <div class="function-section">
            <div class="button-grid">
              <button class="btn btn-info btn-sm" @click="openWalkTestWindow">打开行走测试</button>
              <button class="btn btn-info btn-sm" @click="closeWalkTestWindow">关闭行走测试</button>
            </div>
          </div>
          
        </div>
      </div>

      <!-- Canvas显隐控制 -->
      <div class="function-section">
        <div class="button-grid">
          <button 
            class="btn" 
            :class="isAvatarVisible ? 'btn-success' : 'btn-warning'"
            @click="toggleAvatarVisible"
          >
            {{ isAvatarVisible ? '隐藏数字人' : '显示数字人' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
  // @ts-ignore
import XmovAvatar from "youling-lite";

let LiteSDK: XmovAvatar | null;
const emit = defineEmits(["fullScreen"]);

// 响应式数据
const isFullScreen = ref(false);
const isLandscape = ref(false);
const showSubtitle = ref(true);
const enableLogger = ref(false);
const enableDebugger = ref(false);
const enableClientInterrupt = ref(false);
const volume = ref(1);
const speakText = ref("");
const showHelp = ref(false);
const subtitleText = ref("");
const isSubtitleVisible = ref(false);
const selectedConfig = ref("1080p");
const replayData = ref(null);
const isAvatarVisible = ref(true); // 数字人canvas显隐状态
// 新增：面板收缩状态
const isLeftCollapsed = ref(false);
const isRightCollapsed = ref(false);
// 新增：缓存状态配置
const enable_speech_cache = ref('default');
const loading = ref(false)
// 新增：WebM 模式状态
const isWebMMode = ref(false);
const testRunning = ref(false);
const webmStatus = ref({
  mseSpeechId: -1,
  mseFirstFrameIndex: -1,
  isPlaying: false,
  queueLength: 0
});
let statusIntervalId: number | null = null; // 状态更新定时器ID

// SDK连接配置 - 从环境变量获取，如果没有则使用默认值
// @ts-ignore
const appId = ref(import.meta.env.VITE_APP_ID || "123123123");
// @ts-ignore
const appSecret = ref(import.meta.env.VITE_APP_SECRET || "123123123");
// @ts-ignore
const tag = ref(import.meta.env.VITE_TAG || '')
// @ts-ignore
const gatewayServer = ref(import.meta.env.VITE_GATEWAY_SERVER || 'https://pre-ttsa-gateway-lite.xingyun3d.com/api/session');

// 默认布局和行走配置
const defaultLayout = {
  "container": {
    "size": [1440, 810]
  },
  "avatar": {
    "v_align": "center",
    "h_align": "middle",
    "scale": 0.3, // 人物大小 = 分辨率 * scale
    "offset_x": 0,
    "offset_y": 0
  }
}

// 大于100px
const defaultWalkConfig = {
  "min_x_offset": -500,
  "max_x_offset": 500,
  "walk_points": {
    "A": -500,
    "B": -400,
    "C": -300,
    "D": -200,
    "E": -100,
    "F": 0,
    "G": 100,
    "H": 200,
    "I": 300,
    "J": 400,
    "K": 500
  },
  "init_point": 0
}

// 新增：行走配置JSON（默认值为defaultWalkConfig）
const walkConfigJson = ref(JSON.stringify(defaultWalkConfig, null, 2));
// 新增：layout配置JSON（默认值为defaultLayout）
const layoutConfigJson = ref(JSON.stringify(defaultLayout, null, 2));

// 默认配置 - 从环境变量获取，如果没有则使用默认值
const defaultConfigBase = {
    "auto_ka": true,
    "cleaning_text": true,
    "emotion_version": "v1_version",
    "figure_name": "SCF25_001",
    "framedata_proto_version": 2,
    "init_events": [
    ],
    "is_large_model": false,
    "is_vertical": true,
    "language": "chinese",
    "lite_drive_style": "service1",
    "llm_name": "Doubao",
    "look_name": "N_Wuliping_14333_new",
    "mp_service_id": "F_CN02_show52",
    "optional_emotion": "serious,smile,confused",
    "pitch": 1,
    "raw_audio": false,
    "render_preset": "1080x1920_fullbody",
    "resolution": {
        "height": 1920,
        "width": 1080
    },
    "sta_face_id": "F_lively02_xiaoze",
    "tts_emotion": "neutral",
    "tts_speed": 1,
    "tts_split_length": 16,
    "tts_split_row": 1,
    "tts_vcn_id": "XMOV_HN_TTS__43",
    "volume": 1
}

// 从环境变量解析配置，如果解析失败或不存在则使用默认值
let defaultConfig = defaultConfigBase;
// @ts-ignore
if (import.meta.env.VITE_DEFAULT_CONFIG) {
  try {
    // @ts-ignore
    const envConfig = JSON.parse(import.meta.env.VITE_DEFAULT_CONFIG);
    // 合并环境变量配置和默认配置，环境变量配置优先
    defaultConfig = { ...defaultConfigBase, ...envConfig };
  } catch (error) {
    console.warn('[Main.vue] Failed to parse VITE_DEFAULT_CONFIG, using default config:', error);
  }
}
const configJson = ref(JSON.stringify(defaultConfig, null, 2));

// 默认播放文本
const defaultSpeakText = `<speak>
    <ue4event>
        <type>walk</type>
        <data>
            <target>K</target>
        </data>
    </ue4event>
汉皇重色思倾国，御宇多年求不得。杨家有女初长成，养在深闺人未识。天生丽质难自弃，一朝选在君王侧。回眸一笑百媚生，六宫粉黛无颜色。春寒赐浴华清池，温泉水滑洗凝脂。侍儿扶起娇无力，始是新承恩泽时。云鬓花颜金步摇，芙蓉帐暖度春宵。春宵苦短日高起，从此君王不早朝。承欢侍宴无闲暇，春从春游夜专夜。后宫佳丽三千人，三千宠爱在一身。金屋妆成娇侍夜，玉楼宴罢醉和春。姊妹弟兄皆列土，可怜光彩生门户。遂令天下父母心，不重生男重生女。骊宫高处入青云，仙乐风飘处处闻。缓歌谩舞凝丝竹，尽日君王看不足。渔阳鼙鼓动地来，惊破霓裳羽衣曲。九重城阙烟尘生，千乘万骑西南行。翠华摇摇行复止，西出都门百余里。六军不发无奈何，宛转蛾眉马前死。花钿委地无人收，翠翘金雀玉搔头。君王掩面救不得，回看血泪相和流。黄埃散漫风萧索，云栈萦纡登剑阁。峨嵋山下少人行，旌旗无光日色薄。蜀江水碧蜀山青，圣主朝朝暮暮情。行宫见月伤心色，夜雨闻铃肠断声。天旋地转回龙驭，到此踌躇不能去。马嵬坡下泥土中，不见玉颜空死处。君臣相顾尽沾衣，东望都门信马归。归来池苑皆依旧，太液芙蓉未央柳。芙蓉如面柳如眉，对此如何不泪垂。春风桃李花开日，秋雨梧桐叶落时。西宫南内多秋草，落叶满阶红不扫。梨园弟子白发新，椒房阿监青娥老。夕殿萤飞思悄然，孤灯挑尽未成眠。迟迟钟鼓初长夜，耿耿星河欲曙天。鸳鸯瓦冷霜华重，翡翠衾寒谁与共。悠悠生死别经年，魂魄不曾来入梦。临邛道士鸿都客，能以精诚致魂魄。为感君王辗转思，遂教方士殷勤觅。排空驭气奔如电，升天入地求之遍。上穷碧落下黄泉，两处茫茫皆不见。忽闻海上有仙山，山在虚无缥渺间。楼阁玲珑五云起，其中绰约多仙子。中有一人字太真，雪肤花貌参差是。金阙西厢叩玉扃，转教小玉报双成。闻道汉家天子使，九华帐里梦魂惊。揽衣推枕起徘徊，珠箔银屏迤逦开。云鬓半偏新睡觉，花冠不整下堂来。风吹仙袂飘飘举，犹似霓裳羽衣舞。玉容寂寞泪阑干，梨花一枝春带雨。含情凝睇谢君王，一别音容两渺茫。昭阳殿里恩爱绝，蓬莱宫中日月长。回头下望人寰处，不见长安见尘雾。惟将旧物表深情，钿合金钗寄将去。钗留一股合一扇，钗擘黄金合分钿。但教心似金钿坚，天上人间会相见。临别殷勤重寄词，词中有誓两心知。七月七日长生殿，夜半无人私语时。在天愿作比翼鸟，在地愿为连理枝。天长地久有时尽，此恨绵绵无绝期。
</speak>`;

speakText.value = defaultSpeakText;

// 计算属性
const canvasStyle = computed(() => {
  if (isFullScreen.value) {
    return {
      width: "100vw",
      height: "100vh",
      position: "fixed" as const,
      left: 0,
      top: 0,
      background: "#eee",
      zIndex: 10,
      transform: "scale(1)",
    };
  }

  if (isLandscape.value) {
    return { minWidth: "800px", height: "480px" };
  } else {
    return {
      minWidth: "480px",
      height: "800px",
    };
  }
});

// 新增：应用行走点位配置
const applyWalkConfig = () => {
  try {
    const walkConfig = JSON.parse(walkConfigJson.value);
    const layoutConfig = JSON.parse(layoutConfigJson.value);
    if (LiteSDK) {
      LiteSDK.changeWalkConfig(walkConfig);
      LiteSDK.changeLayout(layoutConfig);
      // 更新主配置中的walk_config
      const mainConfig = JSON.parse(configJson.value);
      mainConfig.walk_config = walkConfig;
      mainConfig.layout = layoutConfig;
      configJson.value = JSON.stringify(mainConfig, null, 2);
      alert("行走点位配置已应用");
    } else {
      alert("请先初始化SDK");
    }
  } catch (e) {
    console.error("行走点位配置解析失败", e);
    alert("JSON格式错误，请检查配置");
  }
};

function setLoading(params: boolean) {
  loading.value = params
}

const resetWalkConfig = () => {
  walkConfigJson.value = JSON.stringify(defaultWalkConfig, null, 2);
  layoutConfigJson.value = JSON.stringify(defaultLayout, null, 2);
  if (LiteSDK) {
    LiteSDK.changeWalkConfig(defaultWalkConfig);
    LiteSDK.changeLayout(defaultLayout);
  }
};

// 方法
function instance() {
  const config = JSON.parse(configJson.value);
  LiteSDK = new XmovAvatar({
    containerId: "#sdk",
    appId: appId.value || "123",
    appSecret: appSecret.value || "123",
    gatewayServer:
      gatewayServer.value || "https://test-ttsa-gateway-lite.xmov.ai",
    headers: {
      'Authorization': '888jn',
    },
    tag: tag.value,
    enableLogger: enableLogger.value,
    enableDebugger: enableDebugger.value,
    enableClientInterrupt: enableClientInterrupt.value,
    config,
    hardwareAcceleration: "prefer-hardware",
    // onWidgetEvent: (e:any) => {
    //   console.log("onWidgetEvent", e);
    //   if (e.type === "subtitle_on") {
    //     isSubtitleVisible.value = true;
    //     subtitleText.value = e.text;
    //   } else if (e.type === "subtitle_off") {
    //     isSubtitleVisible.value = false;
    //     subtitleText.value = "";
    //   }
    // },
    onNetworkInfo(networkInfo: any) {
      console.log("NetworkInfo:", networkInfo);
    },
    onStateChange(state: string) {
      console.log("SDK State Change:", state);
    },
    onStatusChange(status: any) {
      if(status === 1) {
        console.log("数字人已离线");
      }
      if(status === 0) {
        console.log("数字人已上线");
      }
      console.log("SDK Status Change:", status, LiteSDK);
    },
    onVoiceStateChange(state: string) {
      console.log("SDK Voice State Change:", state);
    },
    onStateRenderChange(state: string, duration: number) {
      console.log("SDK State Change Render:", state, duration);
    },
    onMessage(e: any) {
      setLoading(false)
      console.error("[onMessage]", e);
    },
    onWalkStateChange(state: string) {
      console.log("onWalkStateChange", state);
    },
    onStartSessionWarning(message: Object)  {
      console.log("onStartSessionWarning===========", message);
    },
    onAAFrameHandle(data: any) {
      // 这里下发数据给机器人
      console.log("onAAFrameHandle=====", data);
    }
  });
  
  // 更新 window 上的引用，方便调试
  if (typeof window !== 'undefined') {
    (window as any).LiteSDK = LiteSDK;
  }
}

const openWalkTestWindow = () => {
  // @ts-ignore
  if (!window.IPC) {
    alert("请在electron应用中打开");
    return
  }
  // @ts-ignore
  window.IPC.ipcSend("open-walk-window");
}

const closeWalkTestWindow = () => {
  // @ts-ignore
  if (!window.IPC) {
    alert("请在electron应用中打开");
    return
  }
  // @ts-ignore
  window.IPC.ipcSend("close-walk-window");
}

function init() {
  if (replayData.value && LiteSDK) {
    LiteSDK?.setReplayData(replayData.value);
  }
  LiteSDK?.init({
    onDownloadProgress: (progress: number) => {
      console.log("progress", progress);
      if (progress === 100) {
        setLoading(false)
        LiteSDK?.showDebugInfo();
      }
    },
  });
}

async function reload() {
  if (loading.value) {
    return
  }
  setLoading(true)
  if (LiteSDK) {
    await destroy();
  }
  instance();
  init();
}

async function destroy() {
  subtitleText.value = "";
  isSubtitleVisible.value = false;
  await LiteSDK?.destroy();
  LiteSDK = null;
  // 更新 window 上的引用
  if (typeof window !== 'undefined') {
    (window as any).LiteSDK = null;
  }
}

function speak() {
  if (enable_speech_cache.value === 'default') {
    LiteSDK?.speak(speakText.value, true, true);
  } else {
    LiteSDK?.speak(speakText.value, true, true, {
      enable_speech_cache: enable_speech_cache.value === 'enable' ? true : false,
    });
  }
}

// 切换数字人canvas显隐
function toggleAvatarVisible() {
  isAvatarVisible.value = !isAvatarVisible.value;
  LiteSDK?.changeAvatarVisible(isAvatarVisible.value);
}

// function performSkill() {
//   if (skillAction.value.trim()) {
//     LiteSDK?.skill(skillAction.value);
//   }
// }

function setVolume() {
  LiteSDK?.setVolume(volume.value);
}

function applyConfig() {
  reload()
}

function applySelectedConfig() {
  if (selectedConfig.value) {
    let templateConfig;

    if (selectedConfig.value === "female") {
      templateConfig = {
        "auto_ka": false,
        "cleaning_text": true,
        "emotion_version": "v1_version",
        "figure_name": "SCF25_001",
        "framedata_proto_version": 2,
        "init_events": [],
        "is_large_model": true,
        "is_vertical": true,
        "language": "english",
        "lite_drive_style": "lively",
        "look_name": "amanda_14600_new",
        "mp_service_id": "F_CN02_show52",
        "optional_emotion": "serious,smile,confused",
        "pitch": 1,
        "raw_audio": true,
        "render_preset": "1944x3456_fullbody",
        "resolution": {
          "height": 3456,
          "width": 1944
        },
        "sta_face_id": "F_EN02_elizabethT",
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 28,
        "tts_split_row": 2,
        "tts_vcn_id": "XMOV_EN_TTS__5",
        "volume": 1
      }
    } else if (selectedConfig.value === "male") {
      templateConfig = {
        "auto_ka": false,
        "cleaning_text": true,
        "emotion_version": "v1_version",
        "figure_name": "SCM20_001",
        "framedata_proto_version": 2,
        "init_events": [],
        "is_large_model": false,
        "is_vertical": true,
        "language": "english",
        "lite_drive_style": "lively",
        "look_name": "caixiangyu_14601_new",
        "mp_service_id": "M_CN03_show03",
        "optional_emotion": "serious,smile,confused",
        "pitch": 1,
        "raw_audio": true,
        "render_preset": "1944x3456_fullbody",
        "resolution": {
          "height": 3456,
          "width": 1944
        },
        "sta_face_id": "M_EN00_thomas",
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 28,
        "tts_split_row": 2,
        "tts_vcn_id": "XMOV_EN_TTS__6",
        "volume": 1
      }
    } else if(selectedConfig.value === '4k-small'){
      templateConfig = {
        "auto_ka": false,
        "cleaning_text": true,
        "emotion_version": "v1_version",
        "figure_name": "SCF25_001",
        "framedata_proto_version": 2,
        "init_events": [
            {
                "axis_id": 100,
                "height": 0.9458128078817734,
                "image": "https://media.xingyun3d.com/avatar_sdk_material/M_MX02_show__1080x1920_fullbody__Look_ZMD_BOY.png",
                "type": "SetCharacterCanvasAnchor",
                "width": 0.9458128078817734,
                "x_location": 0.029154518950437316,
                "y_location": -0.03284072249589491
            },
            {
                "data": {
                    "axis_id": 1,
                    "height": 1,
                    "image": "https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_ChineseLandscape_02.png",
                    "width": 1,
                    "x_location": 0,
                    "y_location": 0
                },
                "type": "widget_pic"
            }
        ],
        "is_large_model": true,
        "is_vertical": true,
        "language": "chinese",
        "lite_drive_style": "lively",
        "look_name": "amanda_14600_new",
        "mp_service_id": "F_CN02_show52",
        "optional_emotion": "smile,confused,serious",
        "pitch": 1,
        "raw_audio": true,
        "render_preset": "1620x2880_fullbody",
        "resolution": {
            "height": 2880,
            "width": 1620
        },
        "sta_face_id": "F_CN05_niujingxin",
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 16,
        "tts_split_row": 1,
        "tts_vcn_id": "XMOV_HN_TTS__8",
        "volume": 1,
        "layout": defaultLayout
    }
    } else if (selectedConfig.value === '1080p') {
      templateConfig = {
        "auto_ka": true,
        "cleaning_text": true,
        "emotion_version": "v1_version",
        "figure_name": "SCF25_001",
        "framedata_proto_version": 2,
        "init_events": [
        ],
        "is_large_model": false,
        "is_vertical": true,
        "language": "chinese",
        "lite_drive_style": "service1",
        "llm_name": "Doubao",
        "look_name": "N_Wuliping_14333_new",
        "mp_service_id": "F_CN02_show52",
        "optional_emotion": "serious,smile,confused",
        "pitch": 1,
        "raw_audio": false,
        "render_preset": "1080x1920_fullbody",
        "resolution": {
            "height": 1920,
            "width": 1080
        },
        "sta_face_id": "F_lively02_xiaoze",
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 16,
        "tts_split_row": 1,
        "tts_vcn_id": "XMOV_HN_TTS__43",
        "volume": 1,
        "layout": defaultLayout
      }
    } else if (selectedConfig.value === "robot") {
      templateConfig = {
        "auto_ka": true,
        "cleaning_text": true,
        "figure_name": "YUANZHENG_ROBOT",
        "framedata_proto_version": 2,
        "init_events": [],
        "is_large_model": false,
        "is_vertical": false,
        "language": "chinese",
        "lite_drive_style": "lively",
        "llm_name": "Doubao",
        "look_name": "YuanZheng_robot_02",
        "mp_service_id": "M_RO08_show",
        "optional_emotion": "serious,smile,confused",
        "pitch": 1,
        "raw_audio": true,
        "render_preset": "1080x1920_fullbody",
        "resolution": {
          "height": 1920,
          "width": 1080
        },
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 24,
        "tts_split_row": 1,
        "tts_vcn_id": "XMOV_HN_TTS__603",
        "volume": 1
      };
    } else if (selectedConfig.value === "cartoon") {
      templateConfig = {
        "auto_ka": true,
        "cleaning_text": true,
        "figure_name": "CARTOON_MONKEY",
        "framedata_proto_version": 2,
        "init_events": [],
        "is_large_model": false,
        "is_vertical": false,
        "language": "chinese",
        "lite_drive_style": "lively",
        "llm_name": "Doubao",
        "look_name": "cartoon_monkey_001",
        "mp_service_id": "M_cartoon02_show",
        "pitch": 1,
        "raw_audio": true,
        "render_preset": "1080x1920_fullbody",
        "resolution": {
          "height": 1920,
          "width": 1080
        },
        "sta_face_id": "T_MONKEY",
        "tts_emotion": "neutral",
        "tts_speed": 1,
        "tts_split_length": 24,
        "tts_split_row": 1,
        "tts_vcn_id": "HS__zh_BV061_streaming",
        "volume": 1
      }
    } else if (selectedConfig.value === 'walk') {
      templateConfig = {
        "look_name": "FF008_6530_new",
        "tts_vcn_id": "XMOV_HN_TTS__4",
        "is_large_model": false,
        "sta_face_id": "F_CN02_yuxuan",
        "mp_service_id": "F_CN02_show52_walk_test",
        "framedata_proto_version": 2,
        "figure_name": "SCF25_001",
        "lite_drive_style": "lively",
        "background_img": "https://media.youyan.xyz/youyan/images/shot_layer_library/2D_background/ppt_train_02__2D_background.png",
        "frame_rate": 24,
        "optional_emotion": "",
        "init_events": [
          {
            "data": {
              "axis_id": 1,
              "height": 1,
              "image": "https://media.xingyun3d.com/xingyun3d/general/litehuman/background_2D/jushen_v1_black_and_gold_style_office_02.png",
              "width": 1,
              "x_location": 0,
              "y_location": 0
            },
            "type": "widget_pic"
          }
        ],
        "auto_ka": true,
        "render_preset": "1080x1920_fullbody",
        "layout": defaultLayout,
        "walk_config": defaultWalkConfig
      }
    }

    if (templateConfig) {
      configJson.value = JSON.stringify(templateConfig, null, 2);
    }
  }
}

function toggleOrientation() {
  isLandscape.value = !isLandscape.value;
  if (LiteSDK) {
    reload();
  }
}

function toggleSubtitle() {
  showSubtitle.value = !showSubtitle.value;
  if (!showSubtitle.value) {
    isSubtitleVisible.value = false;
    subtitleText.value = "";
  }
}

function toggleLogger() {
  enableLogger.value = !enableLogger.value;
}

function toggleDebugger() {
  enableDebugger.value = !enableDebugger.value;
}

// 切换客户端中断
function toggleClientInterrupt() {
  enableClientInterrupt.value = !enableClientInterrupt.value;
}



// 切换 WebM 模式
function toggleWebMMode() {
  isWebMMode.value = !isWebMMode.value;
  if (LiteSDK) {
    // 更新配置中的 raw_audio
    try {
      const config = JSON.parse(configJson.value);
      config.raw_audio = !isWebMMode.value; // false = WebM, true = PCM
      configJson.value = JSON.stringify(config, null, 2);
      alert(`已切换到 ${isWebMMode.value ? 'WebM' : 'PCM'} 模式，请点击"应用配置"生效`);
    } catch (e) {
      console.error('配置解析失败', e);
    }
  }
}

// 检查 WebM 状态
function checkWebMStatus() {
  if (!LiteSDK) {
    alert('请先初始化 SDK');
    return;
  }
  
  const renderer = (LiteSDK as any).audioRenderer;
  if (!renderer) {
    // alert('无法获取音频渲染器');
    return;
  }
  
  webmStatus.value = {
    mseSpeechId: renderer.mseSpeechId ?? -1,
    mseFirstFrameIndex: renderer.mseFirstFrameIndex ?? -1,
    isPlaying: renderer.mseAudioPlayer?.isPlaying ?? false,
    queueLength: renderer.mseAudioPlayer?.getStats()?.queueLength ?? 0
  };
  
  console.log('WebM 状态:', webmStatus.value);
}



// 快速切换测试（连续发送3个对话）
async function testQuickSwitch() {
  if (!LiteSDK) {
    alert('请先初始化 SDK');
    return;
  }
  
  if (testRunning.value) {
    return;
  }
  
  testRunning.value = true;
  checkWebMStatus();
  
  try {
    console.log('🧪 开始快速切换测试...');
    
    // 第一个对话
    console.log('→ 发送第一个对话...');
    await LiteSDK.speak('你好，这是第一个对话，应该正常播放', true, true);
    checkWebMStatus();
    
    // 等待 1.5 秒（在第一个对话播放过程中）
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 第二个对话（应该在第一个对话停止后立即播放）
    console.log('→ 发送第二个对话（第一个对话应该立即停止）...');
    await LiteSDK.speak('这是第二个对话，应该在第一个对话停止后立即播放', true, true);
    checkWebMStatus();
    
    // 等待 1.5 秒
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 第三个对话
    console.log('→ 发送第三个对话...');
    await LiteSDK.speak('这是第三个对话，测试完成', true, true);
    checkWebMStatus();
    
    console.log('✅ 测试完成，请观察：');
    console.log('   - 每个新对话是否立即停止前一个对话');
    console.log('   - 音频是否按顺序播放，没有重叠');
    console.log('   - 是否有音频混合或异常');
    
    setTimeout(() => {
      checkWebMStatus();
    }, 1000);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    alert('测试失败，请查看控制台');
  } finally {
    testRunning.value = false;
  }
}

// 停止恢复测试
async function testStopAndResume() {
  if (!LiteSDK) {
    alert('请先初始化 SDK');
    return;
  }
  
  if (testRunning.value) {
    return;
  }
  
  testRunning.value = true;
  
  try {
    console.log('🧪 开始停止恢复测试...');
    
    // 发送一个较长的对话
    console.log('→ 发送长对话...');
    await LiteSDK.speak('这是一个较长的对话内容，用于测试停止功能，需要播放较长时间才能完成', true, true);
    checkWebMStatus();
    
    // 等待 2 秒后停止
    setTimeout(async () => {
      console.log('→ 停止播放...');
      const renderer = (LiteSDK as any).audioRenderer;
      if (renderer && renderer.mseSpeechId !== -1) {
        renderer.stop(renderer.mseSpeechId);
        checkWebMStatus();
        
        // 等待 500ms 后发送新对话
        setTimeout(async () => {
          console.log('→ 发送新对话...');
          await LiteSDK.speak('这是停止后的新对话，应该正常播放', true, true);
          checkWebMStatus();
          
          console.log('✅ 测试完成，请观察：');
          console.log('   - 停止后是否完全清理音频资源');
          console.log('   - 新对话是否正常播放');
          
          testRunning.value = false;
        }, 500);
      } else {
        testRunning.value = false;
      }
    }, 2000);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    alert('测试失败，请查看控制台');
    testRunning.value = false;
  }
}

// 停止当前音频
function stopCurrentAudio() {
  if (!LiteSDK) {
    alert('请先初始化 SDK');
    return;
  }
  
  const renderer = (LiteSDK as any).audioRenderer;
  if (!renderer) {
    // alert('无法获取音频渲染器');
    return;
  }
  
  if (renderer.mseSpeechId !== -1) {
    renderer.stop(renderer.mseSpeechId);
    checkWebMStatus();
    console.log('✅ 已停止当前音频');
  } else {
    alert('当前没有正在播放的音频');
  }
}

function uploadReplayData(e: any) {
  const file = e.target?.files?.[0];
  const reader = new FileReader();
  reader.onload = (e: any) => {
    const json = JSON.parse(e.target?.result);
    configJson.value = JSON.stringify(json.config, null, 2);
    replayData.value = json.inputs.filter(
      (item: any) => Number(item.client_frame_number) > 1
    );
    LiteSDK?.setReplayData(replayData.value);
  };
  reader.readAsText(file);
}

function fullScreen() {
  isFullScreen.value = true;
  emit("fullScreen", isFullScreen.value);
}

function exitFullScreen() {
  isFullScreen.value = false;
  emit("fullScreen", isFullScreen.value);
}

onMounted(() => {
  instance();
  
  // 定期更新 WebM 状态（如果启用）
  statusIntervalId = window.setInterval(() => {
    if (isWebMMode.value && LiteSDK) {
      checkWebMStatus();
    }
  }, 2000); // 每2秒更新一次
});

onUnmounted(() => {
  // 清除状态更新定时器
  if (statusIntervalId !== null) {
    clearInterval(statusIntervalId);
    statusIntervalId = null;
  }
  LiteSDK?.destroy();
});
</script>

<style scoped>
.main-container {
  display: flex;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  gap: 12px;
  /* 缩小间距 */
  box-sizing: border-box;
  min-height: 100vh;
}

/* 面板收缩样式 */
.left-panel,
.right-panel {
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
}

.left-panel {
  width: 300px;
  /* 缩小宽度 */
  min-width: 36px;
  border-radius: 8px;
  padding: 12px;
  /* 缩小内边距 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 24px);
  /* 缩小最大高度 */
  background: rgba(255, 255, 255, .5);
  z-index: 101;
}

.left-panel.collapsed {
  width: 36px;
}

.right-panel {
  width: 320px;
  /* 缩小宽度 */
  min-width: 36px;
  border-radius: 8px;
  padding: 12px;
  /* 缩小内边距 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 24px);
  /* 缩小最大高度 */
  background: rgba(255, 255, 255, .5);
  z-index: 101;
}

.right-panel.collapsed {
  width: 36px;
}

/* 收缩按钮样式 */
.panel-collapse-btn {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 16px;
  user-select: none;
}

.left-collapse-btn {
  top: 12px;
  left: 12px;
}

.right-collapse-btn {
  top: 12px;
  right: 12px;
}

/* 收缩时隐藏内容 */
.panel-content {
  transition: opacity 0.2s ease;
}

.left-panel.collapsed .panel-content,
.right-panel.collapsed .panel-content {
  opacity: 0;
  pointer-events: none;
}

/* 中间播放模块 */
.center-panel {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  padding: 8px 0;
}

.panel-header {
  margin-bottom: 12px;
  /* 缩小间距 */
  padding-bottom: 6px;
  /* 缩小间距 */
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  color: #262626;
  font-size: 15px;
  /* 缩小字体 */
  font-weight: 600;
}

.config-section,
.function-section {
  margin-bottom: 12px;
  /* 缩小间距 */
  flex-shrink: 0;
}

/* 配置JSON输入 */
.config-textarea {
  width: 100%;
  min-height: 60px;
  /* 缩小高度 */
  max-height: 200px;
  /* 缩小高度 */
  padding: 8px 10px;
  /* 缩小内边距 */
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 11px;
  /* 缩小字体 */
  line-height: 1.4;
  resize: vertical;
  background: #fafafa;
  overflow-y: auto;
  box-sizing: border-box;
}

.config-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 开关样式 */
.switch-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  /* 缩小间距 */
}

.switch-label {
  font-size: 13px;
  /* 缩小字体 */
  color: #595959;
}

.switch {
  position: relative;
  width: 40px;
  /* 缩小宽度 */
  height: 20px;
  /* 缩小高度 */
  background: #bfbfbf;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.switch.active {
  background: #1890ff;
}

.switch-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  /* 缩小宽度 */
  height: 16px;
  /* 缩小高度 */
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.switch.active .switch-handle {
  transform: translateX(20px);
  /* 调整偏移 */
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 缩小间距 */
}

.volume-slider {
  flex: 1;
  height: 4px;
  background: #d9d9d9;
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  /* 缩小宽度 */
  height: 14px;
  /* 缩小高度 */
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
}

.volume-value {
  min-width: 36px;
  /* 缩小宽度 */
  font-size: 11px;
  /* 缩小字体 */
  color: #8c8c8c;
}

/* 按钮样式（缩小版） */
.btn {
  border: none;
  border-radius: 4px;
  /* 缩小圆角 */
  font-size: 12px;
  /* 缩小字体 */
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  padding: 6px 10px;
  /* 缩小内边距 */
  min-width: 60px;
  /* 缩小最小宽度 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  /* 缩小间距 */
}

/* 超小按钮样式 */
.btn-sm {
  padding: 4px 8px;
  /* 进一步缩小内边距 */
  font-size: 11px;
  /* 进一步缩小字体 */
  min-width: 50px;
  /* 进一步缩小最小宽度 */
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background: #ff7875;
}

.btn-info {
  background: #13c2c2;
  color: white;
}

.btn-info:hover {
  background: #36cfc9;
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover {
  background: #73d13d;
}

.btn-warning {
  background: #faad14;
  color: white;
}

.btn-warning:hover {
  background: #ffc53d;
}

.btn-fullscreen {
  position: absolute;
  bottom: 12px;
  /* 缩小间距 */
  right: 12px;
  /* 缩小间距 */
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 16px;
  /* 缩小圆角 */
  padding: 6px 12px;
  /* 缩小内边距 */
  font-size: 11px;
  /* 缩小字体 */
  z-index: 9999;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  pointer-events: auto;
}

.btn-fullscreen:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.btn.full-width {
  width: 100%;
}

.btn-reset {
  margin-bottom: 12px;
  /* 缩小间距 */
}

/* 按钮网格 */
.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  /* 缩小间距 */
}

/* 输入组 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 缩小间距 */
}

.input-label {
  font-size: 11px;
  /* 缩小字体 */
  color: #595959;
  margin-bottom: 3px;
  /* 缩小间距 */
  font-weight: 500;
}

.text-input {
  width: 100%;
  min-height: 50px;
  /* 缩小高度 */
  max-height: 200px;
  /* 缩小高度 */
  padding: 8px 10px;
  /* 缩小内边距 */
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  /* 缩小字体 */
  line-height: 1.4;
  resize: vertical;
  background: white;
  overflow-y: auto;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* SDK连接配置样式 */
.config-section .config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 缩小间距 */
  margin-bottom: 6px;
  /* 缩小间距 */
}

.config-section .config-label {
  font-size: 11px;
  /* 缩小字体 */
  color: #595959;
  font-weight: 500;
  min-width: 55px;
  /* 缩小宽度 */
}

.config-section .config-input {
  flex: 1;
  min-height: 26px;
  /* 缩小高度 */
  padding: 6px 8px;
  /* 缩小内边距 */
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  /* 缩小字体 */
  line-height: 1.4;
  background: white;
  box-sizing: border-box;
}

.config-section .config-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 配置选择器样式 */
.config-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 缩小间距 */
  margin-bottom: 6px;
  /* 缩小间距 */
}

.config-select {
  flex: 1;
  min-height: 26px;
  /* 缩小高度 */
  padding: 6px 8px;
  /* 缩小内边距 */
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  /* 缩小字体 */
  line-height: 1.4;
  background: white;
  box-sizing: border-box;
}

.config-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* Canvas容器 */
.canvas-container {
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-repeat: round;
}

#sdk {
  position: relative;
}

/* 字幕显示区域 */
.subtitle-container {
  position: absolute;
  bottom: 40px;
  /* 缩小间距 */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  /* 缩小内边距 */
  border-radius: 6px;
  /* 缩小圆角 */
  font-size: 14px;
  /* 缩小字体 */
  font-weight: 500;
  z-index: 1000;
  max-width: 80%;
  min-width: 200px;
  word-break: break-word;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.subtitle-text {
  white-space: pre-wrap;
  line-height: 1.4;
  margin: 0;
}

/* 图标 */
.icon {
  font-size: 12px;
  /* 缩小字体 */
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-panel {
    width: 260px;
    /* 缩小宽度 */
  }

  .right-panel {
    width: 280px;
    /* 缩小宽度 */
  }
}

@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
    overflow: auto;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    height: auto;
    max-height: none;
  }

  .left-panel.collapsed,
  .right-panel.collapsed {
    width: 100%;
  }

  .left-panel.collapsed .panel-content,
  .right-panel.collapsed .panel-content {
    opacity: 1;
    pointer-events: auto;
  }
}

.loading {
  width: 100vw;
  height: 100vh;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255,255,255,.5);
  z-index: 1000;
}
.loading::before {
  content: '';
  width: 100px;
  height: 100px;
  background-color: #6366f1; /* 主题色 */
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  display: block;
  margin: 400px auto;
}
@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.7; }
}
</style>
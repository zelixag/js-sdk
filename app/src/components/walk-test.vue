<template>
  <div class="main-container" :style="sdkContainerStyle">
    <div id="sdk" style="height: 100%;position: absolute;aspect-ratio: 9/16;top: 0;right: 0;" :style="{transform: `translateX(${transformX}px)`}"></div>
    <div v-if="showTip" style="position: absolute;left: 50%;top: 50%;transform: translate(-50%,-50%);">loading:{{ sdkProgress }}%</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import XmovAvatar from "youling-lite";

let LiteSDK: XmovAvatar | null;

// SDK连接配置
const appId = ref("3b8f7000b8fd4b4b83dfc680600590b2");
const appSecret = ref("8b25a33d96684052a6a6e5cc604c2a94");
const gatewayServer = ref("https://pre-ttsa-gateway-lite.xingyun3d.com/api/session");
const sdkProgress = ref(0);
const transformX = ref(0);

const showTip = computed(() => {
  return sdkProgress.value !== 100;
});

const sdkContainerStyle = computed(() => {
  return showTip.value ? {
    background: "rgba(0,0,0,0.6)",
  } : {}
});

const removeListener =  window.IPC.ipcReceive("start-walk-test", () => {
  // 接收到行走测试指令，do something
  console.log("ipc-receive start-walk-test");
});

// 默认配置
const defaultConfig = {
    "auto_ka": true,
    "cleaning_text": true,
    "emotion_version": "v1_version",
    "figure_name": "SCF25_001",
    "framedata_proto_version": 1,
    "init_events": [
    ],
    "is_large_model": false,
    "is_vertical": true,
    "language": "english",
    "lite_drive_style": "lively",
    "llm_name": "Doubao",
    "look_name": "FF008_6530_new",
    "mp_service_id": "F_CN02_show52",
    "optional_emotion": "serious,smile,confused",
    "pitch": 1,
    "raw_audio": true,
    "render_preset": "1080x1920_fullbody",
    "resolution": {
        "height": 1920,
        "width": 1080
    },
    "sta_face_id": "F_EN02_elizabethT",
    "tts_speed": 1,
    "tts_split_length": 28,
    "tts_split_row": 2,
    "tts_vcn_id": "XMOV_EN_TTS__14",
    "volume": 1
}
const configJson = ref(JSON.stringify(defaultConfig, null, 2));
let is_first = true

function init() {
  const config = JSON.parse(configJson.value);
  LiteSDK = new XmovAvatar({
    containerId: "#sdk",
    appId: appId.value || "123",
    appSecret: appSecret.value || "123",
    gatewayServer:
      gatewayServer.value || "https://test-ttsa-gateway-lite.xmov.ai",
    config,
    headers: {
      'Authorization': '888jn',
    },
    hardwareAcceleration: "prefer-software",
    proxyWidget: {
      "widget_slideshow": (data: any) => {
        console.log("widget_slideshow", data);
      },
      "widget_video": (data: any) => {
        console.log("widget_video", data);
      },
      set_character_canvas_offset: (offsetX: number) => {
        offsetX = Math.round(offsetX)
        console.log("set_character_canvas_offset", {offsetX, is_first});
        // transformX.value = offsetX;
        window.IPC.ipcSend("set-character-canvas-offset", {offsetX, is_first});
        is_first = false;
      }
    },
    // onWidgetEvent(event: any) {
    //   console.log("event", event);
    // 处理字幕显示逻辑
    // if (event.type === "subtitle_on") {
    //   isSubtitleVisible.value = true;
    //   subtitleText.value = event.text;
    // } else if (event.type === "subtitle_off") {
    //   isSubtitleVisible.value = false;
    //   subtitleText.value = "";
    // }
    // 需要将输出的数据显示在字幕位置。
    // 返回的结果{type: 'subtitle_on', text: '您提到的医院似乎在查询相关信息'}
    // },
    onNetworkInfo(networkInfo) {
      console.log("NetworkInfo:", networkInfo);
    },
    onStateChange(state) {
      console.log("SDK State Change:", state);
    },
    onStatusChange(status) {
      console.log("SDK Status Change:", status);
    },
    onStateRenderChange(state, duration) {
      console.log("SDK State Change Render:", state, duration);
    },
    onMessage(e) {
      console.log('[onMessage]', e);
    }
  });
  LiteSDK.init({
    onDownloadProgress: (progress: number) => {
      sdkProgress.value = progress;
      console.log("progress", progress);
      if (progress === 100) {
        // LiteSDK?.showDebugInfo();
      }
    },
  });
}

onMounted(() => {
  init();
});
onUnmounted(() => {
  LiteSDK?.destroy();
  removeListener()
});
</script>

<style scoped>
.main-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  -webkit-app-region: drag;
}

</style>

import DefaultWidgetRenderer from "../modules/TrackRenderer/render-implements";
import TrackerRenderer from "../modules/TrackRenderer/index";
import { performanceConstant } from "../utils/perfermance";
import { AvatarStatus } from "../types";
export default class UIRenderer {
    constructor(options) {
        this.TAG = "[UIRenderer]";
        this.trackerRenderer = [];
        this.root = document.createElement("div");
        this.lastFrameIndex = -1;
        this.initEventsRendered = false;
        this.lastSpeechId = -1;
        this.options = options;
        this.root.setAttribute("style", "position:absolute;");
        this.onVoiceStart = options.onVoiceStart;
        this.onVoiceEnd = options.onVoiceEnd;
        this.clearSubtitleOn = options.clearSubtitleOn;
        this.initEventsRendered = false;
        this.lastSpeechId = options.lastSpeechId;
        this.onWalkStateChange = options.onWalkStateChange;
    }
    render(frame) {
        if (this.options.sdk.getStatus() === AvatarStatus.offline)
            return;
        let initEvents = [];
        if (this.lastFrameIndex === -1) {
            this.lastFrameIndex = frame;
            const config = this.options.resourceManager.getConfig();
            if (config.init_events && config.init_events.length > 0) {
                initEvents = config.init_events;
            }
        }
        let event = null;
        if (frame - this.lastFrameIndex > 1) {
            event = this.options.dataCacheQueue._getEventInterval(this.lastFrameIndex, frame);
        }
        else {
            event = this.options.dataCacheQueue._getEvent(frame);
        }
        // 仅执行一次
        if (!this.initEventsRendered) {
            this.initEventsRendered = true;
            if (event) {
                event.e = event.e.concat(initEvents);
            }
            else {
                event = {
                    e: initEvents,
                };
            }
        }
        if (!event) {
            return;
        }
        // 根据lastSpeechId过滤旧的数据,加入前端interrupt事件后，可能在前端打断后，服务仍下发数据
        event.e = event.e.filter(item => item.speech_id > this.lastSpeechId || !item.speech_id);
        if (event.e.some(item => item.type === "voice_start")) {
            const voiceStart = event.e.find(item => item.type === "voice_start");
            const duration = window.performanceTracker.markEnd(performanceConstant.voice_response_play, 'speak');
            this.options.sendSdkPoint('rendering_display', { multi_turn_conversation_id: voiceStart?.multi_turn_conversation_id });
            this.onVoiceStart(duration, voiceStart?.speech_id);
        }
        // 检查并处理voice_end事件
        if (event.e.some(item => item.type === "voice_end")) {
            const voiceEnd = event.e.find(item => item.type === "voice_end");
            this.lastSpeechId = voiceEnd?.speech_id ?? this.lastSpeechId;
            this.onVoiceEnd(voiceEnd?.speech_id);
        }
        // 检查并处理walk_start或speak_walk_start事件
        if (event.e.some(item => item.type === "walk_start") || event.e.some(item => item.type === "speak_walk_start")) {
            const walkState = event.e.find(item => item.type === "walk_start" || item.type === "speak_walk_start");
            this.onWalkStateChange("walk_start");
        }
        // 检查并处理walk_end或speak_walk_end事件
        if (event.e.some(item => item.type === "walk_end") || event.e.some(item => item.type === "speak_walk_end")) {
            const walkState = event.e.find(item => item.type === "walk_end" || item.type === "speak_walk_end");
            this.onWalkStateChange("walk_end");
        }
        // 检查并处理subtitle_off事件
        if (event.e.some(item => item.type === "subtitle_off")) {
            const speech_id = event.e.find(item => item.type === "subtitle_off")?.speech_id;
            this.clearSubtitleOn(speech_id);
        }
        const remainingWidgets = [...event.e];
        // 循环遍历 event.e 数组中的所有元素
        for (let i = 0; i < event.e.length; i++) {
            const widgetData = event.e[i];
            if (Object.prototype.hasOwnProperty.call(widgetData, "event_type")) {
                // 先不处理 ka/ka_intent
                continue;
            }
            // 如果有自定义的渲染器，则所有事件都交给自定义的渲染器处理
            if (DefaultWidgetRenderer.CUSTOM_WIDGET) {
                DefaultWidgetRenderer.CUSTOM_WIDGET(widgetData);
                // 从剩余元素中删除已处理的元素
                const index = remainingWidgets.indexOf(widgetData);
                if (index > -1) {
                    remainingWidgets.splice(index, 1);
                }
                continue;
            }
            // 如果有代理的渲染器，则根据类型执行代理的渲染器
            if (DefaultWidgetRenderer.PROXY_WIDGET && DefaultWidgetRenderer.PROXY_WIDGET[widgetData.type]) {
                DefaultWidgetRenderer.PROXY_WIDGET[widgetData.type](widgetData);
                // 从剩余元素中删除已处理的元素
                const index = remainingWidgets.indexOf(widgetData);
                if (index > -1) {
                    remainingWidgets.splice(index, 1);
                }
                continue;
            }
        }
        // 对剩余未自定义的元素执行 TrackerRenderer
        if (remainingWidgets.length > 0) {
            // 遍历剩余的元素，每个单独执行 TrackerRenderer
            // 传递 SDK 实例引用，用于区分不同数字人实例的 widget
            for (const widgetData of remainingWidgets) {
                const tracker = new TrackerRenderer(widgetData, this.options.sdk);
                this.trackerRenderer.push(tracker);
            }
        }
        return this.trackerRenderer;
    }
    clearTrackerRenderer() {
        this.trackerRenderer = [];
    }
    destroy() {
        this.lastFrameIndex = -1;
        this.initEventsRendered = false;
        // 传递 SDK 实例引用，只清除当前实例的 widget
        DefaultWidgetRenderer.destroy(this.options.sdk);
        this.trackerRenderer.forEach((tracker) => tracker.destroy());
    }
}

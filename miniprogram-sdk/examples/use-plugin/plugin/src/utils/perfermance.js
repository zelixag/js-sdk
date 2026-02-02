export const performanceConstant = {
    load_resource: 'load_resource',
    ttsa_connect: 'ttsa_connect',
    ttsa_ready: 'ttsa_ready',
    first_avatar_render: 'first_avatar_render',
    first_webgl_render: 'first_webgl_render',
    ttsa_body_res: 'ttsa_body_res',
    start_action_res: 'start_action_res',
    start_action_render: 'start_action_render',
    load_video: 'load_video',
    decode_video: 'decode_video',
    voice_response_play: 'voice_response_play',
};
const performanceText = {
    [performanceConstant.load_resource]: '加载资源',
    [performanceConstant.ttsa_connect]: 'ttsa连接',
    [performanceConstant.ttsa_ready]: 'ttsa准备返回first_start_timestamp',
    [performanceConstant.first_avatar_render]: '前端处理好第一帧渲染数据',
    [performanceConstant.first_webgl_render]: '第一帧webgl渲染',
    [performanceConstant.ttsa_body_res]: 'ttsa返回body',
    [performanceConstant.start_action_res]: '触发行为返回',
    [performanceConstant.start_action_render]: '触发行为并渲染耗时',
    [performanceConstant.load_video]: '视频加载',
    [performanceConstant.decode_video]: '视频解码',
    [performanceConstant.voice_response_play]: 'speak音频响应',
};
class PerformanceTracker {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
        this.reportFunc = null;
        this.onStateRenderChange = () => { };
        this.marks = new Map();
        this.measures = new Map();
    }
    // 记录开始时间点
    markStart(key, state) {
        this.marks.set(key, {
            state,
            time: performance.now(),
        });
    }
    // 记录结束时间点并计算耗时
    markEnd(key, state) {
        const mark = this.marks.get(key);
        if (!mark)
            return;
        if (state && typeof state === 'string' && state !== mark?.state) {
            return;
        }
        const endTime = performance.now();
        const duration = endTime - mark.time;
        this.measures.set(key, {
            state: mark?.state,
            time: duration,
        });
        // 提供给业务方状态改变到渲染耗时
        if (mark.state && key === performanceConstant.start_action_render) {
            this.onStateRenderChange(mark.state, duration);
        }
        this.reportMetric();
        if (key !== performanceConstant.load_video && key !== performanceConstant.decode_video) {
            this.marks.delete(key);
        }
        return duration;
    }
    // 获取所有性能数据
    getAllMetrics() {
        return Object.fromEntries(this.measures.entries());
    }
    getVideoMetrics() {
        const data = this.getAllMetrics();
        const filterData = Object.fromEntries(Object.entries(data).filter(([key]) => [performanceConstant.decode_video, performanceConstant.load_video].includes(key)));
        return filterData;
    }
    setReportFunc(ttsa) {
        this.reportFunc = ttsa;
    }
    // 上报数据到服务器
    reportMetric() {
        const data = this.getAllMetrics();
        if (Object.keys(data).length > 0 && this.reportFunc?.getStatus()) {
            // 过滤load_video和decode_video
            const filterData = Object.fromEntries(Object.entries(data).filter(([key]) => ![performanceConstant.load_video, performanceConstant.decode_video].includes(key)));
            if (Object.keys(filterData).length > 0) {
                this.reportFunc?.sendPerfLog(filterData);
            }
            // 遍历data
            for (const key in filterData) {
                if (key !== performanceConstant.decode_video && key !== performanceConstant.load_video) {
                    this.measures.delete(key);
                }
            }
        }
    }
    setOnStateRenderChange(onStateRenderChange) {
        this.onStateRenderChange = onStateRenderChange;
    }
}
// 创建全局单例
window.performanceTracker = new PerformanceTracker();

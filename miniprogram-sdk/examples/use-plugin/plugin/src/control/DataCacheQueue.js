import { EFrameDataType, } from "../types/frame-data";
export class DataCacheQueue {
    constructor() {
        this.TAG = "[DataCacheQueue]";
        // body视频抽帧副本，使用 Map 优化查找和删除性能
        this._bodyQueue = new Map();
        // 表情match信息列表
        this._facialQueue = [];
        // 原始表情数据
        this._realFacialQueue = [];
        // 音频队列
        this.audioQueue = [];
        // UI事件队列
        this.eventQueue = [];
        // 当前处理好的视频id组
        this.videoIdList = [];
        // 当前状态
        this._currentPlayState = "idle";
        // 当前ttsa状态
        this._currentTtsaState = null;
        // @ts-ignore
        window["__dev_event_queue__"] = this.eventQueue;
    }
    set currentPlayState(state) {
        this._currentPlayState = state;
    }
    get currentPlayState() {
        return this._currentPlayState;
    }
    set currentTtsaState(state) {
        this._currentTtsaState = state;
    }
    get currentTtsaState() {
        return this._currentTtsaState;
    }
    get bodyQueue() {
        return Array.from(this._bodyQueue.values());
    }
    // 更新body视频抽帧副本
    _updateBodyImageBitmap(data) {
        const old = this._bodyQueue.get(data.frameIndex);
        if (old && old.frame && typeof old.frame.close === "function") {
            old.frame.close();
        }
        // 清理过期帧，根据data.body_id,删除所有小于的帧
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curFrame.body_id < data.body_id && curFrame.frameIndex >= data.frameIndex) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
        this._bodyQueue.set(data.frameIndex, data);
    }
    clearOldFrames(sf) {
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curIndex >= sf) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
    }
    setVideoIdList(videoId) {
        if (!this.videoIdList.includes(videoId)) {
            this.videoIdList.push(videoId);
        }
    }
    getVideoIdList() {
        return this.videoIdList;
    }
    /**
     * 获取指定帧并从Map中删除
     * @param frameIndex 要获取的帧索引
     * @returns 找到的帧数据（未找到则返回undefined）
     */
    _getBodyImageBitmap(frameIndex) {
        const frame = this._bodyQueue.get(frameIndex);
        // 清理过期帧
        for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
            if (curIndex < frameIndex) {
                curFrame.frame.close();
                this._bodyQueue.delete(curIndex);
            }
        }
        if (frame) {
            return frame;
        }
        return undefined;
    }
    // 获取body内的视频名称list
    getBodyVideoNameListLength() {
        const list = [];
        this.bodyQueue.forEach((item) => {
            if (!list.includes(item.name)) {
                list.push(item.name);
            }
        });
        return list.length;
    }
    _getFaceImageBitmap(frameIndex, body_id) {
        // 找出face中frameIndex和body_id相同的帧
        let targetItem = null;
        for (let i = this._facialQueue.length - 1; i >= 0; i--) {
            const item = this._facialQueue[i];
            if (item.frameIndex === frameIndex && item.body_id === body_id) {
                targetItem = item;
                break; // 找到后立即退出循环
            }
        }
        // 删除所有小于frameIndex的帧
        this._facialQueue = this._facialQueue.filter((item) => item.frameIndex >= frameIndex);
        return targetItem;
    }
    // 更新表情队列
    _updateFacial(data) {
        this._facialQueue.push(...data);
    }
    get facialQueue() {
        return this._facialQueue;
    }
    _getRealFaceImageBitmap(frameIndex, body_id) {
        // 找出face中frameIndex和body_id相同的帧
        let targetItem = null;
        for (let i = this._realFacialQueue.length - 1; i >= 0; i--) {
            const item = this._realFacialQueue[i];
            if (item?.frameIndex === frameIndex && item?.body_id === body_id) {
                targetItem = item;
                break; // 找到后立即退出循环
            }
        }
        // 删除所有小于frameIndex的帧
        this._realFacialQueue = this._realFacialQueue.filter((item) => item?.frameIndex >= frameIndex);
        return targetItem;
    }
    _updateRealFacial(data) {
        this._realFacialQueue.push(...data);
    }
    get realFacialQueue() {
        return this._realFacialQueue;
    }
    /**
     * 清空所有表情数据（用于切换隐身模式时）
     */
    clearAllFaceData() {
        this._facialQueue = [];
        this._realFacialQueue = [];
        window.avatarSDKLogger?.log(this.TAG, "已清空所有表情数据");
    }
    _updateAudio(data) {
        this.audioQueue.push(...data);
    }
    _clearAudio(speech_id) {
        if (speech_id !== -1) {
            this.audioQueue = this.audioQueue.filter(item => item.sid !== speech_id);
        }
        else {
            this.audioQueue = [];
        }
    }
    _getAudio(frameIndex) {
        const targetIndex = this.audioQueue.findIndex((item) => item.sf === frameIndex);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.audioQueue.splice(targetIndex, 1);
        return targetItem;
    }
    _getAudioInterval(startFrame, endFrame) {
        const audioList = this.audioQueue.filter((item) => item.sf >= startFrame && item.sf <= endFrame);
        if (audioList.length === 0) {
            return;
        }
        const audio = audioList[audioList.length - 1];
        const index = this.audioQueue.findIndex((item) => item.id === audio.id);
        this.audioQueue.splice(index, 1);
        return audio;
    }
    _updateUiEvent(data) {
        this.eventQueue.push(...data);
    }
    clearSubtitleOn(speech_id) {
        this.eventQueue = this.eventQueue.map(item => ({
            ...item,
            e: item.e.filter((subItem) => subItem.speech_id != speech_id)
        }));
    }
    _getEvent(frame) {
        const targetIndex = this.eventQueue.findIndex((item) => item.sf === frame);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.eventQueue.splice(targetIndex, 1);
        return targetItem;
    }
    _getEventInterval(startFrame, endFrame) {
        const targetIndex = this.eventQueue.findIndex((item) => item.sf >= startFrame && item.sf <= endFrame);
        if (targetIndex === -1) {
            return;
        }
        const [targetItem] = this.eventQueue.splice(targetIndex, 1);
        return targetItem;
    }
    /**
     * 检查数据是否因seek等原因失效，并清理缓存。
     * @param data 新的数据帧数组
     * @param type 数据类型
     */
    checkValidData(data, type) {
        switch (type) {
            case EFrameDataType.BODY:
                break;
            case EFrameDataType.FACE: {
                // 根据bodyId获取face，暂时去掉过滤
                // if (this._facialQueue.length === 0 || data.length === 0) {
                //   return;
                // }
                // const isDiscontinuous =
                //   this._facialQueue[this._facialQueue.length - 1]?.ef >= data[0].sf ||
                //   data[0].sf <= this._facialQueue[0]?.sf;
                // if (isDiscontinuous) {
                //   const facialIndex = this._facialQueue.findIndex(
                //     (item) => item.sf >= data[0].sf
                //   );
                //   if (facialIndex !== -1) {
                //     this._facialQueue.length = facialIndex;
                //   }
                // }
                break;
            }
            case EFrameDataType.AUDIO: {
                if (this.audioQueue.length === 0 || data.length === 0) {
                    return;
                }
                const isDiscontinuous = this.audioQueue[this.audioQueue.length - 1]?.ef < data[0].sf ||
                    data[0].sf < this.audioQueue[0]?.sf;
                if (isDiscontinuous) {
                    const audioIndex = this.audioQueue.findIndex((item) => item.sf >= data[0].sf);
                    if (audioIndex !== -1) {
                        this.audioQueue.length = audioIndex;
                    }
                }
                break;
            }
        }
    }
    destroy() {
        this._bodyQueue.forEach((item) => {
            if (item.frame && typeof item.frame.close === "function") {
                item.frame.close();
            }
        });
        this._bodyQueue.clear();
        this._facialQueue = [];
        this.audioQueue = [];
        this.eventQueue = [];
    }
}

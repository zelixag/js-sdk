/**
 * UI 控件渲染，所有轨道的元素
 */
import { DataCacheQueue } from "../control/DataCacheQueue";
import TrackerRenderer from "../modules/TrackRenderer/index";
import ResourceManager from "../modules/ResourceManager";
import XmovAvatar from "../index";
type Option = {
    sdk: XmovAvatar;
    dataCacheQueue: DataCacheQueue;
    resourceManager: ResourceManager;
    lastSpeechId: number;
    onVoiceEnd: (speech_id: number) => void;
    onVoiceStart: (duration: number, speech_id: number) => void;
    onWalkStateChange: (state: string) => void;
    clearSubtitleOn: (speech_id: number) => void;
    sendSdkPoint: (type: string, data: any, extra?: any) => void;
};
export default class UIRenderer {
    private TAG;
    options: Option;
    trackerRenderer: TrackerRenderer[];
    root: HTMLDivElement;
    lastFrameIndex: number;
    onVoiceEnd: (speech_id: number) => void;
    onVoiceStart: (duration: number, speech_id: number) => void;
    onWalkStateChange: (state: string) => void;
    clearSubtitleOn: (speech_id: number) => void;
    initEventsRendered: boolean;
    lastSpeechId: number;
    constructor(options: Option);
    render(frame: number): TrackerRenderer[] | undefined;
    clearTrackerRenderer(): void;
    destroy(): void;
}
export {};

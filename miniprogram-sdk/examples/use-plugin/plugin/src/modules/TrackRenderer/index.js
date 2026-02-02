import TrackPic from './track-pic';
import TrackSlideshow from './track-slideshow';
import TrackSubtitle from './track-subtitle';
import TrackText from './track-text';
import TrackVideo from './track-video';
import DefaultRender from './render-implements';
export default class TrackRenderer {
    constructor(event, instance) {
        this.TAG = '[TrackRenderer]';
        this.instance = instance;
        const { type, data, text = '' } = event;
        if (type === 'widget_pic') {
            this.tracker = new TrackPic(data, instance);
        }
        if (type === 'widget_slideshow') {
            this.tracker = new TrackSlideshow(data);
        }
        if (type === 'subtitle_on' || type === 'subtitle_off') {
            this.tracker = new TrackSubtitle({ type, text, axis_id: data?.axis_id ?? 1000 }, instance);
        }
        if (type === 'widget_text') {
            this.tracker = new TrackText(data);
        }
        if (type === 'widget_video') {
            this.tracker = new TrackVideo(data);
        }
    }
    render() {
        return this.tracker?.render();
    }
    stop() {
        this.tracker.stop();
    }
    destroy() {
        DefaultRender.destroy(this.instance);
    }
}

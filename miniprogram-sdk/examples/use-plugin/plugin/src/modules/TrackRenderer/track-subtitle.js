import BaseTrack from "./base-track";
import DefaultRender from './render-implements';
export default class SubtitleTrack extends BaseTrack {
    constructor(data, instance) {
        super();
        this.data = data;
        this.instance = instance;
    }
    render() {
        return DefaultRender.WIDGET_SUBTITLE(this.data, this.instance);
    }
}

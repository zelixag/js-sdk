import BaseTrack from "./base-track";
import DefaultRender from './render-implements';
export default class ImageTrack extends BaseTrack {
    constructor(data, instance) {
        super();
        this.data = data;
        this.instance = instance;
    }
    render() {
        return DefaultRender.WIDGET_PIC(this.data, this.instance);
    }
}

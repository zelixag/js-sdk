export default class Composition {
    constructor(options) {
        this.TAG = "[Composition]";
        this.container = options.container;
        this.avatarRenderer = options.avatarRenderer;
        this.restRenderers = options.restRenderers;
        this.audioRenderer = options.audioRenderer;
        this.container.appendChild(options.avatarRenderer.canvas);
    }
    compose(frameIndex) {
        this.avatarRenderer.render(frameIndex);
        this.audioRenderer.render(frameIndex);
        for (const r of this.restRenderers) {
            const layer = r.render(frameIndex);
            r.clearTrackerRenderer();
            if (layer) {
                for (const l of layer) {
                    const ele = l?.render();
                    if (ele) {
                        this.container.appendChild(ele);
                    }
                }
            }
        }
    }
    stop() {
        this.audioRenderer.stop(-1);
    }
    destroy() {
        this.avatarRenderer.destroy();
        this.audioRenderer.destroy();
        this.restRenderers.forEach((r) => r.destroy());
    }
}

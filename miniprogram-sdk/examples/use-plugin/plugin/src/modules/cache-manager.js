export default class CacheManager {
    constructor(cacheServer) {
        this.cacheServer = cacheServer;
    }
    // preCache(appId: string, appSecret: string): Promise<void> {
    //   return fetch(`${this.cacheServer}/precache?appId=${appId}&appSecret=${appSecret}`).then(res => res.json())
    // }
    getVideo(url) {
        return `${this.cacheServer}/get_video?url=${encodeURIComponent(url)}`;
    }
}

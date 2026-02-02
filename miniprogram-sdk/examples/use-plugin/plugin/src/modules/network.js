class NetworkMonitor {
    constructor(options) {
        this.TAG = "[NetworkMonitor]";
        this.retryCount = 1;
        this.retryTimer = -1;
        this.options = options;
        this.bindHandleOnline = this._handleOnline.bind(this);
        this.bindHandleOffline = this._handleOffline.bind(this);
        this._initEventListeners();
    }
    _initEventListeners() {
        window.addEventListener('online', this.bindHandleOnline);
        window.addEventListener('offline', this.bindHandleOffline);
    }
    _handleOnline() {
        window.clearTimeout(this.retryTimer);
        NetworkMonitor.ONLINE = true;
        this.options.onlineCallback('[NetworkMonitor] 网络已恢复');
    }
    _handleOffline() {
        NetworkMonitor.ONLINE = false;
        this.options.offlineCallback('[NetworkMonitor] 网络已断开');
        this._attempt();
    }
    _attempt() {
        let delay = 1000;
        if (this.retryCount > 1) {
            delay = Math.pow(2, this.retryCount) * 1000;
        }
        this.retryTimer = window.setTimeout(() => {
            // this.options.retryCallback(this.retryCount)
            //   .then((result) => {
            //     if (result === null) {
            //       this.retryCount += 1;
            //       this._attempt();
            //     } else {
            //       this._handleOnline()
            //     }
            //   })
            //   .catch(() => {
            //     this.retryCount += 1;
            //     this._attempt();
            //   });
        }, delay);
    }
    ;
    setState(isOnline) {
        NetworkMonitor.ONLINE = isOnline;
    }
    destroy() {
        window.removeEventListener('online', this.bindHandleOnline);
        window.removeEventListener('offline', this.bindHandleOffline);
        this.retryTimer = -1;
        this.retryCount = 1;
    }
}
NetworkMonitor.ONLINE = true;
export default NetworkMonitor;

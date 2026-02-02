export var AvatarStatus;
(function (AvatarStatus) {
    // initialized,
    AvatarStatus[AvatarStatus["online"] = 0] = "online";
    AvatarStatus[AvatarStatus["offline"] = 1] = "offline";
    AvatarStatus[AvatarStatus["network_on"] = 2] = "network_on";
    AvatarStatus[AvatarStatus["network_off"] = 3] = "network_off";
    AvatarStatus[AvatarStatus["close"] = 4] = "close";
    AvatarStatus[AvatarStatus["visible"] = 5] = "visible";
    AvatarStatus[AvatarStatus["invisible"] = 6] = "invisible";
    AvatarStatus[AvatarStatus["stopped"] = 7] = "stopped";
})(AvatarStatus || (AvatarStatus = {}));
/**
 * 渲染状态枚举
 * 用于表示渲染器的状态，与数字人状态（AvatarStatus）分离
 */
export var RenderState;
(function (RenderState) {
    RenderState["init"] = "init";
    RenderState["rendering"] = "rendering";
    RenderState["pausing"] = "pausing";
    RenderState["paused"] = "paused";
    RenderState["resumed"] = "resumed";
    RenderState["stopped"] = "stopped";
})(RenderState || (RenderState = {}));
export var InitModel;
(function (InitModel) {
    InitModel["normal"] = "normal";
    InitModel["invisible"] = "invisible";
})(InitModel || (InitModel = {}));

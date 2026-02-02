# 未来代码优化方向

- 优化音频播放逻辑，区分暂停和停止
- 优化requestAnimationFrame在document.hidden时的处理,提供requestAnimationFrame不起作用时的替代方案
- 优化scheduler的实现,在scheduler中处理各种打断逻辑时，避免直接调用sub render的方法。scheduler中提供针对所有sub render的方法调用。
- sdk状态收归优化，离线、在线、断网、有网等

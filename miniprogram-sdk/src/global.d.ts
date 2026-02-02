/** 原 SDK 的 proto 脚本会挂到全局，供 ttsa 等使用 */
declare const protobuf: {
  roots: { default: any };
  [key: string]: any;
};

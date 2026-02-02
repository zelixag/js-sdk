# 面部数据和身体数据处理流程详解

本文档详细说明面部数据和身体数据从后端推送到前端后的完整处理流程。

## 目录

1. [数据接收](#数据接收)
2. [面部数据处理](#面部数据处理)
3. [身体数据处理](#身体数据处理)
4. [数据缓存机制](#数据缓存机制)
5. [数据渲染流程](#数据渲染流程)
6. [数据流程图](#数据流程图)

---

## 数据接收

### WebSocket 事件监听

数据通过 WebSocket 连接接收，在 `src/control/ttsa.ts` 中监听两个主要事件：

```typescript
// 面部数据事件
ws.on("face_data", async (e: any) => { ... })

// 身体数据事件
ws.on("body_data", (e: any) => { ... })
```

### 数据格式

- **面部数据**：压缩的 Protobuf 二进制数据（使用 gzip 压缩）
- **身体数据**：JSON 格式的编码数据

---

## 面部数据处理

**重要说明**：面部数据是**3D数据**，包含3D网格、骨骼动画、混合形状等信息，最终通过 **WebGL2** 进行渲染。

### 1. 数据接收与解压缩

**位置**：`src/control/ttsa.ts:175-235`

```typescript
ws.on("face_data", async (e: any) => {
  // 1. 将接收到的数据转换为 Uint8Array
  const uint8Array = new Uint8Array(e);
  
  // 2. 使用 Pako 解压缩 gzip 数据
  const decompressed = Pako.inflate(uint8Array);
  
  // 3. 使用 Protobuf 解码
  const FaceFrameDataList = proxyProtobuf.FaceFrameDataList.decode(decompressed);
  const faceFrameList = FaceFrameDataList.toJSON() || { data: [] };
})
```

### 2. 数据解析与转换

**关键步骤**：

1. **解析 JointData（关节数据）**
   ```typescript
   const joints = (frame.js || []).map((joint) => {
     return {
       translate: joint.translate || [], // float32 数组，直接使用
       rotate: joint.rotate ? scaledInt16BytesToFloat32(joint.rotate) : [] // int16 转 float32
     };
   });
   ```

2. **解析 MeshData（网格数据）**
   ```typescript
   const meshes = (frame.ms || []).map((mesh) => {
     return {
       index: mesh.index || 0,
       weights: mesh.weights || []
     };
   });
   ```

3. **解析 BSW（Blend Shape Weights，混合形状权重）**
   ```typescript
   bsw: frame.bsw ? scaledInt16BytesToFloat32(frame.bsw) : []
   ```

4. **数据格式转换**
   ```typescript
   return {
     ...frame,
     bsw: frame.bsw ? scaledInt16BytesToFloat32(frame.bsw) : [],
     js: joints,
     ms: meshes,
     body_id: frame.bodyId || 0,
     face_frame_type: frame.faceFrameType || 0
   };
   ```

### 3. 数据类型分类

面部数据根据 `face_frame_type` 字段分为两类：

- **实时数据**（`face_frame_type === 1`）：用于实时表情渲染
- **原始数据**（`face_frame_type === 0` 或不存在）：用于基础表情渲染

### 4. 数据传递

解析后的数据通过回调传递给 `RenderScheduler`：

```typescript
options.handleMessage(EFrameDataType.FACE, frameList);
```

---

## 身体数据处理

### 1. 数据接收与解码

**位置**：`src/control/ttsa.ts:236-255`

```typescript
ws.on("body_data", (e: any) => {
  // 1. 解码 JSON 数据
  let bodyDecodeData = decode(e) as IRawBodyFrameData[];
  
  // 2. 处理 x_offset（行走偏移量）
  const cBody = bodyDecodeData.map(item => ({
    ...item,
    x_offset: [] // 初始化为空数组
  }));
  
  // 3. 传递给 RenderScheduler
  options.handleMessage(EFrameDataType.BODY, bodyDecodeData);
})
```

### 2. 身体数据结构

```typescript
interface IRawBodyFrameData {
  sf: number;        // 起始帧索引
  ef: number;        // 结束帧索引
  hfd: boolean;      // 是否有面部数据
  aef: number;       // 动作结束帧
  asf: number;       // 动作起始帧
  id: number;        // 数据ID
  n: string;         // 视频文件名
  s: string;         // 状态（如 "speak", "idle"）
  body_id: number;   // 身体ID
  x_offset: Uint8Array; // 行走偏移量（字节数组）
}
```

### 3. 数据过滤与验证

**位置**：`src/control/RenderScheduler.ts:212-256`

```typescript
async handleData(data: IRawFrameData[], type: EFrameDataType) {
  switch (type) {
    case EFrameDataType.BODY: {
      // 1. 根据当前帧过滤数据
      const currentFrame = this.frameAnimationController?.getCurrentFrame() ?? 0;
      let mp4List = ([...data] as IRawBodyFrameData[])
        .filter((item) => item.ef > currentFrame);
      
      // 2. 检查数据是否过期
      if (this.frameAnimationController?.getCurrentFrame() > data[0].sf) {
        // 数据过期，发送错误
        this.sdk.onMessage({
          code: EErrorCode.BODY_DATA_EXPIRED,
          message: `身体数据过期`
        });
      }
      
      // 3. 传递给解码器
      this.decoder.decode(mp4List, callback);
    }
  }
}
```

### 4. 视频解码流程

**位置**：`src/modules/decoder.ts`

#### 4.1 视频加载

```typescript
// 1. 从队列中取出身体数据
const bodyInfo = this.queue.shift() as IRawBodyFrameData;

// 2. 加载视频文件（通过 HTTP 请求）
const arrayBuffer = await this.loadVideoWithTimeout(bodyInfo.n);

// 3. 启动 Worker 进行解码
this._startWorker({
  name: bodyInfo.n,
  id: bodyInfo.id,
  frameState: bodyInfo.s,
  start: bodyInfo.asf,
  end: bodyInfo.aef,
  hfd: bodyInfo.hfd,
  data: arrayBuffer,
  startFrameIndex: bodyInfo.sf,
  endFrameIndex: bodyInfo.ef,
  body_id: bodyInfo.body_id,
  x_offset: parseUint8ToFloat32(bodyInfo.x_offset) || []
});
```

#### 4.2 Worker 解码

**位置**：`src/worker/streaming-video.ts`

解码过程在 Web Worker 中异步执行：

1. **MP4 解析**：使用 MP4Box.js 解析 MP4 文件
2. **视频解码**：使用 WebCodecs API 的 `VideoDecoder` 解码视频帧
3. **帧提取**：提取指定范围内的视频帧（`startFrame` 到 `endFrame`）
4. **帧回调**：每解码一帧，通过 `postMessage` 发送给主线程

```typescript
// Worker 中的解码流程
function decodeFile(file, startFrame, endFrame) {
  // 1. 创建 MP4Box 文件对象
  self.mp4boxfile = MP4Box.createFile();
  
  // 2. 解析 MP4 文件
  self.mp4boxfile.onReady = function(info) {
    self.videoTrack = info.videoTracks[0];
    self.mp4boxfile.setExtractionOptions(self.videoTrack.id, null, {
      nbSamples: nbSampleTotal,
      rapAlignement: true
    });
    self.mp4boxfile.start();
  };
  
  // 3. 获取视频样本
  self.mp4boxfile.onSamples = async function(trackId, ref, samples) {
    // 4. 创建 VideoDecoder
    self.videoDecoder = new VideoDecoder({
      output: handleFrame,
      error: err => { ... }
    });
    
    // 5. 配置解码器
    self.videoDecoder.configure(config);
    
    // 6. 解码每一帧
    for (let i = 0; i < samples.length; i++) {
      const chunk = new EncodedVideoChunk({...});
      self.videoDecoder.decode(chunk);
    }
  };
  
  // 7. 处理解码后的帧
  function handleFrame(videoFrame) {
    postMessage({ 
      type: 'frame', 
      frame: videoFrame, 
      index: frameIndex++ 
    }, [videoFrame]);
  }
}
```

#### 4.3 帧数据更新

**位置**：`src/control/RenderScheduler.ts:233-246`

解码后的每一帧通过回调更新到缓存队列：

```typescript
this.decoder.decode(mp4List, (file: any, frame: any, index: any) => {
  if (file.start <= index && file.end >= index) {
    this.dataCacheQueue._updateBodyImageBitmap({
      frame,                    // VideoFrame 对象
      frameIndex: file.startFrameIndex + index,  // 全局帧索引
      frameState: file.frameState,               // 状态（如 "speak"）
      id: file.id,
      body_id: file.body_id,
      name: file.name,
      hfd: file.hfd,            // 是否有面部数据
      sf: file.startFrameIndex,
      offset: file?.x_offset[index] || 0  // 行走偏移量（像素）
    });
  }
});
```

---

## 数据缓存机制

### 缓存队列结构

**位置**：`src/control/DataCacheQueue.ts`

数据缓存使用多个队列分别存储不同类型的数据：

```typescript
export class DataCacheQueue {
  // 1. 身体视频帧缓存（使用 Map 优化查找性能）
  private _bodyQueue: Map<number, IBodyFrame> = new Map();
  
  // 2. 实时表情数据队列
  private _facialQueue: Array<IRawFaceFrameData> = [];
  
  // 3. 原始表情数据队列
  private _realFacialQueue: Array<IRawFaceFrameData> = [];
  
  // 4. 音频队列
  private audioQueue: Array<IRawAudioFrameData> = [];
  
  // 5. UI 事件队列
  private eventQueue: Array<IRawEventFrameData> = [];
}
```

### 身体数据缓存

**更新方法**：`_updateBodyImageBitmap`

```typescript
_updateBodyImageBitmap(data: IBodyFrame) {
  const old = this._bodyQueue.get(data.frameIndex);
  
  // 1. 关闭旧的 VideoFrame（释放内存）
  if (old && old.frame && typeof old.frame.close === "function") {
    old.frame.close();
  }
  
  // 2. 清理过期帧（根据 body_id）
  for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
    if (curFrame.body_id < data.body_id && curFrame.frameIndex >= data.frameIndex) {
      curFrame.frame.close();
      this._bodyQueue.delete(curIndex);
    }
  }
  
  // 3. 存储新帧
  this._bodyQueue.set(data.frameIndex, data);
}
```

**获取方法**：`_getBodyImageBitmap`

```typescript
_getBodyImageBitmap(frameIndex: number) {
  const frame = this._bodyQueue.get(frameIndex);
  
  // 清理过期帧（小于当前帧索引的帧）
  for (const [curIndex, curFrame] of this._bodyQueue.entries()) {
    if (curIndex < frameIndex) {
      curFrame.frame.close();
      this._bodyQueue.delete(curIndex);
    }
  }
  
  return frame;
}
```

### 面部数据缓存

**实时表情数据**：`_updateFacial` / `_getFaceImageBitmap`

```typescript
// 更新实时表情数据
_updateFacial(data: Array<IRawFaceFrameData>) {
  this._facialQueue.push(...data);
}

// 获取指定帧的表情数据
_getFaceImageBitmap(frameIndex: number, body_id: number) {
  // 从后往前查找匹配的帧
  let targetItem: IRawFaceFrameData | null = null;
  for (let i = this._facialQueue.length - 1; i >= 0; i--) {
    const item = this._facialQueue[i];
    if (item.frameIndex === frameIndex && item.body_id === body_id) {
      targetItem = item;
      break;
    }
  }
  
  // 清理过期帧
  this._facialQueue = this._facialQueue.filter(
    (item) => item.frameIndex >= frameIndex
  );
  
  return targetItem;
}
```

**原始表情数据**：`_updateRealFacial` / `_getRealFaceImageBitmap`

处理逻辑与实时表情数据类似，但存储在独立的队列中。

---

## 数据渲染流程

### 渲染入口

**位置**：`src/baseRender/AvatarRenderer.ts:310-529`

渲染流程在每一帧的动画循环中执行：

```typescript
render(frameIndex: number) {
  // 1. 获取身体帧数据
  const bodyFrame = this.options.dataCacheQueue._getBodyImageBitmap(frameIndex);
  
  // 2. 获取面部帧数据
  let faceFrame = this.options.dataCacheQueue._getFaceImageBitmap(
    frameIndex,
    bodyFrame?.body_id ?? bodyFrame?.id ?? 0
  );
  
  // 3. 获取原始面部数据
  let curRealFaceData = this.options.dataCacheQueue._getRealFaceImageBitmap(
    frameIndex, 
    bodyFrame?.body_id ?? bodyFrame?.id ?? 0
  );
  
  // 4. 处理表情数据插值（见下文）
  
  // 5. 调用 WebGL 渲染管线渲染
  this.pipeline.renderFrame(
    bodyFrame.frame,      // VideoFrame（身体视频帧）
    faceData,             // 3D面部数据（IBRAnimationFrameData_NN）
    null,                 // 其他数据
    { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 }
  );
  
  // 注意：faceData 是3D数据，包含：
  // - movableJointTransforms: 3D关节变换（位置+旋转）
  // - blendshapeWeights: 混合形状权重（用于面部变形）
  // - mesh: 网格数据（纹理模型索引和PCA权重）
  // 这些数据通过 WebGL2 着色器进行3D渲染
  
  // 6. 更新 Canvas 偏移（用于行走功能）
  const offset_PX = bodyFrame?.offset;
  if(offset_PX !== this.canvasOffsetX) {
    this.canvasOffsetX = offset_PX;
    updateCanvasXOffset(this.canvas, offset_PX);
  }
  
  // 7. 关闭 VideoFrame（释放内存）
  if (bodyFrame.frame && typeof bodyFrame.frame.close === "function") {
    bodyFrame.frame.close();
  }
}
```

### 表情数据插值逻辑

**位置**：`src/baseRender/AvatarRenderer.ts:336-408`

表情数据渲染支持三种模式：

#### 1. 实时数据模式（`face_frame_type === 1`）

```typescript
if(faceFrame?.FaceFrameData && faceFrame?.face_frame_type) {
  // 保存实时数据
  this.lastRealFaceFrameData = faceFrame.FaceFrameData;
  this.lastRealFaceFrame = frameIndex;
  
  // 如果有原始数据，进行插值
  if (this.lastRealFaceFrame !== -1 && this.lastWeight > 0 && curRealFaceData) {
    const lastWeight = this.computeWeight(frameIndex);
    faceFrame = {
      frameIndex,
      FaceFrameData: IBRAnimationFrameData_NN.interp(
        this.lastRealFaceFrameData,    // 实时数据
        curRealFaceData.FaceFrameData, // 原始数据
        curRealFaceData.FaceFrameData, // 原始数据（作为插值目标）
        lastWeight,                     // 插值权重
        this.options.resourceManager.resource_pack?.interpolate_joints || []
      )
    };
  }
}
```

#### 2. 原始数据模式（`face_frame_type === 0` 或不存在）

```typescript
else {
  if(this.lastRealFaceFrame === -1) {
    // 直接使用原始数据
    faceFrame = curRealFaceData;
  } else {
    // 使用上次实时数据和当前原始数据插值
    if(curRealFaceData?.FaceFrameData) {
      if(this.lastRealFaceFrameData === null) {
        faceFrame = curRealFaceData;
      } else {
        const lastWeight = this.computeWeight(frameIndex);
        faceFrame = {
          frameIndex,
          FaceFrameData: IBRAnimationFrameData_NN.interp(
            this.lastRealFaceFrameData,
            curRealFaceData.FaceFrameData,
            curRealFaceData.FaceFrameData,
            lastWeight,
            this.options.resourceManager.resource_pack?.interpolate_joints || []
          )
        };
      }
    }
  }
}
```

#### 3. 客户端打断模式（`interrupt === true`）

```typescript
if(this.interrupt) {
  // 直接使用原始数据，不进行插值
  faceFrame = curRealFaceData;
}
```

### 权重计算

**位置**：`src/baseRender/AvatarRenderer.ts:280-308`

权重用于控制实时数据和原始数据的插值比例：

```typescript
computeWeight(frameIndex: number): number {
  const maxTweenStep = 0.1;  // 最大插值步长
  const frameDiff = frameIndex - this.lastRealFaceFrame;
  const isLost = frameDiff > 1;  // 是否丢帧
  
  if (isLost) {
    // 丢帧：权重累加（逐渐过渡到原始数据）
    this.lastWeight = Math.min(this.lastWeight + frameDiff, maxTweenStep);
  } else {
    // 未丢帧：权重递减（逐渐过渡到实时数据）
    this.lastWeight = Math.max(this.lastWeight - frameDiff, 0);
  }
  
  return this.lastWeight / maxTweenStep;
}
```

---

## 数据流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                      WebSocket 数据接收                          │
│                    (src/control/ttsa.ts)                         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│   face_data   │              │   body_data   │
└───────┬───────┘              └───────┬───────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│ 1. 解压缩     │              │ 1. JSON解码   │
│    (Pako)     │              │    (decode)   │
└───────┬───────┘              └───────┬───────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│ 2. Protobuf   │              │ 2. 数据过滤   │
│    解码       │              │    (过滤过期)  │
└───────┬───────┘              └───────┬───────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│ 3. 数据转换   │              │ 3. 视频加载   │
│ - int16→float │              │    (HTTP请求) │
│ - 结构转换    │              └───────┬───────┘
└───────┬───────┘                      │
        │                               ▼
        │                      ┌───────────────┐
        │                      │ 4. Worker解码  │
        │                      │  (MP4Box+      │
        │                      │   VideoDecoder)│
        │                      └───────┬───────┘
        │                               │
        ▼                               ▼
┌───────────────────────────────────────────────────┐
│          RenderScheduler.handleData()             │
│         (src/control/RenderScheduler.ts)          │
└───────────────────────┬───────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│ 更新面部队列  │              │ 更新身体队列  │
│ - _facialQueue│              │ - _bodyQueue  │
│ - _realFacial │              │   (Map结构)   │
│   Queue       │              └───────┬───────┘
└───────┬───────┘                      │
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │    DataCacheQueue 缓存队列    │
        │  (src/control/DataCacheQueue.ts)│
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │    AvatarRenderer.render()     │
        │  (src/baseRender/AvatarRenderer.ts)│
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│ 1. 获取数据    │              │ 2. 表情插值   │
│ - bodyFrame    │              │ - 实时/原始   │
│ - faceFrame    │              │ - 权重计算    │
└───────┬───────┘              └───────┬───────┘
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   3. GLPipeline.renderFrame() │
        │      (WebGL 渲染管线)          │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   4. Canvas 输出              │
        │   (最终渲染结果)               │
        └───────────────────────────────┘
```

---

## 关键数据结构

### 面部数据（IRawFaceFrameData）

```typescript
interface IRawFaceFrameData {
  frameIndex: number;              // 帧索引
  state: string;                   // 状态（"speak", "idle" 等）
  id: number;                      // 数据ID
  body_id: number;                  // 关联的身体ID
  face_frame_type: number;         // 0=原始数据, 1=实时数据
  FaceFrameData: IBRAnimationFrameData_NN;  // 面部动画数据
  sf: number;                      // 起始帧
  ef: number;                       // 结束帧
}
```

### 身体数据（IBodyFrame）

```typescript
interface IBodyFrame {
  frame: VideoFrame;               // WebCodecs VideoFrame 对象
  frameIndex: number;               // 帧索引
  frameState: string;              // 状态
  id: number;                      // 数据ID
  name: string;                     // 视频文件名
  body_id: number;                  // 身体ID
  hfd: boolean;                     // 是否有面部数据
  sf: number;                       // 起始帧索引
  offset: number;                   // 行走偏移量（像素）
}
```

---

## 性能优化要点

1. **使用 Map 存储身体帧**：O(1) 查找性能
2. **及时释放 VideoFrame**：调用 `frame.close()` 释放内存
3. **Worker 异步解码**：不阻塞主线程
4. **过期帧清理**：自动清理不再使用的帧数据
5. **数据过滤**：在解码前过滤过期数据

---

## 错误处理

### 面部数据解码错误

```typescript
catch (error) {
  this.sdk.onMessage({
    code: EErrorCode.FACE_DECODE_ERROR,
    message: `Error: 表情数据解码失败`,
    e: JSON.stringify({ error }),
  });
}
```

### 身体数据解码错误

```typescript
catch (error) {
  this.sdk.onMessage({
    code: EErrorCode.VIDEO_DECODE_ERROR,
    message: `Error: 身体数据解码失败`,
    e: JSON.stringify({ error }),
  });
}
```

### 数据过期检测

```typescript
if (this.frameAnimationController?.getCurrentFrame() > data[0].sf) {
  this.sdk.onMessage({
    code: EErrorCode.BODY_DATA_EXPIRED,
    message: `身体数据过期`,
  });
}
```

---

## WebGL 3D 渲染详解

### Canvas 承载

**重要说明**：脸部数据（以及整个数字人）通过 **Web DOM 的 Canvas 元素**进行承载和渲染。

**位置**：`src/baseRender/AvatarRenderer.ts:31`

```typescript
export default class AvatarRender {
  canvas = document.createElement("canvas");  // 创建 HTML Canvas 元素
  
  constructor(options: Option) {
    // Canvas 会被添加到 DOM 中（通过 containerId）
    // 通过 canvas.getContext('webgl2') 获取 WebGL2 上下文
  }
}
```

**Canvas 初始化流程**：

1. **创建 Canvas 元素**：`document.createElement("canvas")`
   ```typescript
   // src/baseRender/AvatarRenderer.ts:31
   canvas = document.createElement("canvas");
   ```

2. **获取 WebGL2 上下文**：
   ```typescript
   // src/utils/GLDevice.ts:23
   const gl = this.canvas.getContext('webgl2', { 
     antialias: false, 
     premultipliedAlpha: true 
   });
   ```

3. **添加到 DOM 容器**：
   ```typescript
   // Canvas 会被添加到用户指定的容器元素中
   // 容器通过 containerId 参数指定（如 "#avatar-container"）
   const container = document.querySelector(containerId);
   container.appendChild(canvas);  // 实际添加逻辑在 RenderScheduler 中
   ```

4. **渲染到 Canvas**：所有3D渲染结果（包括脸部数据）最终输出到这个 Canvas 上

**Canvas 特点**：
- 使用 **HTMLCanvasElement**（Web DOM 标准元素）
- 通过 **WebGL2** 上下文进行硬件加速渲染
- Canvas 作为 DOM 元素，可以设置 CSS 样式、位置、大小等
- 支持与其他 DOM 元素（如背景、Widget）进行层级叠加

### 着色器与 Canvas 的关系

**重要说明**：着色器（Shader）不是直接"给"Canvas 的，而是通过 **WebGL2 上下文**在 **GPU** 上执行的。

#### 1. 着色器的执行位置

着色器代码在 **GPU** 上执行，而不是在 Canvas 上：

```typescript
// 1. 从 Canvas 获取 WebGL2 上下文
const gl = canvas.getContext('webgl2');
// gl 是 WebGL2RenderingContext，这是与 GPU 通信的接口

// 2. 编译着色器代码（上传到 GPU）
const shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(shader, shaderCode);  // 着色器代码（GLSL 字符串）
gl.compileShader(shader);             // GPU 编译着色器

// 3. 创建着色器程序（在 GPU 上）
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);               // GPU 链接程序

// 4. 使用着色器程序进行渲染
gl.useProgram(program);
gl.drawElements(...);                  // GPU 执行着色器，渲染结果输出到 Canvas
```

#### 2. 渲染流程

```
Canvas (DOM元素)
  ↓ getContext('webgl2')
WebGL2RenderingContext (与GPU通信的接口)
  ↓ compileShader / createProgram
GPU (硬件)
  ↓ 执行着色器代码
渲染结果
  ↓ 输出到帧缓冲区
Canvas 显示
```

#### 3. 着色器代码示例

**顶点着色器**（在 GPU 上执行）：
```glsl
#version 300 es
// 这个代码在 GPU 上运行，不是 Canvas 上
void main() {
  gl_Position = u_proj_mat * lbs_transform(pos + bs_pos);
}
```

**片段着色器**（在 GPU 上执行）：
```glsl
#version 300 es
// 这个代码也在 GPU 上运行
void main() {
  fragColor = vec4(final_rgb, final_alpha);
  // fragColor 输出到 Canvas 的帧缓冲区
}
```

#### 4. Canvas 的作用

Canvas 的作用是：
1. **提供 WebGL 上下文**：通过 `getContext('webgl2')` 获取与 GPU 通信的接口
2. **显示渲染结果**：作为帧缓冲区的显示载体
3. **DOM 集成**：作为 DOM 元素，可以设置样式、位置等

**关键理解**：
- 着色器代码 → 编译后上传到 **GPU**
- GPU 执行着色器 → 生成像素数据
- 像素数据 → 输出到 Canvas 的**帧缓冲区**
- Canvas → 显示帧缓冲区的内容

#### 5. 代码流程

```typescript
// src/utils/GLDevice.ts:98-123
compileShaderProgram(shaders: { readonly [index: string]: string }): WebGLProgram {
  // 1. 创建着色器程序（GPU 资源）
  let shaderProgram = this.gl.createProgram();
  
  // 2. 为每个着色器阶段编译代码
  for (const [stage, code] of Object.entries(shaders)) {
    const shader = this.gl.createShader(this.shaderStage[stage]);
    this.gl.shaderSource(shader, code);      // 设置 GLSL 代码
    this.gl.compileShader(shader);           // GPU 编译
    this.gl.attachShader(shaderProgram, shader);
  }
  
  // 3. 链接程序（GPU 操作）
  this.gl.linkProgram(shaderProgram);
  
  return shaderProgram;  // 返回 GPU 上的程序对象
}
```

**总结**：
- ✅ 着色器在 **GPU** 上执行（硬件加速）
- ✅ Canvas 提供 **WebGL 上下文**（与 GPU 通信）
- ✅ 渲染结果输出到 Canvas 的**帧缓冲区**
- ✅ Canvas 作为 **DOM 元素**显示最终画面

### WebGL2 给 Canvas 的内容

**WebGL2 渲染管线最终输出到 Canvas 的内容**：

#### 1. 渲染内容组成

WebGL2 将以下内容渲染到 Canvas：

1. **脸部3D网格（Mesh）**
   - **颜色纹理**：通过 PCA（主成分分析）合成的面部纹理
   - **Alpha 遮罩**：用于透明度和混合
   - **深度信息**：用于正确的3D前后关系

2. **身体视频帧**
   - 从视频解码得到的身体部分图像
   - 作为纹理贴图到 Canvas

3. **背景图像**（可选）
   - 背景图片或纯色背景

#### 2. 渲染流程

```typescript
// src/utils/GLPipeline.ts:882-905
public renderFrame(image, frame, background, transform) {
  // 1. 渲染脸部3D网格（如果有面部数据）
  if (frame) {
    this.renderMesh(this.charData, frame);
    // 输出：mesh_color（颜色）和 mesh_alpha（透明度）到 FrameBuffer
  }
  
  // 2. 合成最终画面到 Canvas
  this.renderBackground(background, image, transform);
  // 将 mesh_color、mesh_alpha、body_texture、background 合成
  // 最终输出到 Canvas 的默认帧缓冲区
}
```

#### 3. 具体渲染步骤

**步骤1：渲染脸部遮罩（Alpha）**
```typescript
// 渲染到 FrameBuffer_MSAA（多重采样帧缓冲区）
this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_MSAA);
// 使用 maskPipelineInfo 着色器渲染
// 输出：mesh_alpha（透明度遮罩）
```

**步骤2：渲染脸部颜色（PCA纹理）**
```typescript
// 继续使用 FrameBuffer_MSAA
this.device.gl.useProgram(this.meshPipelineInfo!.program);
// 使用 PCA 纹理合成面部颜色
// 输出：mesh_color（RGB颜色）
```

**步骤3：Blit 到最终纹理**
```typescript
// 将 MSAA 缓冲区的内容复制到最终纹理
this.device.gl.bindFramebuffer(this.device.gl.DRAW_FRAMEBUFFER, this.FrameBuffer_meshColor);
this.device.gl.blitFramebuffer(...);  // 复制颜色和深度
```

**步骤4：合成最终画面**
```typescript
// 渲染背景（合成所有内容）
this.renderBackground(background, image, transform);
// 片段着色器执行：
// - 混合 mesh_color 和 body_texture
// - 应用 mesh_alpha 进行透明度混合
// - 叠加 background（如果有）
// 最终输出到 Canvas 的默认帧缓冲区（null = Canvas）
this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, null);
```

#### 4. 最终输出到 Canvas 的内容

**位置**：`src/utils/GLPipeline.ts:34-76`（背景片段着色器）

```glsl
// 片段着色器最终输出
void main() {
  // 1. 获取身体纹理（char_body）
  vec4 char_color = texture(u_image_char_body, texCoord_char_color);
  vec4 char_alpha = texture(u_image_char_body, texCoord_char_alpha);
  
  // 2. 获取脸部网格颜色和透明度
  vec4 mesh_color = texture(u_image_mesh_color, texCoord_mesh);
  vec4 mesh_alpha = texture(u_image_mesh_alpha, texCoord_mesh);
  
  // 3. 混合计算
  vec3 final_rgb = mesh_alpha.r * mesh_color.rgb + 
                   (1.0 - mesh_alpha.r) * char_alpha_back * char_color.rgb;
  float final_alpha = mesh_alpha.r + (1.0 - mesh_alpha.r) * char_alpha_back;
  
  // 4. 应用身体前景遮罩
  final_rgb = char_alpha_front * char_color.rgb + 
              (1.0 - char_alpha_front) * final_alpha * final_rgb;
  
  // 5. 叠加背景（如果有）
  if(has_background) {
    vec4 bg_color = texture(u_image_bg, v_texCoord);
    final_rgb += bg_color.rgb * (1.0 - final_alpha);
    final_alpha = 1.0;
  }
  
  // 6. 最终输出到 Canvas（RGBA 像素）
  fragColor = vec4(final_rgb, final_alpha);
}
```

#### 5. 输出格式

WebGL2 最终给 Canvas 的是：

- **RGBA 像素数据**：每个像素包含 R、G、B、A 四个通道
- **分辨率**：与 Canvas 的 width 和 height 一致
- **格式**：sRGB 颜色空间（经过 sRGB2RGB 转换）
- **内容**：
  - **R、G、B**：合成后的颜色（脸部 + 身体 + 背景）
  - **A**：透明度通道（用于与页面其他元素混合）

#### 6. 渲染管线总结

```
脸部3D数据
  ↓
[顶点着色器] → 3D变换、骨骼动画、混合形状
  ↓
[片段着色器] → PCA纹理合成、颜色计算
  ↓
FrameBuffer (mesh_color + mesh_alpha)
  ↓
[背景片段着色器] → 混合脸部、身体、背景
  ↓
Canvas 默认帧缓冲区 (null)
  ↓
Canvas 显示在浏览器中
```

**关键点**：
- WebGL2 不直接操作 Canvas 的像素
- 而是通过 **帧缓冲区（Framebuffer）** 进行离屏渲染
- 最终通过 `bindFramebuffer(null)` 将结果输出到 Canvas
- Canvas 自动显示帧缓冲区的内容

### 渲染管线

**位置**：`src/utils/GLPipeline.ts`

面部数据使用 **WebGL2** 进行3D渲染，主要包含以下步骤：

#### 1. 骨骼动画计算

```typescript
// 计算当前帧的骨骼状态
let currentSkeletonStatus = char.evalSkeletonFromMovable(frame_data.movableJointTransforms);

// 计算每个关节的变换矩阵
let joint_matrices = Array(char.skeleton.length);
for (let i = 0; i < char.skeleton.length; i++) {
  const joint_transform = currentSkeletonStatus[i].apply(this.initSkeletonStatus[i].inv());
  joint_matrices[i] = joint_transform.homogeneous_matrix(); // 4x4 变换矩阵
}
```

#### 2. 混合形状权重应用

```typescript
// 将混合形状权重传递给着色器
let effective_bs_count = Math.min(char.mesh[mesh_index].blendshapeIndices.length - 1, this.meshStatistics.max_bs_count);
for (let i = 0; i < effective_bs_count; i++) {
  this._ub_rig_info_data![ub_rig_info_data_offset + i] = 
    frame_data.blendshapeWeights[char.mesh[mesh_index].blendshapeIndices[i + 1] - 1];
}
```

#### 3. WebGL 着色器渲染

**顶点着色器**（Vertex Shader）：
- 执行 **LBS（Linear Blend Skinning）** 骨骼动画
- 应用混合形状变形（Blend Shape Deformation）
- 进行3D到2D的投影变换

```glsl
// 顶点着色器核心逻辑
vec4 lbs_transform(vec3 pos) {
  // 线性混合蒙皮：根据骨骼权重混合多个关节变换
  vec4 result = vec4(0.0);
  for(uint i = 0u; i < 8u; i++) {
    result += joint_weight * (ub_rig.joint_matrices[joint_index] * aug_pos);
  }
  return result;
}

vec3 bs_accumulate(uint vertex_id) {
  // 混合形状累积：根据权重变形顶点位置
  vec3 pos = vec3(0.0);
  for(uint i = 0u; i < u_bs_count; i++) {
    pos += bs_weight * bs_offset;
  }
  return pos;
}

void main() {
  vec3 bs_pos = bs_accumulate(uint(gl_VertexID));
  v_pos = u_proj_mat * lbs_transform(pos + bs_pos); // 3D到2D投影
  gl_Position = v_pos;
}
```

**片段着色器**（Fragment Shader）：
- 使用 **PCA（主成分分析）** 合成纹理
- 应用 LUT（查找表）进行颜色校正
- 处理伽马校正和色彩平衡

```glsl
// 片段着色器核心逻辑
vec4 pca_accumulate(vec2 tex_coord) {
  // PCA纹理合成：根据权重混合多个PCA分量
  vec4 result = vec4(0.0);
  for(int i = 0; i < texSize.z; i++) {
    result += pca_weights[i] * texture(u_image_pca, vec3(tex_coord, float(i)));
  }
  return result;
}

void main() {
  vec4 sample_color = pca_accumulate(v_tex_coord);
  if(has_lut) sample_color = texture(u_image_lut, sample_color.rgb);
  fragColor = RGB2sRGB(sample_color);
}
```

#### 4. 渲染流程

```typescript
private renderMesh(data: GLPipelineCharData, frame_data: IBRAnimationFrameData_NN) {
  // 1. 启用深度测试
  this.device.gl.enable(this.device.gl.DEPTH_TEST);
  
  // 2. 渲染遮罩（用于Alpha混合）
  this.device.gl.bindFramebuffer(this.device.gl.FRAMEBUFFER, this.FrameBuffer_MSAA);
  // ... 渲染遮罩 ...
  
  // 3. 渲染颜色（PCA纹理合成）
  this.device.gl.useProgram(this.meshPipelineInfo!.program);
  // ... 设置uniform、绑定纹理、绘制网格 ...
  this.device.gl.drawElements(this.device.gl.TRIANGLES, ...);
  
  // 4. 将结果blit到最终framebuffer
  this.device.gl.blitFramebuffer(...);
}
```

### 3D数据结构

面部数据包含以下3D信息：

```typescript
interface IBRAnimationFrameData_NN {
  // 1. 可移动关节变换（3D位置和旋转）
  movableJointTransforms: RigidTransform[];
  
  // 2. 混合形状权重（用于面部表情变形）
  blendshapeWeights: number[];
  
  // 3. 网格数据
  mesh: Array<{
    textureModelIndex: number;    // 纹理模型索引
    texturePCAWeights: number[];   // PCA权重（用于纹理合成）
  }>;
}
```

### 渲染技术要点

1. **LBS（Linear Blend Skinning）**：线性混合蒙皮，实现骨骼动画
2. **Blend Shape**：混合形状，实现面部表情变形
3. **PCA Texture**：主成分分析纹理，压缩和合成面部纹理
4. **MSAA**：多重采样抗锯齿，提升渲染质量
5. **深度测试**：正确处理3D物体的前后关系

---

## 总结

### 核心理解

**脸部渲染流程**：
```
脸部3D数据 → WebGL2 着色器处理 → 3D图形渲染 → 输出到 Canvas
```

**具体说明**：
1. **脸部数据是3D的**：包含3D网格、骨骼、混合形状等
2. **WebGL2 渲染3D图形**：通过顶点着色器和片段着色器在 GPU 上渲染
3. **输出到 Canvas**：渲染结果（RGBA 像素）输出到 Canvas 的帧缓冲区
4. **Canvas 显示**：Canvas 作为 DOM 元素显示最终的3D渲染结果

### 完整处理流程

面部数据和身体数据的处理流程包括：

1. **接收**：通过 WebSocket 接收压缩/编码数据
2. **解析**：解压缩、解码、格式转换
3. **缓存**：存储到不同的队列中
4. **解码**：身体数据在 Worker 中异步解码视频
5. **渲染**：
   - **身体数据**：直接渲染视频帧（2D图像）
   - **面部数据**：通过 **WebGL2** 进行 **3D图形渲染**（骨骼动画、混合形状、PCA纹理合成），然后输出到 Canvas

### 渲染对比

| 数据类型 | 渲染方式 | 输出内容 | 承载方式 |
|---------|---------|---------|---------|
| **脸部数据** | WebGL2 3D渲染 | 3D网格 → RGBA像素 | Canvas |
| **身体数据** | 视频解码（2D） | 视频帧 → RGBA像素 | Canvas |

**两者最终都输出到同一个 Canvas 上，通过 Alpha 混合合成最终画面。**

---

## Alpha 混合合成详解

### 什么是 Alpha 混合？

**Alpha 混合**是一种图像合成技术，用于将多个图层按照透明度进行混合，实现自然的叠加效果。

**基本原理**：
```
最终颜色 = 前景颜色 × 前景透明度 + 背景颜色 × (1 - 前景透明度)
```

### 数字人渲染中的 Alpha 混合

在数字人渲染中，需要将以下图层进行 Alpha 混合：

1. **背景层**（最底层）
2. **身体视频层**（中间层）
3. **脸部3D网格层**（最上层）

### 混合流程详解

**位置**：`src/utils/GLPipeline.ts:45-75`（背景片段着色器）

#### 步骤1：获取各层数据

```glsl
// 1. 身体视频纹理（包含颜色和Alpha通道）
vec4 char_color = texture(u_image_char_body, texCoord_char_color);  // 身体颜色
vec4 char_alpha = texture(u_image_char_body, texCoord_char_alpha);  // 身体Alpha

// 2. 脸部3D网格（之前渲染到纹理的）
vec4 mesh_color = texture(u_image_mesh_color, texCoord_mesh);      // 脸部颜色
vec4 mesh_alpha = texture(u_image_mesh_alpha, texCoord_mesh);         // 脸部Alpha

// 3. 背景（如果有）
vec4 bg_color = texture(u_image_bg, v_texCoord);                    // 背景颜色
```

#### 步骤2：提取 Alpha 值

```glsl
// 身体有两个Alpha值：
float char_alpha_back = char_alpha.r;                    // 身体背景Alpha（身体部分）
float char_alpha_front = max(char_alpha.r - char_alpha.b, 0.0);  // 身体前景Alpha（脸部区域）

// 脸部Alpha
float mesh_alpha_value = mesh_alpha.r;                   // 脸部Alpha值
```

#### 步骤3：混合脸部网格和身体背景

```glsl
// 公式：final = mesh × mesh_alpha + body × (1 - mesh_alpha) × body_alpha
vec3 final_rgb = mesh_alpha.r * mesh_color.rgb + 
                 (1.0 - mesh_alpha.r) * char_alpha_back * char_color.rgb;

float final_alpha = mesh_alpha.r + (1.0 - mesh_alpha.r) * char_alpha_back;
```

**理解**：
- 如果 `mesh_alpha.r = 1.0`（脸部完全不透明）：完全显示脸部颜色
- 如果 `mesh_alpha.r = 0.0`（脸部完全透明）：显示身体颜色
- 如果 `mesh_alpha.r = 0.5`（半透明）：50% 脸部 + 50% 身体

#### 步骤4：应用身体前景遮罩

```glsl
// 身体前景（脸部区域）覆盖在混合结果上
final_rgb = char_alpha_front * char_color.rgb + 
            (1.0 - char_alpha_front) * final_alpha * final_rgb;

final_alpha = char_alpha_front + (1.0 - char_alpha_front) * final_alpha;
```

**理解**：
- `char_alpha_front` 是身体视频中脸部区域的遮罩
- 在脸部区域，优先显示身体视频的内容
- 在非脸部区域，显示之前混合的结果（脸部网格 + 身体背景）

#### 步骤5：叠加背景（如果有）

```glsl
if(has_background) {
  // 公式：final = current + background × (1 - current_alpha)
  final_rgb += bg_color.rgb * (1.0 - final_alpha);
  final_alpha = 1.0;  // 有背景时，最终完全不透明
}
```

**理解**：
- 背景只在当前内容透明的地方显示
- `(1.0 - final_alpha)` 是背景的可见度
- 如果 `final_alpha = 1.0`（完全不透明），背景不可见
- 如果 `final_alpha = 0.0`（完全透明），完全显示背景

### 完整混合公式

```
最终颜色 = 
  身体前景 × 身体前景Alpha +
  (1 - 身体前景Alpha) × (
    脸部颜色 × 脸部Alpha +
    身体背景 × (1 - 脸部Alpha) × 身体背景Alpha
  ) +
  背景颜色 × (1 - 最终Alpha)
```

### 可视化示例

假设某个像素的 Alpha 混合过程：

```
初始状态：
┌─────────────┐
│  背景层     │  (bg_color)
└─────────────┘
      ↓ Alpha混合
┌─────────────┐
│  身体背景   │  (char_color × char_alpha_back)
└─────────────┘
      ↓ Alpha混合
┌─────────────┐
│  脸部网格   │  (mesh_color × mesh_alpha)
└─────────────┘
      ↓ Alpha混合
┌─────────────┐
│  身体前景   │  (char_color × char_alpha_front)
└─────────────┘
      ↓
┌─────────────┐
│  最终画面   │  (final_rgb, final_alpha)
└─────────────┘
```

### 实际应用场景

1. **脸部区域**：
   - `mesh_alpha` 较高 → 显示脸部3D网格
   - `char_alpha_front` 较高 → 身体视频的脸部区域覆盖

2. **身体区域**：
   - `mesh_alpha` 较低 → 显示身体视频
   - `char_alpha_back` 控制身体可见度

3. **透明区域**：
   - `final_alpha` 较低 → 显示背景

### 为什么需要 Alpha 混合？

1. **无缝融合**：脸部3D和身体视频需要自然过渡
2. **透明度处理**：正确处理边缘、阴影等透明效果
3. **层级叠加**：背景、身体、脸部的正确叠加顺序
4. **性能优化**：在 GPU 上并行处理所有像素的混合

### 代码位置总结

- **混合逻辑**：`src/utils/GLPipeline.ts:45-75`（片段着色器）
- **纹理绑定**：`src/utils/GLPipeline.ts:671-706`（renderBackground 方法）
- **执行位置**：GPU（硬件加速，并行处理所有像素）

整个流程设计考虑了性能优化、内存管理和错误处理，确保数字人渲染的流畅性和稳定性。

**关键技术**：
- 面部使用 **WebGL2** 进行3D实时渲染（GPU 硬件加速）
- 身体使用 **WebCodecs** 进行视频解码（2D图像）
- 两者通过 Alpha 混合合成最终画面
- 最终显示在 **Web DOM 的 Canvas 元素**上

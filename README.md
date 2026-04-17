# MeetingScribe 🎙️

实时会议转写 + 智能总结桌面工具

- **实时逐字转写**：豆包 ASR 流式识别，字级别实时显示
- **音波动画**：录音时显示音量律动效果
- **智能总结**：会议结束后一键生成结构化 Markdown 总结
- **Obsidian 同步**：直接写入本地 Vault，自动出现在 Obsidian 中
- **极简 UI**：悬浮字幕条，始终置顶，右键菜单操作

---

## 快速开始

### 1. 安装 Node.js 依赖

```bash
cd meeting-scribe
npm install
```

### 2. 安装 Python 依赖

```bash
cd python
pip install -r requirements.txt
```

> Windows 用户如果 `sounddevice` 安装失败，需要先安装 PortAudio：
> 下载 [portaudio](http://www.portaudio.com/) 或使用 `pip install pipwin && pipwin install pyaudio`

### 3. 配置 API Key

启动应用后，右键菜单 → **设置**，填写：

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| 火山引擎 App ID | 豆包语音 ASR | [豆包语音控制台](https://console.volcengine.com/speech/app) |
| 火山引擎 Token | 豆包语音 ASR | 同上 |
| LLM API Key | 智能总结 | 豆包/DeepSeek/OpenAI 均可 |
| LLM Base URL | API 地址 | 默认豆包，可改 DeepSeek |
| Obsidian Vault 路径 | 存放会议记录的文件夹 | 你的 Obsidian 目录 |

配置也保存在 `~/.meeting-scribe/config.json`，可直接编辑。

### 4. 启动开发模式

```bash
npm run dev
```

---

## 使用方式

| 操作 | 方式 |
|------|------|
| 开始录音 | 右键菜单 → 开始录音，或点击顶部「开始」按钮 |
| 停止录音 | 右键菜单 → 停止录音，或点击「停止」按钮 |
| 查看逐字稿 | 右键菜单 → 查看完整逐字稿 |
| 生成总结 | 右键菜单 → 生成智能总结 |
| 同步 Obsidian | 在总结弹窗点击「同步到 Obsidian」 |
| 拖动窗口 | 拖动字幕条任意位置 |
| 退出 | 右键菜单 → 退出 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron |
| 前端 | React + TypeScript + Tailwind CSS |
| 后端 | Python + asyncio |
| 前后端通信 | WebSocket (port 8765) + HTTP (port 8766) |
| 语音转写 | 豆包 ASR（大模型流式语音识别） |
| 智能总结 | 豆包 LLM / DeepSeek / OpenAI（兼容 OpenAI 格式） |
| 音频捕获 | sounddevice |
| Obsidian 同步 | 直接写入本地文件 |

---

## 系统音频捕获（线上会议）

默认只能捕获麦克风。如果需要转写 Zoom/Teams/腾讯会议的声音：

- **Windows**：在声音设置中启用「立体声混音」（Stereo Mix），然后在设置中选择该设备
- **macOS**：安装 [BlackHole](https://existential.audio/blackhole/)，设置多输出设备

---

## 打包发布

```bash
npm run build
```

输出在 `dist-electron/` 目录。

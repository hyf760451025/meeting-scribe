import { useEffect, useRef } from 'react'
import type { AppStatus, Message } from '../App'
import Waveform from './Waveform'

interface SubtitleBarProps {
  status: AppStatus
  messages: Message[]
  interimText: string
  volume: number
  connected: boolean
  onStart: () => void
  onStop: () => void
}

export default function SubtitleBar({
  status,
  messages,
  interimText,
  volume,
  connected,
  onStart,
  onStop,
}: SubtitleBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'

  // 新内容时自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, interimText])

  // 全部文字（已确认 + 当前实时）
  const hasContent = messages.length > 0 || interimText

  return (
    <div className="w-full h-full flex flex-col bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden select-none">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 shrink-0">
        {/* 左侧：状态指示 + 音波 */}
        <div className="flex items-center gap-2">
          {/* 状态点 */}
          <div className={`w-2 h-2 rounded-full transition-colors ${
            !connected ? 'bg-zinc-600' :
            isRecording ? 'bg-red-500 animate-pulse' :
            isProcessing ? 'bg-yellow-500 animate-pulse' :
            'bg-zinc-500'
          }`} />

          {/* 音波动画 */}
          <Waveform active={isRecording} volume={volume} />

          {/* 状态文字 */}
          <span className="text-xs text-zinc-500 ml-1">
            {!connected ? '连接中...' :
             isRecording ? '录音中' :
             isProcessing ? '生成总结中...' :
             '就绪'}
          </span>
        </div>

        {/* 右侧：控制按钮 */}
        <div className="flex items-center gap-1.5">
          {isRecording ? (
            <button
              data-no-drag
              onClick={onStop}
              className="px-2.5 py-0.5 text-xs rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              data-no-drag
              onClick={onStart}
              disabled={!connected || isProcessing}
              className="px-2.5 py-0.5 text-xs rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              开始
            </button>
          )}
          {/* 最小化按钮 */}
          <button
            data-no-drag
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors text-base leading-none"
            title="最小化"
          >
            –
          </button>
        </div>
      </div>

      {/* 字幕区域 */}
      <div
        ref={scrollRef}
        data-no-drag
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {!hasContent ? (
          <p className="text-zinc-600 text-sm leading-relaxed">
            {connected
              ? isRecording
                ? '正在聆听...'
                : '右键菜单开始录音，或点击上方「开始」按钮'
              : '正在连接后端服务...'}
          </p>
        ) : (
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
            {/* 已确认文字 */}
            {messages.map((m) => m.text).join(' ')}
            {/* 实时中间文字（颜色稍淡） */}
            {interimText && (
              <span className="text-zinc-400"> {interimText}</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

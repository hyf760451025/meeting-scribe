import { useEffect, useRef } from 'react'
import type { AppStatus, Message } from '../App'
import Waveform from './Waveform'
import { loadSettings } from './SettingsModal'

// 说话人颜色映射，最多支持 8 个说话人
const SPEAKER_COLORS: Record<number, { text: string; label: string; badge: string }> = {
  0: { text: 'text-zinc-200',   label: '?',  badge: 'bg-zinc-600' },
  1: { text: 'text-indigo-300', label: 'S1', badge: 'bg-indigo-600' },
  2: { text: 'text-emerald-300',label: 'S2', badge: 'bg-emerald-600' },
  3: { text: 'text-amber-300',  label: 'S3', badge: 'bg-amber-600' },
  4: { text: 'text-rose-300',   label: 'S4', badge: 'bg-rose-600' },
  5: { text: 'text-cyan-300',   label: 'S5', badge: 'bg-cyan-600' },
  6: { text: 'text-purple-300', label: 'S6', badge: 'bg-purple-600' },
  7: { text: 'text-orange-300', label: 'S7', badge: 'bg-orange-600' },
  8: { text: 'text-pink-300',   label: 'S8', badge: 'bg-pink-600' },
}

function getSpeakerColor(id: number) {
  return SPEAKER_COLORS[id] ?? SPEAKER_COLORS[0]
}

interface SubtitleBarProps {
  status: AppStatus
  messages: Message[]
  interimText: string
  interimSpeakerId: number
  volume: number
  connected: boolean
  onStart: () => void
  onStop: () => void
}

export default function SubtitleBar({
  status,
  messages,
  interimText,
  interimSpeakerId,
  volume,
  connected,
  onStart,
  onStop,
}: SubtitleBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, interimText])

  const hasContent = messages.length > 0 || interimText

  // 检查是否有说话人信息（任意一条有 speakerId > 0）
  const hasSpeakerInfo = messages.some(m => m.speakerId > 0) || interimSpeakerId > 0

  return (
    <div className="w-full h-full flex flex-col bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden select-none">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            !connected ? 'bg-zinc-600' :
            isRecording ? 'bg-red-500 animate-pulse' :
            isProcessing ? 'bg-yellow-500 animate-pulse' :
            'bg-zinc-500'
          }`} />
          <Waveform active={isRecording} volume={volume} />
          <span className="text-xs text-zinc-500 ml-1">
            {!connected ? '连接中...' :
             isRecording ? '录音中' :
             isProcessing ? '生成总结中...' :
             '就绪'}
          </span>
        </div>

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

          <div className="w-px h-3 bg-white/10 mx-0.5" />

          <button
            data-no-drag
            onClick={() => {
              const behavior = loadSettings().minimizeBehavior
              window.electronAPI?.minimizeWindow(behavior)
            }}
            title={loadSettings().minimizeBehavior === 'tray' ? '最小化到托盘' : '最小化到任务栏'}
            className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors flex items-center justify-center group"
          >
            <span className="hidden group-hover:block text-[8px] text-yellow-900 leading-none font-bold">–</span>
          </button>

          <button
            data-no-drag
            onClick={() => window.electronAPI?.closeWindow()}
            title="退出"
            className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-500 transition-colors flex items-center justify-center group"
          >
            <span className="hidden group-hover:block text-[8px] text-red-900 leading-none font-bold">✕</span>
          </button>
        </div>
      </div>

      {/* 字幕区域 */}
      <div
        ref={scrollRef}
        data-no-drag
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
      >
        {!hasContent ? (
          <p className="text-zinc-600 text-sm leading-relaxed">
            {connected
              ? isRecording ? '正在聆听...' : '右键菜单开始录音，或点击上方「开始」按钮'
              : '正在连接后端服务...'}
          </p>
        ) : hasSpeakerInfo ? (
          // ── 有说话人信息：分行显示，带颜色标签 ──
          <>
            {messages.map(m => {
              const color = getSpeakerColor(m.speakerId)
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <span className={`text-[10px] px-1 py-0.5 rounded font-mono shrink-0 mt-0.5 ${color.badge} text-white`}>
                    {color.label}
                  </span>
                  <p className={`text-sm leading-relaxed ${color.text}`}>{m.text}</p>
                </div>
              )
            })}
            {interimText && (
              <div className="flex items-start gap-2 opacity-70">
                <span className={`text-[10px] px-1 py-0.5 rounded font-mono shrink-0 mt-0.5 ${getSpeakerColor(interimSpeakerId).badge} text-white`}>
                  {getSpeakerColor(interimSpeakerId).label}
                </span>
                <p className={`text-sm leading-relaxed ${getSpeakerColor(interimSpeakerId).text}`}>
                  {interimText}
                </p>
              </div>
            )}
          </>
        ) : (
          // ── 无说话人信息：紧凑模式，连续显示 ──
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
            {messages.map(m => m.text).join(' ')}
            {interimText && <span className="text-zinc-400"> {interimText}</span>}
          </p>
        )}
      </div>
    </div>
  )
}

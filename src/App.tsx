import { useState, useEffect, useRef, useCallback } from 'react'
import SubtitleBar from './components/SubtitleBar'
import SummaryModal from './components/SummaryModal'
import TranscriptModal from './components/TranscriptModal'
import SettingsModal from './components/SettingsModal'
import { useWebSocket } from './hooks/useWebSocket'
import { useWindowDrag } from './hooks/useWindowDrag'

export type AppStatus = 'idle' | 'recording' | 'processing'

export interface Message {
  id: string
  text: string
  isFinal: boolean
  timestamp: number
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [interimText, setInterimText] = useState('')
  const [summary, setSummary] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [volume, setVolume] = useState(0)

  // WebSocket 连接到 Python 后端
  const { sendMessage, connected } = useWebSocket('ws://localhost:8767', {
    onMessage: (data) => {
      const msg = JSON.parse(data)
      handleBackendMessage(msg)
    },
  })

  // 窗口拖动
  useWindowDrag()

  // 处理后端消息
  const handleBackendMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'connected':
      case 'pong':
        // 握手确认 / 心跳，忽略
        break

      case 'asr_interim':
        // 实时中间结果（可能会更新）
        setInterimText(msg.text)
        setVolume(msg.volume ?? 0)
        break

      case 'asr_final':
        // 最终确认文字，加入逐字稿
        setInterimText('')
        if (msg.text?.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              text: msg.text,
              isFinal: true,
              timestamp: Date.now(),
            },
          ])
        }
        setVolume(0)
        break

      case 'volume':
        setVolume(msg.value)
        break

      case 'summary_result':
        setSummary(msg.text)
        setShowSummary(true)
        setStatus('idle')
        break

      case 'error':
        console.error('[Backend Error]', msg.message)
        setStatus('idle')
        break
    }
  }, [])

  // 监听右键菜单事件
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'start':
          handleStart()
          break
        case 'stop':
          handleStop()
          break
        case 'show-transcript':
          setShowTranscript(true)
          break
        case 'summarize':
          handleSummarize()
          break
        case 'settings':
          setShowSettings(true)
          break
      }
    })
    return cleanup
  }, [status, messages])

  const handleStart = useCallback(() => {
    if (status === 'recording') return
    setStatus('recording')
    setMessages([])
    setInterimText('')
    setSummary('')
    sendMessage(JSON.stringify({ action: 'start' }))
  }, [status, sendMessage])

  const handleStop = useCallback(() => {
    if (status !== 'recording') return
    setStatus('idle')
    setInterimText('')
    setVolume(0)
    sendMessage(JSON.stringify({ action: 'stop' }))
  }, [status, sendMessage])

  const handleSummarize = useCallback(() => {
    if (messages.length === 0) return
    setStatus('processing')
    const fullTranscript = messages.map((m) => m.text).join('\n')
    sendMessage(JSON.stringify({ action: 'summarize', transcript: fullTranscript }))
  }, [messages, sendMessage])

  return (
    <div className="w-full h-full">
      {/* 主字幕条 */}
      <SubtitleBar
        status={status}
        messages={messages}
        interimText={interimText}
        volume={volume}
        connected={connected}
        onStart={handleStart}
        onStop={handleStop}
      />

      {/* 智能总结弹窗 */}
      {showSummary && (
        <SummaryModal
          summary={summary}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* 逐字稿弹窗 */}
      {showTranscript && (
        <TranscriptModal
          messages={messages}
          onClose={() => setShowTranscript(false)}
        />
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

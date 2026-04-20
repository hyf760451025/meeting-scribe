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
  speakerId: number  // 说话人 ID，0 表示未知
}

export interface Session {
  id: string        // 唯一 ID
  label: string     // tab 显示名称，如 "14:32"
  startTime: number
  messages: Message[]
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>('idle')
  const [sessions, setSessions] = useState<Session[]>([])       // 所有录制段
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null) // 当前录制段 ID
  const [interimText, setInterimText] = useState('')
  const [interimSpeakerId, setInterimSpeakerId] = useState(0)
  const [summary, setSummary] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [volume, setVolume] = useState(0)

  // 当前 session 的 messages（方便其他逻辑读取）
  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages ?? []

  // WebSocket 连接到 Python 后端
  const { sendMessage, connected } = useWebSocket('ws://localhost:8767', {
    onMessage: (data) => {
      const msg = JSON.parse(data)
      handleBackendMessage(msg)
    },
  })

  // 窗口拖动
  useWindowDrag()

  // 往当前 session 追加 message
  const appendMessage = useCallback((msg: Message) => {
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId
        ? {
            ...s,
            messages: (() => {
              const last = s.messages[s.messages.length - 1]
              if (last?.text === msg.text) return s.messages
              return [...s.messages, msg]
            })()
          }
        : s
    ))
  }, [currentSessionId])

  // 处理后端消息
  const handleBackendMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'connected':
      case 'pong':
        break

      case 'asr_interim':
        if (msg.text) setInterimText(msg.text)
        if (msg.volume) setVolume(msg.volume)
        if (msg.speaker_id !== undefined) setInterimSpeakerId(msg.speaker_id)
        break

      case 'asr_final':
        setInterimText('')
        setInterimSpeakerId(0)
        if (msg.text?.trim()) {
          appendMessage({
            id: Date.now().toString(),
            text: msg.text,
            isFinal: true,
            timestamp: Date.now(),
            speakerId: msg.speaker_id ?? 0,
          })
        }
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
  }, [appendMessage])

  // 监听右键菜单事件
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'start':   handleStart(); break
        case 'stop':    handleStop();  break
        case 'show-transcript': setShowTranscript(true); break
        case 'summarize': handleSummarize(); break
        case 'settings':  setShowSettings(true); break
      }
    })
    return cleanup
  }, [status, sessions, currentSessionId])

  const handleStart = useCallback(() => {
    if (status === 'recording') return

    // 新建一个 session
    const now = Date.now()
    const label = new Date(now).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const newSession: Session = {
      id: now.toString(),
      label,
      startTime: now,
      messages: [],
    }

    setSessions(prev => [...prev, newSession])
    setCurrentSessionId(newSession.id)
    setInterimText('')
    setSummary('')
    setStatus('recording')
    sendMessage(JSON.stringify({ action: 'start' }))
  }, [status, sendMessage])

  const handleStop = useCallback(() => {
    if (status !== 'recording') return
    setStatus('idle')
    // 停止时把当前 interimText 存入当前 session
    setInterimText(prev => {
      if (prev.trim()) {
        appendMessage({
          id: Date.now().toString(),
          text: prev,
          isFinal: false,
          timestamp: Date.now(),
        })
      }
      return ''
    })
    setVolume(0)
    sendMessage(JSON.stringify({ action: 'stop' }))
  }, [status, sendMessage, appendMessage])

  const handleSummarize = useCallback(() => {
    if (currentMessages.length === 0) return
    setStatus('processing')
    const fullTranscript = currentMessages.map(m => m.text).join('\n')
    sendMessage(JSON.stringify({ action: 'summarize', transcript: fullTranscript }))
  }, [currentMessages, sendMessage])

  return (
    <div className="w-full h-full">
      {/* 主字幕条 */}
      <SubtitleBar
        status={status}
        messages={currentMessages}
        interimText={interimText}
        interimSpeakerId={interimSpeakerId}
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
          sessions={sessions}
          currentSessionId={currentSessionId}
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

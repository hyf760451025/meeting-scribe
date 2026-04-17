import { useState } from 'react'
import type { Session } from '../App'

interface TranscriptModalProps {
  sessions: Session[]
  currentSessionId: string | null
  onClose: () => void
}

export default function TranscriptModal({ sessions, currentSessionId, onClose }: TranscriptModalProps) {
  // 默认选中当前录制段，没有则选最后一段
  const [activeId, setActiveId] = useState<string>(
    currentSessionId ?? sessions[sessions.length - 1]?.id ?? ''
  )

  const activeSession = sessions.find(s => s.id === activeId)
  const fullText = activeSession?.messages.map(m => m.text).join('\n') ?? ''

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText)
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <h2 className="text-sm font-semibold text-zinc-100">完整逐字稿</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              复制全部
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab 列表 */}
        {sessions.length > 0 && (
          <div className="flex gap-1 px-5 pt-3 pb-1 shrink-0 overflow-x-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveId(session.id)}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                  activeId === session.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
                }`}
              >
                {session.label}
                <span className="ml-1.5 text-zinc-400 text-[10px]">
                  {session.messages.length} 段
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 逐字稿列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!activeSession || activeSession.messages.length === 0 ? (
            <p className="text-zinc-600 text-sm">暂无内容</p>
          ) : (
            activeSession.messages.map((m) => (
              <div key={m.id} className="flex gap-3 group">
                <span className="text-xs text-zinc-600 shrink-0 mt-0.5 w-20">
                  {formatTime(m.timestamp)}
                </span>
                <p className="text-zinc-300 text-sm leading-relaxed flex-1">
                  {m.text}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

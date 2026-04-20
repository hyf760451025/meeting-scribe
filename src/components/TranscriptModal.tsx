import { useState } from 'react'
import type { Session } from '../App'

const SPEAKER_COLORS: Record<number, { text: string; label: string; badge: string }> = {
  0: { text: 'text-zinc-300',   label: '?',  badge: 'bg-zinc-600' },
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

interface TranscriptModalProps {
  sessions: Session[]
  currentSessionId: string | null
  onClose: () => void
}

export default function TranscriptModal({ sessions, currentSessionId, onClose }: TranscriptModalProps) {
  const [activeId, setActiveId] = useState<string>(
    currentSessionId ?? sessions[sessions.length - 1]?.id ?? ''
  )

  const activeSession = sessions.find(s => s.id === activeId)
  const fullText = activeSession?.messages.map(m => m.text).join('\n') ?? ''
  const hasSpeakerInfo = activeSession?.messages.some(m => m.speakerId > 0) ?? false

  const handleCopy = () => navigator.clipboard.writeText(fullText)

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

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

        {/* Tab */}
        {sessions.length > 0 && (
          <div className="flex gap-1 px-5 pt-3 pb-1 shrink-0 overflow-x-auto">
            {sessions.map(session => (
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
                <span className="ml-1.5 text-zinc-400 text-[10px]">{session.messages.length} 段</span>
              </button>
            ))}
          </div>
        )}

        {/* 逐字稿列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!activeSession || activeSession.messages.length === 0 ? (
            <p className="text-zinc-600 text-sm">暂无内容</p>
          ) : (
            activeSession.messages.map(m => {
              const color = getSpeakerColor(m.speakerId)
              return (
                <div key={m.id} className="flex gap-3">
                  <span className="text-xs text-zinc-600 shrink-0 mt-0.5 w-20">
                    {formatTime(m.timestamp)}
                  </span>
                  {hasSpeakerInfo && (
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono shrink-0 mt-0.5 h-fit ${color.badge} text-white`}>
                      {color.label}
                    </span>
                  )}
                  <p className={`text-sm leading-relaxed flex-1 ${hasSpeakerInfo ? color.text : 'text-zinc-300'}`}>
                    {m.text}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

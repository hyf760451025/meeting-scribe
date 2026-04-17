import type { Message } from '../App'

interface TranscriptModalProps {
  messages: Message[]
  onClose: () => void
}

export default function TranscriptModal({ messages, onClose }: TranscriptModalProps) {
  const fullText = messages.map((m) => m.text).join('\n')

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
            <span className="text-xs text-zinc-500 ml-1">{messages.length} 段</span>
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

        {/* 逐字稿列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-zinc-600 text-sm">暂无内容</p>
          ) : (
            messages.map((m) => (
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

import { useState } from 'react'

interface SummaryModalProps {
  summary: string
  onClose: () => void
}

export default function SummaryModal({ summary, onClose }: SummaryModalProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSyncObsidian = async () => {
    setSyncing(true)
    setSyncStatus('idle')
    try {
      const res = await fetch('http://localhost:8766/sync-obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })
      if (res.ok) {
        setSyncStatus('success')
      } else {
        setSyncStatus('error')
      }
    } catch {
      setSyncStatus('error')
    } finally {
      setSyncing(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-semibold text-zinc-100">智能总结</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 同步状态提示 */}
            {syncStatus === 'success' && (
              <span className="text-xs text-emerald-400">✓ 已同步到 Obsidian</span>
            )}
            {syncStatus === 'error' && (
              <span className="text-xs text-red-400">✗ 同步失败，请检查设置</span>
            )}

            {/* 复制按钮 */}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              复制
            </button>

            {/* 同步到 Obsidian */}
            <button
              onClick={handleSyncObsidian}
              disabled={syncing}
              className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {syncing ? (
                <>
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  同步中
                </>
              ) : (
                <>📎 同步到 Obsidian</>
              )}
            </button>

            {/* 关闭 */}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {summary}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'

interface SettingsModalProps {
  onClose: () => void
}

interface Settings {
  obsidianVaultPath: string
  summaryTemplate: string
  opacity: number              // 窗口透明度 0.3 ~ 1.0
  minimizeBehavior: 'tray' | 'taskbar'  // 最小化行为
}

const DEFAULT_SETTINGS: Settings = {
  obsidianVaultPath: '',
  summaryTemplate: `## 📅 会议信息
- 时间：{{date}}
- 时长：{{duration}}

## 🎯 会议主题


## 👥 参会人员


## 📌 关键决策


## ✅ 待办事项
- [ ] 

## 💬 其他备注


## 📎 下次会议
`,
  opacity: 0.92,
  minimizeBehavior: 'tray',
}

const STORAGE_KEY = 'linging-settings'

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {}
  return DEFAULT_SETTINGS
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'ui' | 'obsidian' | 'template'>('ui')

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  // 透明度实时预览
  useEffect(() => {
    window.electronAPI?.setOpacity(settings.opacity)
  }, [settings.opacity])

  const handleSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    try {
      await fetch('http://localhost:8766/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const tabs = [
    { id: 'ui',       label: '🎨 界面' },
    { id: 'obsidian', label: '📎 Obsidian' },
    { id: 'template', label: '📝 总结模板' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl animate-slide-up max-h-[85vh]">

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <h2 className="text-sm font-semibold text-zinc-100">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* 界面设置 */}
          {activeTab === 'ui' && (
            <>
              {/* 透明度 */}
              <Section title="窗口透明度">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">透明度</span>
                    <span className="text-xs text-zinc-400 w-10 text-right">
                      {Math.round(settings.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.01}
                    value={settings.opacity}
                    onChange={e => update('opacity', parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>30% 半透明</span>
                    <span>100% 不透明</span>
                  </div>
                </div>
              </Section>

              {/* 最小化行为 */}
              <Section title="最小化行为">
                <p className="text-xs text-zinc-500 mb-3">
                  同时影响界面右上角按钮和右键菜单的最小化动作
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'tray',     label: '最小化到系统托盘', desc: '窗口隐藏，点击右下角托盘图标恢复' },
                    { value: 'taskbar',  label: '最小化到任务栏',   desc: '窗口缩小到任务栏，点击任务栏恢复' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        settings.minimizeBehavior === opt.value
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="minimizeBehavior"
                        value={opt.value}
                        checked={settings.minimizeBehavior === opt.value}
                        onChange={() => update('minimizeBehavior', opt.value as 'tray' | 'taskbar')}
                        className="mt-0.5 accent-indigo-500"
                      />
                      <div>
                        <p className="text-xs text-zinc-200">{opt.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* Obsidian */}
          {activeTab === 'obsidian' && (
            <Section title="Obsidian Vault 路径">
              <Field label="Vault 路径">
                <Input
                  value={settings.obsidianVaultPath}
                  onChange={v => update('obsidianVaultPath', v)}
                  placeholder="C:\Users\你\Documents\Obsidian\MyVault\Meetings"
                />
              </Field>
              <p className="text-xs text-zinc-600 mt-2">
                填写 Obsidian Vault 里用于存放会议记录的文件夹路径，总结将以「YYYY-MM-DD 会议记录.md」格式写入。
              </p>
            </Section>
          )}

          {/* 总结模板 */}
          {activeTab === 'template' && (
            <Section title="Markdown 模板">
              <p className="text-xs text-zinc-500 mb-2">
                支持变量：
                <code className="text-indigo-400 mx-1">{'{{date}}'}</code>
                <code className="text-indigo-400 mx-1">{'{{duration}}'}</code>
                <code className="text-indigo-400 mx-1">{'{{transcript}}'}</code>
              </p>
              <textarea
                value={settings.summaryTemplate}
                onChange={e => update('summaryTemplate', e.target.value)}
                rows={14}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 resize-none"
              />
            </Section>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3.5 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            {saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 小组件 ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-zinc-400 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
    />
  )
}

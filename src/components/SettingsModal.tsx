import { useState, useEffect } from 'react'

interface SettingsModalProps {
  onClose: () => void
}

interface Settings {
  volcengineAppId: string
  volcengineToken: string
  llmApiKey: string
  llmBaseUrl: string
  llmModel: string
  obsidianVaultPath: string
  summaryTemplate: string
}

const DEFAULT_SETTINGS: Settings = {
  volcengineAppId: '',
  volcengineToken: '',
  llmApiKey: '',
  llmBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  llmModel: 'doubao-pro-32k',
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
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'api' | 'obsidian' | 'template'>('api')

  useEffect(() => {
    // 从 localStorage 加载设置
    const stored = localStorage.getItem('meeting-scribe-settings')
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      } catch {}
    }
  }, [])

  const handleSave = async () => {
    localStorage.setItem('meeting-scribe-settings', JSON.stringify(settings))
    // 同步到 Python 后端
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

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const tabs = [
    { id: 'api', label: '🔑 API 配置' },
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

        {/* Tab 切换 */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {tabs.map((tab) => (
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* API 配置 */}
          {activeTab === 'api' && (
            <>
              <Section title="火山引擎语音识别（豆包 ASR）">
                <Field label="App ID">
                  <Input
                    value={settings.volcengineAppId}
                    onChange={(v) => update('volcengineAppId', v)}
                    placeholder="从豆包语音控制台获取"
                  />
                </Field>
                <Field label="Access Token">
                  <Input
                    value={settings.volcengineToken}
                    onChange={(v) => update('volcengineToken', v)}
                    placeholder="从豆包语音控制台获取"
                    type="password"
                  />
                </Field>
              </Section>

              <Section title="大语言模型（智能总结）">
                <Field label="API Key">
                  <Input
                    value={settings.llmApiKey}
                    onChange={(v) => update('llmApiKey', v)}
                    placeholder="豆包 / DeepSeek / OpenAI 均可"
                    type="password"
                  />
                </Field>
                <Field label="Base URL">
                  <Input
                    value={settings.llmBaseUrl}
                    onChange={(v) => update('llmBaseUrl', v)}
                    placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  />
                </Field>
                <Field label="模型名称">
                  <Input
                    value={settings.llmModel}
                    onChange={(v) => update('llmModel', v)}
                    placeholder="doubao-pro-32k"
                  />
                </Field>
              </Section>
            </>
          )}

          {/* Obsidian 配置 */}
          {activeTab === 'obsidian' && (
            <Section title="Obsidian Vault 路径">
              <Field label="Vault 路径">
                <Input
                  value={settings.obsidianVaultPath}
                  onChange={(v) => update('obsidianVaultPath', v)}
                  placeholder="C:\Users\你\Documents\Obsidian\MyVault\Meetings"
                />
              </Field>
              <p className="text-xs text-zinc-600 mt-1">
                填写你的 Obsidian Vault 里用于存放会议记录的文件夹路径，会议总结将以
                「YYYY-MM-DD 会议记录.md」格式写入。
              </p>
            </Section>
          )}

          {/* 总结模板 */}
          {activeTab === 'template' && (
            <Section title="Markdown 模板">
              <p className="text-xs text-zinc-500 mb-2">
                支持变量：<code className="text-indigo-400">{'{{date}}'}</code>、
                <code className="text-indigo-400">{'{{duration}}'}</code>、
                <code className="text-indigo-400">{'{{transcript}}'}</code>
              </p>
              <textarea
                value={settings.summaryTemplate}
                onChange={(e) => update('summaryTemplate', e.target.value)}
                rows={14}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 resize-none"
              />
            </Section>
          )}
        </div>

        {/* 底部保存按钮 */}
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

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
    />
  )
}

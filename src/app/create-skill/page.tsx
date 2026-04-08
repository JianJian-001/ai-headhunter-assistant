'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import {
  Upload,
  MessageSquare,
  FileArchive,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSkillStore } from '@/lib/skill-store'
import type { Skill } from '@/lib/types'

type CreateMode = 'chat' | 'upload'

interface SkillDraft {
  name: string
  description: string
  category: string
  invocation_method: string
  system_prompt: string
}

export default function CreateSkillPage() {
  return (
    <Suspense>
      <CreateSkillPageInner />
    </Suspense>
  )
}

async function readJsonPayload(response: Response): Promise<Record<string, unknown> | null> {
  const responseText = await response.text()
  if (!responseText.trim()) return null
  try {
    return JSON.parse(responseText) as Record<string, unknown>
  } catch {
    return null
  }
}

function extractSkillDraft(content: string): SkillDraft | null {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (parsed && typeof parsed.name === 'string') {
      return {
        name: parsed.name || '',
        description: parsed.description || '',
        category: parsed.category || '自定义',
        invocation_method: parsed.invocation_method || '',
        system_prompt: parsed.system_prompt || content,
      }
    }
  } catch {
    // ignore parse errors
  }
  return null
}

function CreateSkillPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editSkillId = searchParams.get('edit')
  const { addSkill } = useSkillStore()
  const [mode, setMode] = useState<CreateMode>('chat')

  // Chat mode state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [skillDraft, setSkillDraft] = useState<SkillDraft | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)

  // Upload mode state
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load existing skill data when editing
  useEffect(() => {
    if (!editSkillId) return
    async function loadSkill() {
      try {
        const res = await fetch(`/api/skills/${editSkillId}`)
        if (!res.ok) {
          setEditLoadError('加载技能数据失败，请稍后重试。')
          return
        }
        const skill: Skill & { manifest?: { system_prompt?: string } } = await res.json()
        setSkillDraft({
          name: skill.name ?? '',
          description: skill.description ?? '',
          category: (skill as unknown as { category?: string }).category ?? '自定义',
          invocation_method: skill.invocation_method ?? '',
          system_prompt: skill.manifest?.system_prompt ?? '',
        })
        setChatMessages([{
          role: 'assistant',
          content: `已加载技能「${skill.name}」的当前配置，你可以在下方卡片中修改后重新保存。`,
        }])
      } catch {
        setEditLoadError('加载技能数据时出错，请稍后重试。')
      }
    }
    void loadSkill()
  }, [editSkillId])

  async function handleChatSubmit() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setChatInput('')
    setChatLoading(true)
    setSkillDraft(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `我想创建一个新技能：${userMsg}。

请帮我设计这个技能，包含以下内容：
1. 技能名称
2. 功能描述（清晰说明能做什么）
3. 分类（如：猎头工具、文案生成、数据分析、自定义等）
4. 调用方式（斜杠命令，如 /my-skill）
5. 系统提示词（详细说明 AI 如何执行该技能的工作流）

请在回复末尾用以下 JSON 格式输出技能信息（保留其他内容，JSON 块放在最后）：
\`\`\`json
{"name":"技能名称","description":"功能描述","category":"分类","invocation_method":"/命令","system_prompt":"详细的系统提示词..."}
\`\`\``,
          mode: 'agent',
          enabled_skills: ['skill-creator'],
        }),
      })

      if (!res.ok) {
        const errorPayload = await readJsonPayload(res)
        throw new Error(
          typeof errorPayload?.error === 'string' && errorPayload.error.trim()
            ? errorPayload.error
            : '创建技能请求失败，请稍后重试。',
        )
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.content) content += parsed.content
              } catch {}
            }
          }
        }
      }

      if (!content.trim()) {
        throw new Error('技能创建助手暂时没有返回内容，请稍后重试。')
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content }])

      // Try to extract skill draft from JSON block in the AI response
      const draft = extractSkillDraft(content)
      if (draft) {
        setSkillDraft(draft)
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error && error.message.trim()
              ? error.message
              : '抱歉，创建技能时出错了。',
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleConfirmCreate() {
    if (!skillDraft || confirmLoading) return
    setConfirmLoading(true)
    try {
      const isEdit = Boolean(editSkillId)
      const res = await fetch(isEdit ? `/api/skills/${editSkillId}` : '/api/skills', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillDraft),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `${isEdit ? '更新' : '创建'}技能失败，请稍后重试。`)
      }
      const savedSkill: Skill = await res.json()
      // Auto-sync newly created/updated skill into skill-store so it's immediately usable in chat
      addSkill(savedSkill)
      setConfirmSuccess(true)
      setTimeout(() => router.push('/my-skills/added?tab=created'), 1500)
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error ? error.message : '保存技能时出错，请稍后重试。',
        },
      ])
    } finally {
      setConfirmLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/skills/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setUploadSuccess(true)
        setUploadResult(`技能 "${data.name}" 上传成功！已添加到"我创建的"列表。`)
      } else {
        setUploadResult(`上传失败: ${data.error}`)
      }
    } catch {
      setUploadResult('上传失败，请重试')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <Link
          href="/my-skills/added"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#8E86AF] hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} /> 返回我的技能
        </Link>
        <h1 className="text-[42px] font-bold text-[#27214D] leading-tight">
          {editSkillId ? '技能改造' : '创建技能'}
        </h1>
        <p className="text-[15px] text-[#8E86AF] mt-1">
          {editSkillId ? '修改技能配置后点击确认保存' : '通过对话描述或上传技能文件包来创建新技能'}
        </p>
        {editLoadError && (
          <p className="mt-2 text-[14px] text-[#EF4444]">{editLoadError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Mode tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-2 h-10 px-5 rounded-2xl text-[14px] font-semibold transition-colors ${
              mode === 'chat'
                ? 'bg-[#F0EDFF] text-primary'
                : 'bg-white border border-[#EAE5FF] text-[#8E86AF] hover:bg-[#F6F3FF]'
            }`}
          >
            <MessageSquare size={16} /> 对话创建
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-2 h-10 px-5 rounded-2xl text-[14px] font-semibold transition-colors ${
              mode === 'upload'
                ? 'bg-[#F0EDFF] text-primary'
                : 'bg-white border border-[#EAE5FF] text-[#8E86AF] hover:bg-[#F6F3FF]'
            }`}
          >
            <FileArchive size={16} /> 上传技能文件包
          </button>
        </div>

        {mode === 'chat' ? (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-3xl border border-[#EAE5FF] p-6">
              <div className="space-y-3 mb-5 max-h-[400px] overflow-y-auto">
                {chatMessages.length === 0 && (
                  <p className="text-[14px] text-[#8E86AF] text-center py-10">
                    描述你想创建的技能，AI 会帮你设计并生成技能配置
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-[14px] p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-white ml-12 rounded-tr-lg'
                        : 'bg-[#F6F3FF] text-[#27214D] mr-12 rounded-tl-lg'
                    }`}
                  >
                    {msg.role === 'assistant'
                      ? msg.content.replace(/```json[\s\S]*?```/g, '').trim()
                      : msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-[#F6F3FF] mr-12 rounded-2xl rounded-tl-lg p-4 flex items-center gap-2">
                    <Loader2 size={16} className="text-primary animate-spin" />
                    <span className="text-[14px] text-[#8E86AF]">AI 正在设计技能...</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleChatSubmit()}
                  placeholder="描述你想创建的技能，例如：帮我写销售邮件的技能..."
                  className="flex-1 h-11 px-4 rounded-2xl bg-white border border-[#EAE5FF] text-[14px] text-[#27214D] placeholder:text-[#B8B0D4] focus:outline-none focus:border-primary transition-colors"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-11 px-5 rounded-2xl bg-primary text-white text-[14px] font-medium hover:bg-[#5B4EE6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发送
                </button>
              </div>
            </div>

            {/* Skill draft confirmation card */}
            {skillDraft && !confirmSuccess && (
              <div className="bg-white rounded-3xl border-2 border-primary/30 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-primary" />
                  <h3 className="text-[15px] font-bold text-[#27214D]">技能设计完成，确认创建？</h3>
                </div>
                <div className="space-y-3 mb-5">
                  <div className="flex gap-3">
                    <span className="text-[13px] text-[#8E86AF] w-20 flex-shrink-0">技能名称</span>
                    <input
                      value={skillDraft.name}
                      onChange={(e) => setSkillDraft({ ...skillDraft, name: e.target.value })}
                      className="flex-1 h-9 px-3 rounded-xl border border-[#EAE5FF] text-[14px] text-[#27214D] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[13px] text-[#8E86AF] w-20 flex-shrink-0">功能描述</span>
                    <textarea
                      value={skillDraft.description}
                      onChange={(e) => setSkillDraft({ ...skillDraft, description: e.target.value })}
                      rows={2}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#EAE5FF] text-[14px] text-[#27214D] focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[13px] text-[#8E86AF] w-20 flex-shrink-0">分类</span>
                    <input
                      value={skillDraft.category}
                      onChange={(e) => setSkillDraft({ ...skillDraft, category: e.target.value })}
                      className="flex-1 h-9 px-3 rounded-xl border border-[#EAE5FF] text-[14px] text-[#27214D] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[13px] text-[#8E86AF] w-20 flex-shrink-0">调用方式</span>
                    <input
                      value={skillDraft.invocation_method}
                      onChange={(e) =>
                        setSkillDraft({ ...skillDraft, invocation_method: e.target.value })
                      }
                      placeholder="/my-skill"
                      className="flex-1 h-9 px-3 rounded-xl border border-[#EAE5FF] text-[14px] text-[#27214D] font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSkillDraft(null)}
                    className="flex-1 h-10 rounded-2xl border border-[#EAE5FF] text-[14px] text-[#8E86AF] hover:bg-[#F6F3FF] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmCreate}
                    disabled={confirmLoading || !skillDraft.name.trim()}
                    className="flex-1 h-10 rounded-2xl bg-primary text-white text-[14px] font-medium hover:bg-[#5B4EE6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {confirmLoading ? '创建中...' : '确认创建技能'}
                  </button>
                </div>
              </div>
            )}

            {confirmSuccess && (
              <div className="bg-[#E8FFF3] rounded-3xl border border-[#A7F3D0] p-6 text-center">
                <CheckCircle size={32} className="mx-auto text-[#10B981] mb-3" />
                <p className="text-[15px] font-bold text-[#065F46]">技能创建成功！</p>
                <p className="text-[13px] text-[#6EE7B7] mt-1">正在跳转到我创建的列表...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAE5FF] p-6 max-w-3xl">
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-14 text-center transition-colors ${
                uploading
                  ? 'border-primary/40 cursor-not-allowed'
                  : 'border-[#E4DDFD] cursor-pointer hover:border-primary/60'
              }`}
            >
              {uploading ? (
                <Loader2 size={36} className="mx-auto text-primary animate-spin mb-3" />
              ) : uploadSuccess ? (
                <CheckCircle size={36} className="mx-auto text-[#10B981] mb-3" />
              ) : (
                <Upload size={36} className="mx-auto text-[#8E86AF] mb-3" />
              )}
              <p className="text-[15px] text-[#27214D] font-medium">
                {uploading ? '上传中...' : uploadSuccess ? '上传成功' : '点击上传技能文件包'}
              </p>
              <p className="text-[13px] text-[#8E86AF] mt-1">格式为 .md、.zip 或者 .skill</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.zip,.skill"
              onChange={handleUpload}
              className="hidden"
            />
            {uploadResult && (
              <div
                className={`text-[14px] mt-4 text-center p-3 rounded-2xl ${
                  uploadSuccess
                    ? 'bg-[#E8FFF3] text-[#065F46]'
                    : 'bg-[#FFF5F5] text-[#EF4444]'
                }`}
              >
                {uploadResult}
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setUploadSuccess(false)
                    setUploadResult(null)
                  }}
                  className="flex-1 h-10 rounded-2xl border border-[#EAE5FF] text-[14px] text-[#8E86AF] hover:bg-[#F6F3FF] transition-colors"
                >
                  继续上传
                </button>
                <Link
                  href="/my-skills/added?tab=created"
                  className="flex-1 h-10 rounded-2xl bg-primary text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#5B4EE6] transition-colors"
                >
                  查看我创建的技能
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

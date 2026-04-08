'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip, Layers, ArrowUp, Loader2, Square, X } from 'lucide-react'
import { LuxeBotIcon } from '@/components/shared/AppIcons'
import type { ChatAttachment, ChatMode } from '@/lib/types'

interface ComposerProps {
  onSend: (payload: { content: string; attachments?: ChatAttachment[] }) => void
  disabled?: boolean
  isStreaming?: boolean
  onStop?: () => void
  enabledSkillSlugs?: string[]
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  autoOpenCreateGuideSignal?: number
  /** 自动打开弹窗后调用，将父级 signal 归零，避免空态→聊天切换时新 Composer 实例再次弹出 */
  onAutoOpenCreateGuideConsumed?: () => void
  /** 预填充到输入框的命令，例如 "/skill-slug " */
  presetCommand?: string
}

const modes: { value: ChatMode; label: string }[] = [
  { value: 'agent', label: 'Agent 模式' },
  { value: 'qa', label: '问答模式' },
  { value: 'web_search', label: '联网搜索' },
]

const CHAT_ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed'
const SKILL_PACKAGE_ACCEPT = '.md,.zip,.skill'
const CHAT_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'zip'])
const MAX_CHAT_ATTACHMENT_COUNT = 4

async function readResponsePayload(response: Response): Promise<Record<string, unknown> | null> {
  const responseText = await response.text()
  if (!responseText.trim()) {
    return null
  }

  try {
    return JSON.parse(responseText) as Record<string, unknown>
  } catch {
    return null
  }
}

export function Composer({
  onSend,
  disabled,
  isStreaming = false,
  onStop,
  enabledSkillSlugs = [],
  mode,
  onModeChange,
  autoOpenCreateGuideSignal = 0,
  onAutoOpenCreateGuideConsumed,
  presetCommand,
}: ComposerProps) {
  const [value, setValue] = useState('')
  const [showSlash, setShowSlash] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showCreateGuide, setShowCreateGuide] = useState(false)
  const [isUploadingSkillPackage, setIsUploadingSkillPackage] = useState(false)
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  const [attachedDocuments, setAttachedDocuments] = useState<ChatAttachment[]>([])
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const createGuideRef = useRef<HTMLDivElement>(null)
  const slashMenuRef = useRef<HTMLDivElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const skillPackageInputRef = useRef<HTMLInputElement>(null)

  // Auto-open create guide when navigating from "创建技能" button；打开后立即消费 signal，避免布局切换导致弹窗再次出现
  useEffect(() => {
    if (autoOpenCreateGuideSignal > 0) {
      setShowCreateGuide(true)
      onAutoOpenCreateGuideConsumed?.()
    }
  }, [autoOpenCreateGuideSignal, onAutoOpenCreateGuideConsumed])

  // Pre-fill textarea when a preset command is provided (e.g. from "立即使用")
  useEffect(() => {
    if (presetCommand) {
      setValue(presetCommand)
      textareaRef.current?.focus()
    }
  }, [presetCommand])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setShowSlash(false)
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false)
      }
      if (createGuideRef.current && !createGuideRef.current.contains(e.target as Node)) {
        setShowCreateGuide(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && attachedDocuments.length === 0) || disabled) return

    onSend({ content: trimmed, attachments: attachedDocuments })
    setValue('')
    setAttachedDocuments([])
    setDocumentUploadError(null)
    setShowSlash(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)
    setShowSlash(v === '/' || (v.startsWith('/') && !v.includes(' ')))
  }

  const selectSlashCommand = (slug: string) => {
    setValue(`/${slug} `)
    setShowSlash(false)
    textareaRef.current?.focus()
  }

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    if (attachedDocuments.length >= MAX_CHAT_ATTACHMENT_COUNT) {
      setDocumentUploadError(`最多保留 ${MAX_CHAT_ATTACHMENT_COUNT} 个附件，请先移除后再上传。`)
      if (documentInputRef.current) {
        documentInputRef.current.value = ''
      }
      return
    }

    const validFiles = files.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      return CHAT_ATTACHMENT_EXTENSIONS.has(extension)
    })

    if (validFiles.length === 0) {
      setDocumentUploadError('仅支持 PDF、Word（.doc/.docx）和 ZIP 文件。')
      if (documentInputRef.current) {
        documentInputRef.current.value = ''
      }
      return
    }

    const uploadDocuments = async () => {
      setIsUploadingDocuments(true)
      setDocumentUploadError(null)

      try {
        const formData = new FormData()
        validFiles.forEach((file) => {
          formData.append('files', file)
        })

        const response = await fetch('/api/chat/attachments', {
          method: 'POST',
          body: formData,
        })
        const data = await readResponsePayload(response)

        if (!response.ok) {
          const errorMessage =
            response.status === 401
              ? '请先登录后再上传文档。'
              : typeof data?.error === 'string' && data.error.trim()
                ? data.error
                : '附件上传失败，请稍后重试。'
          throw new Error(errorMessage)
        }

        if (!data || !Array.isArray(data.attachments)) {
          throw new Error('附件上传返回结果异常，请稍后重试。')
        }

        const nextAttachments = Array.isArray(data?.attachments)
          ? (data.attachments as ChatAttachment[])
          : []
        let ignoredAttachmentCount = 0

        setAttachedDocuments((currentDocuments) => {
          const mergedDocuments = [...currentDocuments]
          nextAttachments.forEach((attachment) => {
            if (
              mergedDocuments.length < MAX_CHAT_ATTACHMENT_COUNT &&
              !mergedDocuments.some((currentDocument) => currentDocument.id === attachment.id)
            ) {
              mergedDocuments.push(attachment)
            } else {
              ignoredAttachmentCount += 1
            }
          })
          return mergedDocuments
        })
        if (ignoredAttachmentCount > 0) {
          setDocumentUploadError(`最多保留 ${MAX_CHAT_ATTACHMENT_COUNT} 个附件，其余文件已忽略。`)
        }
      } catch (error) {
        setDocumentUploadError(
          error instanceof Error ? error.message : '附件上传失败，请稍后重试。',
        )
      } finally {
        setIsUploadingDocuments(false)
        if (documentInputRef.current) {
          documentInputRef.current.value = ''
        }
      }
    }

    void uploadDocuments()
  }

  const handleSkillPackageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setShowCreateGuide(false)
    setIsUploadingSkillPackage(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/skills/upload', { method: 'POST', body: formData })
      const data = await readResponsePayload(res)
      if (res.ok) {
        onSend({
          content: `/skill-creator 我上传了技能包「${typeof data?.name === 'string' ? data.name : file.name}」(${file.name})，请帮我解析并完善这个技能。注意：技能需保存到指定目录后方可被系统读取。`,
        })
      } else {
        onSend({
          content: `上传技能包失败: ${typeof data?.error === 'string' ? data.error : '未知错误'}，请帮我排查问题。`,
        })
      }
    } catch {
      onSend({ content: '上传技能包时网络出错了，请帮我重试。' })
    } finally {
      setIsUploadingSkillPackage(false)
      if (skillPackageInputRef.current) skillPackageInputRef.current.value = ''
    }
  }

  const openSkillPackagePicker = () => {
    setShowCreateGuide(false)
    skillPackageInputRef.current?.click()
  }

  const handleStartCreate = () => {
    setShowCreateGuide(false)
    onSend({ content: '/skill-creator 我想创建一个新技能，请帮我开始。' })
  }

  const removeAttachedDocument = (attachmentId: string) => {
    setAttachedDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== attachmentId),
    )
  }

  return (
    <div className="relative w-full max-w-[1020px]">
      {/* Slash command dropdown */}
      {showSlash && enabledSkillSlugs.length > 0 && (
        <div
          ref={slashMenuRef}
          className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-2xl border border-card-border shadow-lg max-h-64 overflow-y-auto z-20"
        >
          <div className="p-3 text-xs text-text-muted border-b border-card-border font-medium">
            可用技能命令
          </div>
          {enabledSkillSlugs
            .filter((s) => s.startsWith(value.slice(1)))
            .map((slug) => (
              <button
                key={slug}
                onClick={() => selectSlashCommand(slug)}
                className="w-full text-left px-4 py-2.5 hover:bg-bg text-sm text-text-primary transition-colors"
              >
                <span className="text-primary font-mono font-medium">/{slug}</span>
              </button>
            ))}
        </div>
      )}

      {/* Composer box */}
      <div className="flex flex-col gap-5 bg-white rounded-[28px] border border-[#EAE5FF] p-5 shadow-[0_18px_40px_rgba(125,112,249,0.07)]" style={{ minHeight: 180 }}>
        {attachedDocuments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachedDocuments.map((document) => (
              <div
                key={document.id}
                className="inline-flex items-center gap-2 rounded-full border border-[#E7E0FF] bg-[#F8F5FF] px-3 py-1.5 text-[13px] text-[#4A4365]"
              >
                <span className="font-medium">{document.name}</span>
                <span className="text-[#8E86AF] uppercase">{document.extension}</span>
                {document.extraction_status === 'parsed' && (
                  <span className="rounded-full bg-[#EDE7FF] px-2 py-0.5 text-[11px] text-primary">
                    已解析
                  </span>
                )}
                {document.parser_used && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#7B6AAE]">
                    {document.parser_used}
                  </span>
                )}
                <button
                  onClick={() => removeAttachedDocument(document.id)}
                  className="text-[#8E86AF] hover:text-[#27214D] transition-colors"
                  title="移除文件"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {documentUploadError && (
          <div className="rounded-2xl bg-[#FFF5F8] px-4 py-3 text-[13px] leading-relaxed text-[#9A3F63]">
            {documentUploadError}
          </div>
        )}

        {attachedDocuments.length > 0 && (
          <div className="text-[12px] text-[#8E86AF]">
            最多支持 {MAX_CHAT_ATTACHMENT_COUNT} 个附件同时进入对话上下文。
          </div>
        )}

        {/* Textarea area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder=""
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-[15px] text-text-primary placeholder:text-[#8E86AF] focus:outline-none leading-relaxed"
        />

        {/* Tool row */}
        <div className="flex items-center justify-between">
          {/* Left action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => documentInputRef.current?.click()}
              disabled={disabled || isUploadingDocuments}
              className="w-[42px] h-[42px] rounded-[13px] bg-white border border-[#E4DDFD] flex items-center justify-center text-text-muted hover:bg-[#F7F5FF] transition-colors shadow-[0_4px_10px_rgba(125,112,249,0.08)] disabled:opacity-40"
              title="上传文档 (.pdf / .doc / .docx / .zip)"
            >
              {isUploadingDocuments ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
            <input
              ref={documentInputRef}
              type="file"
              accept={CHAT_ATTACHMENT_ACCEPT}
              multiple
              onChange={handleDocumentUpload}
              className="hidden"
            />
            <div className="relative" ref={modeMenuRef}>
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="w-[42px] h-[42px] rounded-[13px] bg-white border border-[#E4DDFD] flex items-center justify-center text-text-muted hover:bg-[#F7F5FF] transition-colors shadow-[0_4px_10px_rgba(125,112,249,0.08)]"
              >
                <LuxeBotIcon size={18} className="text-[#5B4EE6]" />
              </button>
              {/* Mode menu float */}
              {showModeMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-[280px] bg-white rounded-[20px] border border-[#EAE5FF] p-4 shadow-[0_16px_30px_rgba(125,112,249,0.1)] z-30">
                  <div className="text-sm font-bold text-[#8B84A7] mb-3">Agent 设置</div>
                  {modes.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { onModeChange(m.value); setShowModeMenu(false) }}
                      className="flex items-center justify-between w-full py-2.5 text-[16px] text-[#27214D] hover:bg-bg rounded-lg px-1 transition-colors"
                    >
                      <span className={mode === m.value ? 'font-semibold' : 'font-medium'}>{m.label}</span>
                      {mode === m.value && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#27214D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={createGuideRef}>
              <button
                onClick={() => setShowCreateGuide(!showCreateGuide)}
                className={`w-[42px] h-[42px] rounded-[13px] flex items-center justify-center transition-colors shadow-[0_4px_10px_rgba(125,112,249,0.08)] ${
                  showCreateGuide ? 'bg-[#F1EEFF] border border-[#D8CCFF] text-primary' : 'bg-white border border-[#E4DDFD] text-text-muted hover:bg-[#F7F5FF]'
                }`}
              >
                <Layers size={18} />
              </button>
              {/* Create skill guide panel */}
              {showCreateGuide && (
                <div className="absolute bottom-full left-0 mb-2 w-[340px] bg-white rounded-[20px] border border-[#EAE5FF] p-5 shadow-[0_16px_30px_rgba(125,112,249,0.1)] z-30">
                  <div className="text-[15px] font-bold text-[#27214D] mb-3">创建技能</div>
                  <button
                    type="button"
                    onClick={openSkillPackagePicker}
                    disabled={isUploadingSkillPackage}
                    className="mb-4 w-full rounded-2xl border border-[#EAE5FF] bg-[#FCFBFF] px-4 py-3 text-left transition-colors hover:bg-[#F6F3FF] disabled:opacity-50"
                  >
                    <div className="text-[14px] font-medium text-[#27214D]">上传技能文件包</div>
                    <div className="mt-1 text-[12px] text-[#8E86AF]">格式为 .md、.zip 或者 .skill</div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openSkillPackagePicker}
                      disabled={isUploadingSkillPackage}
                      className="h-9 px-4 rounded-2xl bg-white border border-[#EAE5FF] text-[13px] font-medium text-[#27214D] hover:bg-[#F6F3FF] transition-colors"
                    >
                      上传技能文件包
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCreate}
                      disabled={isUploadingSkillPackage}
                      className="h-9 px-4 rounded-2xl bg-primary text-white text-[13px] font-medium hover:bg-[#5B4EE6] transition-colors"
                    >
                      {isUploadingSkillPackage ? '上传中...' : '对话创建'}
                    </button>
                  </div>
                  <div className="mt-3 text-[12px] leading-relaxed text-[#8E86AF]">
                    也可以直接通过 <span className="text-primary font-medium">/skill-creator</span> 对话创建新技能。
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={isStreaming ? onStop : handleSend}
            disabled={isStreaming ? !onStop : ((!value.trim() && attachedDocuments.length === 0) || disabled)}
            className="w-[38px] h-[38px] rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-40 hover:bg-primary-dark transition-colors"
            title={isStreaming ? '暂停生成' : '发送消息'}
          >
            {isStreaming ? <Square size={14} fill="currentColor" /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
      <input
        ref={skillPackageInputRef}
        type="file"
        accept={SKILL_PACKAGE_ACCEPT}
        onChange={handleSkillPackageUpload}
        className="hidden"
      />
    </div>
  )
}

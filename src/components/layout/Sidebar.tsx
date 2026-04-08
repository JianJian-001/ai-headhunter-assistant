'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Layers,
  MessageSquare,
  MoreHorizontal,
  PencilLine,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { BrandCrest } from '@/components/shared/AppIcons'
import { useChatStore } from '@/lib/chat-store'
import { useLayoutStore } from '@/lib/layout-store'

const navItems = [
  {
    href: '/marketplace',
    label: '技能',
    icon: Layers,
    matchPaths: ['/marketplace', '/my-skills', '/create-skill', '/purchases', '/merchant'],
  },
]

const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_AVATAR_SIZE_BYTES = 20 * 1024 * 1024
const MAX_AVATAR_EDGE = 256
const MAX_PERSISTED_AVATAR_CHARS = 280_000
const MAX_AVATAR_DIMENSION = 6000
const MAX_AVATAR_TOTAL_PIXELS = 24_000_000
const MAX_CONVERSATION_TITLE_LENGTH = 40
const SIDEBAR_TRANSITION_DURATION_MS = 300
const HISTORY_MENU_VIEWPORT_PADDING = 12
const HISTORY_MENU_GAP = 8
const HISTORY_ACTION_MENU_WIDTH = 220
const HISTORY_RENAME_MENU_WIDTH = 260
const HISTORY_ACTION_MENU_HEIGHT = 150
const HISTORY_RENAME_MENU_HEIGHT = 188

type HistoryMenuMode = 'actions' | 'rename'
type HistoryMenuPosition = {
  top: number
  left: number
  width: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function resolveHistoryMenuPosition(triggerRect: DOMRect, menuMode: HistoryMenuMode): HistoryMenuPosition {
  const width = menuMode === 'rename' ? HISTORY_RENAME_MENU_WIDTH : HISTORY_ACTION_MENU_WIDTH
  const height = menuMode === 'rename' ? HISTORY_RENAME_MENU_HEIGHT : HISTORY_ACTION_MENU_HEIGHT
  const maxLeft = Math.max(
    HISTORY_MENU_VIEWPORT_PADDING,
    window.innerWidth - width - HISTORY_MENU_VIEWPORT_PADDING,
  )
  const canOpenAbove =
    triggerRect.top >= height + HISTORY_MENU_GAP + HISTORY_MENU_VIEWPORT_PADDING
  const top = canOpenAbove
    ? triggerRect.top - height - HISTORY_MENU_GAP
    : Math.min(
        triggerRect.bottom + HISTORY_MENU_GAP,
        window.innerHeight - height - HISTORY_MENU_VIEWPORT_PADDING,
      )

  return {
    top: Math.max(HISTORY_MENU_VIEWPORT_PADDING, top),
    left: clamp(triggerRect.right - width, HISTORY_MENU_VIEWPORT_PADDING, maxLeft),
    width,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('头像读取失败，请重新上传。'))
    }
    reader.onerror = () => reject(new Error('头像读取失败，请重新上传。'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('头像解析失败，请更换图片后重试。'))
    image.src = dataUrl
  })
}

async function buildAvatarDataUrl(file: File): Promise<string> {
  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(sourceDataUrl)

  if (
    image.naturalWidth > MAX_AVATAR_DIMENSION ||
    image.naturalHeight > MAX_AVATAR_DIMENSION ||
    image.naturalWidth * image.naturalHeight > MAX_AVATAR_TOTAL_PIXELS
  ) {
    throw new Error('图片分辨率过高，请换一张更小的图片。')
  }

  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = largestEdge > MAX_AVATAR_EDGE ? MAX_AVATAR_EDGE / largestEdge : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('头像处理失败，请稍后重试。')
  }

  context.drawImage(image, 0, 0, width, height)

  let outputDataUrl = canvas.toDataURL('image/webp', 0.82)
  if (!outputDataUrl.startsWith('data:image/webp')) {
    outputDataUrl = canvas.toDataURL('image/jpeg', 0.86)
  }

  if (outputDataUrl.length > MAX_PERSISTED_AVATAR_CHARS) {
    throw new Error('头像压缩后仍偏大，请换一张更小的图片。')
  }

  return outputDataUrl
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, profile, updateProfile } = useLayoutStore()
  const {
    conversations,
    conversationMessages,
    activeConversationId,
    openConversation,
    newConversation,
    renameConversation,
    deleteConversation,
    toggleConversationPinned,
  } = useChatStore()
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [draftName, setDraftName] = useState(profile.name)
  const [draftAvatarDataUrl, setDraftAvatarDataUrl] = useState<string | null>(profile.avatarDataUrl)
  const [historySearchKeyword, setHistorySearchKeyword] = useState('')
  const [historyMenuConversationId, setHistoryMenuConversationId] = useState<string | null>(null)
  const [historyMenuMode, setHistoryMenuMode] = useState<HistoryMenuMode>('actions')
  const [historyRenameDraft, setHistoryRenameDraft] = useState('')
  const [historyMenuPosition, setHistoryMenuPosition] = useState<HistoryMenuPosition | null>(null)
  const [isBrandTextVisible, setIsBrandTextVisible] = useState(!sidebarCollapsed)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const historyMenuRef = useRef<HTMLDivElement>(null)
  const historyMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarMenuOpenRef = useRef(false)
  const draftDirtyRef = useRef(false)

  const closeHistoryMenu = () => {
    setHistoryMenuConversationId(null)
    setHistoryMenuMode('actions')
    setHistoryMenuPosition(null)
    historyMenuButtonRef.current = null
  }

  const currentHistoryMenuConversation = useMemo(
    () =>
      historyMenuConversationId
        ? conversations.find((conversation) => conversation.id === historyMenuConversationId) ?? null
        : null,
    [conversations, historyMenuConversationId],
  )

  useEffect(() => {
    avatarMenuOpenRef.current = avatarMenuOpen
  }, [avatarMenuOpen])

  useEffect(() => {
    if (sidebarCollapsed) {
      setIsBrandTextVisible(false)
      return
    }

    const timer = window.setTimeout(() => {
      setIsBrandTextVisible(true)
    }, SIDEBAR_TRANSITION_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [sidebarCollapsed])

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' })
        if (!response.ok) {
          return
        }

        const data = await response.json()
        if (cancelled) {
          return
        }

        const nextName = data.nickname || '猎头顾问'
        const nextAvatar = data.avatar_url ?? null
        updateProfile({
          name: nextName,
          avatarDataUrl: nextAvatar,
        })
        if (!avatarMenuOpenRef.current || !draftDirtyRef.current) {
          setDraftName(nextName)
          setDraftAvatarDataUrl(nextAvatar)
          draftDirtyRef.current = false
        }
      } catch {
        // Keep the in-memory profile when API is unavailable.
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [updateProfile])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false)
      }

      const targetNode = event.target as Node
      const clickedInsideHistoryMenu =
        Boolean(historyMenuRef.current) && historyMenuRef.current!.contains(targetNode)
      const clickedHistoryMenuButton =
        Boolean(historyMenuButtonRef.current) && historyMenuButtonRef.current!.contains(targetNode)

      if (!clickedInsideHistoryMenu && !clickedHistoryMenuButton) {
        closeHistoryMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!avatarMenuOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAvatarMenuOpen(false)
        closeHistoryMenu()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [avatarMenuOpen])

  useEffect(() => {
    if (!historyMenuConversationId) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeHistoryMenu()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [historyMenuConversationId])

  useEffect(() => {
    if (!historyMenuConversationId) {
      return
    }

    function syncHistoryMenuPosition() {
      if (!historyMenuButtonRef.current || !historyMenuButtonRef.current.isConnected) {
        closeHistoryMenu()
        return
      }

      setHistoryMenuPosition(
        resolveHistoryMenuPosition(
          historyMenuButtonRef.current.getBoundingClientRect(),
          historyMenuMode,
        ),
      )
    }

    syncHistoryMenuPosition()
    window.addEventListener('resize', syncHistoryMenuPosition)
    window.addEventListener('scroll', syncHistoryMenuPosition, true)

    return () => {
      window.removeEventListener('resize', syncHistoryMenuPosition)
      window.removeEventListener('scroll', syncHistoryMenuPosition, true)
    }
  }, [historyMenuConversationId, historyMenuMode])

  const openAvatarPicker = () => {
    setAvatarError(null)
    avatarInputRef.current?.click()
  }

  const openProfileEditor = () => {
    setDraftName(profile.name)
    setDraftAvatarDataUrl(profile.avatarDataUrl)
    setAvatarError(null)
    draftDirtyRef.current = false
    setAvatarMenuOpen(true)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setAvatarError('请选择 PNG、JPG 或 WebP 图片。')
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('头像大小需控制在 20MB 以内。')
      event.target.value = ''
      return
    }

    try {
      const avatarDataUrl = await buildAvatarDataUrl(file)
      setDraftAvatarDataUrl(avatarDataUrl)
      draftDirtyRef.current = true
      setAvatarError(null)
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : '头像处理失败，请重新上传。')
    }

    event.target.value = ''
  }

  const handleAvatarRemove = () => {
    setDraftAvatarDataUrl(null)
    draftDirtyRef.current = true
    setAvatarError(null)
  }

  const handleSaveProfile = () => {
    const normalizedName = draftName.trim()
    if (!normalizedName) {
      setAvatarError('昵称不能为空。')
      return
    }

    const nextProfile = {
      name: normalizedName,
      avatarDataUrl: draftAvatarDataUrl,
    }

    const saveProfile = async () => {
      setIsSavingProfile(true)

      try {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: normalizedName,
            avatar_url: draftAvatarDataUrl,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          updateProfile({
            name: data.nickname || normalizedName,
            avatarDataUrl: data.avatar_url ?? draftAvatarDataUrl,
          })
          setDraftName(data.nickname || normalizedName)
          setDraftAvatarDataUrl(data.avatar_url ?? draftAvatarDataUrl)
          draftDirtyRef.current = false
        } else if (response.status === 401) {
          updateProfile(nextProfile)
          setAvatarError('当前未登录，资料仅暂存在当前页面，刷新后可能丢失。')
          return
        } else {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || '保存失败，请稍后重试。')
        }

        setAvatarError(null)
        setAvatarMenuOpen(false)
      } catch (error) {
        updateProfile(nextProfile)
        setAvatarError(
          error instanceof Error
            ? `${error.message} 已暂存在当前页面，刷新后可能丢失。`
            : '已暂存在当前页面，刷新后可能丢失。',
        )
      } finally {
        setIsSavingProfile(false)
      }
    }

    void saveProfile()
  }

  const userInitial = profile.name.slice(0, 1)
  const draftInitial = draftName.trim().slice(0, 1) || '猎'

  const handleStartNewConversation = () => {
    newConversation()
    router.push('/')
  }

  const handleOpenConversation = (conversationId: string) => {
    setHistoryMenuConversationId(null)
    setHistoryMenuMode('actions')
    openConversation(conversationId)
    router.push('/')
  }

  const filteredConversations = useMemo(() => {
    const normalizedKeyword = historySearchKeyword.trim().toLowerCase()
    if (!normalizedKeyword) {
      return conversations
    }

    return conversations.filter((conversation) => {
      const messageText = (conversationMessages[conversation.id] ?? [])
        .map((message) => message.content)
        .join(' ')
      const searchableText = [
        conversation.title,
        conversation.preview ?? '',
        messageText,
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedKeyword)
    })
  }, [conversationMessages, conversations, historySearchKeyword])

  useEffect(() => {
    if (!historyMenuConversationId) {
      return
    }

    const visibleConversationIds = new Set(filteredConversations.map((conversation) => conversation.id))
    if (!visibleConversationIds.has(historyMenuConversationId)) {
      closeHistoryMenu()
    }
  }, [filteredConversations, historyMenuConversationId])

  useEffect(() => {
    if (historyMenuConversationId && !currentHistoryMenuConversation) {
      closeHistoryMenu()
    }
  }, [currentHistoryMenuConversation, historyMenuConversationId])

  const openHistoryMenu = (
    conversationId: string,
    title: string,
    triggerButton: HTMLButtonElement,
  ) => {
    historyMenuButtonRef.current = triggerButton
    setHistoryMenuConversationId(conversationId)
    setHistoryMenuMode('actions')
    setHistoryRenameDraft(title)
    setHistoryMenuPosition(
      resolveHistoryMenuPosition(triggerButton.getBoundingClientRect(), 'actions'),
    )
  }

  const handleStartRenameConversation = (conversationId: string, title: string) => {
    setHistoryMenuConversationId(conversationId)
    setHistoryMenuMode('rename')
    setHistoryRenameDraft(title)
    if (historyMenuButtonRef.current) {
      setHistoryMenuPosition(
        resolveHistoryMenuPosition(historyMenuButtonRef.current.getBoundingClientRect(), 'rename'),
      )
    }
  }

  const handleSubmitRenameConversation = (conversationId: string) => {
    const normalizedTitle = historyRenameDraft.trim()
    if (!normalizedTitle) {
      return
    }

    renameConversation(conversationId, normalizedTitle)
    closeHistoryMenu()
  }

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId)
    closeHistoryMenu()
    if (activeConversationId === conversationId) {
      router.push('/')
    }
  }

  return (
    <aside
      className="h-full shrink-0 flex flex-col gap-[18px] bg-white rounded-3xl p-[18px] shadow-[0_16px_32px_rgba(110,97,217,0.06)] transition-all duration-300 overflow-visible"
      style={{ width: sidebarCollapsed ? 72 : 'var(--sidebar-width)' }}
    >
      {/* Brand */}
      <div
        className={`pb-3 ${sidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3 px-1'}`}
      >
        <div className="shrink-0 rounded-[18px] shadow-[0_14px_28px_rgba(81,66,198,0.24)]">
          <BrandCrest size={44} />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div
              className={`transition-opacity duration-150 ${
                isBrandTextVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="text-lg font-bold text-text-primary leading-tight whitespace-nowrap">AI猎头助手</div>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="w-7 h-7 rounded-[10px] bg-bg border border-[#E8E3FF] flex items-center justify-center text-text-muted hover:bg-[#EAE5FF] transition-colors shrink-0"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New conversation */}
      <button
        onClick={handleStartNewConversation}
        className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-[#F7F5FF] border border-[#E8E3FF] hover:bg-[#EFEAFF] transition-colors"
        title="新对话"
      >
        <Plus size={16} className="text-primary shrink-0" />
        {!sidebarCollapsed && (
          <span className="text-[15px] font-semibold text-[#2F2853]">新对话</span>
        )}
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.matchPaths.some((matchPath) => pathname.startsWith(matchPath))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#F1EEFF] border border-[#D8CCFF]'
                  : 'bg-white border border-[#E8E3FF] hover:bg-[#F7F5FF]'
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
              />
              {!sidebarCollapsed && (
                <span
                  className={`text-[15px] font-medium ${isActive ? 'text-primary' : 'text-[#2F2853]'}`}
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* History */}
      <div className="flex-1 min-h-0">
        {!sidebarCollapsed && (
          <div className="h-full min-h-0 flex flex-col">
            <div className="px-1 pb-3 text-xs font-semibold text-[#8E86AF]">历史对话</div>
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E86AF]"
              />
              <input
                type="text"
                value={historySearchKeyword}
                onChange={(event) => setHistorySearchKeyword(event.target.value)}
                placeholder="搜索历史对话..."
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white border border-[#EAE5FF] text-[14px] text-[#27214D] placeholder:text-[#B8B0D4] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {conversations.length === 0 ? (
                <div className="px-3 py-4 rounded-2xl border border-dashed border-[#E8E3FF] text-[13px] leading-relaxed text-[#AEA6CB]">
                  暂无历史对话
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-3 py-4 rounded-2xl border border-dashed border-[#E8E3FF] text-[13px] leading-relaxed text-[#AEA6CB]">
                  未找到相关对话
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = pathname === '/' && activeConversationId === conversation.id
                  const isPinned = Boolean(conversation.pinned_at)
                  const isMenuOpen = historyMenuConversationId === conversation.id

                  return (
                    <div
                      key={conversation.id}
                      className={`relative rounded-2xl border transition-colors ${
                        isActive
                          ? 'bg-[#F1EEFF] border-[#D8CCFF]'
                          : 'bg-white border-[#EEE9FF] hover:bg-[#F7F5FF]'
                      }`}
                    >
                      <button
                        onClick={() => handleOpenConversation(conversation.id)}
                        className="w-full text-left px-3 py-3 pr-12"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-[#F7F4FF] border border-[#E8E3FF] flex items-center justify-center text-[#8E86AF]">
                            <MessageSquare size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-[14px] font-medium text-[#2F2853]">
                                {conversation.title}
                              </div>
                              {isPinned && (
                                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#ECE6FF] px-2 py-0.5 text-[11px] font-medium text-primary">
                                  <Pin size={10} />
                                  置顶
                                </span>
                              )}
                            </div>
                            {conversation.preview && (
                              <div className="mt-1 truncate text-[12px] text-[#8E86AF]">
                                {conversation.preview}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        ref={isMenuOpen ? historyMenuButtonRef : undefined}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (isMenuOpen) {
                            closeHistoryMenu()
                            return
                          }
                          openHistoryMenu(conversation.id, conversation.title, event.currentTarget)
                        }}
                        className={`absolute right-3 bottom-3 w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                          isMenuOpen
                            ? 'bg-[#EFEAFF] border-[#D8CCFF] text-primary'
                            : 'bg-white border-[#EEE9FF] text-[#8E86AF] hover:bg-[#F7F5FF]'
                        }`}
                        title="更多操作"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {currentHistoryMenuConversation && historyMenuPosition &&
        createPortal(
          <div
            ref={historyMenuRef}
            className="fixed rounded-[22px] border border-[#EAE5FF] bg-white p-2 shadow-[0_18px_40px_rgba(69,52,170,0.18)] z-[70]"
            style={{
              top: historyMenuPosition.top,
              left: historyMenuPosition.left,
              width: historyMenuPosition.width,
            }}
          >
            {historyMenuMode === 'rename' ? (
              <div className="p-2">
                <div className="text-xs font-semibold text-[#6D6590]">重命名对话</div>
                <input
                  autoFocus
                  value={historyRenameDraft}
                  onChange={(event) => setHistoryRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitRenameConversation(currentHistoryMenuConversation.id)
                    }
                    if (event.key === 'Escape') {
                      setHistoryMenuMode('actions')
                      setHistoryRenameDraft(currentHistoryMenuConversation.title)
                    }
                  }}
                  maxLength={MAX_CONVERSATION_TITLE_LENGTH}
                  className="mt-3 h-10 w-full rounded-2xl border border-[#E7E0FF] bg-[#FCFBFF] px-4 text-sm text-[#231C4C] outline-none focus:border-[#CFC1FF] focus:ring-2 focus:ring-[#EEE8FF]"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setHistoryMenuMode('actions')
                      setHistoryRenameDraft(currentHistoryMenuConversation.title)
                    }}
                    className="h-9 rounded-2xl border border-[#E7E0FF] bg-white text-sm font-medium text-[#4D4473] hover:bg-[#F8F5FF] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSubmitRenameConversation(currentHistoryMenuConversation.id)}
                    disabled={!historyRenameDraft.trim()}
                    className="h-9 rounded-2xl bg-primary text-sm font-medium text-white hover:bg-[#5B4EE6] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    toggleConversationPinned(currentHistoryMenuConversation.id)
                    closeHistoryMenu()
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] font-medium text-[#2F2853] hover:bg-[#F7F5FF] transition-colors"
                >
                  <Pin size={15} className="text-[#8E86AF]" />
                  {currentHistoryMenuConversation.pinned_at ? '取消置顶' : '置顶'}
                </button>
                <button
                  onClick={() =>
                    handleStartRenameConversation(
                      currentHistoryMenuConversation.id,
                      currentHistoryMenuConversation.title,
                    )
                  }
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] font-medium text-[#2F2853] hover:bg-[#F7F5FF] transition-colors"
                >
                  <PencilLine size={15} className="text-[#8E86AF]" />
                  重命名
                </button>
                <button
                  onClick={() => handleDeleteConversation(currentHistoryMenuConversation.id)}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] font-medium text-[#C84A68] hover:bg-[#FFF4F7] transition-colors"
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* User footer */}
      <div ref={avatarMenuRef} className="relative">
        <div
          className={`flex items-center gap-3 px-3 py-3 rounded-[18px] bg-[#FCFBFF] border border-[#EEE9FF] ${
            sidebarCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <button
            onClick={openProfileEditor}
            className="relative shrink-0"
            title="编辑头像和昵称"
          >
            {profile.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={`${profile.name}头像`}
                className="w-11 h-11 rounded-full object-cover border border-[#E2D8FF] shadow-[0_8px_18px_rgba(110,97,217,0.18)]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[linear-gradient(135deg,#5A4DE6_0%,#9D8CFF_100%)] flex items-center justify-center text-white text-sm font-semibold shadow-[0_10px_20px_rgba(110,97,217,0.24)]">
                {userInitial}
              </div>
            )}
            <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#1F1A42] border-2 border-white text-white flex items-center justify-center shadow-sm">
              <PencilLine size={10} />
            </span>
          </button>

          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-text-primary truncate">{profile.name}</div>
            </div>
          )}
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {avatarMenuOpen && (
          <div
            className={`absolute bottom-full mb-3 w-[280px] rounded-[24px] border border-[#EAE5FF] bg-white p-4 shadow-[0_18px_40px_rgba(69,52,170,0.18)] z-20 ${
              sidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#231C4C]">编辑资料</div>
              <button
                onClick={() => setAvatarMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F7F4FF] text-[#6D6590] flex items-center justify-center hover:bg-[#EFEAFF] transition-colors"
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-1 text-xs leading-relaxed text-[#7A7398]">
              点击上传新头像，修改昵称后手动保存。支持 PNG、JPG、WebP，文件不超过 20MB。
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="shrink-0">
                {draftAvatarDataUrl ? (
                  <img
                    src={draftAvatarDataUrl}
                    alt="头像预览"
                    className="w-16 h-16 rounded-full object-cover border border-[#E2D8FF]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[linear-gradient(135deg,#5A4DE6_0%,#9D8CFF_100%)] flex items-center justify-center text-white text-xl font-semibold">
                    {draftInitial}
                  </div>
                )}
              </div>
              <div className="flex-1 grid gap-2">
                <button
                  onClick={openAvatarPicker}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#E7E0FF] bg-[#F8F5FF] px-3 py-2.5 text-sm font-medium text-[#2E255B] hover:bg-[#F1ECFF] transition-colors"
                >
                  <ImagePlus size={16} className="text-primary" />
                  上传头像
                </button>
                <button
                  onClick={handleAvatarRemove}
                  disabled={!draftAvatarDataUrl}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#F1E4EC] bg-white px-3 py-2.5 text-sm font-medium text-[#8A4360] hover:bg-[#FFF7FA] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 size={16} />
                  移除头像
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-xs font-medium text-[#6D6590]" htmlFor="profile-name">
                昵称
              </label>
              <input
                id="profile-name"
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value)
                  draftDirtyRef.current = true
                  if (avatarError) {
                    setAvatarError(null)
                  }
                }}
                maxLength={20}
                placeholder="输入昵称"
                className="h-11 rounded-2xl border border-[#E7E0FF] bg-[#FCFBFF] px-4 text-sm text-[#231C4C] outline-none focus:border-[#CFC1FF] focus:ring-2 focus:ring-[#EEE8FF]"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setAvatarMenuOpen(false)}
                disabled={isSavingProfile}
                className="h-10 rounded-2xl border border-[#E7E0FF] bg-white text-sm font-medium text-[#4D4473] hover:bg-[#F8F5FF] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="h-10 rounded-2xl bg-primary text-sm font-medium text-white hover:bg-[#5B4EE6] transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={16} />
                {isSavingProfile ? '保存中' : '保存'}
              </button>
            </div>

            {avatarError && (
              <div className="mt-3 rounded-2xl bg-[#FFF5F8] px-3 py-2 text-xs leading-relaxed text-[#9A3F63]">
                {avatarError}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

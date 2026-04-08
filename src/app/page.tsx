'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useChatStore } from '@/lib/chat-store'
import { useSkillStore } from '@/lib/skill-store'
import { ChatArea } from '@/components/chat/ChatArea'
import { Composer } from '@/components/chat/Composer'
import { ScenarioCards } from '@/components/chat/ScenarioCards'
import { LuxeBotIcon } from '@/components/shared/AppIcons'
import type { ChatAttachment, Message, MessageMetadata } from '@/lib/types'

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface OutgoingMessagePayload {
  content: string
  attachments?: ChatAttachment[]
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    // ignore non-json responses
  }

  return response.status === 401 ? '当前操作需要登录后才能继续。' : '抱歉，请求出错了，请稍后重试。'
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const startCreate = searchParams.get('create') === '1'
  const skillParam = searchParams.get('skill')
  const [createGuideSignal, setCreateGuideSignal] = useState(0)
  const [presetCommand, setPresetCommand] = useState('')
  const streamAbortControllerRef = useRef<AbortController | null>(null)

  const {
    messages,
    mode,
    isStreaming,
    streamingConversationId,
    streamingContent,
    setMode,
    addMessage,
    startStreaming,
    finishStreaming,
    appendStreamContent,
    activeConversationId,
    setActiveConversation,
    startConversation,
    newConversation,
  } = useChatStore()

  const { enabledSlugs } = useSkillStore()

  useEffect(() => {
    if (!startCreate) {
      return
    }

    setCreateGuideSignal((currentValue) => currentValue + 1)
    newConversation()
    router.replace(pathname, { scroll: false })
  }, [startCreate, newConversation, router, pathname])

  useEffect(() => {
    if (!skillParam) return
    setPresetCommand(`/${skillParam} `)
    newConversation()
    router.replace(pathname, { scroll: false })
  }, [skillParam, newConversation, router, pathname])

  const sendMessage = useCallback(
    async ({ content, attachments = [] }: OutgoingMessagePayload) => {
      if (isStreaming) {
        streamAbortControllerRef.current?.abort()
      }

      const conversationId = activeConversationId ?? genId()
      const userTimestamp = new Date().toISOString()
      const normalizedContent = content.trim()
      const conversationSeed =
        normalizedContent || attachments.map((attachment) => attachment.name).join(' ')
      const userMetadata: MessageMetadata | null =
        attachments.length > 0 ? { attachments } : null

      if (!activeConversationId) {
        startConversation(conversationId, conversationSeed, mode)
      } else {
        setActiveConversation(conversationId)
      }

      const userMsg: Message = {
        id: genId(),
        conversation_id: conversationId,
        role: 'user',
        content: normalizedContent,
        skill_id: null,
        metadata: userMetadata,
        created_at: userTimestamp,
      }
      addMessage(userMsg)
      startStreaming(conversationId)
      const abortController = new AbortController()
      streamAbortControllerRef.current = abortController

      let fullContent = ''
      let wasAborted = false
      let streamBuffer = ''
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            conversation_id: conversationId,
            message: normalizedContent,
            mode,
            enabled_skills: enabledSlugs,
            attachments,
          }),
        })

        if (!res.ok) {
          throw new Error(await readErrorMessage(res))
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            streamBuffer += decoder.decode(value, { stream: true })
            const lines = streamBuffer.split('\n')
            streamBuffer = lines.pop() ?? ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    fullContent += parsed.content
                    appendStreamContent(conversationId, parsed.content)
                  }
                  if (parsed.conversation_id && !activeConversationId) {
                    setActiveConversation(parsed.conversation_id)
                  }
                } catch {
                  fullContent += data
                  appendStreamContent(conversationId, data)
                }
              }
            }
          }

          const finalLine = streamBuffer.trim()
          if (finalLine.startsWith('data: ')) {
            const data = finalLine.slice(6)
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullContent += parsed.content
                  appendStreamContent(conversationId, parsed.content)
                }
              } catch {
                fullContent += data
                appendStreamContent(conversationId, data)
              }
            }
          }
        }

        const assistantMsg: Message = {
          id: genId(),
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
          skill_id: null,
          metadata: null,
          created_at: new Date().toISOString(),
        }
        addMessage(assistantMsg)
      } catch (error) {
        wasAborted =
          error instanceof DOMException
            ? error.name === 'AbortError'
            : error instanceof Error && error.name === 'AbortError'

        if (wasAborted) {
          if (fullContent.trim()) {
            const partialAssistantMsg: Message = {
              id: genId(),
              conversation_id: conversationId,
              role: 'assistant',
              content: fullContent,
              skill_id: null,
              metadata: null,
              created_at: new Date().toISOString(),
            }
            addMessage(partialAssistantMsg)
          }
          return
        }

        const errorMsg: Message = {
          id: genId(),
          conversation_id: conversationId,
          role: 'assistant',
          content:
            error instanceof Error && error.message.trim()
              ? error.message
              : '抱歉，请求出错了，请稍后重试。',
          skill_id: null,
          metadata: null,
          created_at: new Date().toISOString(),
        }
        addMessage(errorMsg)
      } finally {
        if (streamAbortControllerRef.current === abortController) {
          streamAbortControllerRef.current = null
        }
        finishStreaming(conversationId)
      }
    },
    [
      activeConversationId,
      mode,
      enabledSlugs,
      addMessage,
      startConversation,
      startStreaming,
      finishStreaming,
      appendStreamContent,
      setActiveConversation,
      isStreaming,
    ],
  )

  const stopStreaming = useCallback(() => {
    streamAbortControllerRef.current?.abort()
  }, [])

  const consumeAutoOpenCreateGuide = useCallback(() => {
    setCreateGuideSignal(0)
  }, [])

  const isActiveConversationStreaming =
    isStreaming && streamingConversationId === activeConversationId
  const hasMessages = messages.length > 0 || isActiveConversationStreaming

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {hasMessages ? (
        <>
          {/* Chat mode */}
          <ChatArea
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isActiveConversationStreaming}
          />
          <div className="px-8 pb-6 pt-2 flex justify-center">
            <Composer
              onSend={sendMessage}
              disabled={isActiveConversationStreaming}
              isStreaming={isActiveConversationStreaming}
              onStop={stopStreaming}
              enabledSkillSlugs={enabledSlugs}
              mode={mode}
              onModeChange={setMode}
              autoOpenCreateGuideSignal={createGuideSignal}
              onAutoOpenCreateGuideConsumed={consumeAutoOpenCreateGuide}
              presetCommand={presetCommand}
            />
          </div>
        </>
      ) : (
        /* Empty state - hero + composer + scenarios */
        <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
          <div className="w-full max-w-[1020px] flex flex-col items-start">
            {/* Hero */}
            <div className="mb-6 pt-4 px-2">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#EFEAFF] mb-[18px]">
                <LuxeBotIcon size={15} className="text-[#5B4EE6]" />
                <span className="text-xs font-semibold text-primary">提示：输入 /技能名 可直接唤起技能</span>
              </div>
              <h1 className="text-[52px] font-bold text-[#4A3BDA] leading-tight">
                你的 AI 猎头分身
              </h1>
            </div>

            {/* Composer */}
            <Composer
              onSend={sendMessage}
              disabled={isActiveConversationStreaming}
              isStreaming={isActiveConversationStreaming}
              onStop={stopStreaming}
              enabledSkillSlugs={enabledSlugs}
              mode={mode}
              onModeChange={setMode}
              autoOpenCreateGuideSignal={createGuideSignal}
              onAutoOpenCreateGuideConsumed={consumeAutoOpenCreateGuide}
              presetCommand={presetCommand}
            />

            {/* Scenario cards */}
            <ScenarioCards onSelect={(prompt) => void sendMessage({ content: prompt })} />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { FileArchive, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatAttachment, Message } from '@/lib/types'
import { LuxeBotIcon } from '@/components/shared/AppIcons'
import { useLayoutStore } from '@/lib/layout-store'

interface ChatAreaProps {
  messages: Message[]
  streamingContent: string
  isStreaming: boolean
}

export function ChatArea({ messages, streamingContent, isStreaming }: ChatAreaProps) {
  const avatarDataUrl = useLayoutStore((state) => state.profile.avatarDataUrl)
  const profileName = useLayoutStore((state) => state.profile.name)

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          avatarDataUrl={avatarDataUrl}
          profileName={profileName}
        />
      ))}

      {isStreaming && streamingContent && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[linear-gradient(135deg,#F7F2FF_0%,#EBE5FF_100%)] border border-[#DED3FF] flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(110,97,217,0.12)]">
            <LuxeBotIcon size={18} className="text-[#5B4EE6]" />
          </div>
          <div className="flex-1 max-w-[82%] rounded-[30px] rounded-tl-lg border border-[#E5DEFF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFBFF_100%)] p-6 shadow-[0_14px_40px_rgba(109,97,217,0.08)]">
            <MarkdownContent content={streamingContent} />
            <span className="inline-block w-1.5 h-5 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          </div>
        </div>
      )}

      {isStreaming && !streamingContent && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[linear-gradient(135deg,#F7F2FF_0%,#EBE5FF_100%)] border border-[#DED3FF] flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(110,97,217,0.12)]">
            <LuxeBotIcon size={18} className="text-[#5B4EE6]" />
          </div>
          <div className="rounded-[30px] rounded-tl-lg border border-[#E5DEFF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFBFF_100%)] p-6 shadow-[0_14px_40px_rgba(109,97,217,0.08)]">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  avatarDataUrl,
  profileName,
}: {
  message: Message
  avatarDataUrl: string | null
  profileName: string
}) {
  const isUser = message.role === 'user'
  const userInitial = profileName.slice(0, 1)
  const attachments = message.metadata?.attachments ?? []

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-10 h-10 shrink-0 overflow-hidden ${
          isUser
            ? 'rounded-full'
            : 'rounded-2xl bg-[linear-gradient(135deg,#F7F2FF_0%,#EBE5FF_100%)] border border-[#DED3FF] shadow-[0_8px_20px_rgba(110,97,217,0.12)]'
        }`}
      >
        {isUser ? (
          avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt={`${profileName}头像`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-semibold">
              {userInitial}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <LuxeBotIcon size={18} className="text-[#5B4EE6]" />
          </div>
        )}
      </div>
      <div
        className={`p-5 text-[15px] leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-3xl rounded-tr-lg'
            : 'max-w-[82%] rounded-[30px] rounded-tl-lg border border-[#E5DEFF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFBFF_100%)] px-6 py-5 text-text-primary shadow-[0_14px_40px_rgba(109,97,217,0.08)]'
        }`}
      >
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <AttachmentCard key={attachment.id} attachment={attachment} isUser={isUser} />
            ))}
          </div>
        )}
        {message.content.trim() && (
          <div className={attachments.length > 0 ? 'mt-3' : ''}>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function sanitizeLinkHref(href?: string): string | undefined {
  if (!href) {
    return undefined
  }

  try {
    const normalizedUrl = new URL(href, 'https://domi.local')
    const allowedProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:'])
    if (!allowedProtocols.has(normalizedUrl.protocol)) {
      return undefined
    }
    return href
  } catch {
    return undefined
  }
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content break-words text-[15px] leading-7 text-[#2F2853]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...props }) => (
            <h1
              className="mt-7 mb-4 border-b border-[#EEE9FF] pb-3 text-[30px] font-bold leading-tight text-[#231C4C] first:mt-0"
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              className="mt-7 mb-4 flex items-center gap-2 text-[24px] font-semibold leading-tight text-[#27214D] first:mt-0 before:inline-block before:h-5 before:w-1 before:rounded-full before:bg-[#8F7CFF]"
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 className="mt-6 mb-3 text-[18px] font-semibold leading-tight text-[#27214D] first:mt-0" {...props} />
          ),
          h4: ({ node: _node, ...props }) => (
            <h4 className="mt-5 mb-2 text-[16px] font-semibold leading-tight text-[#27214D] first:mt-0" {...props} />
          ),
          p: ({ node: _node, ...props }) => <p className="my-3.5 first:mt-0 last:mb-0 text-[#3C355C]" {...props} />,
          ul: ({ node: _node, ...props }) => <ul className="my-4 list-disc pl-6 space-y-2 marker:text-[#8F7CFF]" {...props} />,
          ol: ({ node: _node, ...props }) => <ol className="my-4 list-decimal pl-6 space-y-2 marker:font-semibold marker:text-[#8F7CFF]" {...props} />,
          li: ({ node: _node, ...props }) => <li className="pl-1 text-[#3C355C]" {...props} />,
          strong: ({ node: _node, ...props }) => <strong className="font-semibold text-[#231C4C]" {...props} />,
          a: ({ node: _node, href, ...props }) => {
            const safeHref = sanitizeLinkHref(href)
            if (!safeHref) {
              return <span className="text-[#8E86AF]" {...props} />
            }

            return (
              <a
                className="inline-flex items-center gap-1 rounded-lg bg-[#F3F0FF] px-2.5 py-1 text-[13px] font-medium text-primary no-underline transition-colors hover:bg-[#E8E2FF]"
                href={safeHref}
                target="_blank"
                rel="noreferrer"
                {...props}
              />
            )
          },
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="my-5 rounded-2xl border border-[#E7E0FF] bg-[#FAF8FF] px-4 py-3 text-[#5D567D] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
              {...props}
            />
          ),
          hr: ({ node: _node, ...props }) => <hr className="my-5 border-0 border-t border-[#E8E3FF]" {...props} />,
          code: ({ node: _node, className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-[#F3F0FF] px-1.5 py-0.5 font-mono text-[13px] text-[#4A3BDA]"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <code className="font-mono text-[13px] text-[#F4F1FF]" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node: _node, ...props }) => (
            <pre
              className="my-5 overflow-x-auto rounded-[22px] border border-[#2E255D] bg-[#231C4C] px-4 py-3 leading-6 shadow-[0_12px_30px_rgba(35,28,76,0.18)]"
              {...props}
            />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-[22px] border border-[#E1DAFB] bg-white shadow-[0_10px_28px_rgba(109,97,217,0.06)]">
              <table className="min-w-full border-collapse bg-white text-[14px]" {...props} />
            </div>
          ),
          thead: ({ node: _node, ...props }) => <thead className="bg-[#F6F3FF]" {...props} />,
          tbody: ({ node: _node, ...props }) => <tbody className="divide-y divide-[#F0ECFF]" {...props} />,
          tr: ({ node: _node, ...props }) => <tr className="even:bg-[#FCFBFF] hover:bg-[#F8F5FF] transition-colors" {...props} />,
          th: ({ node: _node, ...props }) => (
            <th className="border-b border-[#E1DAFB] px-4 py-3 text-left text-[13px] font-semibold text-[#4C4375]" {...props} />
          ),
          td: ({ node: _node, ...props }) => (
            <td className="px-4 py-3 align-top text-[14px] text-[#3F385D]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function AttachmentCard({
  attachment,
  isUser,
}: {
  attachment: ChatAttachment
  isUser: boolean
}) {
  const isArchive = attachment.extension === 'zip'
  const Icon = isArchive ? FileArchive : FileText

  return (
    <div
      className={`rounded-2xl border px-3.5 py-3 ${
        isUser
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-[#EAE5FF] bg-[#F8F5FF] text-[#2F2853]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            isUser ? 'bg-white/14' : 'bg-white'
          }`}
        >
          <Icon size={16} className={isUser ? 'text-white' : 'text-primary'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{attachment.name}</div>
          <div className={`mt-1 text-[12px] ${isUser ? 'text-white/75' : 'text-[#8E86AF]'}`}>
            {attachment.extension.toUpperCase()} · {formatAttachmentSize(attachment.size_bytes)}
            {attachment.parser_used ? ` · ${attachment.parser_used}` : ''}
          </div>
          {attachment.extracted_excerpt && (
            <div className={`mt-2 text-[12px] leading-relaxed ${isUser ? 'text-white/90' : 'text-[#5D567D]'}`}>
              {attachment.extracted_excerpt}
            </div>
          )}
          {!attachment.extracted_excerpt && attachment.extraction_status === 'failed' && (
            <div className={`mt-2 text-[12px] leading-relaxed ${isUser ? 'text-white/80' : 'text-[#7A7398]'}`}>
              解析失败，请重新上传后重试
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatAttachmentSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

import { chatStream, type ChatMessage } from '@/lib/doubao'
import { routeIntent, type UserCreatedSkillInfo } from '@/lib/skill-router'
import { loadSkillPromptContext } from '@/lib/skill-runtime'
import type { ChatAttachment } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'node:crypto'

export const runtime = 'nodejs'
const MAX_CHAT_ATTACHMENTS = 4
const MAX_ATTACHMENT_TEXT_LENGTH = 4000
const CHAT_ATTACHMENT_BUCKET = 'chat-attachments'
const EPHEMERAL_ATTACHMENT_BUCKET = 'ephemeral-chat-attachments'
const CHAT_ATTACHMENT_PREFIX = 'chat'
const ATTACHMENT_SIGNING_SECRET =
  process.env.CHAT_ATTACHMENT_SIGNING_SECRET?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'domi-local-attachment-signing-key'

function buildAttachmentTokenPayload(attachment: Pick<
  ChatAttachment,
  | 'id'
  | 'name'
  | 'extension'
  | 'mime_type'
  | 'size_bytes'
  | 'storage_bucket'
  | 'storage_path'
  | 'extraction_status'
  | 'parser_used'
  | 'extracted_text'
  | 'extracted_excerpt'
  | 'extraction_note'
>): string {
  return JSON.stringify([
    attachment.id,
    attachment.name,
    attachment.extension,
    attachment.mime_type,
    attachment.size_bytes,
    attachment.storage_bucket,
    attachment.storage_path,
    attachment.extraction_status,
    attachment.parser_used ?? '',
    attachment.extracted_text ?? '',
    attachment.extracted_excerpt ?? '',
    attachment.extraction_note ?? '',
  ])
}

function hasValidAttachmentToken(attachment: Partial<ChatAttachment>): boolean {
  if (typeof attachment.server_token !== 'string' || !attachment.server_token) {
    return false
  }

  const expectedToken = createHmac('sha256', ATTACHMENT_SIGNING_SECRET)
    .update(
      buildAttachmentTokenPayload({
        id: typeof attachment.id === 'string' ? attachment.id : '',
        name: typeof attachment.name === 'string' ? attachment.name : '',
        extension: typeof attachment.extension === 'string' ? attachment.extension : '',
        mime_type: typeof attachment.mime_type === 'string' ? attachment.mime_type : '',
        size_bytes:
          typeof attachment.size_bytes === 'number' && Number.isFinite(attachment.size_bytes)
            ? attachment.size_bytes
            : 0,
        storage_bucket: typeof attachment.storage_bucket === 'string' ? attachment.storage_bucket : '',
        storage_path: typeof attachment.storage_path === 'string' ? attachment.storage_path : '',
        extraction_status:
          attachment.extraction_status === 'parsed' ||
          attachment.extraction_status === 'stored_only' ||
          attachment.extraction_status === 'failed'
            ? attachment.extraction_status
            : 'stored_only',
        parser_used:
          attachment.parser_used === 'docling' ||
          attachment.parser_used === 'mineru' ||
          attachment.parser_used === 'coze'
            ? attachment.parser_used
            : undefined,
        extracted_text: typeof attachment.extracted_text === 'string' ? attachment.extracted_text : undefined,
        extracted_excerpt:
          typeof attachment.extracted_excerpt === 'string' ? attachment.extracted_excerpt : undefined,
        extraction_note:
          typeof attachment.extraction_note === 'string' ? attachment.extraction_note : undefined,
      }),
    )
    .digest('hex')

  return expectedToken === attachment.server_token
}

function sanitizeAttachments(input: unknown, userId?: string): ChatAttachment[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .slice(0, MAX_CHAT_ATTACHMENTS)
    .filter((attachment): attachment is Partial<ChatAttachment> => typeof attachment === 'object' && attachment !== null)
    .filter((attachment) => hasValidAttachmentToken(attachment))
    .filter(
      (attachment) =>
        (attachment.storage_bucket === CHAT_ATTACHMENT_BUCKET &&
          Boolean(userId) &&
          typeof attachment.storage_path === 'string' &&
          attachment.storage_path.startsWith(`${CHAT_ATTACHMENT_PREFIX}/${userId}/`)) ||
        (attachment.storage_bucket === EPHEMERAL_ATTACHMENT_BUCKET &&
          typeof attachment.storage_path === 'string' &&
          attachment.storage_path.length === 0),
    )
    .map((attachment) => ({
      id: typeof attachment.id === 'string' ? attachment.id : '',
      name: typeof attachment.name === 'string' ? attachment.name : '未命名附件',
      extension: typeof attachment.extension === 'string' ? attachment.extension : 'file',
      mime_type:
        typeof attachment.mime_type === 'string'
          ? attachment.mime_type
          : 'application/octet-stream',
      size_bytes:
        typeof attachment.size_bytes === 'number' && Number.isFinite(attachment.size_bytes)
          ? attachment.size_bytes
          : 0,
      storage_bucket:
        typeof attachment.storage_bucket === 'string' ? attachment.storage_bucket : '',
      storage_path: typeof attachment.storage_path === 'string' ? attachment.storage_path : '',
      server_token: typeof attachment.server_token === 'string' ? attachment.server_token : undefined,
      extraction_status:
        attachment.extraction_status === 'parsed' ||
        attachment.extraction_status === 'stored_only' ||
        attachment.extraction_status === 'failed'
          ? attachment.extraction_status
          : 'stored_only',
      parser_used:
        attachment.parser_used === 'docling' ||
        attachment.parser_used === 'mineru' ||
        attachment.parser_used === 'coze'
          ? attachment.parser_used
          : undefined,
      extracted_text:
        typeof attachment.extracted_text === 'string'
          ? attachment.extracted_text.slice(0, MAX_ATTACHMENT_TEXT_LENGTH)
          : undefined,
      extracted_excerpt:
        typeof attachment.extracted_excerpt === 'string'
          ? attachment.extracted_excerpt.slice(0, 500)
          : undefined,
      extraction_note:
        typeof attachment.extraction_note === 'string'
          ? attachment.extraction_note.slice(0, 200)
          : undefined,
    }))
}

function buildAttachmentContext(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) {
    return ''
  }

  return attachments
    .map((attachment, index) => {
      const detailLines = [
        `[附件 ${index + 1}]`,
        `文件名: ${attachment.name}`,
        `类型: ${attachment.extension.toUpperCase()}`,
        `大小: ${attachment.size_bytes} 字节`,
        `提取状态: ${attachment.extraction_status}`,
        attachment.parser_used ? `解析引擎: ${attachment.parser_used}` : undefined,
      ]
        .filter((line): line is string => Boolean(line))

      if (attachment.extracted_text) {
        detailLines.push(`正文摘录:\n${attachment.extracted_text}`)
      } else if (attachment.extraction_note) {
        detailLines.push(`说明: ${attachment.extraction_note}`)
      }

      return detailLines.join('\n')
    })
    .join('\n\n')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json()
  const { message, mode, enabled_skills = [], conversation_id, attachments = [] } = body
  const requestedAttachmentCount = Array.isArray(attachments) ? attachments.length : 0
  const sanitizedAttachments = sanitizeAttachments(attachments, user?.id)
  if (requestedAttachmentCount > 0 && sanitizedAttachments.length === 0) {
    return new Response(JSON.stringify({ error: '附件信息校验失败，请重新上传后再试。' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const normalizedMessage = typeof message === 'string' ? message.trim() : ''
  const attachmentContext = buildAttachmentContext(sanitizedAttachments)
  const routingMessage =
    normalizedMessage || sanitizedAttachments.map((attachment) => attachment.name).join(' ')
  const userMessageContent = attachmentContext
    ? `${normalizedMessage || '请结合我上传的附件完成本次任务。'}\n\n[附件上下文]\n${attachmentContext}`
    : normalizedMessage

  if (!userMessageContent) {
    return new Response(JSON.stringify({ error: '请输入消息内容后再试。' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build system prompt based on mode
  const systemPrompt = buildSystemPrompt(mode, enabled_skills)

  // Route intent for agent mode
  let skillContext = ''
  if (mode === 'agent') {
    try {
      // Load user-created skills that are enabled for this session
      let userCreatedSkills: UserCreatedSkillInfo[] = []
      if (user && enabled_skills.length > 0) {
        const { data: userSkillRows } = await supabase
          .from('user_skills')
          .select('enabled, skill:skills(id, slug, name, description, invocation_method, manifest, skill_type)')
          .eq('user_id', user.id)
          .eq('source', 'created')
          .eq('enabled', true)

        if (userSkillRows) {
          userCreatedSkills = userSkillRows
            .flatMap((row) => {
              const skill = row.skill as unknown as {
                id: string
                slug: string
                name: string
                description: string
                invocation_method: string | null
                manifest: Record<string, unknown> | null
                skill_type: string
              } | null
              if (!skill) return []
              if (!enabled_skills.includes(skill.slug)) return []
              const info: UserCreatedSkillInfo = {
                slug: skill.slug,
                name: skill.name,
                description: skill.description,
                invocation_method: skill.invocation_method,
                system_prompt:
                  typeof skill.manifest?.system_prompt === 'string'
                    ? skill.manifest.system_prompt
                    : undefined,
              }
              return [info]
            })
        }
      }

      const routed = await routeIntent(routingMessage, enabled_skills, userCreatedSkills)
      if (routed) {
        if (routed.isUserCreated) {
          const matchedUserSkill = userCreatedSkills.find((s) => s.slug === routed.slug)
          const userSystemPrompt = matchedUserSkill?.system_prompt
          skillContext = `\n\n[当前激活技能: ${routed.slug}]\n${routed.context}${
            userSystemPrompt
              ? `\n\n[技能配置]\n${userSystemPrompt}`
              : ''
          }`
        } else {
          const skillPromptContext = await loadSkillPromptContext(routed.slug)
          skillContext = `\n\n[当前激活技能: ${routed.slug}]\n${routed.context}${skillPromptContext ? `\n\n[技能工作流上下文]\n${skillPromptContext}` : ''}`
        }
      }
    } catch {
      // Intent routing failed, continue without skill context
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt + skillContext },
    { role: 'user', content: userMessageContent },
  ]

  const encoder = new TextEncoder()

  try {
    const stream = await chatStream(messages)

    // SSE response
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation_id in first chunk
          if (conversation_id) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversation_id })}\n\n`),
            )
          }

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '生成回复时出错'
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: `\n\n[错误] ${errMsg}\n\n请检查LLM API 配置（DOUBAO_MODEL、DOUBAO_API_KEY、DOUBAO_BASE_URL）是否正确。` })}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    // LLM API call itself failed (e.g. invalid model, auth error)
    const errMsg = err instanceof Error ? err.message : '调用 AI 服务失败'
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: `[错误] ${errMsg}\n\n请检查LLM API 配置（DOUBAO_MODEL、DOUBAO_API_KEY、DOUBAO_BASE_URL）是否正确。` })}\n\n`,
          ),
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }
}

function buildSystemPrompt(mode: string, enabledSkills: string[]): string {
  const base = `你是一个专业、友好、高效的 AI 助手。
你精通猎头行业的各个环节：BD开发、岗位分析、人才搜寻、简历匹配、候选人推荐、客户维护等。
请用中文回复。`

  if (mode === 'qa') {
    return base + '\n\n当前为问答模式，直接回答用户问题，不触发任何技能。'
  }

  if (mode === 'web_search') {
    return (
      base +
      '\n\n当前为联网搜索模式，请基于搜索结果综合回答用户问题。'
    )
  }

  // Agent mode
  if (enabledSkills.length > 0) {
    return (
      base +
      `\n\n当前为 Agent 模式。用户已启用以下技能：${enabledSkills.join(', ')}。
当用户的意图匹配某个技能时，请调用对应技能的工作流来回答。
当用户输入斜杠命令（如 /find-job）时，直接执行对应技能。`
    )
  }

  return base + '\n\n当前为 Agent 模式，但用户尚未启用任何技能。若用户通过斜杠命令显式调用内置技能，请直接按该技能执行；否则请引导用户前往技能商城添加技能。'
}

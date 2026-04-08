import { Readable } from 'node:stream'
import { CozeAPI, ChatEventType, RoleType } from '@coze/api'
import type { ChatAttachment } from '@/lib/types'

export type CozeAttachmentParseResult = {
  text: string
  note?: string
  status: ChatAttachment['extraction_status']
  parserUsed: 'coze'
}

const COZE_CN_BASE = 'https://api.coze.cn'
const MIN_USABLE_TEXT_LENGTH = 80
const DEFAULT_USER_PROMPT =
  '请阅读附件并提取全文正文，输出为 Markdown。只输出文档内容本身，不要前言、总结、解释或对话套话。'

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasUsableText(text: string): boolean {
  const normalized = normalizeExtractedText(text)
  const alphanumericCount = (normalized.match(/[A-Za-z0-9\u4e00-\u9fa5]/g) ?? []).length
  return (
    normalized.length >= MIN_USABLE_TEXT_LENGTH &&
    alphanumericCount >= MIN_USABLE_TEXT_LENGTH / 2
  )
}

function buildCozeClient(): CozeAPI {
  const token = process.env.COZE_API_TOKEN?.trim()
  if (!token) {
    throw new Error('未配置 COZE_API_TOKEN。')
  }

  const baseURL = process.env.COZE_API_BASE?.trim() || COZE_CN_BASE

  return new CozeAPI({
    token,
    baseURL,
  })
}

/**
 * 使用扣子开放平台智能体：先上传文件到扣子，再发起对话提取正文。
 * 需在扣子侧发布为 API 可调用，并配置 COZE_API_TOKEN（个人访问令牌等）与 COZE_BOT_ID。
 */
export async function parseChatAttachmentViaCoze(request: {
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  /** 用于隔离不同终端用户，建议传登录用户 id */
  userKey: string
}): Promise<CozeAttachmentParseResult> {
  const botId = process.env.COZE_BOT_ID?.trim()
  if (!botId) {
    return {
      text: '',
      note: '未配置 COZE_BOT_ID。',
      status: 'failed',
      parserUsed: 'coze',
    }
  }

  const userPrompt = process.env.COZE_ATTACHMENT_PROMPT?.trim() || DEFAULT_USER_PROMPT

  try {
    const client = buildCozeClient()

    // 勿使用 Web File/Blob：axios→form-data→combined-stream 会把 File 误判为可读流并对
    // 其调用 .on，从而抛出「a.on is not a function」。使用 Node Readable 并带 path 供 multipart 文件名。
    const fileForUpload = Readable.from(request.fileBuffer) as Readable & { path?: string }
    fileForUpload.path = request.fileName

    const uploaded = await client.files.upload({ file: fileForUpload })

    const chatStream = client.chat.stream(
      {
        bot_id: botId,
        user_id: request.userKey.slice(0, 64),
        auto_save_history: false,
        additional_messages: [
          {
            role: RoleType.User,
            content_type: 'object_string',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'file', file_id: uploaded.id },
            ],
          },
        ],
      },
      {
        timeout: Number(process.env.COZE_CHAT_TIMEOUT_MS) || 120_000,
      },
    )

    let streamedText = ''
    let chatFailed = false

    for await (const event of chatStream) {
      if (event.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
        const msg = event.data as { role?: string; type?: string; content?: string } | undefined
        if (msg?.role === RoleType.Assistant && msg?.type === 'answer') {
          streamedText += msg.content ?? ''
        }
      } else if (event.event === ChatEventType.CONVERSATION_CHAT_FAILED) {
        chatFailed = true
      }
    }

    if (chatFailed) {
      return {
        text: '',
        note: '扣子解析对话失败，请稍后重试。',
        status: 'failed',
        parserUsed: 'coze',
      }
    }

    const rawText = streamedText
    const normalized = normalizeExtractedText(rawText)

    if (!hasUsableText(normalized)) {
      return {
        text: '',
        note: '扣子已返回，但正文过短或为空，请检查智能体编排或提示词。',
        status: 'failed',
        parserUsed: 'coze',
      }
    }

    return {
      text: normalized,
      status: 'parsed',
      parserUsed: 'coze',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '扣子解析调用失败。'
    return {
      text: '',
      note: message,
      status: 'failed',
      parserUsed: 'coze',
    }
  }
}

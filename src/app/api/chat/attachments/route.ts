import { createHmac, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { resolveAttachmentExtractorMode } from '@/lib/attachment-extractor'
import { parseChatAttachmentViaMcp } from '@/lib/chat-attachment-parser'
import { parseChatAttachmentViaCoze } from '@/lib/coze-attachment-parser'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ChatAttachment } from '@/lib/types'

export const runtime = 'nodejs'

const CHAT_ATTACHMENT_BUCKET = 'chat-attachments'
const EPHEMERAL_ATTACHMENT_BUCKET = 'ephemeral-chat-attachments'
const CHAT_ATTACHMENT_PREFIX = 'chat'
const EPHEMERAL_ATTACHMENT_PREFIX = 'temp'
const MAX_CHAT_ATTACHMENT_COUNT = 4
const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024
const MAX_EXTRACTED_TEXT_LENGTH = 12000
const MAX_EXCERPT_LENGTH = 320
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5
const SUPPORTED_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'zip'])
const ATTACHMENT_SIGNING_SECRET =
  process.env.CHAT_ATTACHMENT_SIGNING_SECRET?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'domi-local-attachment-signing-key'

type PreparedAttachmentSource = {
  attachmentBucket: string
  attachmentPath: string
  signedUrl?: string
  note?: string
  cleanupTarget?: {
    bucket: string
    path: string
  }
}

/** 仅用于对象存储路径、扣子/MCP 等需 ASCII 安全文件名的场景 */
function sanitizeFileName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? 'file'
  return lastSegment.replace(/[^a-zA-Z0-9._-]/g, '_')
}

const MAX_DISPLAY_FILE_NAME_LENGTH = 200

/** 界面展示用原始文件名：保留中文等 Unicode，仅取 basename 并去掉危险字符 */
function safeDisplayFileName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? 'file'
  const cleaned = lastSegment.replace(/\u0000/g, '').trim()
  if (!cleaned) {
    return 'file'
  }
  if (cleaned.length > MAX_DISPLAY_FILE_NAME_LENGTH) {
    return `${cleaned.slice(0, MAX_DISPLAY_FILE_NAME_LENGTH)}…`
  }
  return cleaned
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function buildExcerpt(value: string): string {
  if (value.length <= MAX_EXCERPT_LENGTH) {
    return value
  }

  return `${value.slice(0, MAX_EXCERPT_LENGTH)}...`
}

function mergeAttachmentNote(...notes: Array<string | undefined>): string | undefined {
  const normalizedNotes = notes
    .map((note) => note?.trim())
    .filter((note): note is string => Boolean(note))

  if (normalizedNotes.length === 0) {
    return undefined
  }

  return normalizedNotes.join(' ')
}

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

function signAttachmentToken(attachment: Pick<
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
  return createHmac('sha256', ATTACHMENT_SIGNING_SECRET)
    .update(buildAttachmentTokenPayload(attachment))
    .digest('hex')
}

function buildPersistentStoragePath(userId: string, sanitizedFileName: string): string {
  return `${CHAT_ATTACHMENT_PREFIX}/${userId}/${Date.now()}_${randomUUID()}_${sanitizedFileName}`
}

function buildEphemeralStoragePath(sanitizedFileName: string): string {
  return `${EPHEMERAL_ATTACHMENT_PREFIX}/${Date.now()}_${randomUUID()}_${sanitizedFileName}`
}

async function uploadFileToStorage(
  adminSupabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  storagePath: string,
  fileBuffer: Buffer,
  mimeType: string,
) {
  const { error } = await adminSupabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    upsert: false,
    contentType: mimeType || undefined,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function createSignedDownloadUrl(
  adminSupabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  storagePath: string,
) {
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || '未生成附件签名链接。')
  }

  return data.signedUrl
}

async function removeStorageFile(
  adminSupabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  storagePath: string,
) {
  const { error } = await adminSupabase.storage.from(bucket).remove([storagePath])
  if (error) {
    console.warn(`Failed to clean up ${bucket}/${storagePath}:`, error.message)
  }
}

async function prepareEphemeralAttachmentSource(
  adminSupabase: ReturnType<typeof createAdminClient>,
  sanitizedFileName: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<PreparedAttachmentSource> {
  const storagePath = buildEphemeralStoragePath(sanitizedFileName)
  await uploadFileToStorage(
    adminSupabase,
    EPHEMERAL_ATTACHMENT_BUCKET,
    storagePath,
    fileBuffer,
    mimeType,
  )

  return {
    attachmentBucket: EPHEMERAL_ATTACHMENT_BUCKET,
    attachmentPath: '',
    signedUrl: await createSignedDownloadUrl(
      adminSupabase,
      EPHEMERAL_ATTACHMENT_BUCKET,
      storagePath,
    ),
    cleanupTarget: {
      bucket: EPHEMERAL_ATTACHMENT_BUCKET,
      path: storagePath,
    },
  }
}

async function prepareAuthenticatedAttachmentSource(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  sanitizedFileName: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<PreparedAttachmentSource> {
  const persistentStoragePath = buildPersistentStoragePath(userId, sanitizedFileName)

  try {
    await uploadFileToStorage(
      adminSupabase,
      CHAT_ATTACHMENT_BUCKET,
      persistentStoragePath,
      fileBuffer,
      mimeType,
    )

    return {
      attachmentBucket: CHAT_ATTACHMENT_BUCKET,
      attachmentPath: persistentStoragePath,
      signedUrl: await createSignedDownloadUrl(
        adminSupabase,
        CHAT_ATTACHMENT_BUCKET,
        persistentStoragePath,
      ),
    }
  } catch (error) {
    const fallbackSource = await prepareEphemeralAttachmentSource(
      adminSupabase,
      sanitizedFileName,
      fileBuffer,
      mimeType,
    )

    return {
      ...fallbackSource,
      note: mergeAttachmentNote(
        error instanceof Error ? error.message : '附件云端存储失败。',
        '附件已转入临时解析通道，当前仅在本次对话中可用。',
      ),
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const formData = await request.formData()
    const files = formData
      .getAll('files')
      .filter((file): file is File => file instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_CHAT_ATTACHMENT_COUNT) {
      return NextResponse.json(
        { error: `一次最多上传 ${MAX_CHAT_ATTACHMENT_COUNT} 个附件。` },
        { status: 400 },
      )
    }

    for (const file of files) {
      const extension = getFileExtension(file.name)
      if (!SUPPORTED_ATTACHMENT_EXTENSIONS.has(extension)) {
        return NextResponse.json(
          { error: 'Invalid file type. Use PDF, Word (.doc/.docx) or ZIP.' },
          { status: 400 },
        )
      }

      if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
        return NextResponse.json(
          { error: '单个附件大小不能超过 20MB。' },
          { status: 400 },
        )
      }
    }

    const attachments: ChatAttachment[] = []
    for (const file of files) {
      const extension = getFileExtension(file.name)
      const sanitizedFileName = sanitizeFileName(file.name)
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      let preparedSource: PreparedAttachmentSource | null = null
      if (extension !== 'zip') {
        preparedSource = user
          ? await prepareAuthenticatedAttachmentSource(
              adminSupabase,
              user.id,
              sanitizedFileName,
              fileBuffer,
              file.type,
            )
          : await prepareEphemeralAttachmentSource(
              adminSupabase,
              sanitizedFileName,
              fileBuffer,
              file.type,
            )
      }

      let extractionResult: {
        text: string
        note?: string
        status: ChatAttachment['extraction_status']
        parserUsed?: ChatAttachment['parser_used']
      }

      try {
        if (extension === 'zip') {
          extractionResult = {
            text: '',
            note: user
              ? 'ZIP 文件已接收，当前不自动提取压缩包正文。'
              : 'ZIP 文件已接收，当前不自动提取压缩包正文，且不会进入云端持久化。',
            status: 'stored_only',
          }
        } else if (!preparedSource?.signedUrl) {
          extractionResult = {
            text: '',
            note: '文件已保存，但未生成可用的解析链接。',
            status: 'stored_only',
          }
        } else {
          const extractorMode = resolveAttachmentExtractorMode()
          if (extractorMode === 'coze') {
            extractionResult = await parseChatAttachmentViaCoze({
              fileBuffer,
              fileName: sanitizedFileName,
              mimeType: file.type || 'application/octet-stream',
              userKey: user?.id ?? `anon-${randomUUID()}`,
            })
          } else if (extractorMode === 'mcp') {
            extractionResult = await parseChatAttachmentViaMcp({
              fileUrl: preparedSource.signedUrl,
              fileName: sanitizedFileName,
              mimeType: file.type,
            })
          } else {
            extractionResult = {
              text: '',
              note:
                '未配置文档解析：请在环境变量中配置扣子（COZE_API_TOKEN、COZE_BOT_ID）或 Docling/MinerU MCP（DOCLING_MCP_URL / MINERU_MCP_URL）。',
              status: 'failed',
            }
          }
        }
      } finally {
        if (preparedSource?.cleanupTarget) {
          await removeStorageFile(
            adminSupabase,
            preparedSource.cleanupTarget.bucket,
            preparedSource.cleanupTarget.path,
          ).catch(() => undefined)
        }
      }

      let storageBucket = preparedSource?.attachmentBucket ?? EPHEMERAL_ATTACHMENT_BUCKET
      let storagePath = preparedSource?.attachmentPath ?? ''
      let attachmentNote = mergeAttachmentNote(extractionResult.note, preparedSource?.note)

      if (extension === 'zip' && user) {
        storageBucket = CHAT_ATTACHMENT_BUCKET
        storagePath = buildPersistentStoragePath(user.id, sanitizedFileName)

        try {
          await uploadFileToStorage(
            adminSupabase,
            CHAT_ATTACHMENT_BUCKET,
            storagePath,
            fileBuffer,
            file.type,
          )
        } catch (error) {
          storageBucket = EPHEMERAL_ATTACHMENT_BUCKET
          storagePath = ''
          attachmentNote = mergeAttachmentNote(
            attachmentNote,
            error instanceof Error ? error.message : 'ZIP 文件云端存储失败。',
            'ZIP 文件当前仅在本次对话中可用。',
          )
        }
      } else if (extension === 'zip') {
        attachmentNote = mergeAttachmentNote(
          attachmentNote,
          '当前未登录，附件仅在当前设备的本次对话中可用。',
        )
      }

      if (!user && extension !== 'zip') {
        attachmentNote = mergeAttachmentNote(
          attachmentNote,
          '当前未登录，附件仅在当前设备的本次对话中可用。',
        )
      }

      const attachment: ChatAttachment = {
        id: randomUUID(),
        name: safeDisplayFileName(file.name),
        extension,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        extraction_status: extractionResult.status,
        parser_used: extractionResult.parserUsed,
        extracted_text: extractionResult.text
          ? extractionResult.text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
          : undefined,
        extracted_excerpt: extractionResult.text ? buildExcerpt(extractionResult.text) : undefined,
        extraction_note: attachmentNote,
      }

      attachments.push({
        ...attachment,
        server_token: signAttachmentToken(attachment),
      })
    }

    return NextResponse.json({ attachments })
  } catch (error) {
    console.error('Chat attachment upload failed:', error)
    return NextResponse.json(
      { error: '附件处理失败，请稍后重试。' },
      { status: 500 },
    )
  }
}

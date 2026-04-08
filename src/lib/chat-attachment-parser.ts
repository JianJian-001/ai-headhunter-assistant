import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { ChatAttachment } from '@/lib/types'

type ParserKind = 'docling' | 'mineru'
type ParserPreference = ParserKind | 'auto'

type ParserEndpointConfig = {
  kind: ParserKind
  url?: string
  toolName?: string
}

type ToolLike = {
  name?: string
  inputSchema?: {
    properties?: Record<string, unknown>
  }
}

type ParsedToolPayload = {
  markdown: string
  structured: Record<string, unknown>
  parserUsed?: string
  error?: string
}

export type ParsedAttachmentResult = {
  text: string
  note?: string
  status: ChatAttachment['extraction_status']
  parserUsed?: ParserKind
}

const MIN_USABLE_MARKDOWN_LENGTH = 80
const MAX_PARSER_ERROR_MESSAGE_LENGTH = 240
const SUPPORTED_AUTO_TOOL_NAMES = ['parse_resume', 'parse_document', 'parse_file']

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getParserConfig(kind: ParserKind): ParserEndpointConfig {
  if (kind === 'docling') {
    return {
      kind,
      url: process.env.DOCLING_MCP_URL?.trim(),
      toolName: process.env.DOCLING_MCP_TOOL_NAME?.trim(),
    }
  }

  return {
    kind,
    url: process.env.MINERU_MCP_URL?.trim(),
    toolName: process.env.MINERU_MCP_TOOL_NAME?.trim(),
  }
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getPreferredParsers(extension: string, prefer: ParserPreference): ParserKind[] {
  if (prefer === 'docling') {
    return ['docling', 'mineru']
  }

  if (prefer === 'mineru') {
    return ['mineru', 'docling']
  }

  if (['doc', 'docx', 'html', 'ppt', 'pptx'].includes(extension)) {
    return ['docling', 'mineru']
  }

  if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    return ['mineru', 'docling']
  }

  return ['docling', 'mineru']
}

function getToolSchemaKeys(tool: ToolLike): Set<string> {
  const properties = tool.inputSchema?.properties
  if (!properties || typeof properties !== 'object') {
    return new Set()
  }

  return new Set(Object.keys(properties))
}

function setFirstSupportedArgument(
  argumentsRecord: Record<string, unknown>,
  schemaKeys: Set<string>,
  candidates: string[],
  value: unknown,
) {
  if (value === undefined || value === null || value === '') {
    return
  }

  const targetKey =
    schemaKeys.size > 0
      ? candidates.find((candidate) => schemaKeys.has(candidate))
      : candidates[0]

  if (!targetKey) {
    return
  }

  argumentsRecord[targetKey] = value
}

function looksLikeParserTool(tool: ToolLike): boolean {
  const toolName = tool.name?.toLowerCase() ?? ''
  if (/(parse|extract|document|resume|file)/.test(toolName)) {
    return true
  }

  const schemaKeys = getToolSchemaKeys(tool)
  return (
    ['file_url', 'fileUrl', 'url', 'source_url'].some((key) => schemaKeys.has(key)) &&
    ['file_name', 'fileName', 'filename', 'name'].some((key) => schemaKeys.has(key))
  )
}

function pickTool(tools: ToolLike[], preferredToolName?: string): ToolLike | undefined {
  if (preferredToolName) {
    const matchedTool = tools.find((tool) => tool.name === preferredToolName)
    if (matchedTool) {
      return matchedTool
    }
  }

  const autoMatchedTool = SUPPORTED_AUTO_TOOL_NAMES
    .map((toolName) => tools.find((tool) => tool.name === toolName))
    .find(Boolean)
  if (autoMatchedTool) {
    return autoMatchedTool
  }

  const parserTool = tools.find(looksLikeParserTool)
  if (parserTool) {
    return parserTool
  }

  if (tools.length === 1 && looksLikeParserTool(tools[0])) {
    return tools[0]
  }

  return undefined
}

function buildToolArguments(
  tool: ToolLike,
  parserKind: ParserKind,
  request: {
    fileUrl: string
    fileName: string
    mimeType?: string
  },
): Record<string, unknown> {
  const schemaKeys = getToolSchemaKeys(tool)
  const argumentsRecord: Record<string, unknown> = {}

  setFirstSupportedArgument(
    argumentsRecord,
    schemaKeys,
    ['file_url', 'fileUrl', 'url', 'source_url', 'file_signed_url'],
    request.fileUrl,
  )
  setFirstSupportedArgument(
    argumentsRecord,
    schemaKeys,
    ['file_name', 'fileName', 'filename', 'name'],
    request.fileName,
  )
  setFirstSupportedArgument(
    argumentsRecord,
    schemaKeys,
    ['mime_type', 'mimeType', 'content_type'],
    request.mimeType,
  )
  setFirstSupportedArgument(
    argumentsRecord,
    schemaKeys,
    ['extension', 'ext'],
    getExtension(request.fileName),
  )
  setFirstSupportedArgument(
    argumentsRecord,
    schemaKeys,
    ['prefer', 'preferred_parser', 'parser', 'engine'],
    parserKind,
  )

  return argumentsRecord
}

function parseJsonText(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function extractToolPayload(result: unknown): ParsedToolPayload {
  if (!result || typeof result !== 'object') {
    return { markdown: '', structured: {} }
  }

  const payload = result as {
    content?: Array<{ type?: string; text?: string }>
    structuredContent?: unknown
  }

  if (
    payload.structuredContent &&
    typeof payload.structuredContent === 'object' &&
    !Array.isArray(payload.structuredContent)
  ) {
    return normalizeToolPayload(payload.structuredContent as Record<string, unknown>)
  }

  const textContent = Array.isArray(payload.content)
    ? payload.content.find(
        (contentItem): contentItem is { type?: string; text?: string } =>
          contentItem?.type === 'text' && typeof contentItem.text === 'string',
      )?.text
    : undefined

  if (!textContent) {
    return { markdown: '', structured: {} }
  }

  const parsedJsonPayload = parseJsonText(textContent)
  if (parsedJsonPayload) {
    return normalizeToolPayload(parsedJsonPayload)
  }

  return {
    markdown: textContent,
    structured: {},
  }
}

function readStringField(
  payload: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function normalizeToolPayload(payload: Record<string, unknown>): ParsedToolPayload {
  const structuredValue = payload.structured
  const structured =
    structuredValue && typeof structuredValue === 'object' && !Array.isArray(structuredValue)
      ? (structuredValue as Record<string, unknown>)
      : {}

  return {
    markdown: readStringField(payload, ['markdown', 'md', 'text', 'content']) ?? '',
    structured,
    parserUsed: readStringField(payload, ['parser_used', 'parser', 'parserName']),
    error: readStringField(payload, ['error', 'message']),
  }
}

function hasUsableMarkdown(markdown: string): boolean {
  const normalizedMarkdown = normalizeExtractedText(markdown)
  const alphanumericCount = (normalizedMarkdown.match(/[A-Za-z0-9\u4e00-\u9fa5]/g) ?? []).length
  return (
    normalizedMarkdown.length >= MIN_USABLE_MARKDOWN_LENGTH &&
    alphanumericCount >= MIN_USABLE_MARKDOWN_LENGTH / 2
  )
}

function isParserKind(value: string | undefined): value is ParserKind {
  return value === 'docling' || value === 'mineru'
}

function truncateErrorMessage(message: string): string {
  return message.slice(0, MAX_PARSER_ERROR_MESSAGE_LENGTH).trim()
}

async function callParserTool(
  parserConfig: ParserEndpointConfig,
  request: {
    fileUrl: string
    fileName: string
    mimeType?: string
  },
): Promise<ParsedToolPayload> {
  if (!parserConfig.url) {
    throw new Error(`${parserConfig.kind} MCP 未配置。`)
  }

  const client = new Client({
    name: 'ai-headhunter-assistant-chat-attachments',
    version: '0.1.0',
  })

  try {
    const transport = new StreamableHTTPClientTransport(new URL(parserConfig.url))
    await client.connect(transport)

    const toolsResponse = await client.listTools()
    const availableTools = Array.isArray(toolsResponse.tools)
      ? (toolsResponse.tools as ToolLike[])
      : []
    const selectedTool = pickTool(availableTools, parserConfig.toolName)

    if (!selectedTool?.name) {
      throw new Error(`${parserConfig.kind} MCP 未暴露可用的解析工具。`)
    }

    const result = await client.callTool({
      name: selectedTool.name,
      arguments: buildToolArguments(selectedTool, parserConfig.kind, request),
    })

    return extractToolPayload(result)
  } finally {
    await client.close().catch(() => undefined)
  }
}

export async function parseChatAttachmentViaMcp(request: {
  fileUrl: string
  fileName: string
  mimeType?: string
  prefer?: ParserPreference
}): Promise<ParsedAttachmentResult> {
  const extension = getExtension(request.fileName)
  const parserCandidates = getPreferredParsers(extension, request.prefer ?? 'auto')
  const parserErrors: string[] = []

  for (const parserKind of parserCandidates) {
    const parserConfig = getParserConfig(parserKind)
    if (!parserConfig.url) {
      parserErrors.push(`${parserKind} MCP 未配置。`)
      continue
    }

    try {
      const parserPayload = await callParserTool(parserConfig, request)
      const normalizedMarkdown = normalizeExtractedText(parserPayload.markdown)
      const parserUsed = isParserKind(parserPayload.parserUsed)
        ? parserPayload.parserUsed
        : parserKind

      if (hasUsableMarkdown(normalizedMarkdown)) {
        const notes = [
          parserUsed !== parserKind ? `已由 ${parserUsed} 完成实际解析。` : undefined,
          parserPayload.error ? `解析器提示：${truncateErrorMessage(parserPayload.error)}` : undefined,
        ].filter((note): note is string => Boolean(note))

        return {
          text: normalizedMarkdown,
          note: notes.length > 0 ? notes.join(' ') : undefined,
          status: 'parsed',
          parserUsed,
        }
      }

      parserErrors.push(
        parserPayload.error
          ? `${parserKind} 返回内容不足：${truncateErrorMessage(parserPayload.error)}`
          : `${parserKind} 返回内容不足，已尝试切换解析器。`,
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${parserKind} 调用失败。`
      parserErrors.push(`${parserKind} 调用失败：${truncateErrorMessage(errorMessage)}`)
    }
  }

  return {
    text: '',
    note:
      parserErrors.length > 0
        ? parserErrors.join(' ')
        : '文件已保存，但当前未从 Docling / MinerU 获得可用正文。',
    status: 'failed',
  }
}

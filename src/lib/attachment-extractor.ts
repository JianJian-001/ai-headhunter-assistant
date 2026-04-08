export type AttachmentExtractorMode = 'coze' | 'mcp'

/**
 * 决定附件正文用哪条解析链路。
 * - 未设置 CHAT_ATTACHMENT_EXTRACTOR 时：若已配置扣子则优先扣子，否则走 MCP。
 * - `coze` / `mcp`：强制使用该链路（缺配置则返回 null）。
 */
export function resolveAttachmentExtractorMode(): AttachmentExtractorMode | null {
  const explicit = process.env.CHAT_ATTACHMENT_EXTRACTOR?.trim().toLowerCase()
  const hasCoze = Boolean(process.env.COZE_API_TOKEN?.trim() && process.env.COZE_BOT_ID?.trim())
  const hasMcp = Boolean(process.env.DOCLING_MCP_URL?.trim() || process.env.MINERU_MCP_URL?.trim())

  if (explicit === 'coze') {
    return hasCoze ? 'coze' : null
  }
  if (explicit === 'mcp') {
    return hasMcp ? 'mcp' : null
  }

  if (hasCoze) {
    return 'coze'
  }
  if (hasMcp) {
    return 'mcp'
  }

  return null
}

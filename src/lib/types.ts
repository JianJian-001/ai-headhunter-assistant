// ============================================================
// Shared TypeScript types for Domi Platform
// ============================================================

export type ChatMode = 'agent' | 'qa' | 'web_search'
export type MessageRole = 'user' | 'assistant' | 'system'
export type SkillType = 'builtin' | 'user_created' | 'marketplace'
export type SkillSource = 'added' | 'created' | 'purchased'
export type PurchaseStatus = 'active' | 'expired' | 'refunded'
export type ChatAttachmentExtractionStatus = 'parsed' | 'stored_only' | 'failed'
export type ChatAttachmentParser = 'docling' | 'mineru' | 'coze'

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  is_merchant: boolean
  merchant_channel: string | null
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  preview?: string
  mode: ChatMode
  pinned_at?: string | null
  created_at: string
  updated_at: string
}

export interface ChatAttachment {
  id: string
  name: string
  extension: string
  mime_type: string
  size_bytes: number
  storage_bucket: string
  storage_path: string
  server_token?: string
  extraction_status: ChatAttachmentExtractionStatus
  parser_used?: ChatAttachmentParser
  extracted_text?: string
  extracted_excerpt?: string
  extraction_note?: string
}

export interface MessageMetadata {
  attachments?: ChatAttachment[]
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  skill_id: string | null
  metadata: MessageMetadata | null
  created_at: string
}

export interface Skill {
  id: string
  slug: string
  name: string
  description: string
  icon: string | null
  skill_type: SkillType
  category: string
  invocation_method: string | null
  manifest: SkillManifest | null
  price: number
  is_published: boolean
  creator_id: string | null
  enabled: boolean
  created_at: string
}

export interface SkillManifest {
  version: string
  role: string
  workflow?: string[]
  references?: string[]
  scripts?: { name: string; runtime: string; path: string }[]
  env_vars?: string[]
}

export interface UserSkill {
  id: string
  user_id: string
  skill_id: string
  source: SkillSource
  enabled: boolean
  created_at: string
  skill?: Skill
}

export interface Purchase {
  id: string
  user_id: string
  skill_id: string
  skill_name: string
  price: number
  subscription_days: number
  payment_channel: string
  status: PurchaseStatus
  expires_at: string
  created_at: string
}

// Chat streaming types
export interface ChatRequest {
  conversation_id?: string
  message: string
  mode: ChatMode
  enabled_skills?: string[]
  attachments?: ChatAttachment[]
}

export interface StreamChunk {
  type: 'text' | 'skill_start' | 'skill_end' | 'error' | 'done'
  content?: string
  skill_slug?: string
  metadata?: Record<string, unknown>
}

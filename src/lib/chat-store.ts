import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Conversation, Message, ChatMode } from './types'

interface ConversationMessagesMap {
  [conversationId: string]: Message[]
}

interface DeletedConversationMap {
  [conversationId: string]: boolean
}

function getPinnedTimestamp(conversation: Conversation): number {
  if (!conversation.pinned_at) {
    return 0
  }

  const pinnedTimestamp = new Date(conversation.pinned_at).getTime()
  return Number.isNaN(pinnedTimestamp) ? 0 : pinnedTimestamp
}

function buildConversationTitle(content: string): string {
  const normalizedContent = content.replace(/\s+/g, ' ').trim()
  if (!normalizedContent) {
    return '新对话'
  }

  return normalizedContent.length > 18 ? `${normalizedContent.slice(0, 18)}...` : normalizedContent
}

function buildConversationPreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 40)
}

function buildAttachmentConversationLabel(
  metadata: Message['metadata'],
  fallbackTitle?: string,
): string {
  const attachmentNames = metadata?.attachments?.map((attachment) => attachment.name).join(' ')
  if (attachmentNames) {
    return attachmentNames
  }

  return fallbackTitle || '新对话'
}

function upsertConversation(
  conversations: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return [conversation, ...conversations.filter((item) => item.id !== conversation.id)].sort(
    (left, right) =>
      getPinnedTimestamp(right) - getPinnedTimestamp(left) ||
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )
}

interface ChatState {
  conversations: Conversation[]
  conversationMessages: ConversationMessagesMap
  deletedConversationIds: DeletedConversationMap
  activeConversationId: string | null
  messages: Message[]
  mode: ChatMode
  isStreaming: boolean
  streamingConversationId: string | null
  streamingContent: string

  setConversations: (conversations: Conversation[]) => void
  openConversation: (id: string) => void
  startConversation: (conversationId: string, firstMessage: string, mode: ChatMode) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setMode: (mode: ChatMode) => void
  startStreaming: (conversationId: string) => void
  finishStreaming: (conversationId: string) => void
  appendStreamContent: (conversationId: string, chunk: string) => void
  resetStreamContent: () => void
  newConversation: () => void
  renameConversation: (conversationId: string, nextTitle: string) => void
  deleteConversation: (conversationId: string) => void
  toggleConversationPinned: (conversationId: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      conversationMessages: {},
      deletedConversationIds: {},
      activeConversationId: null,
      messages: [],
      mode: 'agent',
      isStreaming: false,
      streamingConversationId: null,
      streamingContent: '',

      setConversations: (conversations) => set({ conversations }),

      openConversation: (id) =>
        set((state) => ({
          activeConversationId: id,
          messages: state.conversationMessages[id] ?? [],
          mode: state.conversations.find((item) => item.id === id)?.mode ?? state.mode,
          isStreaming: false,
          streamingConversationId: null,
          streamingContent: '',
        })),

      startConversation: (conversationId, firstMessage, mode) =>
        set((state) => {
          const timestamp = new Date().toISOString()
          const existingConversation = state.conversations.find((item) => item.id === conversationId)
          const nextDeletedConversationIds = { ...state.deletedConversationIds }
          delete nextDeletedConversationIds[conversationId]
          const nextConversation: Conversation = {
            id: conversationId,
            user_id: existingConversation?.user_id ?? 'local',
            title: existingConversation?.title ?? buildConversationTitle(firstMessage),
            preview: existingConversation?.preview ?? buildConversationPreview(firstMessage),
            mode,
            created_at: existingConversation?.created_at ?? timestamp,
            updated_at: timestamp,
          }

          return {
            activeConversationId: conversationId,
            messages: state.conversationMessages[conversationId] ?? [],
            mode,
            conversations: upsertConversation(state.conversations, nextConversation),
            deletedConversationIds: nextDeletedConversationIds,
            isStreaming: false,
            streamingConversationId: null,
            streamingContent: '',
          }
        }),

      setActiveConversation: (id) =>
        set((state) => ({
          activeConversationId: id,
          messages: id ? state.conversationMessages[id] ?? [] : [],
        })),

      setMessages: (messages) =>
        set((state) => {
          if (!state.activeConversationId) {
            return { messages }
          }

          return {
            messages,
            conversationMessages: {
              ...state.conversationMessages,
              [state.activeConversationId]: messages,
            },
          }
        }),

      addMessage: (message) =>
        set((state) => {
          if (!message.conversation_id) {
            return { messages: [...state.messages, message] }
          }

          if (state.deletedConversationIds[message.conversation_id]) {
            return state
          }

          const currentConversationMessages = state.conversationMessages[message.conversation_id] ?? []
          const nextConversationMessages = [...currentConversationMessages, message]
          const existingConversation = state.conversations.find(
            (item) => item.id === message.conversation_id,
          )
          const messageTitleSource = message.content || buildAttachmentConversationLabel(message.metadata, existingConversation?.title)
          const nextConversation: Conversation = {
            id: message.conversation_id,
            user_id: existingConversation?.user_id ?? 'local',
            title:
              currentConversationMessages.length === 0
                ? buildConversationTitle(messageTitleSource)
                : existingConversation?.title ?? buildConversationTitle(messageTitleSource),
            preview: buildConversationPreview(message.content || buildAttachmentConversationLabel(message.metadata)),
            mode:
              state.activeConversationId === message.conversation_id
                ? state.mode
                : existingConversation?.mode ?? state.mode,
            created_at: existingConversation?.created_at ?? message.created_at,
            updated_at: message.created_at,
          }

          return {
            messages:
              state.activeConversationId === message.conversation_id
                ? [...state.messages, message]
                : state.messages,
            conversationMessages: {
              ...state.conversationMessages,
              [message.conversation_id]: nextConversationMessages,
            },
            conversations: upsertConversation(state.conversations, nextConversation),
          }
        }),

      setMode: (mode) =>
        set((state) => {
          if (!state.activeConversationId) {
            return { mode }
          }

          const existingConversation = state.conversations.find(
            (item) => item.id === state.activeConversationId,
          )
          if (!existingConversation) {
            return { mode }
          }

          const nextConversation: Conversation = {
            ...existingConversation,
            mode,
            updated_at: new Date().toISOString(),
          }

          return {
            mode,
            conversations: upsertConversation(state.conversations, nextConversation),
          }
        }),
      startStreaming: (conversationId) =>
        set({
          isStreaming: true,
          streamingConversationId: conversationId,
          streamingContent: '',
        }),
      finishStreaming: (conversationId) =>
        set((state) =>
          state.streamingConversationId === conversationId
            ? {
                isStreaming: false,
                streamingConversationId: null,
                streamingContent: '',
              }
            : state,
        ),
      appendStreamContent: (conversationId, chunk) =>
        set((state) =>
          state.streamingConversationId === conversationId
            ? { streamingContent: state.streamingContent + chunk }
            : state,
        ),
      resetStreamContent: () => set({ streamingContent: '' }),
      newConversation: () =>
        set({
          activeConversationId: null,
          messages: [],
          isStreaming: false,
          streamingConversationId: null,
          streamingContent: '',
        }),
      renameConversation: (conversationId, nextTitle) =>
        set((state) => {
          const normalizedTitle = nextTitle.trim()
          if (!normalizedTitle) {
            return state
          }

          const targetConversation = state.conversations.find((item) => item.id === conversationId)
          if (!targetConversation) {
            return state
          }

          const renamedConversation: Conversation = {
            ...targetConversation,
            title: normalizedTitle,
          }

          return {
            conversations: upsertConversation(state.conversations, renamedConversation),
          }
        }),
      deleteConversation: (conversationId) =>
        set((state) => {
          const nextConversations = state.conversations.filter((item) => item.id !== conversationId)
          const nextConversationMessages = { ...state.conversationMessages }
          const nextDeletedConversationIds = { ...state.deletedConversationIds, [conversationId]: true }
          delete nextConversationMessages[conversationId]

          const nextActiveConversationId =
            state.activeConversationId === conversationId ? null : state.activeConversationId

          return {
            conversations: nextConversations,
            conversationMessages: nextConversationMessages,
            deletedConversationIds: nextDeletedConversationIds,
            activeConversationId: nextActiveConversationId,
            messages: nextActiveConversationId ? state.messages : [],
            isStreaming:
              state.streamingConversationId === conversationId ? false : state.isStreaming,
            streamingConversationId:
              state.streamingConversationId === conversationId ? null : state.streamingConversationId,
            streamingContent:
              state.streamingConversationId === conversationId ? '' : state.streamingContent,
          }
        }),
      toggleConversationPinned: (conversationId) =>
        set((state) => {
          const targetConversation = state.conversations.find((item) => item.id === conversationId)
          if (!targetConversation) {
            return state
          }

          const toggledConversation: Conversation = {
            ...targetConversation,
            pinned_at: targetConversation.pinned_at ? null : new Date().toISOString(),
          }

          return {
            conversations: upsertConversation(state.conversations, toggledConversation),
          }
        }),
    }),
    {
      name: 'domi-chat',
      partialize: (state) => ({
        conversations: state.conversations,
        conversationMessages: state.conversationMessages,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
        mode: state.mode,
      }),
    },
  ),
)

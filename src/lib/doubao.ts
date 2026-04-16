import OpenAI from 'openai'

let _client: OpenAI | null = null

const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'

function getDoubaoConfig() {
  const apiKey = process.env.DOUBAO_API_KEY?.trim()
  const model = process.env.DOUBAO_MODEL?.trim()

  if (!apiKey) {
    throw new Error('缺少LLM配置：DOUBAO_API_KEY')
  }

  if (!model) {
    throw new Error('缺少LLM配置：DOUBAO_MODEL')
  }

  return { apiKey, model, baseURL: DOUBAO_BASE_URL }
}

function getClient(): OpenAI {
  const { apiKey, baseURL } = getDoubaoConfig()

  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL,
    })
  }
  return _client
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Non-streaming completion */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const { model } = getDoubaoConfig()
  const response = await getClient().chat.completions.create({
    model,
    messages,
  })
  return response.choices[0]?.message?.content ?? ''
}

/** Streaming completion — returns an async iterable of text chunks */
export async function chatStream(messages: ChatMessage[]) {
  const { model } = getDoubaoConfig()
  return getClient().chat.completions.create({
    model,
    messages,
    stream: true,
  })
}

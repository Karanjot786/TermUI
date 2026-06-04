import { createRequire } from 'node:module'

export type AIProvider = 'openai' | 'anthropic'

export interface AIOptions {
  apiKey: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIAdapter {
  generate(prompt: string): Promise<string>
  chat(messages: AIMessage[]): AsyncIterable<string>
}

function isModuleNotFound(error: unknown, moduleName: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' &&
    error.message.includes(moduleName)
  )
}

function loadOpenAI() {
  try {
    const req = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = req('openai') as any
    return 'default' in mod ? mod.default : mod
  } catch (error) {
    if (isModuleNotFound(error, 'openai')) {
      throw new Error(
        'useAI() requires the optional peer dependency `openai`. Install it with: bun add openai'
      )
    }
    throw error
  }
}

function loadAnthropic() {
  try {
    const req = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = req('@anthropic-ai/sdk') as any
    return 'default' in mod ? mod.default : mod
  } catch (error) {
    if (isModuleNotFound(error, '@anthropic-ai/sdk')) {
      throw new Error(
        'useAI() requires the optional peer dependency `@anthropic-ai/sdk`. Install it with: bun add @anthropic-ai/sdk'
      )
    }
    throw error
  }
}

export function useAI(provider: AIProvider, options: AIOptions): AIAdapter {
  return {
    async generate(prompt: string): Promise<string> {
      if (provider === 'openai') {
        const OpenAI = loadOpenAI()
        const client = new OpenAI({ apiKey: options.apiKey })
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        })
        return response.choices[0]?.message?.content ?? ''
      }

      const Anthropic = loadAnthropic()
      const client = new Anthropic({ apiKey: options.apiKey })
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      return block.type === 'text' ? block.text : ''
    },

    async *chat(messages: AIMessage[]): AsyncIterable<string> {
      if (provider === 'openai') {
        const OpenAI = loadOpenAI()
        const client = new OpenAI({ apiKey: options.apiKey })
        const stream = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          stream: true,
        })
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content
          if (token) yield token
        }
        return
      }

      const Anthropic = loadAnthropic()
      const client = new Anthropic({ apiKey: options.apiKey })
      const stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages,
      })
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text
        }
      }
    },
  }
}
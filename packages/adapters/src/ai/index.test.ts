import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAI } from './index.js'

// Mock node:module so we can control whether SDKs are "installed"
vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()
  return {
    ...actual,
    createRequire: () => (specifier: string) => {
      if (specifier === 'openai') {
        return {
          default: class MockOpenAI {
            chat = {
              completions: {
                create: vi.fn().mockImplementation(({ stream }: { stream?: boolean }) => {
                  if (stream) {
                    return (async function* () {
                      yield { choices: [{ delta: { content: 'Hello' } }] }
                      yield { choices: [{ delta: { content: ' World' } }] }
                    })()
                  }
                  return Promise.resolve({
                    choices: [{ message: { content: 'Hello World' } }],
                  })
                }),
              },
            }
          },
        }
      }
      if (specifier === '@anthropic-ai/sdk') {
        return {
          default: class MockAnthropic {
            messages = {
              create: vi.fn().mockResolvedValue({
                content: [{ type: 'text', text: 'Hello World' }],
              }),
              stream: vi.fn().mockImplementation(() =>
                (async function* () {
                  yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
                  yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } }
                })()
              ),
            }
          },
        }
      }
      const err = new Error(`Cannot find module '${specifier}'`) as NodeJS.ErrnoException
      err.code = 'MODULE_NOT_FOUND'
      throw err
    },
  }
})

beforeEach(() => {
  vi.resetModules()
})

describe('useAI', () => {
  it('returns generate and chat functions', () => {
    const ai = useAI('openai', { apiKey: 'test-key' })
    expect(typeof ai.generate).toBe('function')
    expect(typeof ai.chat).toBe('function')
  })

  it('generate calls OpenAI and returns text', async () => {
    const ai = useAI('openai', { apiKey: 'test-key' })
    const result = await ai.generate('Hello')
    expect(result).toBe('Hello World')
  })

  it('generate calls Anthropic and returns text', async () => {
    const ai = useAI('anthropic', { apiKey: 'test-key' })
    const result = await ai.generate('Hello')
    expect(result).toBe('Hello World')
  })

  it('chat streams tokens from OpenAI', async () => {
    const ai = useAI('openai', { apiKey: 'test-key' })
    const tokens: string[] = []
    for await (const token of ai.chat([{ role: 'user', content: 'Hi' }])) {
      tokens.push(token)
    }
    expect(tokens).toEqual(['Hello', ' World'])
  })

  it('chat streams tokens from Anthropic', async () => {
    const ai = useAI('anthropic', { apiKey: 'test-key' })
    const tokens: string[] = []
    for await (const token of ai.chat([{ role: 'user', content: 'Hi' }])) {
      tokens.push(token)
    }
    expect(tokens).toEqual(['Hello', ' World'])
  })
})
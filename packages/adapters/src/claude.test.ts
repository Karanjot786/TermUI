import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeAdapter } from './claude.js';

// Mock node:module so we can control whether @anthropic-ai/sdk is "installed"
vi.mock('node:module', async (importActual) => {
    const actual = await importActual<typeof import('node:module')>();
    return {
        ...actual,
        createRequire: () => (specifier: string) => {
            if (specifier === '@anthropic-ai/sdk') {
                return {
                    default: class MockAnthropic {
                        messages = {
                            stream: vi.fn().mockImplementation(() =>
                                (async function* () {
                                    yield {
                                        type: 'content_block_delta',
                                        delta: { type: 'text_delta', text: 'Hello' },
                                    };
                                    yield {
                                        type: 'content_block_delta',
                                        delta: { type: 'text_delta', text: ' World' },
                                    };
                                })()
                            ),
                        };
                    },
                };
            }
            const err = new Error(`Cannot find module '${specifier}'`) as NodeJS.ErrnoException;
            err.code = 'MODULE_NOT_FOUND';
            throw err;
        },
    };
});

beforeEach(() => {
    vi.resetModules();
});

describe('ClaudeAdapter', () => {
    it('initializes with default options', () => {
        const adapter = new ClaudeAdapter();
        expect(adapter).toBeDefined();
    });

    it('uses mock stream mode when no apiKey is provided', async () => {
        const adapter = new ClaudeAdapter();
        const chunks: string[] = [];
        await adapter.streamMessage('hi', (text) => {
            chunks.push(text);
        });
        expect(chunks.length).toBeGreaterThan(0);
        const joined = chunks.join('');
        expect(
            joined.includes('mock mode') ||
            joined.includes('Mock mode') ||
            joined.includes('No API key')
        ).toBe(true);
    });

    it('uses real stream mode when apiKey is provided', async () => {
        const adapter = new ClaudeAdapter({ apiKey: 'test-api-key' });
        const chunks: string[] = [];
        await adapter.streamMessage('hi', (text) => {
            chunks.push(text);
        });
        expect(chunks).toEqual(['Hello', ' World']);
    });
});

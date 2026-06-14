import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { RAGChat } from './RAGChat.js';
import { type AIAdapter, type AIMessage } from './index.js';
import { LocalVectorStore, type DocumentChunk } from './vectorStore.js';
import { Screen, type KeyEvent } from '@termuijs/core';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

class MockVectorStore extends LocalVectorStore {
    constructor() {
        super();
    }
    override addDocuments = vi.fn<[Omit<DocumentChunk, 'embedding'>[], AIAdapter], Promise<void>>();
    override query = vi.fn<[string, AIAdapter, number?], Promise<DocumentChunk[]>>();
    override load = vi.fn<[], Promise<void>>();
    override save = vi.fn<[], Promise<void>>();
}

describe('RAGChat', () => {
    let mockAI: AIAdapter;
    let mockVectorStore: MockVectorStore;
    let tempDocsDir: string;

    beforeEach(async () => {
        tempDocsDir = path.join(process.cwd(), 'temp-test-rag-chat-docs');
        await fs.mkdir(tempDocsDir, { recursive: true });
        await fs.writeFile(path.join(tempDocsDir, 'doc1.md'), 'TermUI widgets are beautiful', 'utf-8');

        mockAI = {
            generate: vi.fn<[string], Promise<string>>(),
            chat: vi.fn<[AIMessage[]], AsyncIterable<string>>(async function* () {
                yield 'Here ';
                yield 'is ';
                yield 'the ';
                yield 'answer.';
            }),
            embed: vi.fn<[string], Promise<number[]>>(async () => [0.1, 0.2, 0.3]),
        };

        mockVectorStore = new MockVectorStore();
        mockVectorStore.addDocuments.mockResolvedValue();
        mockVectorStore.query.mockResolvedValue([
            { id: 'chunk-0', text: 'TermUI widgets are beautiful', filePath: 'doc1.md' }
        ]);
        mockVectorStore.load.mockResolvedValue();
        mockVectorStore.save.mockResolvedValue();
    });

    afterEach(async () => {
        try {
            await fs.rm(tempDocsDir, { recursive: true, force: true });
        } catch {}
    });

    const makeKeyEvent = (key: string): KeyEvent => ({
        key,
        raw: Buffer.alloc(0),
        ctrl: false,
        alt: false,
        shift: false,
        stopPropagation: () => {},
        preventDefault: () => {},
    });

    const awaitIndex = async (store: MockVectorStore) => {
        await new Promise<void>(resolve => {
            const timer = setInterval(() => {
                if (store.save.mock.calls.length > 0) {
                    clearInterval(timer);
                    resolve();
                }
            }, 2);
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 200);
        });
    };

    const getScreenChars = (screen: Screen): string => {
        return screen.back.map(row => row.map(c => c.char).join('')).join('\n');
    };

    it('renders chat panel with input and history areas on mount', async () => {
        const chat = new RAGChat({}, {
            ai: mockAI,
            vectorStore: mockVectorStore,
            docsPath: tempDocsDir,
        });

        const screen = new Screen(60, 20);
        chat.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        chat.render(screen);

        await awaitIndex(mockVectorStore);
        await flush();

        expect(mockVectorStore.load).toHaveBeenCalled();
        expect(mockVectorStore.save).toHaveBeenCalled();

        chat.render(screen);
        const chars = getScreenChars(screen);
        expect(chars).toContain('Ask a question against docs...');
    });

    it('submits input, triggers retrieval query, and shows loading state', async () => {
        const chat = new RAGChat({}, {
            ai: mockAI,
            vectorStore: mockVectorStore,
            docsPath: tempDocsDir,
        });

        await awaitIndex(mockVectorStore);
        await flush();

        chat.isFocused = true;
        for (const ch of 'What is TermUI?') {
            chat.handleKey(makeKeyEvent(ch));
        }

        const screenBefore = new Screen(60, 20);
        chat.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        chat.render(screenBefore);
        const charsBefore = getScreenChars(screenBefore);
        expect(charsBefore).toContain('What is TermUI?');

        chat.handleKey(makeKeyEvent('enter'));

        const screenLoading = new Screen(60, 20);
        chat.render(screenLoading);
        const charsLoading = getScreenChars(screenLoading);
        expect(charsLoading).toContain('[ Thinking... ]');

        await flush();
        await flush();

        expect(mockVectorStore.query).toHaveBeenCalledWith('What is TermUI?', mockAI, 3);
    });

    it('streams AI tokens into the history list on response', async () => {
        const chat = new RAGChat({}, {
            ai: mockAI,
            vectorStore: mockVectorStore,
            docsPath: tempDocsDir,
        });

        await awaitIndex(mockVectorStore);
        await flush();

        chat.isFocused = true;
        for (const ch of 'Hello?') {
            chat.handleKey(makeKeyEvent(ch));
        }
        chat.handleKey(makeKeyEvent('enter'));

        await flush();
        await flush();
        await flush();

        expect(mockAI.chat).toHaveBeenCalled();

        const screenAfter = new Screen(60, 20);
        chat.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        chat.render(screenAfter);
        const charsAfter = getScreenChars(screenAfter);
        expect(charsAfter).toContain('You: Hello?');
        expect(charsAfter).toContain('AI: Here is the answer.');
    });

    it('propagates index initialization errors and query errors to onError handler and events emitter', async () => {
        const initError = new Error('Init failed');
        mockVectorStore.load = vi.fn().mockRejectedValue(initError);
        const onErrorSpy = vi.fn();
        const eventSpy = vi.fn();

        const chat = new RAGChat({}, {
            ai: mockAI,
            vectorStore: mockVectorStore,
            docsPath: tempDocsDir,
            onError: onErrorSpy,
        });
        (chat.events as any).on('error', eventSpy); // Cast needed: Widget events typed interface does not contain custom 'error' event, but underlying EventEmitter supports it.

        await flush();
        await flush();

        expect(onErrorSpy).toHaveBeenCalledWith(initError);
        expect(eventSpy).toHaveBeenCalledWith(initError);

        onErrorSpy.mockReset();
        eventSpy.mockReset();
        mockVectorStore.load = vi.fn().mockResolvedValue(undefined);
        
        const queryError = new Error('Query failed');
        mockVectorStore.query = vi.fn().mockRejectedValue(queryError);

        const chat2 = new RAGChat({}, {
            ai: mockAI,
            vectorStore: mockVectorStore,
            docsPath: tempDocsDir,
            onError: onErrorSpy,
        });
        (chat2.events as any).on('error', eventSpy); // Cast needed: Widget events typed interface does not contain custom 'error' event, but underlying EventEmitter supports it.
        await awaitIndex(mockVectorStore);
        await flush();

        chat2.isFocused = true;
        chat2.handleKey(makeKeyEvent('Q'));
        chat2.handleKey(makeKeyEvent('enter'));

        await flush();
        await flush();

        expect(onErrorSpy).toHaveBeenCalledWith(queryError);
        expect(eventSpy).toHaveBeenCalledWith(queryError);
    });
});

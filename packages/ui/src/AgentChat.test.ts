// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for AgentChat widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { AgentChat } from './AgentChat.js';
import { Screen, computeLayout } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** A no-op query function that yields nothing. */
async function* emptyQuery(_msg: string): AsyncGenerator<string> {
    // yields nothing
}

/** A query function that yields tokens one by one. */
function makeEchoQuery(response: string) {
    return async function* (_msg: string): AsyncGenerator<string> {
        for (const ch of response) {
            yield ch;
            // tick to allow the UI to update
            await new Promise<void>((r) => setTimeout(r, 0));
        }
    };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AgentChat', () => {
    it('initializes with zero messages when no welcomeMessage is set', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });
        expect(chat).toBeDefined();
        expect(chat.isResponding()).toBe(false);
    });

    it('renders welcome message in the output pane', () => {
        const chat = new AgentChat({
            title: 'Test Agent',
            welcomeMessage: 'Hello world',
            onQuery: emptyQuery,
        });

        const screen = new Screen(80, 24);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('Hello world');
    });

    it('renders the widget title in the header', () => {
        const chat = new AgentChat({
            title: 'MyAgent',
            onQuery: emptyQuery,
        });

        const screen = new Screen(80, 24);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('MyAgent');
    });

    it('renders token usage: "in:0 out:0" initially', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });

        const screen = new Screen(80, 24);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('in:0 out:0');
    });

    it('isResponding() is false before any query is sent', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });
        expect(chat.isResponding()).toBe(false);
    });

    it('handleKey returns false on Ctrl+C (quit signal)', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });
        const result = chat.handleKey({ key: 'c', ctrl: true, alt: false } as any);
        expect(result).toBe(false);
    });

    it('handleKey returns true for normal character keys', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });
        const result = chat.handleKey({ key: 'a', ctrl: false, alt: false } as any);
        expect(result).toBe(true);
    });

    it('addMessage adds assistant messages to the thread', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });

        const screen = new Screen(80, 24);
        chat.addMessage('assistant', 'Added message');

        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('Added message');
    });

    it('addMessage adds user messages with [User] badge', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });

        const screen = new Screen(80, 24);
        chat.addMessage('user', 'My user message');

        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('[User]');
        expect(joined).toContain('My user message');
    });

    it('resetTokens sets counters to zero', () => {
        const chat = new AgentChat({ onQuery: emptyQuery });

        // Force some counts internally
        chat.resetTokens();

        const screen = new Screen(80, 24);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('in:0 out:0');
    });

    it('streams tokens from onQuery into the assistant message', async () => {
        const echo = makeEchoQuery('ECHO_RESPONSE');
        const chat = new AgentChat({ onQuery: echo, welcomeMessage: 'hi' });

        // Simulate keypress: type 'hi' then press Enter
        chat.handleKey({ key: 'h', ctrl: false, alt: false } as any);
        chat.handleKey({ key: 'i', ctrl: false, alt: false } as any);
        chat.handleKey({ key: 'enter', ctrl: false, alt: false } as any);

        // Wait for async streaming to complete
        await new Promise<void>((r) => setTimeout(r, 200));

        const screen = new Screen(80, 30);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 30);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        expect(joined).toContain('ECHO_RESPONSE');
    });

    it('uses ASCII fallback chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { AgentChat: AgentChatFresh } = await import('./AgentChat.js');
        const chat = new AgentChatFresh({ onQuery: emptyQuery });

        const screen = new Screen(80, 24);
        const node = chat.getLayoutNode();
        computeLayout(node, 80, 24);
        chat.syncLayout();
        chat.render(screen);

        const rows = screen.back.map((row) => row.map((c) => c.char).join(''));
        const joined = rows.join('\n');
        // Help text should use ASCII fallback '>' instead of unicode '❯'
        expect(joined).not.toMatch(/❯/);
    });
});

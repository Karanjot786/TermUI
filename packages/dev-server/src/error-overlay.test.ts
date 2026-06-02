import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { parseErrorStack, ErrorOverlay } from './error-overlay.js';

describe('error-overlay stack trace parsing', () => {
    it('correctly parses standard runtime error stacks', () => {
        const rawTrace = `
TypeError: Cannot read properties of undefined (reading 'foo')
    at renderSelf (D:/OpenSource/TermUI/TermUI/packages/widgets/src/display/Clock.ts:40:15)
    at render (D:/OpenSource/TermUI/TermUI/packages/widgets/src/base/Widget.ts:182:14)
    at runMicrotasks (<anonymous>)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
`;

        const parsed = parseErrorStack(rawTrace);
        expect(parsed.name).toBe('TypeError');
        expect(parsed.message).toBe("Cannot read properties of undefined (reading 'foo')");
        expect(parsed.file).toBe('D:/OpenSource/TermUI/TermUI/packages/widgets/src/display/Clock.ts');
        expect(parsed.line).toBe(40);
        expect(parsed.column).toBe(15);
        expect(parsed.rawStack.length).toBe(4);
    });

    it('filters out node_modules and framework internals', () => {
        const rawTrace = `
Error: Render failed
    at renderSelf (D:/OpenSource/TermUI/TermUI/node_modules/some-lib/index.js:5:10)
    at renderSelf (D:/OpenSource/TermUI/TermUI/packages/widgets/src/display/Clock.ts:25:8)
    at bun:wrap (bun:wrap:12:4)
`;

        const parsed = parseErrorStack(rawTrace);
        expect(parsed.file).toBe('D:/OpenSource/TermUI/TermUI/packages/widgets/src/display/Clock.ts');
        expect(parsed.line).toBe(25);
    });
});

describe('ErrorOverlay rendering', () => {
    it('writes parsed details correctly into the screen buffer', () => {
        const rawTrace = `
ReferenceError: x is not defined
    at D:/OpenSource/TermUI/TermUI/src/index.ts:12:4
`;
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay(rawTrace);
        overlay.render(screen);

        const textOutput = screen.back.map(row => row.map(c => c.char).join('')).join('\n');

        expect(textOutput).toContain('DEV-SERVER RUNTIME / COMPILE ERROR');
        expect(textOutput).toContain('ReferenceError:');
        expect(textOutput).toContain('x is not defined');
        expect(textOutput).toContain('Location: D:/OpenSource/TermUI/TermUI/src/index.ts:12:4');
        expect(textOutput).toContain('Watching for changes...');
    });
});

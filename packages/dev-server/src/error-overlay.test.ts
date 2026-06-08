import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { parseErrorStack, ErrorOverlay } from './error-overlay.js';

// ─────────────────────────────────────────────────────
// Original tests — preserved exactly
// ─────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────
// Edge-case and robustness tests
// ─────────────────────────────────────────────────────

// 1. Stack traces without file information
describe('parseErrorStack — stack trace without file information', () => {
    it('does not throw when there are no stack frames', () => {
        expect(() => parseErrorStack('Error: Something went wrong')).not.toThrow();
    });

    it('extracts the error name correctly', () => {
        const parsed = parseErrorStack('Error: Something went wrong');
        expect(parsed.name).toBe('Error');
    });

    it('preserves the error message', () => {
        const parsed = parseErrorStack('Error: Something went wrong');
        expect(parsed.message).toBe('Something went wrong');
    });

    it('returns undefined for file, line, and column when there are no frames', () => {
        const parsed = parseErrorStack('Error: Something went wrong');
        expect(parsed.file).toBeUndefined();
        expect(parsed.line).toBeUndefined();
        expect(parsed.column).toBeUndefined();
    });

    it('returns an empty rawStack when there are no stack frames', () => {
        const parsed = parseErrorStack('Error: Something went wrong');
        expect(parsed.rawStack).toHaveLength(0);
    });
});

// 2. Unknown or malformed stack frames
describe('parseErrorStack — malformed or unknown stack frames', () => {
    it('does not throw on "at someInvalidFrame"', () => {
        const rawTrace = `Error: fail\n    at someInvalidFrame`;
        expect(() => parseErrorStack(rawTrace)).not.toThrow();
    });

    it('does not throw on "at ??"', () => {
        const rawTrace = `Error: fail\n    at ??`;
        expect(() => parseErrorStack(rawTrace)).not.toThrow();
    });

    it('does not throw on "at unknown"', () => {
        const rawTrace = `Error: fail\n    at unknown`;
        expect(() => parseErrorStack(rawTrace)).not.toThrow();
    });

    it('still extracts name and message even when all frames are malformed', () => {
        const rawTrace = `RangeError: index out of bounds\n    at someInvalidFrame\n    at ??\n    at unknown`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.name).toBe('RangeError');
        expect(parsed.message).toBe('index out of bounds');
    });

    it('collects malformed frames in rawStack', () => {
        const rawTrace = `Error: fail\n    at someInvalidFrame\n    at ??`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.rawStack.length).toBeGreaterThan(0);
    });
});

// 3. Multiple user frames — correct frame selection
describe('parseErrorStack — multiple user frames', () => {
    it('selects the first user-land frame and ignores internals', () => {
        const rawTrace = `
Error: something broke
    at node:internal/process/task_queues:95:5
    at /app/src/components/Button.ts:10:5
    at /app/src/components/Form.ts:30:12
    at /app/node_modules/some-lib/index.js:1:1
`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.file).toBe('/app/src/components/Button.ts');
        expect(parsed.line).toBe(10);
        expect(parsed.column).toBe(5);
    });

    it('is deterministic — same input always returns the same frame', () => {
        const rawTrace = `
Error: determinism check
    at /app/src/a.ts:1:1
    at /app/src/b.ts:2:2
    at /app/src/c.ts:3:3
`;
        const first = parseErrorStack(rawTrace);
        const second = parseErrorStack(rawTrace);
        expect(first.file).toBe(second.file);
        expect(first.line).toBe(second.line);
        expect(first.column).toBe(second.column);
    });
});

// 4. Empty and whitespace-only input
describe('parseErrorStack — empty and whitespace-only input', () => {
    it('does not throw on empty string', () => {
        expect(() => parseErrorStack('')).not.toThrow();
    });

    it('does not throw on whitespace-only string', () => {
        expect(() => parseErrorStack('   \n\t  \n  ')).not.toThrow();
    });

    it('returns sensible fallback values for empty string', () => {
        const parsed = parseErrorStack('');
        expect(parsed.name).toBe('Error');
        expect(parsed.message).toBe('An unknown error occurred');
        expect(parsed.file).toBeUndefined();
        expect(parsed.line).toBeUndefined();
        expect(parsed.column).toBeUndefined();
        expect(parsed.rawStack).toHaveLength(0);
    });

    it('returns sensible fallback values for whitespace-only string', () => {
        const parsed = parseErrorStack('   \n\t  \n  ');
        expect(parsed.name).toBe('Error');
        expect(parsed.message).toBe('An unknown error occurred');
        expect(parsed.rawStack).toHaveLength(0);
    });
});

// 5. Different error types
describe('parseErrorStack — different error types', () => {
    it('correctly extracts TypeError name and message', () => {
        const parsed = parseErrorStack('TypeError: Cannot set property x of null');
        expect(parsed.name).toBe('TypeError');
        expect(parsed.message).toBe('Cannot set property x of null');
    });

    it('correctly extracts ReferenceError name and message', () => {
        const parsed = parseErrorStack('ReferenceError: y is not defined');
        expect(parsed.name).toBe('ReferenceError');
        expect(parsed.message).toBe('y is not defined');
    });

    it('correctly extracts SyntaxError name and message', () => {
        const parsed = parseErrorStack('SyntaxError: Unexpected token }');
        expect(parsed.name).toBe('SyntaxError');
        expect(parsed.message).toBe('Unexpected token }');
    });

    it('correctly extracts RangeError name and message', () => {
        const parsed = parseErrorStack('RangeError: Maximum call stack size exceeded');
        expect(parsed.name).toBe('RangeError');
        expect(parsed.message).toBe('Maximum call stack size exceeded');
    });
});

// 6. Unix-style paths
describe('parseErrorStack — Unix-style paths', () => {
    it('extracts file correctly from a Unix path', () => {
        const rawTrace = `
TypeError: bad input
    at renderClock (/src/widgets/Clock.ts:40:15)
    at node:internal/process/task_queues:95:5
`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.file).toBe('/src/widgets/Clock.ts');
    });

    it('extracts line number correctly from a Unix path frame', () => {
        const rawTrace = `
Error: oops
    at doSomething (/home/user/project/src/index.ts:99:7)
`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.line).toBe(99);
    });

    it('extracts column number correctly from a Unix path frame', () => {
        const rawTrace = `
Error: oops
    at doSomething (/home/user/project/src/index.ts:99:7)
`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.column).toBe(7);
    });

    it('handles a bare Unix path frame without a function name', () => {
        const rawTrace = `
Error: bare frame
    at /app/src/main.ts:5:3
`;
        const parsed = parseErrorStack(rawTrace);
        expect(parsed.file).toBe('/app/src/main.ts');
        expect(parsed.line).toBe(5);
        expect(parsed.column).toBe(3);
    });
});

// 7. ErrorOverlay rendering with long messages
describe('ErrorOverlay rendering — long error messages', () => {
    it('does not throw when message is wider than the screen', () => {
        const longMessage = 'x'.repeat(500);
        const rawTrace = `Error: ${longMessage}\n    at /app/src/main.ts:1:1`;
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay(rawTrace);
        expect(() => overlay.render(screen)).not.toThrow();
    });

    it('keeps every cell in the screen buffer defined after a very long message', () => {
        const longMessage = 'A'.repeat(300);
        const rawTrace = `Error: ${longMessage}\n    at /app/src/main.ts:1:1`;
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay(rawTrace);
        overlay.render(screen);
        for (const row of screen.back) {
            for (const cell of row) {
                expect(typeof cell.char).toBe('string');
            }
        }
    });

    it('still renders the banner when the message is very long', () => {
        const longMessage = 'B'.repeat(400);
        const rawTrace = `Error: ${longMessage}\n    at /app/src/main.ts:1:1`;
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay(rawTrace);
        overlay.render(screen);
        const textOutput = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(textOutput).toContain('DEV-SERVER RUNTIME / COMPILE ERROR');
    });
});

// 8. ErrorOverlay rendering with missing location data
describe('ErrorOverlay rendering — missing location data', () => {
    it('does not throw when file, line, and column are all absent', () => {
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay('Error: no location at all');
        expect(() => overlay.render(screen)).not.toThrow();
    });

    it('renders the error name and message even without a location', () => {
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay('TypeError: something exploded');
        overlay.render(screen);
        const textOutput = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(textOutput).toContain('TypeError:');
        expect(textOutput).toContain('something exploded');
    });

    it('does not render "Location:" when file is missing', () => {
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay('Error: location-free error');
        overlay.render(screen);
        const textOutput = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(textOutput).not.toContain('Location:');
    });

    it('still renders the banner and footer when location data is absent', () => {
        const screen = new Screen(80, 20);
        const overlay = new ErrorOverlay('RangeError: out of range');
        overlay.render(screen);
        const textOutput = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(textOutput).toContain('DEV-SERVER RUNTIME / COMPILE ERROR');
        expect(textOutput).toContain('Watching for changes...');
    });
});

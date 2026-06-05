import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, KeyEvent } from '@termuijs/core';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('TextArea', () => {
    it('initial render shows placeholder when empty and unfocused', async () => {
        const { TextArea } = await import('./TextArea.js');
        const textarea = new TextArea({}, { placeholder: 'Write your message...' });
        textarea.updateRect({ x: 0, y: 0, width: 25, height: 4 });
        
        const screen = new Screen(25, 4);
        textarea.render(screen);

        const renderedRow = screen.back[1].map((c: any) => c.char).join('');
        expect(renderedRow).toContain('Write your message');
    });

    it('typing text updates the value and renders correctly', async () => {
        const { TextArea } = await import('./TextArea.js');
        let val = '';
        const textarea = new TextArea({}, { onChange: (v) => { val = v; } });
        textarea.isFocused = true;
        textarea.updateRect({ x: 0, y: 0, width: 20, height: 4 });
        
        textarea.handleKey({ key: 'h' } as KeyEvent);
        textarea.handleKey({ key: 'i' } as KeyEvent);

        expect(textarea.value).toBe('hi');
        expect(val).toBe('hi');

        const screen = new Screen(20, 4);
        textarea.render(screen);
        const renderedRow = screen.back[1].map((c: any) => c.char).join('');
        expect(renderedRow).toContain('hi');
    });

    it('Enter key adds a newline at the cursor position', async () => {
        const { TextArea } = await import('./TextArea.js');
        const textarea = new TextArea();
        textarea.isFocused = true;
        
        textarea.handleKey({ key: 'a' } as KeyEvent);
        textarea.handleKey({ key: 'enter' } as KeyEvent);
        textarea.handleKey({ key: 'b' } as KeyEvent);

        expect(textarea.value).toBe('a\nb');
    });

    it('cursor moves with up/down/left/right arrow keys', async () => {
        const { TextArea } = await import('./TextArea.js');
        const textarea = new TextArea();
        textarea.isFocused = true;

        textarea.handleKey({ key: '1' } as KeyEvent);
        textarea.handleKey({ key: 'enter' } as KeyEvent);
        textarea.handleKey({ key: '2' } as KeyEvent);
        // lines are now: "1", "2"
        // cursor is at { row: 1, col: 1 }

        textarea.handleKey({ key: 'up' } as KeyEvent);
        // cursor is at { row: 0, col: 1 }
        textarea.handleKey({ key: 'left' } as KeyEvent);
        // cursor is at { row: 0, col: 0 }
        textarea.handleKey({ key: 'x' } as KeyEvent);

        expect(textarea.value).toBe('x1\n2');

        textarea.handleKey({ key: 'down' } as KeyEvent);
        textarea.handleKey({ key: 'right' } as KeyEvent);
        textarea.handleKey({ key: 'y' } as KeyEvent);

        expect(textarea.value).toBe('x1\n2y');
    });

    it('Ctrl+Enter fires onSubmit', async () => {
        const { TextArea } = await import('./TextArea.js');
        let submitted = '';
        const textarea = new TextArea({}, { onSubmit: (v) => { submitted = v; } });
        textarea.isFocused = true;
        
        textarea.handleKey({ key: 't' } as KeyEvent);
        textarea.handleKey({ key: 'e' } as KeyEvent);
        textarea.handleKey({ key: 's' } as KeyEvent);
        textarea.handleKey({ key: 't' } as KeyEvent);

        // Submit via Ctrl+Enter
        textarea.handleKey({ key: 'enter', ctrl: true } as KeyEvent);

        expect(submitted).toBe('test');
    });
});

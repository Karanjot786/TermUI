import { Screen } from './terminal/Screen.js';
import { createInlineViewport, renderInlineToTerminal } from './inline-viewport.js';

// Fake terminal to capture writes
class FakeTerminal {
    public out = '';
    write(s: string) { this.out += s; }
}

test('createInlineViewport returns rows', () => {
    const v = createInlineViewport({ rows: 3 });
    expect(v.rows).toBe(3);
});

test('renderInlineToTerminal writes last N rows', () => {
    const screen = new Screen(5, 4);
    screen.writeString(0, 0, 'row0');
    screen.writeString(0, 1, 'row1');
    screen.writeString(0, 2, 'row2');
    screen.writeString(0, 3, 'row3');

    const term = new FakeTerminal();
    renderInlineToTerminal(term as unknown as import('./terminal/Terminal.js').Terminal, screen, 2);
    expect(term.out).toContain('row2');
    expect(term.out).toContain('row3');
    expect(term.out).not.toContain('row1');
});

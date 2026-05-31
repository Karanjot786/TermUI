import { createTestScreen, testScreenSetString, testScreenToString } from './terminal/TestBackend.js';
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
    const screen = createTestScreen(5, 4);
    testScreenSetString(screen, 0, 0, 'row0');
    testScreenSetString(screen, 0, 1, 'row1');
    testScreenSetString(screen, 0, 2, 'row2');
    testScreenSetString(screen, 0, 3, 'row3');

    const term = new FakeTerminal();
    // @ts-ignore: adapt to TestScreen shape
    renderInlineToTerminal(term as any, screen as any, 2);
    expect(term.out).toContain('row2');
    expect(term.out).toContain('row3');
    expect(term.out).not.toContain('row1');
});

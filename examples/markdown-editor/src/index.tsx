import { App, caps } from '@termuijs/core';
import { Box, Card, Columns, Markdown, Text } from '@termuijs/widgets';
import { MultilineTextInput } from '@termuijs/ui';

// ── Helpers ──────────────────────────────────────────────
const dot = caps.unicode ? '•' : '*';
const pen = caps.unicode ? '✎' : '>';
const eye = caps.unicode ? '◉' : 'o';

function countStats(value: string): { lines: number; words: number; chars: number } {
    const lines = value === '' ? 0 : value.split('\n').length;
    const words = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;
    const chars = value.length;
    return { lines, words, chars };
}

// ── Initial Content ──────────────────────────────────────
const defaultContent = `# Markdown Editor

Type markdown on the left.

## Features

- Live preview
- Headings
- Lists
- Code blocks
`;

// ── Footer / Status Bar ──────────────────────────────────
const initialStats = countStats(defaultContent);

const statusLeft = new Text(
    `  ${dot} q quit  ${dot} Ctrl+C exit`,
    {
        fg: { type: 'named', name: 'brightBlack' },
        height: 1,
    },
);

const statusRight = new Text(
    `Ln ${initialStats.lines}  ${dot}  Words ${initialStats.words}  ${dot}  Ch ${initialStats.chars}  `,
    {
        fg: { type: 'named', name: 'brightBlack' },
        height: 1,
    },
    { align: 'right' },
);

const statusBar = new Columns({ height: 1 }, { gap: 0 });
statusBar.addChild(statusLeft);
statusBar.addChild(statusRight);

// ── Preview Widget ───────────────────────────────────────
const markdown = new Markdown({
    content: defaultContent,
});

// ── Editor Widget ────────────────────────────────────────
const editor = new MultilineTextInput(
    {
        flexGrow: 1,
    },
    {
        onChange: (value) => {
            markdown.setContent(value);
            const stats = countStats(value);
            statusRight.setContent(
                `Ln ${stats.lines}  ${dot}  Words ${stats.words}  ${dot}  Ch ${stats.chars}  `,
            );
        },
    },
);

editor.value = markdown.getContent();

// ── Panel Cards ──────────────────────────────────────────
const editorCard = new Card(
    {
        flexGrow: 1,
        borderColor: { type: 'named', name: 'cyan' },
    },
    { title: `${pen} EDITOR`, borderColor: { type: 'named', name: 'cyan' } },
);
editorCard.addChild(editor);

const previewCard = new Card(
    {
        flexGrow: 1,
        borderColor: { type: 'named', name: 'brightBlack' },
    },
    { title: `${eye} PREVIEW`, borderColor: { type: 'named', name: 'brightBlack' } },
);
previewCard.addChild(markdown);

// ── Main Layout ──────────────────────────────────────────
const contentRow = new Columns({ flexGrow: 1 }, { gap: 0 });
contentRow.addChild(editorCard);
contentRow.addChild(previewCard);

const root = new Box({
    flexDirection: 'column',
    width: '100%',
    height: '100%',
});

root.addChild(contentRow);
root.addChild(statusBar);

// ── App ──────────────────────────────────────────────────
const app = new App(root, {
    fullscreen: true,
    title: 'Markdown Editor',
    fps: 30,
});

app.events.on('key', (event) => {
    if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
        app.exit(0);
        return;
    }

    editor.handleKey(event);
    app.requestRender();
});

const exitCode = await app.mount();
process.exit(exitCode);
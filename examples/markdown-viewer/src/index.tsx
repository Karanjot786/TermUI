import { App, wordWrap, type KeyEvent } from '@termuijs/core';
import { Text, Widget, Markdown, ScrollView } from '@termuijs/widgets';
import { readFileSync } from 'node:fs';

// ── Sample markdown used when no file path is provided ───────────
const SAMPLE_MARKDOWN = `# TermUI Markdown Viewer

Welcome to the **TermUI Markdown Viewer** — a scrollable terminal markdown reader.

## Features

- **Scrollable** content with keyboard navigation
- Renders _headings_, **bold**, _italic_, and \`inline code\`
- Supports unordered and ordered lists
- Code fence rendering with language labels

## Getting Started

1. Install dependencies with \`bun install\`
2. Run the viewer with \`bun start\`
3. Pass a markdown file as an argument: \`bun start ./README.md\`

## Example Code

\`\`\`typescript
import { App } from '@termuijs/core';
import { Markdown } from '@termuijs/widgets';

const md = new Markdown({ content: '# Hello World' });
const app = new App(md, { fullscreen: true });
await app.mount();
\`\`\`

## Keyboard Controls

- **Up / Down** — Scroll one line
- **Page Up / Page Down** — Scroll one page
- **Home** — Jump to top
- **End** — Jump to bottom
- **q / Ctrl+C** — Exit

## About TermUI

TermUI is a _TypeScript-first_ framework for building beautiful, interactive terminal user interfaces.

It provides a rich set of widgets including:

- Text and Box layout primitives
- Forms, tables, and lists
- Charts and data visualization
- Scrollable views and modals
- Markdown rendering

### Philosophy

> Build for the terminal the way you build for the web.

TermUI brings modern UI patterns — component trees, styling, layout engines — to the terminal, so you can create **polished CLI tools** without sacrificing developer experience.

## License

MIT — see LICENSE for details.
`;

// ── Load markdown content ────────────────────────────────────────
function loadMarkdown(): string {
    const filePath = process.argv[2];
    if (filePath) {
        try {
            return readFileSync(filePath, 'utf-8');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`Error reading file "${filePath}": ${message}`);
            process.exit(1);
        }
    }
    return SAMPLE_MARKDOWN;
}

// ── Application widget ──────────────────────────────────────────
class MarkdownViewerApp extends Widget {
    private scrollView: ScrollView;
    private markdownWidget: Markdown;
    private statusText: Text;
    private filePath: string;
    private content: string;
    private lastHeight = 0;
    private lastWidth = 0;

    /** Compute the rendered row count, mirroring Markdown._renderSelf logic. */
    private static computeContentHeight(content: string, width: number): number {
        const lines = content.split('\n');
        let rows = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('```')) {
                // code block: header + footer + body lines
                i++;
                let codeLines = 0;
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeLines++;
                    i++;
                }
                rows += codeLines + 2; // top border + body + bottom border
            } else if (line.startsWith('# ') || line.startsWith('- ') || /^\d+\.\s/.test(line)) {
                rows++;
            } else {
                // paragraph / normal text — may wrap
                const wrapped = wordWrap(line, width);
                rows += wrapped.split('\n').length;
            }
        }
        return Math.max(rows + 2, 10); // small safety margin
    }

    constructor(content: string, filePath: string) {
        super({ flexDirection: 'column', padding: 1, gap: 0 });
        this.filePath = filePath;
        this.content = content;

        // ── Title bar ────────────────────────────────────────
        const titleLabel = filePath
            ? ` 📄 Markdown Viewer — ${filePath} `
            : ' 📄 Markdown Viewer — (sample) ';

        const title = new Text(titleLabel, {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            height: 1,
        });

        // ── Markdown inside a ScrollView ─────────────────────
        // Use a generous initial height; syncLayout() will recalculate properly
        // once the terminal dimensions are known.
        const initialHeight = MarkdownViewerApp.computeContentHeight(content, 80);
        this.markdownWidget = new Markdown(
            { content },
            { height: initialHeight }
        );

        this.scrollView = new ScrollView(
            { border: 'single', flexGrow: 1 },
            { contentHeight: initialHeight, showScrollbar: true }
        );
        this.scrollView.addChild(this.markdownWidget);

        // ── Status / footer bar ──────────────────────────────
        this.statusText = new Text(
            ' [↑/↓] Scroll  [PgUp/PgDn] Page  [Home/End] Jump  [q] Quit',
            { dim: true, height: 1 }
        );

        this.addChild(title);
        this.addChild(this.scrollView);
        this.addChild(this.statusText);
    }

    override syncLayout(): void {
        super.syncLayout();
        const currentHeight = this.scrollView.rect.height;
        const currentWidth = this.scrollView.rect.width;

        // Recompute contentHeight whenever the viewport size changes (height or
        // width), since Markdown wraps based on width.
        if (currentHeight !== this.lastHeight || currentWidth !== this.lastWidth) {
            this.lastHeight = currentHeight;
            this.lastWidth = currentWidth;

            const innerWidth = Math.max(1, currentWidth - 2); // subtract border
            const newContentHeight = MarkdownViewerApp.computeContentHeight(
                this.content,
                innerWidth
            );

            this.markdownWidget.setStyle({ height: newContentHeight });
            this.scrollView.setContentHeight(newContentHeight);
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): boolean {
        // Exit
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        // Scrolling
        if (event.key === 'up') {
            this.scrollView.scrollBy(-1);
        } else if (event.key === 'down') {
            this.scrollView.scrollBy(1);
        } else if (event.key === 'pageup') {
            this.scrollView.scrollBy(-Math.max(1, this.scrollView.rect.height - 1));
        } else if (event.key === 'pagedown') {
            this.scrollView.scrollBy(Math.max(1, this.scrollView.rect.height - 1));
        } else if (event.key === 'home') {
            this.scrollView.scrollTo(0);
        } else if (event.key === 'end') {
            // Scroll to the very bottom
            this.scrollView.scrollTo(Infinity);
        }

        return true;
    }

    protected _renderSelf(): void {}
}

// ── Main entry point ─────────────────────────────────────────────
async function main() {
    const content = loadMarkdown();
    const filePath = process.argv[2] || '';

    const viewerApp = new MarkdownViewerApp(content, filePath);

    const app = new App(viewerApp, {
        fullscreen: true,
        title: 'Markdown Viewer',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = viewerApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});

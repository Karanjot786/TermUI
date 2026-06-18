import { App } from '@termuijs/core';
import { Columns, Markdown } from '@termuijs/widgets';
import { MultilineTextInput } from '@termuijs/ui';

const markdown = new Markdown({
    content: `# Markdown Editor

Type markdown on the left.

## Features

- Live preview
- Headings
- Lists
- Code blocks
`
});

const editor = new MultilineTextInput(
    {
        border: 'single',
        flexGrow: 1,
    },
    {
        onChange: (value) => {
            markdown.setContent(value);
        },
    },
);

editor.value = markdown.getContent();

const columns = new Columns();

columns.addChild(editor);
columns.addChild(markdown);

const app = new App(columns, {
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
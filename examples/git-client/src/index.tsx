import { App, type KeyEvent } from '@termuijs/core';
import {
    Box,
    Text,
    Widget,
    List,
    DiffView,
    type ListItem,
    type DiffLine,
} from '@termuijs/widgets';

class GitClientExample extends Widget {
    private fileList: List;
    private statusText: Text;

    constructor() {
        super({
            flexDirection: 'column',
            padding: 1,
            gap: 1,
        });

        const title = new Text(' Git Client Example ', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'cyan' },
        });

        const files: ListItem[] = [
            { label: 'src/index.tsx', value: 'index' },
            { label: 'src/App.tsx', value: 'app' },
            { label: 'README.md', value: 'readme' },
            { label: 'package.json', value: 'package' },
        ];

        const diffLines: DiffLine[] = [
            {
                type: 'context',
                content: 'function App() {',
                lineNo: 1,
            },
            {
                type: 'remove',
                content: 'console.log("old version");',
                lineNo: 2,
            },
            {
                type: 'add',
                content: 'console.log("new version");',
                lineNo: 2,
            },
            {
                type: 'context',
                content: '}',
                lineNo: 3,
            },
        ];

        const contentRow = new Box({
            flexDirection: 'row',
            gap: 2,
            flexGrow: 1,
        });

        const leftPanel = new Box({
            flexDirection: 'column',
            width: 40,
        });

        leftPanel.addChild(
            new Text(' Staged Files ', {
                bold: true,
            }),
        );

        this.fileList = new List(files, { flexGrow: 2});

        leftPanel.addChild(this.fileList);

        const rightPanel = new Box({
            flexDirection: 'column',
            flexGrow: 1,
            border: 'single',
        });

        rightPanel.addChild(
            new Text(' Diff Preview ', {
                bold: true,
            }),
        );

        const diffView = new DiffView({
            lines: diffLines,
        }, { flexGrow: 1 });

        rightPanel.addChild(diffView);

        contentRow.addChild(leftPanel);
        contentRow.addChild(rightPanel);

        const commitBox = new Box({
            flexDirection: 'column',
            border: 'single',
            height: 7,
        });

        commitBox.addChild(
            new Text('Commit Message ', {
                bold: true,
                height:1
            }),
        );

        commitBox.addChild(
            new Text('feat: initial git-client example',{height:2}),
        );

        this.statusText = new Text(
            'Controls: ↑ ↓ navigate | Enter select | q quit',
            {
                dim: true,
                height: 1,
            },
        );

        this.addChild(title);
        this.addChild(contentRow);
        this.addChild(commitBox);
        this.addChild(this.statusText);

        this.fileList.isFocused = true;
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        if (event.key === 'up') {
            this.fileList.selectPrev();
            return true;
        }

        if (event.key === 'down') {
            this.fileList.selectNext();
            return true;
        }

        if (event.key === 'enter') {
            const item = this.fileList.selectedItem;

            if (item) {
                this.statusText.setContent(
                    `Selected: ${item.label}  |  Press q to quit`,
                );
            }

            return true;
        }

        return true;
    }

    protected _renderSelf(): void {}
}

async function main() {
    const exampleApp = new GitClientExample();

    const app = new App(exampleApp, {
        fullscreen: true,
        title: 'Git Client Example',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = exampleApp.handleKey(event);

        if (!shouldContinue) {
            app.exit(0);
        }

        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
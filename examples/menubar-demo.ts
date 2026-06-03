// ─────────────────────────────────────────────────────
// TermUI MenuBar Widget Demo
// ─────────────────────────────────────────────────────
// Run with: bun examples/menubar-demo.ts

import { App } from '../packages/core/src/index.js';
import { Box, Text, Widget } from '../packages/widgets/src/index.js';
import { MenuBar } from '../packages/ui/src/index.js';
import type { Screen, KeyEvent } from '../packages/core/src/index.js';

class MenuBarDemoApp extends Widget {
    private _menuBar: MenuBar;
    private _infoText: Text;
    private _statusBar: Text;

    constructor(onExit: () => void) {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Status text update function
        const setStatus = (msg: string) => {
            this._infoText.setContent(`Last action: ${msg}`);
            this.markDirty();
        };

        // Initialize MenuBar
        this._menuBar = new MenuBar([
            {
                label: 'File',
                items: [
                    { label: 'New File', action: () => setStatus('New File Created') },
                    { label: 'Open File (disabled)', disabled: true },
                    { label: 'Save File', action: () => setStatus('File Saved Successfully') },
                    { label: 'Exit Demo', action: onExit },
                ]
            },
            {
                label: 'Edit',
                items: [
                    { label: 'Cut', action: () => setStatus('Text Cut') },
                    { label: 'Copy', action: () => setStatus('Text Copied to Clipboard') },
                    { label: 'Paste', action: () => setStatus('Text Pasted') },
                ]
            },
            {
                label: 'Help',
                items: [
                    { label: 'Documentation', action: () => setStatus('Opening Docs...') },
                    { label: 'About MenuBar', action: () => setStatus('MenuBar Widget v1.0.0') },
                ]
            }
        ]);

        // Main content area
        const contentBox = new Box({
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            border: 'single',
            borderColor: { type: 'named', name: 'brightBlack' }
        });

        this._infoText = new Text('Welcome! Navigate the MenuBar above.', {
            bold: true,
            fg: { type: 'named', name: 'green' }
        });

        contentBox.addChild(new Text('TermUI MenuBar Demo', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            marginBottom: 1
        }));
        contentBox.addChild(this._infoText);
        contentBox.addChild(new Text('\nUse Left/Right to change menu • Enter to open/confirm • Up/Down to navigate • Esc to close dropdown', {
            fg: { type: 'named', name: 'brightBlack' },
            marginTop: 1
        }));

        // Status/instructions bar
        this._statusBar = new Text(' Press Q or choose File > Exit Demo to quit.', {
            height: 1,
            fg: { type: 'named', name: 'brightBlack' }
        });

        // Assemble widget structure
        this.addChild(this._menuBar);
        this.addChild(contentBox);
        this.addChild(this._statusBar);
    }

    handleKey(event: KeyEvent): boolean {
        // Forward keys to MenuBar first
        this._menuBar.handleKey(event);
        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Layout managed by flexbox children
    }
}

async function main() {
    let appInstance: App | null = null;
    const exitDemo = () => {
        if (appInstance) appInstance.exit(0);
    };

    const demo = new MenuBarDemoApp(exitDemo);
    appInstance = new App(demo, {
        fullscreen: true,
        title: 'TermUI MenuBar Demo',
        fps: 30,
    });

    appInstance.events.on('key', (event) => {
        if (event.key.toLowerCase() === 'q' && !demo.isOpen) {
            exitDemo();
            return;
        }
        demo.handleKey(event);
        appInstance?.requestRender();
    });

    const exitCode = await appInstance.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Demo error:', err);
    process.exit(1);
});

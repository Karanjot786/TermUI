// ─────────────────────────────────────────────────────
// MultilineTextInput Demo Tab
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { MultilineTextInput } from '@termuijs/ui';
import type { Screen, KeyEvent } from '@termuijs/core';

export class MultilineTab extends Widget {
    private _editor: MultilineTextInput;
    private _statusLine: Text;
    private _preview: Text;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // ── Header ─────────────────────────────────────
        const header = new Text('MultilineTextInput — Multi-line text editing widget', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'cyan' },
        });

        const hint = new Text(
            '  Arrows move cursor  •  Enter inserts newline  •  Backspace/Delete edit text',
            { height: 1, fg: { type: 'named', name: 'yellow' } },
        );

        // ── Editor ─────────────────────────────────────
        const editorLabel = new Text(' Editor (type freely below):', {
            height: 1, bold: true, fg: { type: 'named', name: 'green' },
        });

        this._editor = new MultilineTextInput(
            { border: 'single', height: 10, flexGrow: 0 },
            {
                onChange: (value) => this._onContentChange(value),
            },
        );

        // Pre-fill with some text so the widget isn't blank on first open
        this._editor.value = 'Hello, TermUI!\nThis is the MultilineTextInput widget.\nTry editing this text with arrow keys and Enter.';

        // ── Status line ────────────────────────────────
        this._statusLine = new Text('', {
            height: 1,
            fg: { type: 'named', name: 'brightBlack' },
        });
        this._updateStatus(this._editor.value);

        // ── Live preview ───────────────────────────────
        const previewLabel = new Text(' Live value (raw string with \\n):', {
            height: 1, bold: true, fg: { type: 'named', name: 'magenta' },
        });

        this._preview = new Text('', {
            border: 'single',
            height: 6,
            fg: { type: 'named', name: 'brightWhite' },
            wrap: true,
        });
        this._updatePreview(this._editor.value);

        // ── Build tree ─────────────────────────────────
        this.addChild(header);
        this.addChild(hint);
        this.addChild(editorLabel);
        this.addChild(this._editor);
        this.addChild(this._statusLine);
        this.addChild(previewLabel);
        this.addChild(this._preview);
    }

    handleKey(event: KeyEvent): void {
        this._editor.handleKey(event);
    }

    private _onContentChange(value: string): void {
        this._updateStatus(value);
        this._updatePreview(value);
    }

    private _updateStatus(value: string): void {
        const lines = value.split('\n').length;
        const chars = value.length;
        this._statusLine.setContent(
            `  Lines: ${lines}  •  Characters: ${chars}`,
        );
    }

    private _updatePreview(value: string): void {
        // Show the raw string so the user can see the \n characters
        this._preview.setContent(JSON.stringify(value));
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

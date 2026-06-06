// ─────────────────────────────────────────────────────
// Feedback Tab — MultiProgress, CommandPalette
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { MultiProgress, CommandPalette, Spinner } from '@termuijs/widgets';
import type { Command } from '@termuijs/widgets';
import type { Screen } from '@termuijs/core';

// ── Commands list ─────────────────────────────────────

const COMMANDS: Command[] = [
    { id: 'new-file',  label: 'New File',  description: 'Create a new file',            action: () => {} },
    { id: 'save',      label: 'Save',      description: 'Save current file  Ctrl+S',    action: () => {} },
    { id: 'find',      label: 'Find',      description: 'Find in file  Ctrl+F',         action: () => {} },
    { id: 'replace',   label: 'Replace',   description: 'Find and replace',             action: () => {} },
    { id: 'terminal',  label: 'Terminal',  description: 'Open integrated terminal',     action: () => {} },
    { id: 'settings',  label: 'Settings',  description: 'Open settings',                action: () => {} },
    { id: 'theme',     label: 'Theme',     description: 'Change color theme',           action: () => {} },
    { id: 'quit',      label: 'Quit',      description: 'Exit application',             action: () => {} },
];

// ── FeedbackTab ───────────────────────────────────────

export class FeedbackTab extends Widget {
    private _multiProgress: MultiProgress;
    private _cmdPalette: CommandPalette;
    private _progressInterval: ReturnType<typeof setInterval>;
    private _tick = 0;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Header
        const header = new Text('Feedback Tab — MultiProgress  |  CommandPalette', {
            bold: true,
            fg: { type: 'named', name: 'magenta' },
            height: 1,
        });

        // Hint
        const hint = new Text(
            '  Type to filter commands  •  Up/Down to navigate  •  Enter to select',
            { height: 1, fg: { type: 'named', name: 'yellow' } },
        );

        // ── MultiProgress ──────────────────────────────
        const progressLabel = new Text(' MultiProgress — Animated build pipeline:', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        this._multiProgress = new MultiProgress(
            {
                items: [
                    { label: 'TypeScript', value: 0, color: { type: 'named', name: 'cyan' } },
                    { label: 'Tests',      value: 0, color: { type: 'named', name: 'green' } },
                    { label: 'Bundle',     value: 0, color: { type: 'named', name: 'yellow' } },
                    { label: 'Deploy',     value: 0, color: { type: 'named', name: 'magenta' } },
                ],
                labelWidth: 12,
                showValues: true,
            },
            { border: 'single', height: 8 },
        );

        // Animate progress values
        this._progressInterval = setInterval(() => {
            this._tick++;
            this._multiProgress.updateItem(0, Math.min(1, this._tick / 60));
            this._multiProgress.updateItem(1, Math.min(1, this._tick / 80));
            this._multiProgress.updateItem(2, Math.min(1, this._tick / 100));
            this._multiProgress.updateItem(3, Math.min(1, this._tick / 120));
        }, 100);

        // ── CommandPalette ─────────────────────────────
        const paletteLabel = new Text(' CommandPalette — Fuzzy search (type to filter):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        this._cmdPalette = new CommandPalette(
            { commands: COMMANDS, maxVisible: 6 },
            { border: 'single', flexGrow: 1 },
        );
        this._cmdPalette.open();
                // ── Spinner Demos ──────────────────────────────
        const spinnerLabel = new Text(' Spinner — Loading indicators (dots, line, pulse):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        const spinnerRow = new Box({ flexDirection: 'row', height: 1, gap: 4 });
        const spinnerDots = new Spinner({}, { preset: 'dots', label: 'dots' });
        const spinnerLine = new Spinner({}, { preset: 'line', label: 'line' });
        const spinnerPulse = new Spinner({}, { preset: 'pulse', label: 'pulse' });
        spinnerRow.addChild(spinnerDots);
        spinnerRow.addChild(spinnerLine);
        spinnerRow.addChild(spinnerPulse);

        // Build widget tree
        this.addChild(header);
        this.addChild(hint);
        this.addChild(progressLabel);
        this.addChild(this._multiProgress);
        this.addChild(paletteLabel);
        this.addChild(this._cmdPalette);
        this.addChild(spinnerLabel);
        this.addChild(spinnerRow);
    }

    handleKey(key: string): void {
        // Forward all keys to CommandPalette
        this._cmdPalette.handleKey(this._mapKey(key));
    }

    private _mapKey(key: string): string {
        switch (key) {
            case 'up':        return 'ArrowUp';
            case 'down':      return 'ArrowDown';
            case 'enter':     return 'Enter';
            case 'escape':    return 'Escape';
            case 'backspace': return 'Backspace';
            default:          return key;
        }
    }

    cleanup(): void {
        clearInterval(this._progressInterval);
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

// ─────────────────────────────────────────────────────
// Environment Tab — Capability flags, theme tokens, VirtualList
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { VirtualList } from '@termuijs/widgets';
import { caps } from '@termuijs/core';
import { systemTheme, defaultDark, defaultLight } from '@termuijs/tss';
import type { Screen } from '@termuijs/core';

// ── EnvTab ────────────────────────────────────────────

export class EnvTab extends Widget {
    private _virtualList: VirtualList;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Header
        const header = new Text('Environment Tab — Caps Flags  |  Theme Tokens  |  VirtualList (1000 items)', {
            bold: true,
            fg: { type: 'named', name: 'yellow' },
            height: 1,
        });

        const hint = new Text(
            '  Up/Down navigate VirtualList  •  PageUp/PageDown fast scroll',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        // ── Two column layout ──────────────────────────
        const topRow = new Box({ flexDirection: 'row', gap: 1, height: 12 });

        // ── Left: Capability flags ─────────────────────
        const capsBox = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'cyan' },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });
        capsBox.addChild(new Text('Terminal Capability Flags', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        }));

        const capsFlags = [
            { label: 'unicode',      value: caps.unicode },
            { label: 'color',        value: caps.color },
            { label: 'motion',       value: caps.motion },
            { label: 'ci',           value: caps.ci },
        ];

        for (const flag of capsFlags) {
            const val = flag.value;
            capsBox.addChild(new Text(
                `  ${flag.label.padEnd(14)} ${val ? 'YES' : 'NO'}`,
                {
                    height: 1,
                    fg: val
                        ? { type: 'named', name: 'green' }
                        : { type: 'named', name: 'brightBlack' },
                    bold: val,
                },
            ));
        }

        // ── Right: Theme tokens ────────────────────────
        const themeBox = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'magenta' },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });

        const isDark = systemTheme === defaultDark;
        const modeLabel = isDark ? 'dark' : 'light';
        const theme = isDark ? defaultDark : defaultLight;

        themeBox.addChild(new Text(`System Theme Tokens  [${modeLabel}]`, {
            height: 1, bold: true, fg: { type: 'named', name: 'magenta' },
        }));

        const tokenKeys: Array<keyof typeof theme> = [
            'bg', 'fg', 'primary', 'secondary', 'success', 'warning', 'error', 'muted',
        ];
        for (const key of tokenKeys) {
            themeBox.addChild(new Text(
                `  ${key.padEnd(12)} ${theme[key]}`,
                { height: 1, fg: { type: 'named', name: 'white' } },
            ));
        }

        topRow.addChild(capsBox);
        topRow.addChild(themeBox);

        // ── VirtualList: 1000 items ────────────────────
        const listLabel = new Text(' VirtualList — 1000 virtual items (computeRange performance test):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        this._virtualList = new VirtualList({
            totalItems: 1000,
            itemHeight: 1,
            renderItem: (i) => `Item #${i.toString().padStart(4, '0')} — virtual scroll test`,
            onSelect: (_i) => { /* ignore */ },
        });

        // Override the border style set by VirtualList constructor
        // to let it flexGrow
        this._virtualList.setStyle({ flexGrow: 1, height: 12 });

        // Build widget tree
        this.addChild(header);
        this.addChild(hint);
        this.addChild(topRow);
        this.addChild(listLabel);
        this.addChild(this._virtualList);
    }

    handleKey(key: string): void {
        switch (key) {
            case 'up':
                this._virtualList.selectPrev();
                break;
            case 'down':
                this._virtualList.selectNext();
                break;
            case 'pageup':
                this._virtualList.pageUp();
                break;
            case 'pagedown':
                this._virtualList.pageDown();
                break;
            case 'home':
                this._virtualList.selectFirst();
                break;
            case 'end':
                this._virtualList.selectLast();
                break;
            case 'enter':
                this._virtualList.confirm();
                break;
        }
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

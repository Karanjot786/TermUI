// ─────────────────────────────────────────────────────
// Theming Tab — Live theme switching with TSS preview
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { Divider } from '@termuijs/ui';
import { ThemeEngine, getAllBuiltinThemes, getBuiltinThemeNames, draculaTheme, nordTheme, tokensToTSS } from '@termuijs/tss';
import { type Screen, styleToCellAttrs } from '@termuijs/core';

const THEME_NAMES = getBuiltinThemeNames();

export class ThemingTab extends Widget {
    private _engine: ThemeEngine;
    private _currentThemeIndex = 0;
    private _previewBoxes: Text[] = [];

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1, gap: 1 });

        this._engine = new ThemeEngine();
        this._engine.loadAll([getAllBuiltinThemes()]);

        const header = new Text('🎨 Theming — Terminal Style Sheets (.tss)', {
            bold: true, fg: { type: 'named', name: 'yellow' }, height: 1,
        });

        const mainRow = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // ── Left: Theme list ──
        const leftPanel = new Box({ border: 'round', borderColor: { type: 'named', name: 'yellow' }, flexGrow: 1, padding: 1, flexDirection: 'column', gap: 0 });
        leftPanel.addChild(new Text('Available Themes', { height: 1, bold: true, fg: { type: 'named', name: 'yellow' } }));
        leftPanel.addChild(new Divider({ color: { type: 'named', name: 'brightBlack' } }));

        for (let i = 0; i < THEME_NAMES.length; i++) {
            const name = THEME_NAMES[i];
            const icon = i === 0 ? '▸' : ' ';
            const t = new Text(`${icon} ${name.charAt(0).toUpperCase() + name.slice(1)}`, {
                height: 1,
                fg: i === 0 ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'white' },
                bold: i === 0,
            });
            this._previewBoxes.push(t);
            leftPanel.addChild(t);
        }

        // ── Right: Color palette preview ──
        const rightPanel = new Box({ border: 'single', borderColor: { type: 'named', name: 'green' }, flexGrow: 2, padding: 1, flexDirection: 'column', gap: 1 });
        rightPanel.addChild(new Text('Color Palette', { height: 1, bold: true, fg: { type: 'named', name: 'green' } }));

        // Variable display rows
        const vars = ['--primary', '--secondary', '--accent', '--success', '--warning', '--error', '--text', '--text-muted', '--bg', '--surface'];
        for (const v of vars) {
            rightPanel.addChild(new Text(`  ${v.padEnd(16)} ${'■■■■'}`, { height: 1 }));
        }

        rightPanel.addChild(new Divider({ title: 'TSS Syntax', color: { type: 'named', name: 'brightBlack' } }));
        rightPanel.addChild(new Text('  @theme cyberpunk {', { height: 1, fg: { type: 'named', name: 'cyan' } }));
        rightPanel.addChild(new Text('      --primary: #ff00ff;', { height: 1, fg: { type: 'named', name: 'magenta' } }));
        rightPanel.addChild(new Text('      --accent: #ff6b6b;', { height: 1, fg: { type: 'named', name: 'red' } }));
        rightPanel.addChild(new Text('  }', { height: 1, fg: { type: 'named', name: 'cyan' } }));

        // ── Token bridge: tokensToTSS() preview ──
        rightPanel.addChild(new Divider({ title: 'Token bridge: tokensToTSS()', color: { type: 'named', name: 'brightBlack' } }));
        const draculaTSSPreview = tokensToTSS('dracula', draculaTheme).split('\n').slice(0, 4).join('\n');
        for (const line of draculaTSSPreview.split('\n')) {
            rightPanel.addChild(new Text(`  ${line}`, { height: 1, fg: { type: 'named', name: 'yellow' } }));
        }
        const nordTSSPreview = tokensToTSS('nord', nordTheme).split('\n').slice(1, 3).join('\n');
        for (const line of nordTSSPreview.split('\n')) {
            rightPanel.addChild(new Text(`  ${line}`, { height: 1, fg: { type: 'named', name: 'blue' } }));
        }

        mainRow.addChild(leftPanel);
        mainRow.addChild(rightPanel);

        const helpText = new Text(
            '  t Cycle Theme  •  6 built-in themes  •  Hot-reload via .tss files',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        this.addChild(header);
        this.addChild(mainRow);
        this.addChild(helpText);
    }

    cycleTheme(): string {
        this._currentThemeIndex = (this._currentThemeIndex + 1) % THEME_NAMES.length;
        const name = THEME_NAMES[this._currentThemeIndex];
        this._engine.setTheme(name);

        // Update list highlights
        for (let i = 0; i < this._previewBoxes.length; i++) {
            const active = i === this._currentThemeIndex;
            const label = THEME_NAMES[i];
            this._previewBoxes[i].setContent(`${active ? '▸' : ' '} ${label.charAt(0).toUpperCase() + label.slice(1)}`);
        }

        return name;
    }

    get currentTheme(): string { return THEME_NAMES[this._currentThemeIndex]; }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

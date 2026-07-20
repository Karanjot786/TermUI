// ─────────────────────────────────────────────────────
// TermUI Showcase — Main Entry Point
// ─────────────────────────────────────────────────────
//
// Run with:  npx tsx src/index.ts
//
// Demonstrates all TermUI packages:
//   @termuijs/core      — App lifecycle, Screen, Input
//   @termuijs/widgets   — Box, Text, Table, Gauge, Sparkline
//   @termuijs/ui        — Modal, Select, Tree, Divider, Toast
//   @termuijs/tss       — Theme engine, 6 built-in themes
//   @termuijs/motion    — Spring physics, transitions
//   @termuijs/dev-server — DevTools panel, perf metrics
//
// Controls:
//   1-5       Switch tabs
//   t         Cycle theme
//   Space     Retrigger animations (tab 4)
//   q/Ctrl+C  Quit
//

import { App } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';
import type { Screen, KeyEvent } from '@termuijs/core';
import * as fs from 'node:fs';

import { DashboardTab } from './tabs/dashboard.js';
import { ComponentsTab } from './tabs/components.js';
import { ThemingTab } from './tabs/theming.js';
import { AnimationsTab } from './tabs/animations.js';
import { DevToolsTab } from './tabs/devtools.js';

// ── Tab names ──
const TAB_LABELS = ['📊 Dashboard', '🧩 Components', '🎨 Theming', '🎬 Animations', '🔧 DevTools'];

// ── Root Widget ─────────────────────────────────────

class ShowcaseApp extends Widget {
    private _tabBar: Box;
    private _tabLabels: Text[] = [];
    private _tabPanels: Widget[] = [];
    private _activeTab = 0;
    private _statusBar: Text;
    private _debugBar: Text;
    private _dashboardTab: DashboardTab;
    private _componentsTab: ComponentsTab;
    private _themingTab: ThemingTab;
    private _animationsTab: AnimationsTab;
    private _devtoolsTab: DevToolsTab;

    constructor() {
        super({ flexDirection: 'column' });

        // ── Title bar ──
        const titleBar = new Box({ flexDirection: 'row', height: 1 });
        titleBar.addChild(new Text(' ⚡ TermUI Showcase ', { bold: true, fg: { type: 'named', name: 'cyan' }, height: 1 }));
        titleBar.addChild(new Text('— The React/Next.js of CLI Apps', { height: 1, fg: { type: 'named', name: 'brightBlack' }, italic: true }));

        // ── Tab bar ──
        this._tabBar = new Box({ flexDirection: 'row', height: 1, gap: 0 });
        for (let i = 0; i < TAB_LABELS.length; i++) {
            const active = i === 0;
            const label = new Text(
                active ? ` [${TAB_LABELS[i]}] ` : `  ${TAB_LABELS[i]}  `,
                {
                    height: 1,
                    fg: active ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'brightBlack' },
                    bold: active,
                    underline: active,
                },
            );
            this._tabLabels.push(label);
            this._tabBar.addChild(label);
        }

        // ── Separator ──
        const separator = new Text('─'.repeat(120), { height: 1, fg: { type: 'named', name: 'brightBlack' } });

        // ── Tab panels ──
        this._dashboardTab = new DashboardTab();
        this._componentsTab = new ComponentsTab();
        this._themingTab = new ThemingTab();
        this._animationsTab = new AnimationsTab();
        this._devtoolsTab = new DevToolsTab();

        this._tabPanels = [
            this._dashboardTab,
            this._componentsTab,
            this._themingTab,
            this._animationsTab,
            this._devtoolsTab,
        ];

        // ── Status bar ──
        this._statusBar = new Text(
            '  1-5 Tabs  •  t Theme  •  Space Retrigger  •  q Quit  │  Theme: default',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        // Debug bar
        this._debugBar = new Text(
            '  [DEBUG] Waiting for key input...',
            { height: 1, fg: { type: 'named', name: 'yellow' }, bold: true },
        );

        // Build tree
        this.addChild(titleBar);
        this.addChild(this._tabBar);
        this.addChild(separator);
        this.addChild(this._tabPanels[0]); // Show first tab
        this.addChild(this._statusBar);
        this.addChild(this._debugBar);
    }

    handleKey(event: KeyEvent): boolean {
        const dbg = (msg: string) => {
            fs.appendFileSync('/tmp/termui-debug.log', msg + '\n');
            this._debugBar.setContent(`  [DEBUG] ${msg}`);
        };
        dbg(`key="${event.key}" ctrl=${event.ctrl} tab=${this._activeTab}`);

        // Quit
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) return false;

        // Tab switching: 1-5
        const num = parseInt(event.key);
        if (num >= 1 && num <= 5) {
            dbg(`SWITCH to tab ${num - 1}`);
            this.switchTab(num - 1);
            return true;
        }

        // Theme cycling
        if (event.key === 't') {
            const name = this._themingTab.cycleTheme();
            this._statusBar.setContent(`  1-5 Tabs  •  t Theme  •  Space Retrigger  •  q Quit  │  Theme: ${name}`);
            return true;
        }

        // Forward arrow/space/enter/tab keys to active tab
        const interactiveKeys = ['up', 'down', 'left', 'right', 'enter', 'space', 'tab'];
        if (interactiveKeys.includes(event.key)) {
            dbg(`INTERACTIVE key "${event.key}" on tab=${this._activeTab}`);
            // Components tab handles its own keyboard
            if (this._activeTab === 1) {
                dbg(`-> FORWARD to ComponentsTab.handleKey("${event.key}")`);
                this._componentsTab.handleKey(event.key);
                dbg(`-> ComponentsTab state: ${this._componentsTab.getDebugState()}`);
                return true;
            }
            // Space retriggers animations only on the animations tab
            if (event.key === 'space' && this._activeTab === 3) {
                this._animationsTab.retrigger();
                return true;
            }
        }

        return true;
    }

    switchTab(index: number): void {
        if (index === this._activeTab || index < 0 || index >= this._tabPanels.length) return;

        // Remove current panel (it's at index 3 in children: title, tabbar, separator, PANEL, statusbar)
        this.removeChild(this._tabPanels[this._activeTab]);

        // Update tab bar highlights
        for (let i = 0; i < TAB_LABELS.length; i++) {
            const active = i === index;
            this._tabLabels[i].setContent(active ? ` [${TAB_LABELS[i]}] ` : `  ${TAB_LABELS[i]}  `);
        }

        this._activeTab = index;

        // Insert new panel before status bar and debug bar
        this.removeChild(this._statusBar);
        this.removeChild(this._debugBar);
        this.addChild(this._tabPanels[index]);
        this.addChild(this._statusBar);
        this.addChild(this._debugBar);
    }

    tick(dt: number): void {
        this._dashboardTab.tick(dt);
        this._animationsTab.tick(dt);
        this._devtoolsTab.tick(dt);
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

// ── Main ─────────────────────────────────────────────

async function main() {
    process.stdout.write('\x1b[?25l');
    const showcase = new ShowcaseApp();

    const app = new App(showcase, {
        fullscreen: true,
        title: 'TermUI Showcase',
        fps: 60,
    });

    // Keyboard handler
    app.events.on('key', (event) => {
        const shouldContinue = showcase.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    // Animation loop
    let lastTick = Date.now();
    const tickInterval = setInterval(() => {
        const now = Date.now();
        showcase.tick(now - lastTick);
        lastTick = now;
        app.requestRender();
    }, 16); // ~60fps

    app.terminal.onCleanup(() => clearInterval(tickInterval));

    const exitCode = await app.mount();
    clearInterval(tickInterval);
    process.stdout.write('\x1b[?25h');
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Showcase error:', err);
    process.exit(1);
});

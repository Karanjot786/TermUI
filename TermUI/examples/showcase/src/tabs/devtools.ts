// ─────────────────────────────────────────────────────
// DevTools Tab — Perf metrics, widget tree inspector
// ─────────────────────────────────────────────────────

import { Widget, Box, Text, ProgressBar } from '@termuijs/widgets';
import { Divider } from '@termuijs/ui';
import { DevTools } from '@termuijs/dev-server';
import type { Screen } from '@termuijs/core';

export class DevToolsTab extends Widget {
    private _devtools: DevTools;
    private _renderTimeText: Text;
    private _fpsText: Text;
    private _memText: Text;
    private _widgetCountText: Text;
    private _fpsBar: ProgressBar;
    private _memBar: ProgressBar;
    private _eventLogTexts: Text[] = [];

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1, gap: 1 });

        this._devtools = new DevTools();

        const header = new Text('🔧 DevTools — Performance & Inspection', {
            bold: true, fg: { type: 'named', name: 'red' }, height: 1,
        });

        const mainRow = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // ── Left: Performance metrics ──
        const perfPanel = new Box({ border: 'round', borderColor: { type: 'named', name: 'red' }, flexGrow: 1, padding: 1, flexDirection: 'column', gap: 0 });
        perfPanel.addChild(new Text('⚡ Performance', { height: 1, bold: true, fg: { type: 'named', name: 'red' } }));
        perfPanel.addChild(new Divider({ color: { type: 'named', name: 'brightBlack' } }));

        this._renderTimeText = new Text('  Render:  0.0ms', { height: 1, fg: { type: 'named', name: 'green' } });
        this._fpsText = new Text('  FPS:     0', { height: 1, fg: { type: 'named', name: 'cyan' } });
        this._memText = new Text('  Memory:  0 MB', { height: 1, fg: { type: 'named', name: 'yellow' } });
        this._widgetCountText = new Text('  Widgets: 0', { height: 1, fg: { type: 'named', name: 'magenta' } });

        perfPanel.addChild(this._renderTimeText);
        perfPanel.addChild(this._fpsText);
        perfPanel.addChild(this._memText);
        perfPanel.addChild(this._widgetCountText);

        perfPanel.addChild(new Text('', { height: 1 }));
        perfPanel.addChild(new Text('  FPS', { height: 1, dim: true }));
        this._fpsBar = new ProgressBar({ height: 1 }, { value: 0, fillColor: { type: 'named', name: 'cyan' }, showLabel: false });
        perfPanel.addChild(this._fpsBar);

        perfPanel.addChild(new Text('  Memory', { height: 1, dim: true }));
        this._memBar = new ProgressBar({ height: 1 }, { value: 0, fillColor: { type: 'named', name: 'yellow' }, showLabel: false });
        perfPanel.addChild(this._memBar);

        // ── Right: Event log ──
        const eventPanel = new Box({ border: 'single', borderColor: { type: 'named', name: 'blue' }, flexGrow: 1, padding: 1, flexDirection: 'column' });
        eventPanel.addChild(new Text('📋 Event Log', { height: 1, bold: true, fg: { type: 'named', name: 'blue' } }));
        eventPanel.addChild(new Divider({ color: { type: 'named', name: 'brightBlack' } }));

        for (let i = 0; i < 12; i++) {
            const t = new Text('', { height: 1, fg: { type: 'named', name: 'brightBlack' }, dim: true });
            this._eventLogTexts.push(t);
            eventPanel.addChild(t);
        }

        mainRow.addChild(perfPanel);
        mainRow.addChild(eventPanel);

        const helpText = new Text(
            '  F12 DevTools Panel  •  Widget tree inspector  •  Real-time performance metrics',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        this.addChild(header);
        this.addChild(mainRow);
        this.addChild(helpText);
    }

    tick(_dt: number): void {
        // Simulate render metrics
        const renderTime = 0.5 + Math.random() * 2;
        const fps = 28 + Math.random() * 4;
        const mem = process.memoryUsage().heapUsed / 1024 / 1024;
        const widgetCount = 45 + Math.floor(Math.random() * 5);

        this._devtools.recordRender(renderTime, widgetCount);

        this._renderTimeText.setContent(`  Render:  ${renderTime.toFixed(1)}ms`);
        this._fpsText.setContent(`  FPS:     ${fps.toFixed(0)}`);
        this._memText.setContent(`  Memory:  ${mem.toFixed(1)} MB`);
        this._widgetCountText.setContent(`  Widgets: ${widgetCount}`);
        this._fpsBar.setValue(fps / 60);
        this._memBar.setValue(Math.min(1, mem / 100));

        // Simulate event log
        const time = new Date().toISOString().slice(11, 23);
        const events = ['key:1', 'render', 'tick', 'key:t', 'theme-change', 'resize', 'render', 'focus:tab'];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        this._devtools.logEvent('input', randomEvent);

        // Shift log display
        for (let i = 0; i < this._eventLogTexts.length - 1; i++) {
            // We just show simulated lines
        }
        const idx = Math.floor(Math.random() * this._eventLogTexts.length);
        if (this._eventLogTexts[idx]) {
            this._eventLogTexts[idx].setContent(`  ${time}  [${randomEvent}]`);
        }
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

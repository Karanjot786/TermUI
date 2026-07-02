// ─────────────────────────────────────────────────────
// Dashboard Tab — Gauges, Table, ProgressBar, Spinner
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { Box, Text, ProgressBar, Spinner, Table, Sparkline, StatusIndicator, StatusMessage, StreamingText } from '@termuijs/widgets';
import { type Screen, caps } from '@termuijs/core';

export class DashboardTab extends Widget {
    private _cpuGauge: ProgressBar;
    private _memGauge: ProgressBar;
    private _diskGauge: ProgressBar;
    private _sparkline: Sparkline;
    private _spinner: Spinner;
    private _table: Table;
    private _statusIndicators: StatusIndicator[];
    private _cpuHistory: number[] = [];
    private _progress = 0.3;
    private _statusMsg: StatusMessage;
    private _streamingText: StreamingText;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1, gap: 1 });

        // Header
        const header = new Text('📊 Dashboard — Real-time System Monitor', {
            bold: true, fg: { type: 'named', name: 'cyan' }, height: 1,
        });

        // Gauges row
        const gaugeRow = new Box({ flexDirection: 'row', gap: 2, height: 3 });

        const cpuBox = new Box({ flexDirection: 'column', flexGrow: 1 });
        cpuBox.addChild(new Text('CPU', { height: 1, fg: { type: 'named', name: 'green' }, bold: true }));
        this._cpuGauge = new ProgressBar({ height: 1 }, { value: 0.45, fillColor: { type: 'named', name: 'green' }, showLabel: true });
        cpuBox.addChild(this._cpuGauge);

        const memBox = new Box({ flexDirection: 'column', flexGrow: 1 });
        memBox.addChild(new Text('MEM', { height: 1, fg: { type: 'named', name: 'yellow' }, bold: true }));
        this._memGauge = new ProgressBar({ height: 1 }, { value: 0.62, fillColor: { type: 'named', name: 'yellow' }, showLabel: true });
        memBox.addChild(this._memGauge);

        const diskBox = new Box({ flexDirection: 'column', flexGrow: 1 });
        diskBox.addChild(new Text('DSK', { height: 1, fg: { type: 'named', name: 'magenta' }, bold: true }));
        this._diskGauge = new ProgressBar({ height: 1 }, { value: 0.78, fillColor: { type: 'named', name: 'magenta' }, showLabel: true });
        diskBox.addChild(this._diskGauge);

        gaugeRow.addChild(cpuBox);
        gaugeRow.addChild(memBox);
        gaugeRow.addChild(diskBox);

        // Main content row
        const mainRow = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // Left: sparkline + status
        const leftPanel = new Box({ border: 'round', borderColor: { type: 'named', name: 'blue' }, flexGrow: 1, padding: 1, flexDirection: 'column', gap: 1 });
        leftPanel.addChild(new Text('📈 CPU History', { height: 1, bold: true, fg: { type: 'named', name: 'blue' } }));
        this._sparkline = new Sparkline('', { height: 3, flexGrow: 1 }, { color: { type: 'named', name: 'cyan' } });
        leftPanel.addChild(this._sparkline);

        this._spinner = new Spinner({ height: 1 }, { spinner: 'dots', label: 'Collecting metrics...', color: { type: 'named', name: 'magenta' } });
        leftPanel.addChild(this._spinner);

        // ── StatusMessage widget ──
        this._statusMsg = new StatusMessage(
            'System monitoring active',
            { height: 1 },
            { variant: 'success' },
        );
        leftPanel.addChild(this._statusMsg);

        // ── StreamingText widget ──
        this._streamingText = new StreamingText(
            { text: 'TermUI — Real-time system monitor powered by @termuijs/data', speed: 3 },
            { height: 1, fg: { type: 'named', name: 'cyan' } },
        );
        leftPanel.addChild(this._streamingText);

        this._statusIndicators = [
            new StatusIndicator('API Server', true, { height: 1 }),
            new StatusIndicator('Database', true, { height: 1 }),
            new StatusIndicator('Cache', true, { height: 1 }, { upColor: { type: 'named', name: 'yellow' } }),
            new StatusIndicator('Worker', false, { height: 1 }),
        ];
        for (const si of this._statusIndicators) leftPanel.addChild(si);

        // Right: table
        const rightPanel = new Box({ border: 'single', borderColor: { type: 'named', name: 'green' }, flexGrow: 2, padding: 1 });
        this._table = new Table(
            [
                { header: 'Process', key: 'name', width: 18 },
                { header: 'PID', key: 'pid', width: 8, align: 'right' },
                { header: 'CPU%', key: 'cpu', width: 8, align: 'right' },
                { header: 'MEM%', key: 'mem', width: 8, align: 'right' },
                { header: 'Status', key: 'status', width: 10 },
            ],
            [
                { name: 'node', pid: '1234', cpu: '12.3', mem: '4.2', status: caps.unicode ? '● running' : 'o running' },
                { name: 'postgres', pid: '5678', cpu: '3.1', mem: '8.7', status: caps.unicode ? '● running' : 'o running' },
                { name: 'redis', pid: '9012', cpu: '0.5', mem: '1.1', status: caps.unicode ? '● running' : 'o running' },
                { name: 'nginx', pid: '3456', cpu: '1.2', mem: '0.8', status: caps.unicode ? '● running' : 'o running' },
                { name: 'worker-1', pid: '7890', cpu: '25.4', mem: '12.3', status: caps.unicode ? '● busy' : 'o busy' },
                { name: 'worker-2', pid: '2345', cpu: '0.0', mem: '3.2', status: caps.unicode ? '○ idle' : 'o idle' },
                { name: 'cron', pid: '6789', cpu: '0.1', mem: '0.4', status: caps.unicode ? '● running' : 'o running' },
            ],
            { flexGrow: 1 },
            { stripe: true },
        );
        rightPanel.addChild(this._table);

        mainRow.addChild(leftPanel);
        mainRow.addChild(rightPanel);

        this.addChild(header);
        this.addChild(gaugeRow);
        this.addChild(mainRow);
    }

    tick(dt: number): void {
        if (caps.motion) {
            this._spinner.tick(dt);
        }
        this._streamingText.tick();
        // Simulate CPU history
        const cpuVal = 30 + Math.sin(Date.now() / 2000) * 20 + Math.random() * 10;
        this._cpuHistory.push(cpuVal);
        if (this._cpuHistory.length > 40) this._cpuHistory.shift();
        this._sparkline.setData(this._cpuHistory);
        this._cpuGauge.setValue(cpuVal / 100);
        // Simulate memory
        this._memGauge.setValue(0.55 + Math.sin(Date.now() / 5000) * 0.15);
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

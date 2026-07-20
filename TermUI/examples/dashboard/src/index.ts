// ─────────────────────────────────────────────────────
// TermUI Example — Interactive Dashboard
// ─────────────────────────────────────────────────────
//
// Run with:  npx tsx src/index.ts
//
// Features demonstrated:
// - Box layout with borders and padding
// - Text rendering with alignment
// - ProgressBar with dynamic updates
// - Spinner animation
// - Table with live process data
// - Card layout container with title
// - StatusMessage for status indicators
// - StreamingText for typewriter-style display
// - Real system metrics via @termuijs/data
// - caps guards for unicode/motion capability detection
// - Keyboard input handling (q to quit, r to reset)
// - Graceful CI/pipe fallback
//

import { App, caps } from '@termuijs/core';
import {
    Box,
    Text,
    ProgressBar,
    Spinner,
    Table,
    Widget,
    Card,
    StatusMessage,
    StreamingText,
} from '@termuijs/widgets';
import { cpu, memory, disk, processes } from '@termuijs/data';
import type { Screen, KeyEvent } from '@termuijs/core';

// ── Dashboard Root Widget ────────────────────────────

class Dashboard extends Widget {
    private _title: Text;
    private _container: Box;
    private _statusBar: Text;
    private _cpuBar: ProgressBar;
    private _memBar: ProgressBar;
    private _diskBar: ProgressBar;
    private _spinner: Spinner;
    private _table: Table;
    private _statusMsg: StatusMessage;
    private _streamingText: StreamingText;

    constructor() {
        super({
            flexDirection: 'column',
        });

        // ── Header ──
        this._title = new Text(
            `${caps.unicode ? '⚡' : '*'} TermUI Dashboard`,
            {
                bold: true,
                fg: { type: 'named', name: 'cyan' },
                height: 1,
            },
            { align: 'center' },
        );

        // StreamingText beneath header — typewriter intro message
        this._streamingText = new StreamingText(
            { text: 'Dashboard loaded. Monitoring active.', speed: 4 },
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        // StatusMessage — live metrics indicator
        this._statusMsg = new StatusMessage(
            'Live system metrics',
            { height: 1 },
            { variant: 'info' },
        );

        // ── Main container ──
        this._container = new Box({
            flexDirection: 'row',
            flexGrow: 1,
            gap: 1,
        });

        // ── Left panel: Resources Card wrapping CPU/Memory/Disk gauges ──
        const resourceCard = new Card(
            {
                flexGrow: 1,
                flexDirection: 'column',
                gap: 1,
            },
            {
                title: 'Resources',
                borderColor: { type: 'named', name: 'blue' },
            },
        );

        const cpuLabel = new Text(
            `${caps.unicode ? '▸' : '>'} CPU Usage:`,
            { height: 1, dim: true },
        );

        this._cpuBar = new ProgressBar(
            { height: 1 },
            {
                value: cpu.percent / 100,
                fillColor: { type: 'named', name: 'green' },
                showLabel: true,
            },
        );

        const memLabel = new Text(
            `${caps.unicode ? '▸' : '>'} Memory:`,
            { height: 1, dim: true },
        );

        this._memBar = new ProgressBar(
            { height: 1 },
            {
                value: memory.percent / 100,
                fillColor: { type: 'named', name: 'yellow' },
                showLabel: true,
            },
        );

        const diskLabel = new Text(
            `${caps.unicode ? '▸' : '>'} Disk (/):`,
            { height: 1, dim: true },
        );

        this._diskBar = new ProgressBar(
            { height: 1 },
            {
                value: disk.percent / 100,
                fillColor: { type: 'named', name: 'magenta' },
                showLabel: true,
            },
        );

        this._spinner = new Spinner(
            { height: 1 },
            {
                spinner: 'dots',
                label: 'Refreshing...',
                color: { type: 'named', name: 'cyan' },
            },
        );

        resourceCard.addChild(cpuLabel);
        resourceCard.addChild(this._cpuBar);
        resourceCard.addChild(memLabel);
        resourceCard.addChild(this._memBar);
        resourceCard.addChild(diskLabel);
        resourceCard.addChild(this._diskBar);
        resourceCard.addChild(this._spinner);

        // ── Right panel: Process Table Card ──
        const processCard = new Card(
            {
                flexGrow: 2,
                flexDirection: 'column',
            },
            {
                title: 'Top Processes',
                borderColor: { type: 'named', name: 'green' },
            },
        );

        const topProcs = processes.top(8);
        const tableRows = topProcs.map(p => ({
            pid: String(p.pid),
            name: p.name,
            cpu: `${p.cpu.toFixed(1)}%`,
            mem: `${p.mem.toFixed(1)}%`,
            user: p.user,
        }));

        this._table = new Table(
            [
                { header: 'PID', key: 'pid', width: 7 },
                { header: 'Name', key: 'name', width: 18 },
                { header: 'CPU%', key: 'cpu', width: 7, align: 'right' },
                { header: 'MEM%', key: 'mem', width: 7, align: 'right' },
                { header: 'User', key: 'user', width: 10 },
            ],
            tableRows,
            { flexGrow: 1 },
            { stripe: true },
        );

        processCard.addChild(this._table);

        this._container.addChild(resourceCard);
        this._container.addChild(processCard);

        // ── Status bar ──
        this._statusBar = new Text(
            `  q Quit  ${caps.unicode ? '•' : '|'}  r Refresh  ${caps.unicode ? '•' : '|'}  TermUI v0.1.0`,
            {
                height: 1,
                fg: { type: 'named', name: 'brightBlack' },
            },
        );

        this.addChild(this._title);
        this.addChild(this._streamingText);
        this.addChild(this._statusMsg);
        this.addChild(this._container);
        this.addChild(this._statusBar);
    }

    /**
     * Refresh process table with latest data from @termuijs/data.
     */
    private _refreshTable(): void {
        const topProcs = processes.top(8);
        const rows = topProcs.map(p => ({
            pid: String(p.pid),
            name: p.name,
            cpu: `${p.cpu.toFixed(1)}%`,
            mem: `${p.mem.toFixed(1)}%`,
            user: p.user,
        }));
        this._table.setRows(rows);
    }

    /**
     * Handle keyboard input for the dashboard.
     */
    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // signal exit
        }
        if (event.key === 'r') {
            // Force a refresh of real metrics
            this._cpuBar.setValue(cpu.percent / 100);
            this._memBar.setValue(memory.percent / 100);
            this._diskBar.setValue(disk.percent / 100);
            this._refreshTable();
            this._statusMsg.setMessage('Refreshed at ' + new Date().toLocaleTimeString());
            this._statusMsg.setVariant('success');
        }
        return true;
    }

    /**
     * Called on each tick to animate widgets and pull live metrics.
     */
    tick(deltaMs: number): void {
        // Only tick the spinner when motion is allowed
        if (caps.motion) {
            this._spinner.tick(deltaMs);
        }

        // Advance StreamingText typewriter reveal
        this._streamingText.tick();

        // Update progress bars from real system data
        this._cpuBar.setValue(cpu.percent / 100);
        this._memBar.setValue(memory.percent / 100);
        this._diskBar.setValue(disk.percent / 100);

        // Refresh process list every tick (data layer caches internally)
        this._refreshTable();
    }

    protected _renderSelf(_screen: Screen): void {
        // No custom rendering — children handle everything
    }
}

// ── Main ─────────────────────────────────────────────

async function main() {
    const dashboard = new Dashboard();

    const app = new App(dashboard, {
        fullscreen: true,
        title: 'TermUI Dashboard',
        fps: 30,
    });

    // Handle keyboard input
    app.events.on('key', (event) => {
        const shouldContinue = dashboard.handleKey(event);
        if (!shouldContinue) {
            app.exit(0);
        }
        app.requestRender();
    });

    // Animation loop — tick spinner, update metrics, stream text
    let lastTick = Date.now();
    const tickInterval = setInterval(() => {
        const now = Date.now();
        dashboard.tick(now - lastTick);
        lastTick = now;
        app.requestRender();
    }, 33); // ~30fps

    app.terminal.onCleanup(() => {
        clearInterval(tickInterval);
    });

    // mount() blocks until exit() is called
    const exitCode = await app.mount();
    clearInterval(tickInterval);
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Dashboard error:', err);
    process.exit(1);
});

import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';
import { HeaderBar } from './components/HeaderBar.js';
import { FilterBar } from './components/FilterBar.js';
import { StatsSidebar } from './components/StatsSidebar.js';
import { LogTable, parseLogString } from './components/LogTable.js';

const LOG_TEMPLATES = [
    { level: 'INFO',  service: 'auth-service',  message: 'User login successful (user_id=' },
    { level: 'DEBUG', service: 'db-pool',       message: 'Connection released back to pool (active=' },
    { level: 'INFO',  service: 'gateway',       message: 'Request GET /api/v1/checkout processed in ' },
    { level: 'WARN',  service: 'cache-manager', message: 'High memory usage threshold reached (' },
    { level: 'ERROR', service: 'payment-api',   message: 'Failed to charge card (token=' },
    { level: 'DEBUG', service: 'gateway',       message: 'Route matched /api/v1/products' },
    { level: 'WARN',  service: 'db-pool',       message: 'Query execution time exceeded warning limit (' },
    { level: 'INFO',  service: 'payment-api',   message: 'Webhook received for event payment.succeeded' },
    { level: 'ERROR', service: 'auth-service',  message: 'Password authentication failed for user: ' },
    { level: 'INFO',  service: 'cache-manager', message: 'Pruned ' }
];

function getRandomLog(): string {
    const idx = Math.floor(Math.random() * LOG_TEMPLATES.length);
    const template = LOG_TEMPLATES[idx];
    const timestamp = new Date().toISOString().slice(11, 23); // "HH:MM:SS.mmm"
    let suffix = '';
    switch (template.service) {
        case 'auth-service':
            suffix = template.level === 'INFO' ? `${Math.floor(1000 + Math.random() * 9000)})` : 'admin';
            break;
        case 'db-pool':
            suffix = template.level === 'DEBUG' ? `3, idle=${Math.floor(10 + Math.random() * 10)})` : `${Math.floor(100 + Math.random() * 200)}ms)`;
            break;
        case 'gateway':
            suffix = template.level === 'INFO' ? `${Math.floor(10 + Math.random() * 90)}ms` : '';
            break;
        case 'cache-manager':
            suffix = template.level === 'WARN' ? `${Math.floor(80 + Math.random() * 15)}%)` : `${Math.floor(10 + Math.random() * 100)} expired keys in 2ms`;
            break;
        case 'payment-api':
            suffix = template.level === 'ERROR' ? `tok_${Math.random().toString(36).substring(2, 7)}) - connection timeout` : '';
            break;
    }
    return `[${timestamp}] [${template.level}] ${template.service}: ${template.message}${suffix}`;
}

function extractLatency(msg: string): number | null {
    // Matches e.g. "processed in 45ms" or "warning limit (120ms)" or "expired keys in 2ms"
    const match = msg.match(/(?:processed in|warning limit \(|in)\s*(\d+)ms/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

class LogViewerApp extends Widget {
    private allLogs: string[] = [];
    private filteredLogs: string[] = [];
    
    private headerBar: HeaderBar;
    private filterBar: FilterBar;
    private logTable: LogTable;
    private statsSidebar: StatsSidebar;

    private intervalId: ReturnType<typeof setInterval> | null = null;
    private connectionState: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
    
    // Focus Index: 
    // 0: Search Input, 1: Level Dropdown, 2: Chips, 3: Clear Button, 4: Log Table
    private focusIdx = 0; 
    
    // Observability stats counters
    private infoCount = 0;
    private warnCount = 0;
    private errorCount = 0;
    private rollingLatencies: number[] = [];

    constructor() {
        super({
            flexDirection: 'column',
            bg: { type: 'hex', hex: '#0c0d12' },
            padding: 1,
            gap: 1
        });

        // 1. Header Bar
        this.headerBar = new HeaderBar({
            totalLogs: 0,
            errorCount: 0,
            connectionState: this.connectionState
        });

        // 2. Main Content Area (Split Left column and Right Sidebar)
        const bodyBox = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // Left Container Box (Filter bar + Log list)
        const leftBox = new Box({ flexDirection: 'column', flexGrow: 1, gap: 1 });

        this.filterBar = new FilterBar({
            onSearchChange: () => this.applyFilter(),
            onLevelChange: () => this.applyFilter(),
            onClear: () => this.applyFilter()
        });

        this.logTable = new LogTable();

        leftBox.addChild(this.filterBar);
        leftBox.addChild(this.logTable);

        // Right Sidebar Box (Observability statistics and latency sparkline)
        this.statsSidebar = new StatsSidebar();

        bodyBox.addChild(leftBox);
        bodyBox.addChild(this.statsSidebar);

        // 3. Footer Bar
        const footer = new Text(
            " Controls: [Tab] Cycle Focus | [/] Search | [Space] Pause/Resume | [c] Cycle Conn | [Esc] Reset | [q] Exit",
            { dim: true, height: 1 }
        );

        this.addChild(this.headerBar);
        this.addChild(bodyBox);
        this.addChild(footer);

        // Seed 30 initial logs
        for (let i = 0; i < 30; i++) {
            this.receiveLog(getRandomLog());
        }
        
        this.applyFilter();
        this.updateFocusVisuals();
    }

    private receiveLog(logLine: string) {
        this.allLogs.push(logLine);
        // Cap logs history to avoid memory leaks
        if (this.allLogs.length > 500) {
            const removed = this.allLogs.shift();
            if (removed) {
                const parsed = parseLogString(removed);
                if (parsed.level === 'INFO') this.infoCount = Math.max(0, this.infoCount - 1);
                if (parsed.level === 'WARN') this.warnCount = Math.max(0, this.warnCount - 1);
                if (parsed.level === 'ERROR') this.errorCount = Math.max(0, this.errorCount - 1);
            }
        }

        // Process statistics
        const parsed = parseLogString(logLine);
        if (parsed.level === 'INFO') this.infoCount++;
        if (parsed.level === 'WARN') this.warnCount++;
        if (parsed.level === 'ERROR') this.errorCount++;

        const latency = extractLatency(parsed.message);
        if (latency !== null) {
            this.rollingLatencies.push(latency);
            if (this.rollingLatencies.length > 30) {
                this.rollingLatencies.shift();
            }
            this.statsSidebar.pushLatencyValue(latency);
        }

        // Update statistics displays
        const avgLat = this.rollingLatencies.length > 0 
            ? this.rollingLatencies.reduce((a, b) => a + b, 0) / this.rollingLatencies.length
            : 0;

        this.headerBar.setStats(this.allLogs.length, this.errorCount);
        this.statsSidebar.updateStats({
            total: this.allLogs.length,
            info: this.infoCount,
            warn: this.warnCount,
            error: this.errorCount,
            avgLatency: avgLat
        });
    }

    startSimulation(app: App) {
        this.intervalId = setInterval(() => {
            if (this.connectionState === 'connected') {
                this.receiveLog(getRandomLog());
                this.applyFilter();
                app.requestRender();
            }
        }, 800);
    }

    stopSimulation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    applyFilter() {
        const filterText = this.filterBar.searchInput.value.toLowerCase().trim();
        const selectedLvl = this.filterBar.getSelectedLevel();

        this.filteredLogs = this.allLogs.filter(log => {
            const parsed = parseLogString(log);
            const matchesText = filterText === '' || log.toLowerCase().includes(filterText);
            const matchesLvl = selectedLvl === 'ALL' || parsed.level === selectedLvl;
            return matchesText && matchesLvl;
        });

        this.logTable.setLines(this.filteredLogs);
    }

    private updateFocusVisuals() {
        if (this.focusIdx >= 0 && this.focusIdx <= 3) {
            this.filterBar.setFocusedField(this.focusIdx);
            this.logTable.isFocused = false;
        } else if (this.focusIdx === 4) {
            this.filterBar.setFocusedField(-1);
            this.logTable.isFocused = true;
        }
        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        // Exit keys: 'q' or 'Ctrl+C'
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        // Global key shortcut: '/' focuses the search input
        if (event.key === '/' && this.focusIdx !== 0) {
            this.focusIdx = 0;
            this.updateFocusVisuals();
            return true;
        }

        // Global key shortcut: 'c' cycles simulated connection state
        if (event.key === 'c') {
            if (this.connectionState === 'connected') {
                this.connectionState = 'reconnecting';
            } else if (this.connectionState === 'reconnecting') {
                this.connectionState = 'disconnected';
            } else {
                this.connectionState = 'connected';
            }
            this.headerBar.setConnectionState(this.connectionState);
            return true;
        }

        // Space toggles simulation pause/resume (if search input is not focused)
        if (event.key === 'space' && this.focusIdx !== 0) {
            if (this.connectionState === 'connected') {
                this.connectionState = 'disconnected';
            } else {
                this.connectionState = 'connected';
            }
            this.headerBar.setConnectionState(this.connectionState);
            return true;
        }

        // Tab switches focus
        if (event.key === 'tab') {
            this.focusIdx = (this.focusIdx + 1) % 5;
            this.updateFocusVisuals();
            return true;
        }

        // Escape clears search query and level filter
        if (event.key === 'escape') {
            this.filterBar.clearAll();
            this.applyFilter();
            this.focusIdx = 0;
            this.updateFocusVisuals();
            return true;
        }

        // Route keys based on focused element
        if (this.focusIdx === 0) {
            // Typing in Search bar
            if (event.key === 'backspace') {
                this.filterBar.searchInput.deleteBack();
                this.applyFilter();
            } else if (event.key === 'delete') {
                this.filterBar.searchInput.deleteForward();
                this.applyFilter();
            } else if (event.key === 'left') {
                this.filterBar.searchInput.moveCursorLeft();
            } else if (event.key === 'right') {
                this.filterBar.searchInput.moveCursorRight();
            } else if (event.key === 'home') {
                this.filterBar.searchInput.moveCursorHome();
            } else if (event.key === 'end') {
                this.filterBar.searchInput.moveCursorEnd();
            } else if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                this.filterBar.searchInput.insertChar(event.key);
                this.applyFilter();
            }
        } else if (this.focusIdx === 1) {
            // Level Dropdown: Enter or Space cycles through the levels
            if (event.key === 'enter' || event.key === 'space') {
                this.filterBar.cycleLevel(true);
                this.applyFilter();
            }
        } else if (this.focusIdx === 2) {
            // Quick Filter Chips: Left/Right switches chips, Enter activates it
            if (event.key === 'left') {
                this.filterBar.cycleLevel(false);
                this.applyFilter();
            } else if (event.key === 'right') {
                this.filterBar.cycleLevel(true);
                this.applyFilter();
            }
        } else if (this.focusIdx === 3) {
            // Clear Button: Enter clears
            if (event.key === 'enter' || event.key === 'space') {
                this.filterBar.clearAll();
                this.applyFilter();
            }
        } else if (this.focusIdx === 4) {
            // Log Table scrolling
            if (event.key === 'up') {
                this.logTable.moveSelectionUp();
            } else if (event.key === 'down') {
                this.logTable.moveSelectionDown();
            } else if (event.key === 'pageup') {
                this.logTable.scrollUp(10);
            } else if (event.key === 'pagedown') {
                this.logTable.scrollDown(10);
            } else if (event.key === 'space' || event.key === 'enter' || event.key === 'j') {
                // If scrolled up, space or enter jumps back to latest
                if (!this.logTable.getAutoScroll()) {
                    this.logTable.setAutoScroll(true);
                }
            }
        }

        return true;
    }

    protected _renderSelf(): void {}
}

async function main() {
    const exampleApp = new LogViewerApp();

    const app = new App(exampleApp, {
        fullscreen: true,
        title: 'Realtime Log Viewer',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = exampleApp.handleKey(event);
        if (!shouldContinue) {
            exampleApp.stopSimulation();
            app.exit(0);
        }
        app.requestRender();
    });

    exampleApp.startSimulation(app);

    const exitCode = await app.mount();
    exampleApp.stopSimulation();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});

import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget, LogView, TextInput } from '@termuijs/widgets';

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

class LogViewerApp extends Widget {
    private allLogs: string[] = [];
    private filteredLogs: string[] = [];
    private filterInput: TextInput;
    private logView: LogView;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastHeight = 0;

    constructor() {
        super({ flexDirection: 'column', padding: 1, gap: 1 });

        const title = new Text(" 📝 Log Viewer - Realtime Log Stream ", {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            height: 1
        });

        const filterBox = new Box({ flexDirection: 'row', height: 3, gap: 1 });
        filterBox.addChild(new Text("\nFilter: ", { fg: { type: 'named', name: 'yellow' }, bold: true }));
        this.filterInput = new TextInput({ flexGrow: 1 }, {
            placeholder: "Type to filter logs...",
            onChange: () => this.applyFilter()
        });
        filterBox.addChild(this.filterInput);

        this.logView = new LogView({ border: 'single', flexGrow: 1 });

        const footer = new Text(" Controls: [Type] to Filter | [Esc] to Clear | [Up/Down/PgUp/PgDn] to Scroll | [q / Ctrl+C] to Exit", {
            dim: true,
            height: 1
        });

        this.addChild(title);
        this.addChild(filterBox);
        this.addChild(this.logView);
        this.addChild(footer);

        // Make filterInput focused initially
        this.filterInput.isFocused = true;

        // Generate 30 initial logs
        for (let i = 0; i < 30; i++) {
            this.allLogs.push(getRandomLog());
        }
        this.applyFilter();
    }

    override syncLayout(): void {
        super.syncLayout();
        const currentHeight = this.logView.rect.height;
        if (currentHeight !== this.lastHeight) {
            this.lastHeight = currentHeight;
            this.applyFilter();
        }
    }

    startSimulation(app: App) {
        this.intervalId = setInterval(() => {
            const nextLog = getRandomLog();
            this.allLogs.push(nextLog);
            // Cap history to 500 lines to avoid memory leak
            if (this.allLogs.length > 500) {
                this.allLogs.shift();
            }
            this.applyFilter();
            app.requestRender();
        }, 800);
    }

    stopSimulation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    applyFilter() {
        const filterText = this.filterInput.value.toLowerCase().trim();
        if (filterText === '') {
            this.filteredLogs = [...this.allLogs];
        } else {
            this.filteredLogs = this.allLogs.filter(log => log.toLowerCase().includes(filterText));
        }
        this.logView.setLines(this.filteredLogs);
    }

    handleKey(event: KeyEvent): boolean {
        // Exit keys: 'q' or 'Ctrl+C'
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        // Escape to clear filter input
        if (event.key === 'escape') {
            this.filterInput.clear();
            this.applyFilter();
            return true;
        }

        // Pass standard editing and scrolling keys
        if (event.key === 'backspace') {
            this.filterInput.deleteBack();
            this.applyFilter();
        } else if (event.key === 'delete') {
            this.filterInput.deleteForward();
            this.applyFilter();
        } else if (event.key === 'left') {
            this.filterInput.moveCursorLeft();
        } else if (event.key === 'right') {
            this.filterInput.moveCursorRight();
        } else if (event.key === 'home') {
            this.filterInput.moveCursorHome();
        } else if (event.key === 'end') {
            this.filterInput.moveCursorEnd();
        } else if (event.key === 'up') {
            this.logView.scrollUp(1);
        } else if (event.key === 'down') {
            this.logView.scrollDown(1);
        } else if (event.key === 'pageup') {
            this.logView.scrollUp(this.logView.rect.height || 10);
        } else if (event.key === 'pagedown') {
            this.logView.scrollDown(this.logView.rect.height || 10);
        } else if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
            this.filterInput.insertChar(event.key);
            this.applyFilter();
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

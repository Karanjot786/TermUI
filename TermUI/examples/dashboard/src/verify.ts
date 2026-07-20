// Full dashboard verification — tests the rendering pipeline end to end

import { Screen, computeLayout, renderFallback } from '@termuijs/core';
import {
    Box,
    Text,
    ProgressBar,
    Spinner,
    Table,
    Widget,
} from '@termuijs/widgets';

class Dashboard extends Widget {
    constructor() {
        super({ flexDirection: 'column' });

        const title = new Text('⚡ TermUI Dashboard', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            height: 1,
        }, { align: 'center' });

        const container = new Box({
            flexDirection: 'row',
            flexGrow: 1,
            gap: 1,
        });

        const leftPanel = new Box({
            border: 'round',
            borderColor: { type: 'named', name: 'blue' },
            flexGrow: 1,
            padding: 1,
            flexDirection: 'column',
            gap: 1,
        });

        leftPanel.addChild(new Text('📊 System Monitor', {
            bold: true, fg: { type: 'named', name: 'yellow' }, height: 1,
        }));
        leftPanel.addChild(new Text('CPU Usage:', { height: 1, dim: true }));
        leftPanel.addChild(new ProgressBar(
            { height: 1 },
            { value: 0.65, fillColor: { type: 'named', name: 'green' }, showLabel: true },
        ));
        leftPanel.addChild(new Spinner(
            { height: 1 },
            { spinner: 'dots', label: 'Processing...', color: { type: 'named', name: 'magenta' } },
        ));

        const rightPanel = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'green' },
            flexGrow: 2,
            padding: 1,
        });

        rightPanel.addChild(new Table(
            [
                { header: 'Service', key: 'name', width: 15 },
                { header: 'Status', key: 'status', width: 10 },
                { header: 'Uptime', key: 'uptime', align: 'right' },
            ],
            [
                { name: 'API Server', status: '● Online', uptime: '14d 6h' },
                { name: 'Database', status: '● Online', uptime: '30d 2h' },
                { name: 'Cache', status: '● Online', uptime: '7d 12h' },
            ],
            { flexGrow: 1 },
            { stripe: true },
        ));

        container.addChild(leftPanel);
        container.addChild(rightPanel);

        const statusBar = new Text(
            '  q Quit  •  r Reset  •  TermUI v0.1.0',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        this.addChild(title);
        this.addChild(container);
        this.addChild(statusBar);
    }

    protected _renderSelf(): void { }
}

const COLS = 80;
const ROWS = 24;
const dashboard = new Dashboard();
const screen = new Screen(COLS, ROWS);

const layoutRoot = dashboard.getLayoutNode();
computeLayout(layoutRoot, COLS, ROWS);
dashboard.syncLayout();
screen.clear();
dashboard.render(screen);

const output = renderFallback(screen);
console.log(output);
console.log('\n✅ Dashboard verification complete!');

import { Box, Text, Sparkline } from '@termuijs/widgets';
import { type Style } from '@termuijs/core';

export class StatsSidebar extends Box {
    private totalText: Text;
    private infoText: Text;
    private warnText: Text;
    private errorText: Text;
    private memoryText: Text;
    private avgLatencyText: Text;
    private sparkline: Sparkline;

    private latencyHistory: number[] = [];

    constructor(style: Partial<Style> = {}) {
        super({
            flexDirection: 'column',
            width: 30,
            padding: 1,
            gap: 1,
            border: 'single',
            borderColor: { type: 'hex', hex: '#2c3143' },
            bg: { type: 'hex', hex: '#161821' },
            ...style
        });

        // Title
        const title = new Text(" 📊 OBSERVABILITY STATS ", {
            bold: true,
            fg: { type: 'hex', hex: '#eab308' }, // Amber
        }, {
            align: 'center'
        });
        this.addChild(title);

        const divider1 = new Text("─".repeat(26), { dim: true });
        this.addChild(divider1);

        // Stats Cards / Key-Values
        this.totalText = new Text("Total Logs: 0", { bold: true });
        this.infoText = new Text("● INFO:  0", { fg: { type: 'hex', hex: '#10b981' } });
        this.warnText = new Text("● WARN:  0", { fg: { type: 'hex', hex: '#f59e0b' } });
        this.errorText = new Text("● ERROR: 0", { fg: { type: 'hex', hex: '#ef4444' } });

        this.addChild(this.totalText);
        this.addChild(this.infoText);
        this.addChild(this.warnText);
        this.addChild(this.errorText);

        const divider2 = new Text("─".repeat(26), { dim: true });
        this.addChild(divider2);

        // System Performance Stats
        this.memoryText = new Text("Memory Usage: 0.0 MB", { bold: true });
        this.avgLatencyText = new Text("Avg Latency:  0.0 ms", { bold: true, fg: { type: 'hex', hex: '#a855f7' } }); // Purple

        this.addChild(this.memoryText);
        this.addChild(this.avgLatencyText);

        // Latency Sparkline Graph
        this.sparkline = new Sparkline("Latency Trend:", { height: 1 }, {
            color: { type: 'hex', hex: '#a855f7' },
            showRange: false,
            marker: 'block'
        });
        
        // Seed initial mock data
        for (let i = 0; i < 20; i++) {
            this.latencyHistory.push(Math.floor(10 + Math.random() * 80));
        }
        this.sparkline.setData(this.latencyHistory);

        this.addChild(this.sparkline);
    }

    updateStats(stats: {
        total: number;
        info: number;
        warn: number;
        error: number;
        avgLatency: number;
    }) {
        this.totalText.setContent(`Total Logs: ${stats.total}`);
        this.infoText.setContent(`● INFO:  ${stats.info}`);
        this.warnText.setContent(`● WARN:  ${stats.warn}`);
        this.errorText.setContent(`● ERROR: ${stats.error}`);

        this.avgLatencyText.setContent(`Avg Latency:  ${stats.avgLatency.toFixed(1)} ms`);

        // Update system memory stats
        const heap = process.memoryUsage().heapUsed / 1024 / 1024;
        this.memoryText.setContent(`Memory Usage: ${heap.toFixed(1)} MB`);

        this.markDirty();
    }

    pushLatencyValue(ms: number) {
        this.latencyHistory.push(ms);
        if (this.latencyHistory.length > 25) {
            this.latencyHistory.shift();
        }
        this.sparkline.setData([...this.latencyHistory]);
        this.markDirty();
    }
}

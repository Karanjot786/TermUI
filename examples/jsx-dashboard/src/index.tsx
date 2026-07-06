// ─────────────────────────────────────────────────────
// JSX Dashboard — React-like terminal UI
//
// This demo showcases the @termuijs/jsx API:
//   ✓ Uses .tsx file extension with JSX compilation
//   ✓ Functional component patterns
//   ✓ Same data providers as system-monitor
//   ✓ @termuijs/quick fluent API
//
// Run: cd examples/jsx-dashboard && pnpm start
// ─────────────────────────────────────────────────────

import { app, row, col, spacer, gauge, sparkline, table, text, status, multiProgress, streamingText } from '@termuijs/quick';
import { Card } from '@termuijs/widgets';
import { caps } from '@termuijs/core';
import { cpu, memory, disk, processes, system, network } from '@termuijs/data';

// Keep a rolling history for sparklines
const cpuHistory: number[] = [];
const memHistory: number[] = [];

// Header Card displaying Host, Platform, and Uptime
const headerCard = new Card({
    border: caps.unicode ? 'round' : 'single',
    borderColor: { type: 'named', name: 'cyan' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    height: 3,
}, {
    title: ' SYSTEM STATUS '
});
headerCard.addChild(
    row(
        text(() => ` Host: ${system.hostname}  •  Platform: ${system.platform} (${system.arch})  •  Node: ${system.nodeVersion}`, { color: { type: 'named', name: 'white' } }),
        text(() => `Uptime: ${system.uptime} `, { align: 'right', color: { type: 'named', name: 'cyan' } })
    )
);

// CPU Metric Card
const cpuCard = new Card({
    border: caps.unicode ? 'round' : 'single',
    borderColor: { type: 'named', name: 'green' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    flexGrow: 1,
}, {
    title: ' CPU '
});
cpuCard.addChild(
    col(
        gauge('Usage', () => {
            const pct = cpu.percent;
            cpuHistory.push(pct);
            if (cpuHistory.length > 40) cpuHistory.shift();
            return pct / 100;
        }, { color: { type: 'named', name: 'green' } }),
        spacer(1),
        text(() => ` Cores: ${cpu.count}  •  Load: ${cpu.loadAvg.map(l => l.toFixed(2)).join(' ')}`, { dim: true }),
        spacer(1),
        sparkline(caps.unicode ? 'Trend ▸' : 'Trend >', () => [...cpuHistory], { color: { type: 'named', name: 'green' } })
    )
);

// Memory Metric Card
const memCard = new Card({
    border: caps.unicode ? 'round' : 'single',
    borderColor: { type: 'named', name: 'yellow' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    flexGrow: 1,
}, {
    title: ' MEMORY '
});
memCard.addChild(
    col(
        gauge('Usage', () => {
            const pct = memory.percent;
            memHistory.push(pct);
            if (memHistory.length > 40) memHistory.shift();
            return pct / 100;
        }, { color: { type: 'named', name: 'yellow' } }),
        spacer(1),
        multiProgress(() => [
            { label: 'Used', value: memory.raw.used / memory.raw.total },
            { label: 'Free', value: memory.raw.free / memory.raw.total },
        ]),
        spacer(1),
        sparkline(caps.unicode ? 'Trend ▸' : 'Trend >', () => [...memHistory], { color: { type: 'named', name: 'yellow' } })
    )
);

// Disk Metric Card
const diskCard = new Card({
    border: caps.unicode ? 'round' : 'single',
    borderColor: { type: 'named', name: 'magenta' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    flexGrow: 1,
}, {
    title: ' DISK '
});
diskCard.addChild(
    col(
        gauge('Usage', () => disk.percent / 100, { color: { type: 'named', name: 'magenta' } }),
        spacer(1),
        text(() => {
            const main = disk.main;
            if (!main) return ' Mount: N/A';
            return ` Mount: ${main.mountpoint}`;
        }, { dim: true }),
        text(() => {
            const main = disk.main;
            if (!main) return ' Size:  N/A';
            return ` Size:  ${main.size}`;
        }, { dim: true }),
        text(() => {
            const main = disk.main;
            if (!main) return ' Used:  N/A';
            return ` Used:  ${main.used} / ${main.available} free`;
        }, { dim: true })
    )
);

// Network Card
const ifaces = network.interfaces;
const networkContent = ifaces.length > 0
    ? row(...ifaces.slice(0, 4).map(iface =>
        status(`${iface.name} (${iface.address})`, () => true, { upColor: { type: 'named', name: 'green' } })
      ))
    : text(' No active interfaces found', { dim: true });

const networkCard = new Card({
    border: caps.unicode ? 'round' : 'single',
    borderColor: { type: 'named', name: 'blue' },
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
    height: 3,
}, {
    title: ' NETWORK STATUS '
});
networkCard.addChild(networkContent);

app(caps.unicode ? '⚡ SYSTEM MONITOR' : '* SYSTEM MONITOR')
    .rows(
        headerCard,
        spacer(1),
        row(
            cpuCard,
            memCard,
            diskCard
        ),
        spacer(1),
        table(
            'Top Processes',
            () => processes.top(10).map(p => ({
                Name: p.name.slice(0, 18),
                PID: p.pid,
                'CPU%': p.cpu.toFixed(1),
                'MEM%': p.mem.toFixed(1),
                User: p.user,
            })),
            ['Name', 'PID', 'CPU%', 'MEM%', 'User'],
        ),
        spacer(1),
        networkCard,
        spacer(1),
        text('  q quit  •  r refresh  •  Built with @termuijs/jsx ⚡', { dim: true }),
    )
    .keys({ q: 'quit', r: 'refresh' })
    .refresh('1s')
    .run();


// ─────────────────────────────────────────────────────
// System Monitor — built with @termuijs/quick + @termuijs/data
//
// ~35 lines to create a full real-time system dashboard
// ─────────────────────────────────────────────────────

import { caps } from '@termuijs/core';
import { app, row, gauge, sparkline, table, text, status, multiProgress } from '@termuijs/quick';
import { cpu, memory, disk, processes, system, network } from '@termuijs/data';

// Keep a rolling history for sparklines
const cpuHistory: number[] = [];
const memHistory: number[] = [];

app(caps.unicode ? '⚡ System Monitor' : '* System Monitor')
    .rows(
        // Row 1: System info
        row(
            text(() => `${caps.unicode ? '🖥' : '[sys]'}  ${system.hostname} • ${system.platform} • up ${system.uptime}`, { color: { type: 'named', name: 'cyan' }, bold: true }),
        ),
        // Row 2: CPU + Memory gauges
        row(
            gauge('CPU', () => {
                const pct = cpu.percent;
                cpuHistory.push(pct); if (cpuHistory.length > 40) cpuHistory.shift();
                return pct / 100;
            }, { color: { type: 'named', name: 'green' } }),
            gauge('MEM', () => {
                const pct = memory.percent;
                memHistory.push(pct); if (memHistory.length > 40) memHistory.shift();
                return pct / 100;
            }, { color: { type: 'named', name: 'yellow' } }),
            gauge('DSK', () => disk.percent / 100, { color: { type: 'named', name: 'magenta' } }),
        ),
        // Row 3: Multi-bar progress (MEM used + CPU load)
        row(
            multiProgress(() => [
                { label: 'MEM Used', value: memory.raw.used / memory.raw.total },
                { label: 'CPU Load', value: cpu.percent / 100 },
            ]),
        ),
        // Row 4: Sparklines (CPU + Memory trend)
        row(
            sparkline('CPU ▸', () => [...cpuHistory], { color: { type: 'named', name: 'green' } }),
            sparkline('MEM ▸', () => [...memHistory], { color: { type: 'named', name: 'yellow' } }),
        ),
        // Row 5: Top processes table
        table('Top Processes', () => processes.top(8).map(p => ({
            Name: p.name,
            PID: p.pid,
            'CPU%': p.cpu.toFixed(1),
            'MEM%': p.mem.toFixed(1),
            User: p.user,
        })), ['Name', 'PID', 'CPU%', 'MEM%', 'User']),
        // Row 6: Network interfaces
        row(
            ...network.interfaces.map(iface =>
                status(iface.name, () => true, { upColor: { type: 'named', name: 'green' } })
            ),
        ),
    )
    .keys({ q: 'quit', r: 'refresh' })
    .refresh('1s')
    .run();

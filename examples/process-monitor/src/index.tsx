/** @jsxImportSource @termuijs/jsx */
import { renderApp, useState, useEffect, useRef, useKeymap, useInput } from '@termuijs/jsx';
import { Table, LineChart, BarChart, TextInput, type TableColumn, type TableRow, type BarGroup } from '@termuijs/widgets';
import { useCpu, useMemory, useTopProcesses, useSystemInfo } from '@termuijs/data';
import type { KeyEvent } from '@termuijs/core';

declare module '@termuijs/jsx' {
    export namespace JSX {
        interface IntrinsicElements {
            card: {
                children?: any;
                key?: string | number;
                title?: string;
                borderColor?: string;
                flexGrow?: number;
                flexShrink?: number;
                width?: number | string;
                height?: number | string;
                padding?: number;
                margin?: number;
                border?: string;
            };
        }
    }
}

declare module '@termuijs/jsx/jsx-runtime' {
    export namespace JSX {
        interface IntrinsicElements {
            card: {
                children?: any;
                key?: string | number;
                title?: string;
                borderColor?: string;
                flexGrow?: number;
                flexShrink?: number;
                width?: number | string;
                height?: number | string;
                padding?: number;
                margin?: number;
                border?: string;
            };
        }
    }
}

const columns: TableColumn[] = [
    { header: 'PID', key: 'pid', width: 8 },
    { header: 'Name', key: 'name', width: 18 },
    { header: 'CPU%', key: 'cpu', width: 8, align: 'right' },
    { header: 'MEM%', key: 'mem', width: 8, align: 'right' },
    { header: 'User', key: 'user', width: 10 },
];

function TableComponent({ columns, rows, style, options }: { columns: TableColumn[]; rows: TableRow[]; style?: any; options?: any }) {
    const tableRef = useRef<Table | null>(null);
    if (!tableRef.current) {
        tableRef.current = new Table(columns, rows, style ?? {}, options ?? {});
    } else {
        tableRef.current.setRows(rows);
    }
    return tableRef.current;
}

function LineChartComponent({ data, style, options }: { data: number[]; style?: any; options?: any }) {
    const chartRef = useRef<LineChart | null>(null);
    if (!chartRef.current) {
        chartRef.current = new LineChart(data, style ?? {}, options ?? {});
    } else {
        chartRef.current.setData(data);
    }
    return chartRef.current;
}

function BarChartComponent({ data, style, options }: { data: BarGroup[]; style?: any; options?: any }) {
    const chartRef = useRef<BarChart | null>(null);
    if (!chartRef.current) {
        chartRef.current = new BarChart(data, style ?? {}, options ?? {});
    } else {
        chartRef.current.setData(data);
    }
    return chartRef.current;
}

// ── TextInput JSX wrapper ────────────────────────────
function TextInputJSX({ value, onChange, placeholder, isFocused }: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    isFocused: boolean;
}) {
    const ref = useRef<TextInput | null>(null);
    if (!ref.current) {
        ref.current = new TextInput({ width: 30, height: 1 }, { placeholder, onChange });
    }

    if (ref.current.value !== value) {
        ref.current.value = value;
    }

    ref.current.isFocused = isFocused;

    useInput((key: string, event: KeyEvent) => {
        if (!isFocused) return;
        if (!ref.current) return;

        switch (key) {
            case 'backspace': ref.current.deleteBack(); break;
            case 'delete': ref.current.deleteForward(); break;
            case 'left': ref.current.moveCursorLeft(); break;
            case 'right': ref.current.moveCursorRight(); break;
            case 'home': ref.current.moveCursorHome(); break;
            case 'end': ref.current.moveCursorEnd(); break;
            default:
                if (key && key.length === 1 && !event.ctrl && !event.alt) {
                    ref.current.insertChar(key);
                }
        }
    });

    return ref.current as any;
}

// ── Helper: build a text-based gauge bar ─────────────
function gaugeBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
    return `[${bar}] ${percent.toFixed(0)}%`;
}

// ── Helper: format uptime seconds ────────────────────
function formatUptime(uptimeStr: string): string {
    return uptimeStr;
}

function ProcessMonitor() {
    const sys = useSystemInfo();
    const cpu = useCpu(1000);
    const mem = useMemory(1000);
    const procs = useTopProcesses(30, 2000);

    const [cpuHistory, setCpuHistory] = useState<number[]>([]);
    const [filterText, setFilterText] = useState('');
    const [filterFocused, setFilterFocused] = useState(false);

    useEffect(() => {
        setCpuHistory(prev => {
            const next = [...prev, cpu.percent];
            if (next.length > 35) next.shift();
            return next;
        });
    }, [cpu.percent]);

    useKeymap([
        { key: 'q', action: () => { if (!filterFocused) process.exit(0); }, description: 'Quit' },
        { key: '/', action: () => setFilterFocused(true), description: 'Search' },
        { key: 'escape', action: () => { setFilterFocused(false); setFilterText(''); }, description: 'Clear search' },
    ]);

    const memData: BarGroup[] = [
        {
            label: 'RAM',
            bars: [
                { value: mem.raw.used / (1024 * 1024 * 1024), label: 'Used', color: { type: 'named', name: 'yellow' } },
                { value: mem.raw.free / (1024 * 1024 * 1024), label: 'Free', color: { type: 'named', name: 'green' } },
            ]
        }
    ];

    // Filter processes by name if search is active
    const filteredProcs = filterText.length > 0
        ? procs.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
        : procs;

    const tableRows = filteredProcs.slice(0, 15).map(p => ({
        pid: String(p.pid),
        name: p.name.slice(0, 18),
        cpu: `${p.cpu.toFixed(1)}%`,
        mem: `${p.mem.toFixed(1)}%`,
        user: p.user,
    }));

    // Compute process stats from the full list
    const totalProcs = procs.length;

    // CPU gauge bar for the header
    const cpuGauge = gaugeBar(cpu.percent, 15);
    // Memory gauge bar for the header
    const memGauge = gaugeBar(mem.percent, 15);

    return (
        <box flexDirection="column" padding={1} gap={1} flexGrow={1}>
            {/* Header */}
            <box flexDirection="row" height={3} border="round" borderColor="cyan" padding={1}>
                <text bold color="cyan"> 📊 TERMUI PROCESS MONITOR </text>
                <spacer />
                <text dim={true}>
                    {sys.hostname} • {sys.platform} ({sys.arch}) • Uptime: {formatUptime(sys.uptime)}
                </text>
            </box>

            {/* System Summary Bar */}
            <box flexDirection="row" height={3} border="single" borderColor="magenta" padding={1} gap={2}>
                <text bold color="green"> CPU: {cpuGauge} </text>
                <text bold color="yellow"> RAM: {mem.used}/{mem.total} ({mem.percent.toFixed(0)}%) </text>
                <text bold color="blue"> Procs: {totalProcs} </text>
                <text bold color="cyan"> Up: {formatUptime(sys.uptime)} </text>
            </box>

            {/* Main Area */}
            <box flexDirection="row" flexGrow={1} gap={1}>
                {/* Left Panel: CPU Line Chart & Memory status & Process Stats */}
                <box flexDirection="column" width={40} gap={1}>
                    <card title="CPU Load Trend" borderColor="green" flexGrow={1}>
                        <box flexDirection="column" flexGrow={1}>
                            <text bold color="green">Load: {cpu.percent.toFixed(1)}% ({cpu.count} cores @ {cpu.speed}MHz)</text>
                            <LineChartComponent
                                data={cpuHistory}
                                style={{ flexGrow: 1 }}
                                options={{ color: { type: 'named', name: 'green' }, min: 0, max: 100 }}
                            />
                        </box>
                    </card>

                    <card title="Memory Status" borderColor="yellow" height={8}>
                        <box flexDirection="column" gap={1}>
                            <text dim={true}>
                                Total: {mem.total} | Used: {mem.used} | Free: {mem.free}
                            </text>
                            <BarChartComponent
                                data={memData}
                                style={{ height: 3 }}
                                options={{
                                    direction: 'horizontal',
                                    max: mem.raw.total / (1024 * 1024 * 1024),
                                    barWidth: 1,
                                    barGap: 1
                                }}
                            />
                        </box>
                    </card>

                    {/* Process Statistics Panel */}
                    <card title="Process Stats" borderColor="magenta" height={6}>
                        <box flexDirection="column">
                            <text bold color="magenta"> Total Processes: {totalProcs}</text>
                            <text color="green"> CPU Model: {cpu.model.slice(0, 30)}</text>
                            <text color="cyan"> Load Avg: {cpu.loadAvg.map(l => l.toFixed(2)).join(', ')}</text>
                        </box>
                    </card>
                </box>

                {/* Right Panel: Search + Top Processes */}
                <box flexDirection="column" flexGrow={1} gap={1}>
                    {/* Search/Filter Bar */}
                    <box flexDirection="row" height={3} border="single" borderColor={filterFocused ? 'green' : 'white'} padding={1}>
                        <text bold color={filterFocused ? 'green' : 'white'}> 🔍 Filter: </text>
                        <TextInputJSX
                            value={filterText}
                            onChange={setFilterText}
                            placeholder="Type to filter processes..."
                            isFocused={filterFocused}
                        />
                        {filterText.length > 0 && (
                            <text dim={true}> ({filteredProcs.length} matches)</text>
                        )}
                    </box>

                    <card title={filterText ? `Processes matching "${filterText}"` : "Top Processes"} borderColor="blue" flexGrow={1}>
                        <TableComponent
                            columns={columns}
                            rows={tableRows}
                            style={{ flexGrow: 1 }}
                            options={{ stripe: true }}
                        />
                    </card>
                </box>
            </box>

            {/* Footer */}
            <box flexDirection="row" height={1}>
                <text dim={true}>Controls: [q] Quit  [/] Search  [Esc] Clear search</text>
                <spacer />
                <text dim={true}>Refreshed automatically</text>
            </box>
        </box>
    );
}

renderApp(ProcessMonitor, { title: 'Process Monitor' }).catch((err) => {
    console.error('Process Monitor error:', err);
    process.exit(1);
});

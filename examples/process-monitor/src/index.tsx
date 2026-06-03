/** @jsxImportSource @termuijs/jsx */
import { renderApp, useState, useEffect, useRef, useKeymap } from '@termuijs/jsx';
import { Table, LineChart, BarChart, type TableColumn, type TableRow, type BarGroup } from '@termuijs/widgets';
import { useCpu, useMemory, useTopProcesses, useSystemInfo } from '@termuijs/data';

declare module '@termuijs/jsx' {
    export namespace JSX {
        interface IntrinsicElements {
            card: {
                children?: any;
                key?: string | number;
                title?: string;
                borderColor?: any;
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
                borderColor?: any;
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

function ProcessMonitor() {
    const sys = useSystemInfo();
    const cpu = useCpu(1000);
    const mem = useMemory(1000);
    const procs = useTopProcesses(10, 2000);

    const [cpuHistory, setCpuHistory] = useState<number[]>([]);

    useEffect(() => {
        setCpuHistory(prev => {
            const next = [...prev, cpu.percent];
            if (next.length > 35) next.shift();
            return next;
        });
    }, [cpu.percent]);

    useKeymap([
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
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

    const tableRows = procs.map(p => ({
        pid: String(p.pid),
        name: p.name.slice(0, 18),
        cpu: `${p.cpu.toFixed(1)}%`,
        mem: `${p.mem.toFixed(1)}%`,
        user: p.user,
    }));

    return (
        <box flexDirection="column" padding={1} gap={1} flexGrow={1}>
            {/* Header */}
            <box flexDirection="row" height={3} border="round" borderColor="cyan" padding={1}>
                <text bold color="cyan"> 📊 TERMUI PROCESS MONITOR </text>
                <spacer />
                <text dim={true}>
                    {sys.hostname} • {sys.platform} ({sys.arch}) • Uptime: {sys.uptime}
                </text>
            </box>

            {/* Main Area */}
            <box flexDirection="row" flexGrow={1} gap={1}>
                {/* Left Panel: CPU Line Chart & Memory status */}
                <box flexDirection="column" width={40} gap={1}>
                    <card title="CPU Load Trend" borderColor="green" flexGrow={1}>
                        <box flexDirection="column" flexGrow={1}>
                            <text bold color="green">Load: {cpu.percent.toFixed(1)}%</text>
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
                </box>

                {/* Right Panel: Top Processes */}
                <card title="Top Processes" borderColor="blue" flexGrow={1}>
                    <TableComponent
                        columns={columns}
                        rows={tableRows}
                        style={{ flexGrow: 1 }}
                        options={{ stripe: true }}
                    />
                </card>
            </box>

            {/* Footer */}
            <box flexDirection="row" height={1}>
                <text dim={true}>Controls: Press [q] to exit</text>
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

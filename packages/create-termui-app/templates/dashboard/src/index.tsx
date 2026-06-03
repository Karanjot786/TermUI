/** @jsxImportSource @termuijs/jsx */
import { render, useState, useEffect, useRef, useMemo, useKeymap, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider, useTheme } from '@termuijs/tss';
import { AppShell, Tabs } from '@termuijs/ui';
import { Box, Text, LineChart, BarChart, type BarGroup } from '@termuijs/widgets';

interface CpuMetrics {
    percent: number;
}

interface MemoryMetrics {
    percent: number;
    used: string;
    free: string;
    total: string;
    raw: { used: number; free: number; total: number };
}

interface DiskMetrics {
    percent: number;
    used: string;
    free: string;
    total: string;
}

interface ProcessInfo {
    pid: number;
    name: string;
    cpu: number;
    mem: number;
}

type OptionalDataHooks = {
    useCpu?: (intervalMs?: number) => CpuMetrics;
    useMemory?: (intervalMs?: number) => MemoryMetrics;
    useDisk?: (intervalMs?: number) => DiskMetrics;
    useTopProcesses?: (limit?: number, intervalMs?: number) => ProcessInfo[];
} | null;

let dataHooks: OptionalDataHooks = null;
try {
    const mod = (await import('@termuijs/data')) as any;
    dataHooks = {
        useCpu: mod.useCpu,
        useMemory: mod.useMemory,
        useDisk: mod.useDisk,
        useTopProcesses: mod.useTopProcesses,
    };
} catch {
    dataHooks = null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function randomStep(value: number, step: number, min: number, max: number) {
    return clamp(value + (Math.random() - 0.5) * step, min, max);
}

function useFallbackCpu(intervalMs = 1000) {
    const [metric, setMetric] = useState<CpuMetrics>({ percent: 45 });
    useEffect(() => {
        const id = setInterval(() => setMetric((current) => ({
            percent: randomStep(current.percent, 8, 5, 95),
        })), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return metric;
}

function useFallbackMemory(intervalMs = 1000) {
    const [metric, setMetric] = useState<MemoryMetrics>({
        percent: 62,
        used: '12.5 GB',
        free: '7.6 GB',
        total: '20.1 GB',
        raw: { used: 12.5 * 1024 ** 3, free: 7.6 * 1024 ** 3, total: 20.1 * 1024 ** 3 },
    });

    useEffect(() => {
        const id = setInterval(() => {
            setMetric((current) => {
                const percent = randomStep(current.percent, 5, 20, 95);
                const total = 20.1 * 1024 ** 3;
                const used = Math.round((percent / 100) * total);
                const free = total - used;
                return {
                    percent,
                    used: `${(used / 1024 ** 3).toFixed(1)} GB`,
                    free: `${(free / 1024 ** 3).toFixed(1)} GB`,
                    total: '20.1 GB',
                    raw: { used, free, total },
                };
            });
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return metric;
}

function useFallbackDisk(intervalMs = 2000) {
    const [metric, setMetric] = useState<DiskMetrics>({
        percent: 38,
        used: '120 GB',
        free: '190 GB',
        total: '310 GB',
    });

    useEffect(() => {
        const id = setInterval(() => {
            setMetric((current) => {
                const percent = randomStep(current.percent, 3, 10, 95);
                const total = 310;
                const used = Math.round((percent / 100) * total);
                const free = total - used;
                return {
                    percent,
                    used: `${used} GB`,
                    free: `${free} GB`,
                    total: '310 GB',
                };
            });
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return metric;
}

function useFallbackTopProcesses(limit = 5, intervalMs = 2000) {
    const baseline: ProcessInfo[] = [
        { pid: 3245, name: 'termui', cpu: 12.4, mem: 6.2 },
        { pid: 4190, name: 'bun', cpu: 8.1, mem: 4.0 },
        { pid: 2187, name: 'node', cpu: 4.8, mem: 3.1 },
        { pid: 9032, name: 'code', cpu: 3.6, mem: 2.8 },
        { pid: 1540, name: 'docker', cpu: 2.0, mem: 2.4 },
    ];

    const [list, setList] = useState<ProcessInfo[]>(baseline.slice(0, limit));

    useEffect(() => {
        const id = setInterval(() => {
            setList((current) => current.map((proc) => ({
                ...proc,
                cpu: clamp(proc.cpu + (Math.random() - 0.5) * 2.5, 0.1, 30),
                mem: clamp(proc.mem + (Math.random() - 0.5) * 1.5, 0.1, 16),
            })));
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return list;
}

function useOptionalCpu(intervalMs = 1000) {
    return dataHooks?.useCpu ? dataHooks.useCpu(intervalMs) : useFallbackCpu(intervalMs);
}

function useOptionalMemory(intervalMs = 1000) {
    return dataHooks?.useMemory ? dataHooks.useMemory(intervalMs) : useFallbackMemory(intervalMs);
}

function useOptionalDisk(intervalMs = 2000) {
    return dataHooks?.useDisk ? dataHooks.useDisk(intervalMs) : useFallbackDisk(intervalMs);
}

function useOptionalTopProcesses(limit = 5, intervalMs = 2000) {
    return dataHooks?.useTopProcesses ? dataHooks.useTopProcesses(limit, intervalMs) : useFallbackTopProcesses(limit, intervalMs);
}

function createMetricCard(title: string, value: string, detail: string, colorName?: string) {
    const card = new Box({ flexDirection: 'column', border: 'single', padding: 1, flexGrow: 1, minWidth: 20, minHeight: 6 });
    card.addChild(new Text(title, { color: colorName ?? 'white', bold: true }));
    card.addChild(new Text(value, { bold: true, marginTop: 1 } as any));
    card.addChild(new Text(detail, { dim: true, marginTop: 1 } as any));
    return card;
}

function createProcessRow(proc: ProcessInfo) {
    const row = new Box({ flexDirection: 'row', gap: 2, padding: 0 });
    row.addChild(new Text(String(proc.pid), { color: 'cyan' }));
    row.addChild(new Text(proc.name, { color: 'white', bold: true }));
    row.addChild(new Text(`${proc.cpu.toFixed(1)}% CPU`, { color: 'green' }));
    row.addChild(new Text(`${proc.mem.toFixed(1)}% MEM`, { color: 'yellow' }));
    return row;
}

function Dashboard() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);
    const [requestHistory, setRequestHistory] = useState<number[]>(() => Array.from({ length: 18 }, () => 20 + Math.random() * 35));
    const [errorCount, setErrorCount] = useState(5);
    const [processMetric, setProcessMetric] = useState(46);

    const cpu = useOptionalCpu(1000);
    const memory = useOptionalMemory(1000);
    const disk = useOptionalDisk(2000);
    const topProcesses = useOptionalTopProcesses(5, 2500);

    const lineChartRef = useRef<LineChart | null>(null);
    if (!lineChartRef.current) {
        lineChartRef.current = new LineChart(requestHistory, { flexGrow: 1 }, { min: 0, max: 100, showYAxis: true, color: { type: 'named', name: 'cyan' } });
    } else {
        lineChartRef.current.setData(requestHistory);
    }

    const barChartData: BarGroup[] = [
        {
            label: 'Health',
            bars: [
                { value: errorCount, label: 'Errors', color: { type: 'named', name: 'red' } },
                { value: processMetric, label: 'Processes', color: { type: 'named', name: 'yellow' } },
            ],
        },
    ];

    const barChartRef = useRef<BarChart | null>(null);
    if (!barChartRef.current) {
        barChartRef.current = new BarChart(barChartData, { flexGrow: 1 }, { direction: 'horizontal', barWidth: 1, barGap: 1, max: 100 });
    } else {
        barChartRef.current.setData(barChartData);
    }

    const tabs = useMemo(() => new Tabs([
        { label: 'Overview', content: new Box({ flexGrow: 1 }) },
        { label: 'Processes', content: new Box({ flexGrow: 1 }) },
    ]), []);

    useEffect(() => {
        tabs.selectTab(activeTab);
    }, [activeTab, tabs]);

    useEffect(() => {
        const id = setInterval(() => {
            setRequestHistory((current) => {
                const next = [...current, clamp(20 + Math.random() * 45, 5, 95)];
                return next.length > 20 ? next.slice(next.length - 20) : next;
            });
            setErrorCount((current) => Math.max(0, Math.min(100, current + Math.round((Math.random() - 0.5) * 6))));
            setProcessMetric((current) => Math.max(12, Math.min(96, current + Math.round((Math.random() - 0.5) * 4))));
        }, 1200);
        return () => clearInterval(id);
    }, []);

    const header = useMemo(() => new Box({ flexDirection: 'row', border: 'single', padding: 1, gap: 2 }), []);
    useEffect(() => {
        header.clearChildren();
        header.addChild(new Text('Live Dashboard', { bold: true, color: theme.colors.primary }));
        header.addChild(new Text('Overview / Processes', { dim: true }));
        header.addChild(new Text(`Data ${dataHooks ? 'hooks' : 'fallback'}`, { color: dataHooks ? 'green' : 'yellow' }));
    }, [dataHooks, header, theme.colors.primary]);

    const footer = useMemo(() => new Box({ flexDirection: 'row', border: 'single', padding: 1, gap: 2 }), []);
    useEffect(() => {
        footer.clearChildren();
        footer.addChild(new Text('q: quit', { dim: true }));
        footer.addChild(new Text('Tab: switch tabs', { dim: true }));
        footer.addChild(new Text('r: refresh metrics', { dim: true }));
    }, [footer]);

    const main = useMemo(() => new Box({ flexDirection: 'column', gap: 1, padding: 1, flexGrow: 1 }), []);
    useEffect(() => {
        main.clearChildren();

        const metricsRow = new Box({ flexDirection: 'row', gap: 1, flexGrow: 1 });
        metricsRow.addChild(createMetricCard('CPU', `${Math.round(cpu.percent)}%`, `Load`, 'cyan'));
        metricsRow.addChild(createMetricCard('Memory', `${Math.round(memory.percent)}%`, `${memory.used} used`, 'magenta'));
        metricsRow.addChild(createMetricCard('Disk', `${Math.round(disk.percent)}%`, `${disk.used} used`, 'yellow'));
        metricsRow.addChild(createMetricCard('Processes', `${topProcesses.length}`, `${processMetric} active`, 'green'));

        const chartRow = new Box({ flexDirection: 'row', gap: 1, flexGrow: 1 });
        const lineChartPanel = new Box({ flexDirection: 'column', border: 'single', padding: 1, flexGrow: 1 });
        lineChartPanel.addChild(new Text('Requests / History', { bold: true, color: 'cyan' }));
        lineChartPanel.addChild(lineChartRef.current!);

        const barChartPanel = new Box({ flexDirection: 'column', border: 'single', padding: 1, flexGrow: 1 });
        barChartPanel.addChild(new Text('Errors / Process Load', { bold: true, color: 'red' }));
        barChartPanel.addChild(barChartRef.current!);

        chartRow.addChild(lineChartPanel);
        chartRow.addChild(barChartPanel);

        const overviewPanel = new Box({ flexDirection: 'column', gap: 1, flexGrow: 1 });
        overviewPanel.addChild(metricsRow);
        overviewPanel.addChild(chartRow);

        const processesPanel = new Box({ flexDirection: 'column', gap: 1, flexGrow: 1 });
        processesPanel.addChild(new Text('Top Processes', { bold: true, color: theme.colors.primary }));
        topProcesses.forEach((proc) => processesPanel.addChild(createProcessRow(proc)));

        main.addChild(tabs);
        main.addChild(activeTab === 0 ? overviewPanel : processesPanel);
    }, [activeTab, cpu.percent, memory.percent, memory.used, disk.percent, disk.used, processMetric, topProcesses, lineChartRef, barChartRef, theme.colors.primary]);

    const shell = useMemo(() => new AppShell({ header, footer, main }), [header, footer, main]);

    useKeymap([
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
        { key: 'tab', action: () => setActiveTab((current) => (current + 1) % 2), description: 'Next tab' },
        { key: 'tab', shift: true, action: () => setActiveTab((current) => (current + 1) % 2), description: 'Previous tab' },
        { key: 'r', action: () => setRequestHistory((current) => [...current]), description: 'Refresh data' },
    ]);

    return shell;
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => {
                const errorBox = new Box({ border: 'single', padding: 1 });
                errorBox.addChild(new Text('Dashboard Error', { color: 'red', bold: true }));
                errorBox.addChild(new Text(err.message, { color: 'red' }));
                return errorBox;
            }}>
                <Dashboard />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '{{name}} Dashboard' });

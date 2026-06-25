import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { h } from '@termuijs/jsx';

// 1. Mock all the data providers
const mockCpu = {
    percent: 15,
    perCore: [10, 20],
    loadAvg: [1.5, 2.0, 2.5],
    model: 'Intel',
    count: 2,
    speed: 3000,
};

const mockMemory = {
    percent: 45,
    used: '4GB',
    free: '4GB',
    total: '8GB',
    raw: { used: 4000, free: 4000, total: 8000 },
};

const mockDisk = {
    percent: 60,
    partitions: [{ filesystem: '/dev/sda1', size: '20G', used: '12G', available: '8G', percent: 60, mountpoint: '/' }],
    main: { filesystem: '/dev/sda1', size: '20G', used: '12G', available: '8G', percent: 60, mountpoint: '/' },
};

const mockNetwork = {
    interfaces: [{ name: 'eth0', address: '192.168.1.1', family: 'IPv4', internal: false }],
    ip: '192.168.1.1',
    hostname: 'myhost',
};

const mockProcesses = {
    top: (n: number) => [{ pid: 123, name: 'node', cpu: 5.0, mem: 1.0, user: 'pro' }].slice(0, n),
};

const mockSystem = {
    platform: 'linux',
    release: '1.0',
    type: 'Linux',
    hostname: 'myhost',
    uptime: '1h',
    uptimeSeconds: 3600,
    user: 'pro',
    arch: 'x64',
    nodeVersion: 'v18.0.0',
};

const mockHttp = {
    checkAll: vi.fn().mockResolvedValue([{ name: 'test', url: 'http://test.com', status: 'up', latency: 10, statusCode: 200 }]),
};

vi.mock('./cpu.js', () => ({ cpu: mockCpu }));
vi.mock('./memory.js', () => ({ memory: mockMemory }));
vi.mock('./disk.js', () => ({ disk: mockDisk }));
vi.mock('./network.js', () => ({ network: mockNetwork }));
vi.mock('./processes.js', () => ({ processes: mockProcesses }));
vi.mock('./system.js', () => ({ system: mockSystem }));
vi.mock('./http.js', () => ({ http: mockHttp }));

// Setup fake timers before importing the module
vi.useFakeTimers();

// 2. Import hooks now that modules are mocked
const {
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useTopProcesses,
    useSystemInfo,
    useHttpHealth,
} = await import('./hooks.js');

// Use process.nextTick to flush microtasks without relying on mocked setTimeout
const flushPromises = () => new Promise(resolve => process.nextTick(resolve));

describe('core metrics hooks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockHttp.checkAll.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('useCpu hook retrieves cpu metrics and responds to updates', async () => {
        let cpuData: any;
        function TestComponent() {
            cpuData = useCpu(1000);
            return h('text', null, 'cpu');
        }

        const screen = render(h(TestComponent, null));

        expect(cpuData).toEqual(mockCpu);

        // Update mock cpu metrics
        mockCpu.percent = 25;
        mockCpu.perCore = [20, 30];

        // Advance timer
        vi.advanceTimersByTime(1000);
        await flushPromises();

        expect(cpuData.percent).toBe(25);
        expect(cpuData.perCore).toEqual([20, 30]);

        screen.unmount();
    });

    it('useMemory hook retrieves memory metrics and responds to updates', async () => {
        let memoryData: any;
        function TestComponent() {
            memoryData = useMemory(1000);
            return h('text', null, 'memory');
        }

        const screen = render(h(TestComponent, null));

        expect(memoryData).toEqual(mockMemory);

        mockMemory.percent = 50;
        mockMemory.used = '5GB';

        vi.advanceTimersByTime(1000);
        await flushPromises();

        expect(memoryData.percent).toBe(50);
        expect(memoryData.used).toBe('5GB');

        screen.unmount();
    });

    it('useDisk hook retrieves disk metrics and responds to updates', async () => {
        let diskData: any;
        function TestComponent() {
            diskData = useDisk(5000);
            return h('text', null, 'disk');
        }

        const screen = render(h(TestComponent, null));

        expect(diskData).toEqual(mockDisk);

        mockDisk.percent = 70;

        vi.advanceTimersByTime(5000);
        await flushPromises();

        expect(diskData.percent).toBe(70);

        screen.unmount();
    });

    it('useNetwork hook retrieves network metrics and responds to updates', async () => {
        let networkData: any;
        function TestComponent() {
            networkData = useNetwork(5000);
            return h('text', null, 'network');
        }

        const screen = render(h(TestComponent, null));

        expect(networkData).toEqual(mockNetwork);

        mockNetwork.ip = '10.0.0.1';

        vi.advanceTimersByTime(5000);
        await flushPromises();

        expect(networkData.ip).toBe('10.0.0.1');

        screen.unmount();
    });

    it('useTopProcesses hook retrieves top N processes and responds to updates', async () => {
        let processesData: any;
        function TestComponent() {
            processesData = useTopProcesses(5, 2000);
            return h('text', null, 'processes');
        }

        const screen = render(h(TestComponent, null));

        expect(processesData).toEqual(mockProcesses.top(5));

        // Update processes mock
        const newProc = { pid: 456, name: 'zsh', cpu: 1.0, mem: 0.5, user: 'pro' };
        vi.spyOn(mockProcesses, 'top').mockReturnValue([newProc]);

        vi.advanceTimersByTime(2000);
        await flushPromises();

        expect(processesData).toEqual([newProc]);

        screen.unmount();
    });

    it('useSystemInfo hook retrieves static system info once', () => {
        let systemData: any;
        function TestComponent() {
            systemData = useSystemInfo();
            return h('text', null, 'system');
        }

        const screen = render(h(TestComponent, null));

        expect(systemData).toEqual(mockSystem);

        // Update mock (since it is static, it should NOT trigger updates)
        mockSystem.uptime = '2h';
        vi.advanceTimersByTime(5000);

        expect(systemData.uptime).toBe('1h'); // Preserves initial value

        screen.unmount();
    });

    it('useHttpHealth hook polls health checking and responds to updates', async () => {
        let healthData: any;
        function TestComponent() {
            healthData = useHttpHealth(['http://test.com'], 10000);
            return h('text', null, 'health');
        }

        const screen = render(h(TestComponent, null));

        expect(mockHttp.checkAll).toHaveBeenCalledTimes(1);

        await flushPromises();

        expect(healthData).toEqual([{ name: 'test', url: 'http://test.com', status: 'up', latency: 10, statusCode: 200 }]);

        // Next poll interval
        mockHttp.checkAll.mockResolvedValue([{ name: 'test', url: 'http://test.com', status: 'down', latency: 0, statusCode: 500 }]);
        
        vi.advanceTimersByTime(10000);
        await flushPromises();

        expect(mockHttp.checkAll).toHaveBeenCalledTimes(2);
        expect(healthData[0].status).toBe('down');

        screen.unmount();
    });
});

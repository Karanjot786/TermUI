import { describe, it, expect, afterEach } from "vitest";
import { render } from "@termuijs/testing";
import { h } from "@termuijs/jsx";
import {
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useSystemInfo,
    useTopProcesses,
    type CpuMetrics,
    type MemoryMetrics,
    type DiskMetrics,
    type NetworkMetrics,
    type SystemInfo,
} from "./hooks.js";

function renderHook<T>(factory: () => T) {
    let value!: T;
    function Probe() {
        value = factory();
        return h("text", null, "probe");
    }
    const screen = render(h(Probe, null));
    return {
        get current() {
            return value;
        },
        unmount: () => screen.unmount(),
    };
}

describe("data reactive hooks", () => {
    const probes = [] as Array<{ unmount: () => void }>;

    afterEach(() => {
        while (probes.length) probes.pop()?.unmount();
    });

    it("useCpu exposes a numeric metrics snapshot", () => {
        const { current, unmount } = renderHook(() => useCpu(100_000));
        probes.push({ unmount });
        const m = current as CpuMetrics;
        expect(typeof m.percent).toBe("number");
        expect(Array.isArray(m.perCore)).toBe(true);
        expect(typeof m.model).toBe("string");
    });

    it("useMemory exposes used/free/total strings", () => {
        const { current, unmount } = renderHook(() => useMemory(100_000));
        probes.push({ unmount });
        const m = current as MemoryMetrics;
        expect(typeof m.used).toBe("string");
        expect(typeof m.total).toBe("string");
        expect(typeof m.percent).toBe("number");
    });

    it("useDisk exposes partitions and percent", () => {
        const { current, unmount } = renderHook(() => useDisk(100_000));
        probes.push({ unmount });
        const m = current as DiskMetrics;
        expect(Array.isArray(m.partitions)).toBe(true);
        expect(typeof m.percent).toBe("number");
    });

    it("useNetwork exposes interface list and hostname", () => {
        const { current, unmount } = renderHook(() => useNetwork(100_000));
        probes.push({ unmount });
        const m = current as NetworkMetrics;
        expect(Array.isArray(m.interfaces)).toBe(true);
        expect(typeof m.hostname).toBe("string");
    });

    it("useSystemInfo captures a static snapshot", () => {
        const { current, unmount } = renderHook(() => useSystemInfo());
        probes.push({ unmount });
        const m = current as SystemInfo;
        expect(typeof m.platform).toBe("string");
        expect(typeof m.uptimeSeconds).toBe("number");
        expect(typeof m.nodeVersion).toBe("string");
    });

    it("useTopProcesses returns an array", () => {
        const { current, unmount } = renderHook(() => useTopProcesses(5, 100_000));
        probes.push({ unmount });
        expect(Array.isArray(current)).toBe(true);
    });
});

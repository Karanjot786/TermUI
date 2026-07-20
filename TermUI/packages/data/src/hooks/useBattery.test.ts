import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as cp from "node:child_process";

// We'll capture state updates here
let stateValues: any[] = [];
let stateSetters: any[] = [];
let effectCb: (() => (() => void) | void) | null = null;
let stateCallCount = 0;

vi.mock("@termuijs/jsx", () => ({
    useState: (initial: any) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === "function" ? initial() : initial;
        }
        if (!stateSetters[id]) {
            stateSetters[id] = vi.fn((newVal) => {
                stateValues[id] = typeof newVal === "function" ? newVal(stateValues[id]) : newVal;
            });
        }
        return [stateValues[id], stateSetters[id]];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
    useInterval: vi.fn(),
}));

const flushPromises = () => new Promise(resolve => process.nextTick(resolve));

vi.mock("node:os", () => ({
    platform: vi.fn()
}));

vi.mock("node:child_process", () => ({
    exec: vi.fn()
}));

const { useBattery } = await import("./useBattery.js");

describe("useBattery", () => {
    beforeEach(() => {
        // Reset manual mocks
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;

        vi.useFakeTimers();
        (os.platform as any).mockReturnValue("linux");

        (cp.exec as any).mockImplementation((cmd: string, opts: any, cb: any) => {
            const callback = typeof opts === 'function' ? opts : cb;
            if (cmd.includes("capacity")) {
                callback(null, "85\n", "");
            } else if (cmd.includes("status")) {
                callback(null, "Charging\n", "");
            } else {
                callback(new Error("Unknown command"), "", "");
            }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("initial state is loading", () => {
        const { data, error, loading } = useBattery(1000);
        
        expect(loading).toBe(true);
        expect(data).toBeNull();
        expect(error).toBeNull();
    });

    it("fetches data and updates state on success", async () => {
        useBattery(1000);
        
        // Execute the effect
        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        // After flush, state should be updated
        // stateValues[0] = data, stateValues[1] = error, stateValues[2] = loading
        expect(stateValues[0]).toEqual({ level: 85, charging: true });
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it("sets error when the battery provider fails", async () => {
        (cp as any).exec = vi.fn((cmd: string, opts: any, cb: any) => {
            const callback = typeof opts === 'function' ? opts : cb;
            callback(new Error("Command failed"), "", "");
        });

        useBattery(1000);
        
        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[1]).toBeInstanceOf(Error);
        expect(stateValues[1].message).toContain("Command failed");
        expect(stateValues[2]).toBe(false);
    });

    it("cleans up interval on unmount", () => {
        useBattery(1000);
        
        const cleanup = effectCb ? effectCb() : undefined;
        
        // Interval was started
        expect(vi.getTimerCount()).toBeGreaterThan(0);
        
        if (typeof cleanup === "function") {
            cleanup();
        }
        
        // Interval is cleared
        expect(vi.getTimerCount()).toBe(0);
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { subscribe, unsubscribeAll } from "./timer-pool.js";
import { SPRING_PRESETS } from "./spring.js";
import { easings } from "./transitions.js";

describe("Timer Pool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unsubscribeAll();
    vi.restoreAllMocks();
  });

  it("notifies a subscriber when the clock advances", () => {
    const subscriber = vi.fn();
    subscribe(16, subscriber);
    
    expect(subscriber).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(16);
    expect(subscriber).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(16);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it("stops notifying when unsubscribed", () => {
    const subscriber = vi.fn();
    const unsub = subscribe(16, subscriber);
    
    unsub();
    vi.advanceTimersByTime(16);
    
    expect(subscriber).not.toHaveBeenCalled();
  });
});

describe("Timer Pool — VirtualClock integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unsubscribeAll();
    vi.restoreAllMocks();
  });

  it("restores real-timer callbacks after clock is detached", () => {
    const cb = vi.fn();

    // Register a real-timer subscriber
    subscribe(50, cb);
    expect(cb).not.toHaveBeenCalled();

    // Create a minimal VirtualClock
    const clock = { now: () => 0, advance: (_ms: number) => {}, tick: () => {}, _setInterval: vi.fn(() => () => {}) };
    const restore = subscribe(clock);

    // The real timer callback should have been saved, not lost
    expect(cb).not.toHaveBeenCalled();

    // Detach the clock — real-timer callbacks should be restored
    restore();

    // Advance fake timers — the original callback should fire
    vi.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("migrates clock-registered callbacks to real timers on restore", () => {
    const periodics: Array<{ delayMs: number; cb: () => void; unsub: () => void }> = [];
    const clock = {
      now: () => 0,
      advance: (_ms: number) => {},
      tick: () => {},
      _setInterval: (delayMs: number, cb: () => void) => {
        const unsub = () => { entry.cancelled = true; };
        const entry: any = { delayMs, cb, unsub, cancelled: false };
        periodics.push(entry);
        return () => { entry.cancelled = true; };
      },
    };
    const restore = subscribe(clock);

    const cb = vi.fn();
    subscribe(100, cb);

    // Restore the clock — the subscriber should be migrated to real timers
    restore();
    periodics.length = 0;

    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("Motion Presets and Easings", () => {
  it("spring presets return the expected config", () => {
    expect(SPRING_PRESETS).toBeDefined();
    expect(SPRING_PRESETS.default).toEqual({
      tension: 170,
      friction: 26,
      mass: 1,
      precision: 0.01,
    });
    expect(SPRING_PRESETS.gentle).toBeDefined();
  });

  it("easings map inputs to outputs", () => {
    expect(easings.linear(0)).toBe(0);
    expect(easings.linear(0.5)).toBe(0.5);
    expect(easings.linear(1)).toBe(1);
  });
});
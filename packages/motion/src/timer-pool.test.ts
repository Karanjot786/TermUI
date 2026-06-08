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
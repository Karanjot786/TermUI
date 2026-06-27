// ─────────────────────────────────────────────────────
// @termuijs/motion — Timeline tests
// ─────────────────────────────────────────────────────

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Timeline, _setTimeSource } from './timeline.js';
import { subscribe as timerPoolSubscribe, unsubscribeAll } from './timer-pool.js';
import type { VirtualClock } from './virtual-clock.js';

// ── Virtual clock factory (mirrors @termuijs/testing) ─

function createVirtualClock(): VirtualClock {
    let _now = 0;
    const timers: Array<{ delay: number; next: number; cb: () => void; cancelled: boolean }> = [];

    const clock: VirtualClock = {
        now() { return _now; },
        advance(ms: number) {
            if (ms <= 0) return;
            const target = _now + ms;
            // Fire timers in chronological order within the window
            let safety = 0;
            while (safety++ < 100_000) {
                // Find the next timer due at or before target
                let earliest: typeof timers[0] | null = null;
                for (const t of timers) {
                    if (t.cancelled) continue;
                    if (t.next > target) continue;
                    if (!earliest || t.next < earliest.next) earliest = t;
                }
                if (!earliest) break;
                _now = earliest.next;
                earliest.next += earliest.delay;
                earliest.cb();
            }
            _now = target;
        },
        tick() { this.advance(16); },
        _setInterval(delayMs: number, cb: () => void): () => void {
            const entry = { delay: delayMs, next: _now + delayMs, cb, cancelled: false };
            timers.push(entry);
            return () => { entry.cancelled = true; };
        },
    };
    return clock;
}

// ── Setup / teardown ──────────────────────────────────

let clock: VirtualClock;
let restore: () => void;

beforeEach(() => {
    clock = createVirtualClock();
    restore = timerPoolSubscribe(clock);
    // Make Timeline._tick() use virtual time instead of Date.now()
    _setTimeSource(() => clock.now());
});

afterEach(() => {
    restore();
    unsubscribeAll();
    // Restore real wall-clock time
    _setTimeSource(() => Date.now());
});

// ── call() — callback markers ─────────────────────────

describe('call(fn, atMs)', () => {
    test('fires at the specified millisecond mark', () => {
        const tl = new Timeline({ duration: 1000 });
        const log: number[] = [];
        tl.call(() => log.push(clock.now()), 500);
        tl.play();

        // Advance past 500ms in one shot so the marker is crossed
        clock.advance(512); // 32 × 16ms ticks, crosses 500ms
        expect(log).toHaveLength(1);
    });

    test('does not fire before atMs', () => {
        const tl = new Timeline({ duration: 1000 });
        const fn = { called: false };
        tl.call(() => { fn.called = true; }, 800);
        tl.play();
        clock.advance(500);
        expect(fn.called).toBe(false);
    });

    test('fires exactly once per pass', () => {
        let count = 0;
        const tl = new Timeline({ loop: true, duration: 600 });
        tl.call(() => count++, 300);
        tl.play();

        clock.advance(600); // pass 1 — fires once
        expect(count).toBe(1);

        clock.advance(600); // pass 2 — fires again
        expect(count).toBe(2);
    });

    test('multiple markers fire in order', () => {
        const log: number[] = [];
        const tl = new Timeline({ duration: 1000 });
        tl.call(() => log.push(250), 250);
        tl.call(() => log.push(750), 750);
        tl.play();

        clock.advance(1000);
        expect(log).toEqual([250, 750]);
    });
});

// ── sync() — sub-timeline locking ─────────────────────

describe('sync(subTimeline, offsetMs)', () => {
    test('sub-timeline starts at correct offset', () => {
        const target = { x: 0 };
        const sub = new Timeline({ duration: 200 });
        sub.add(target, { x: [0, 100] }, { duration: 200 });

        const tl = new Timeline({ duration: 512 });
        tl.sync(sub, 96); // sub starts 96ms (6×16) into tl
        tl.play();

        // At 96ms into tl → sub at 0ms → x = 0
        clock.advance(96);
        expect(target.x).toBeCloseTo(0, 0);

        // At 192ms into tl → sub at 96ms → ~halfway
        clock.advance(96);
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(100);

        // At 304ms into tl → sub at 208ms → complete (past 200ms duration)
        clock.advance(112);
        expect(target.x).toBeCloseTo(100, 0);
    });

    test('sub-timeline does not advance before its offset', () => {
        const target = { opacity: 0 };
        const sub = new Timeline({ duration: 300 });
        sub.add(target, { opacity: [0, 1] }, { duration: 300 });

        const tl = new Timeline({ duration: 600 });
        tl.sync(sub, 200);
        tl.play();

        clock.advance(150); // before sub offset
        expect(target.opacity).toBe(0);
    });

    test('multiple synced timelines are driven independently', () => {
        const a = { x: 0 };
        const b = { y: 0 };

        const subA = new Timeline({ duration: 200 });
        subA.add(a, { x: [0, 10] }, { duration: 200 });

        const subB = new Timeline({ duration: 200 });
        subB.add(b, { y: [0, 20] }, { duration: 200 });

        const tl = new Timeline({ duration: 600 });
        tl.sync(subA, 0);
        tl.sync(subB, 200);
        tl.play();

        clock.advance(200); // subA done, subB just started
        expect(a.x).toBeCloseTo(10, 0);
        expect(b.y).toBeCloseTo(0, 0);

        clock.advance(200); // subB done
        expect(b.y).toBeCloseTo(20, 0);
    });
});

// ── alternate loop — ping-pong ────────────────────────

describe('alternate: true loop', () => {
    test('reverses direction after the first pass', () => {
        const target = { x: 0 };
        const tl = new Timeline({ loop: true, alternate: true, duration: 400 });
        tl.add(target, { x: [0, 100] }, { duration: 400 });
        tl.play();

        clock.advance(400); // end of pass 1 — forward → x=100
        expect(target.x).toBeCloseTo(100, 0);

        clock.advance(200); // midway through reverse pass → x~50
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(100);

        clock.advance(200); // end of pass 2 — back to x=0
        expect(target.x).toBeCloseTo(0, 0);
    });

    test('goes forward again after two passes', () => {
        const target = { x: 0 };
        const tl = new Timeline({ loop: true, alternate: true, duration: 200 });
        tl.add(target, { x: [0, 50] }, { duration: 200 });
        tl.play();

        clock.advance(200); // pass 1 forward
        clock.advance(200); // pass 2 backward
        clock.advance(100); // pass 3 forward — halfway
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(50);
    });

    test('non-looping timeline does NOT alternate', () => {
        const target = { x: 0 };
        const tl = new Timeline({ loop: false, alternate: true, duration: 320 });
        tl.add(target, { x: [0, 100] }, { duration: 320 });
        tl.play();

        clock.advance(320); // exactly 20×16ms ticks — completes forward pass
        expect(target.x).toBeCloseTo(100, 0);
        expect(tl.playing).toBe(false); // stopped, not reversed
    });
});

// ── live-mode auto-management ─────────────────────────

describe('live mode auto-management', () => {
    test('play() sets playing to true', () => {
        const tl = new Timeline({ duration: 200 });
        expect(tl.playing).toBe(false);
        tl.play();
        expect(tl.playing).toBe(true);
        tl.stop();
    });

    test('timeline stops playing after completion (non-loop)', () => {
        const tl = new Timeline({ duration: 200 });
        tl.play();
        clock.advance(300);
        expect(tl.playing).toBe(false);
    });

    test('pause() stops playback without resetting elapsed', () => {
        const target = { x: 0 };
        const tl = new Timeline({ duration: 500 });
        tl.add(target, { x: [0, 100] }, { duration: 500 });
        tl.play();
        clock.advance(250);
        const mid = target.x;
        tl.pause();
        clock.advance(250); // should not advance
        expect(target.x).toBeCloseTo(mid, 1);
        expect(tl.playing).toBe(false);
    });

    test('stop() resets elapsed to 0', () => {
        const tl = new Timeline({ duration: 400 });
        tl.play();
        clock.advance(200);
        tl.stop();
        expect(tl.elapsed).toBe(0);
        expect(tl.playing).toBe(false);
    });

    test('play() after stop() restarts from beginning', () => {
        const target = { x: 0 };
        const tl = new Timeline({ duration: 400 });
        tl.add(target, { x: [0, 100] }, { duration: 400 });
        tl.play();
        clock.advance(400);
        tl.stop();
        tl.play();
        clock.advance(200); // halfway again
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(100);
    });
});

// ── add() track interpolation ─────────────────────────

describe('add() — track interpolation', () => {
    test('numeric props are interpolated between from and to', () => {
        const target = { opacity: 0 };
        const tl = new Timeline({ duration: 1000 });
        tl.add(target, { opacity: [0, 1] }, { duration: 1000 });
        tl.play();

        clock.advance(500);
        expect(target.opacity).toBeGreaterThan(0);
        expect(target.opacity).toBeLessThan(1);

        clock.advance(500);
        expect(target.opacity).toBeCloseTo(1, 1);
    });

    test('track with offsetMs does not start before offset', () => {
        const target = { y: 0 };
        const tl = new Timeline({ duration: 600 });
        tl.add(target, { y: [0, 100] }, { duration: 200, offsetMs: 200 });
        tl.play();

        clock.advance(150);
        expect(target.y).toBe(0);

        clock.advance(100); // now at 250ms — track at 50ms/200ms = 25%
        expect(target.y).toBeGreaterThan(0);
    });

    test('duration is derived from tracks when not set explicitly', () => {
        const tl = new Timeline();
        tl.add({}, { x: [0, 1] }, { duration: 300, offsetMs: 100 });
        expect(tl.duration).toBe(400); // 100 + 300
    });
});
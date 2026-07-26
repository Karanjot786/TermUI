import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyframeTimeline, parseTimeOffset } from './timeline.js';

describe('parseTimeOffset', () => {
    it('returns absolute number as milliseconds', () => {
        expect(parseTimeOffset(500, 0)).toBe(500);
        expect(parseTimeOffset(1200, 500)).toBe(1200);
        expect(parseTimeOffset(-100, 0)).toBe(0);
    });

    it('parses relative timing strings (+/- offset)', () => {
        expect(parseTimeOffset('+=200ms', 500)).toBe(700);
        expect(parseTimeOffset('-=100ms', 500)).toBe(400);
        expect(parseTimeOffset('+=1s', 1000)).toBe(2000);
        expect(parseTimeOffset('-=0.5s', 2000)).toBe(1500);
    });

    it('parses numeric string values', () => {
        expect(parseTimeOffset('1000', 0)).toBe(1000);
        expect(parseTimeOffset(' 500ms ', 0)).toBe(500);
    });

    it('throws error on invalid string formats', () => {
        expect(() => parseTimeOffset('invalid-time', 0)).toThrow('Invalid keyframe time format');
    });
});

describe('KeyframeTimeline', () => {
    let targetA: { width: number; height: number };
    let targetB: { opacity: number; label: string };

    beforeEach(() => {
        targetA = { width: 10, height: 20 };
        targetB = { opacity: 0, label: 'start' };
    });

    it('adds tracks and auto-calculates total timeline duration', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 10 },
            { time: 1000, value: 50 },
        ]);

        timeline.addTrack(targetB, 'opacity', [
            { time: '+=200ms', value: 0 },
            { time: 1500, value: 1.0 },
        ]);

        expect(timeline.duration).toBe(1500);
    });

    it('interpolates numerical keyframe values linearly across ticks', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100 },
        ]);

        expect(targetA.width).toBe(0);

        timeline.tick(500);
        expect(targetA.width).toBe(50);

        timeline.tick(500);
        expect(targetA.width).toBe(100);
    });

    it('supports seeking to specific time positions', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100 },
        ]);

        timeline.seek(250);
        expect(timeline.currentTime).toBe(250);
        expect(targetA.width).toBe(25);

        timeline.seek(750);
        expect(targetA.width).toBe(75);
    });

    it('handles relative offset keyframes correctly', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 10 },
            { time: '+=500ms', value: 50 },
            { time: '+=500ms', value: 100 },
        ]);

        timeline.seek(500);
        expect(targetA.width).toBe(50);

        timeline.seek(1000);
        expect(targetA.width).toBe(100);
    });

    it('supports custom easing curves between keyframes', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100, easing: 'easeIn' },
        ]);

        timeline.seek(500);
        // easeIn at 0.5 is progress^2 = 0.25 => value = 25
        expect(targetA.width).toBeCloseTo(25, 1);
    });

    it('supports playback rate multipliers', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100 },
        ]);

        timeline.setPlaybackRate(2.0);
        timeline.tick(250); // Effective delta = 500ms
        expect(timeline.currentTime).toBe(500);
        expect(targetA.width).toBe(50);
    });

    it('supports reverse playback direction', () => {
        const timeline = new KeyframeTimeline();

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100 },
        ]);

        timeline.seek(1000);
        timeline.reverse();
        expect(timeline.isReversed).toBe(true);

        timeline.tick(400);
        expect(timeline.currentTime).toBe(600);
        expect(targetA.width).toBe(60);
    });

    it('triggers onUpdate, onComplete, and onLoop callbacks', () => {
        const onUpdate = vi.fn();
        const onComplete = vi.fn();
        const onLoop = vi.fn();

        const timeline = new KeyframeTimeline({
            onUpdate,
            onComplete,
            onLoop,
            loop: true,
        });

        timeline.addTrack(targetA, 'width', [
            { time: 0, value: 0 },
            { time: 1000, value: 100 },
        ]);

        timeline.play();
        timeline.tick(500);
        expect(onUpdate).toHaveBeenCalledWith(0.5, 500);

        timeline.tick(600); // 1100ms -> triggers loop
        expect(onLoop).toHaveBeenCalledWith(1);
    });

    it('validates target, property, and keyframes input', () => {
        const timeline = new KeyframeTimeline();

        expect(() => timeline.addTrack(null as any, 'width', [{ time: 0, value: 10 }])).toThrow('Target must be a valid object');
        expect(() => timeline.addTrack(targetA, '', [{ time: 0, value: 10 }])).toThrow('Property name is required');
        expect(() => timeline.addTrack(targetA, 'width', [])).toThrow('Keyframes array must not be empty');
        expect(() => timeline.setPlaybackRate(0)).toThrow('Playback rate must be a positive number');
    });
});

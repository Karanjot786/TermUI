import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScreenRecorder } from './recorder.js';

describe('ScreenRecorder', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    it('records frames and retrieves them with relative timestamps', () => {
        const recorder = new ScreenRecorder();
        
        recorder.recordFrame('frame1');
        vi.advanceTimersByTime(1500);
        recorder.recordFrame('frame2');
        
        const frames = recorder.getFrames();
        expect(frames.length).toBe(2);
        expect(frames[0].buffer).toBe('frame1');
        expect(frames[0].timestamp).toBe(0);
        expect(frames[1].buffer).toBe('frame2');
        expect(frames[1].timestamp).toBe(1500);
    });

    it('limits buffer size to maxFrames by evicting oldest frames', () => {
        const recorder = new ScreenRecorder({ maxFrames: 3 });
        
        recorder.recordFrame('frame1');
        recorder.recordFrame('frame2');
        recorder.recordFrame('frame3');
        recorder.recordFrame('frame4');
        
        const frames = recorder.getFrames();
        expect(frames.length).toBe(3);
        expect(frames[0].buffer).toBe('frame2');
        expect(frames[2].buffer).toBe('frame4');
    });

    it('returns a new array copy from getFrames', () => {
        const recorder = new ScreenRecorder();
        recorder.recordFrame('frame1');
        
        const frames1 = recorder.getFrames();
        const frames2 = recorder.getFrames();
        
        expect(frames1).not.toBe(frames2);
        expect(frames1).toEqual(frames2);
    });

    it('clears state and resets elapsed timer on clear()', () => {
        const recorder = new ScreenRecorder();
        recorder.recordFrame('frame1');
        vi.advanceTimersByTime(1000);
        
        recorder.clear();
        expect(recorder.getFrames().length).toBe(0);
        
        recorder.recordFrame('frame2');
        expect(recorder.getFrames()[0].timestamp).toBe(0);
    });

    it('respects enabled flag and environment variable RECORD_DISABLED', () => {
        // Disabled via option
        const recorder1 = new ScreenRecorder({ enabled: false });
        recorder1.recordFrame('frame1');
        expect(recorder1.getFrames().length).toBe(0);

        // Enabled via option
        const recorder2 = new ScreenRecorder({ enabled: true });
        recorder2.recordFrame('frame1');
        expect(recorder2.getFrames().length).toBe(1);

        // Disabled via environment variable
        vi.stubEnv('RECORD_DISABLED', '1');
        const recorder3 = new ScreenRecorder();
        recorder3.recordFrame('frame1');
        expect(recorder3.getFrames().length).toBe(0);
    });

    it('exports as valid asciicast v2 JSON', () => {
        const baseTime = Date.now();
        const recorder = new ScreenRecorder();
        
        recorder.recordFrame('first line\nsecond line');
        vi.advanceTimersByTime(2500);
        recorder.recordFrame('another frame');

        const cast = recorder.toAsciicast({ title: 'My Test', width: 100, height: 30 });
        const lines = cast.split('\n');
        
        expect(lines.length).toBe(3);

        const header = JSON.parse(lines[0]);
        expect(header.version).toBe(2);
        expect(header.width).toBe(100);
        expect(header.height).toBe(30);
        expect(header.title).toBe('My Test');

        const event1 = JSON.parse(lines[1]);
        expect(event1[0]).toBe(0);
        expect(event1[1]).toBe('o');
        expect(event1[2]).toBe('first line\nsecond line');

        const event2 = JSON.parse(lines[2]);
        expect(event2[0]).toBe(2.5);
        expect(event2[1]).toBe('o');
        expect(event2[2]).toBe('another frame');
    });

    it('supports alternative exportCast signature', () => {
        const recorder = new ScreenRecorder();
        recorder.recordFrame('hello');
        const cast = recorder.exportCast(80, 24, { title: 'Overload' });
        const lines = cast.split('\n');
        const header = JSON.parse(lines[0]);
        expect(header.width).toBe(80);
        expect(header.height).toBe(24);
        expect(header.title).toBe('Overload');
    });

    it('exports to SVG correctly', () => {
        const recorder = new ScreenRecorder();
        recorder.recordFrame('line1\nline2');
        
        const svg = recorder.toSVG();
        expect(svg).toContain('<svg');
        expect(svg).toContain('line1');
        expect(svg).toContain('line2');
        expect(svg).toContain('</svg>');
    });

    it('validates maxFrames option as a positive integer', () => {
        expect(() => new ScreenRecorder({ maxFrames: 0 })).toThrow('maxFrames must be a positive integer');
        expect(() => new ScreenRecorder({ maxFrames: -5 })).toThrow('maxFrames must be a positive integer');
        expect(() => new ScreenRecorder({ maxFrames: 3.5 })).toThrow('maxFrames must be a positive integer');
        expect(() => new ScreenRecorder({ maxFrames: 10 })).not.toThrow();
    });

    it('returns a deep copy of frame objects from getFrames()', () => {
        const recorder = new ScreenRecorder();
        recorder.recordFrame('frame1');
        
        const frames = recorder.getFrames();
        expect(frames[0].buffer).toBe('frame1');
        
        // Mutate the returned frame object
        frames[0].buffer = 'modified';
        
        // Verify internal state is not modified
        const freshFrames = recorder.getFrames();
        expect(freshFrames[0].buffer).toBe('frame1');
    });
});

import { describe, it, expect } from 'vitest';
import { DevTools } from './devtools.js';

describe('DevTools frame capture', () => {
    it('setFrame stores the frame rows', () => {
        const devtools = new DevTools();
        const rows = ['Line 1', 'Line 2', 'Line 3'];
        devtools.setFrame(rows);
        const captured = devtools.captureFrame();
        expect(captured).toBe('Line 1\nLine 2\nLine 3');
    });

    it('captureFrame joins stored rows with newlines', () => {
        const devtools = new DevTools();
        const rows = ['Row A', 'Row B', 'Row C'];
        devtools.setFrame(rows);
        const captured = devtools.captureFrame();
        expect(captured).toContain('\n');
        expect(captured.split('\n').length).toBe(3);
    });

    it('captureFrame trims trailing blank rows before joining', () => {
        const devtools = new DevTools();
        const rows = ['Line 1', 'Line 2', '', '   ', '\t'];
        devtools.setFrame(rows);
        const captured = devtools.captureFrame();
        expect(captured).toBe('Line 1\nLine 2');
    });

    it('captureFrame returns empty string if no frame has been stored', () => {
        const devtools = new DevTools();
        const captured = devtools.captureFrame();
        expect(captured).toBe('');
    });

    it('captureFrame returns empty string if frame contains only blank rows', () => {
        const devtools = new DevTools();
        const rows = ['', '   ', '\t', '\n'];
        devtools.setFrame(rows);
        const captured = devtools.captureFrame();
        expect(captured).toBe('');
    });

    it('captureFrame handles single row correctly', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Single line']);
        expect(devtools.captureFrame()).toBe('Single line');
    });

    it('captureFrame preserves internal whitespace in rows', () => {
        const devtools = new DevTools();
        const rows = ['  indented  ', 'normal', '   spaces   '];
        devtools.setFrame(rows);
        const captured = devtools.captureFrame();
        expect(captured).toBe('  indented  \nnormal\n   spaces   ');
    });
});

describe('DevTools screenshot filename', () => {
    it('screenshotFilename is deterministic for a fixed timestamp', () => {
        const devtools = new DevTools();
        const filename1 = devtools.screenshotFilename(0);
        const filename2 = devtools.screenshotFilename(0);
        expect(filename1).toBe(filename2);
    });

    it('screenshotFilename(0) always returns the same value', () => {
        const devtools1 = new DevTools();
        const devtools2 = new DevTools();
        expect(devtools1.screenshotFilename(0)).toBe(devtools2.screenshotFilename(0));
    });

    it('screenshotFilename contains "termui-frame"', () => {
        const devtools = new DevTools();
        const filename = devtools.screenshotFilename(1234567890);
        expect(filename).toContain('termui-frame');
    });

    it('screenshotFilename ends with ".txt"', () => {
        const devtools = new DevTools();
        const filename = devtools.screenshotFilename(1234567890);
        expect(filename).toMatch(/\.txt$/);
    });

    it('screenshotFilename includes timestamp when provided', () => {
        const devtools = new DevTools();
        const timestamp = 9876543210;
        const filename = devtools.screenshotFilename(timestamp);
        expect(filename).toContain(String(timestamp));
    });

    it('screenshotFilename uses current time when no timestamp provided', () => {
        const devtools = new DevTools();
        const before = Date.now();
        const filename = devtools.screenshotFilename();
        const after = Date.now();
        
        // Extract timestamp from filename and verify it's in expected range
        const match = filename.match(/termui-frame-(\d+)\.txt/);
        expect(match).not.toBeNull();
        const extractedTimestamp = Number(match![1]);
        expect(extractedTimestamp).toBeGreaterThanOrEqual(before);
        expect(extractedTimestamp).toBeLessThanOrEqual(after);
    });

    it('different timestamps produce different filenames', () => {
        const devtools = new DevTools();
        const filename1 = devtools.screenshotFilename(100);
        const filename2 = devtools.screenshotFilename(200);
        expect(filename1).not.toBe(filename2);
    });
});

describe('DevTools frame lifecycle', () => {
    it('setFrame updates captureFrame output', () => {
        const devtools = new DevTools();
        devtools.setFrame(['First frame']);
        expect(devtools.captureFrame()).toBe('First frame');
        
        devtools.setFrame(['Second frame']);
        expect(devtools.captureFrame()).toBe('Second frame');
    });

    it('setFrame replaces previous frame data', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Old', 'Frame']);
        devtools.setFrame(['New', 'Frame']);
        expect(devtools.captureFrame()).toBe('New\nFrame');
    });

    it('setFrame with empty array results in empty captureFrame', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Some', 'Frame']);
        devtools.setFrame([]);
        expect(devtools.captureFrame()).toBe('');
    });
});

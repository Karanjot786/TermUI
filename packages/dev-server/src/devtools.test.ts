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

describe('DevTools frame immutability', () => {
    it('mutating the original array after setFrame does not alter captured output', () => {
        const devtools = new DevTools();
        const rows = ['Line 1', 'Line 2', 'Line 3'];
        devtools.setFrame(rows);

        // Capture before mutation
        const before = devtools.captureFrame();

        // Mutate the original array in several ways
        rows.push('Line 4');
        rows[0] = 'CHANGED';

        // Captured output must reflect the state at the time setFrame was called
        const after = devtools.captureFrame();
        expect(after).toBe(before);
        expect(after).toBe('Line 1\nLine 2\nLine 3');
    });
});

describe('DevTools internal blank line preservation', () => {
    it('preserves blank rows between content rows while trimming trailing blank rows', () => {
        const devtools = new DevTools();
        // The middle row is intentionally empty — it should be kept.
        // The final two rows are blank — they should be trimmed.
        devtools.setFrame(['Line 1', '', 'Line 3', '', '']);
        const captured = devtools.captureFrame();
        expect(captured).toBe('Line 1\n\nLine 3');
    });

    it('preserves multiple consecutive internal blank rows', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Top', '', '', 'Bottom', '']);
        const captured = devtools.captureFrame();
        expect(captured).toBe('Top\n\n\nBottom');
    });
});

describe('DevTools repeated capture consistency', () => {
    it('captureFrame returns identical output on repeated calls without frame mutation', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Alpha', 'Beta', 'Gamma']);

        const first  = devtools.captureFrame();
        const second = devtools.captureFrame();
        const third  = devtools.captureFrame();

        expect(second).toBe(first);
        expect(third).toBe(first);
    });

    it('repeated captureFrame calls do not modify internal state', () => {
        const devtools = new DevTools();
        devtools.setFrame(['Row 1', 'Row 2', '']);

        // Call many times
        for (let i = 0; i < 10; i++) {
            devtools.captureFrame();
        }

        // The result after many reads must still be correct
        expect(devtools.captureFrame()).toBe('Row 1\nRow 2');
    });
});

describe('DevTools large frame handling', () => {
    it('stores and captures a large number of rows without truncation or corruption', () => {
        const devtools = new DevTools();
        const rowCount = 2000;
        const rows = Array.from({ length: rowCount }, (_, i) => `Row ${i}`);
        devtools.setFrame(rows);

        const captured = devtools.captureFrame();
        const lines = captured.split('\n');

        expect(lines.length).toBe(rowCount);
        for (let i = 0; i < rowCount; i++) {
            expect(lines[i]).toBe(`Row ${i}`);
        }
    });

    it('large frame with trailing blanks trims only trailing rows', () => {
        const devtools = new DevTools();
        const contentRows = Array.from({ length: 500 }, (_, i) => `Content ${i}`);
        const trailingBlanks = Array.from({ length: 50 }, () => '');
        devtools.setFrame([...contentRows, ...trailingBlanks]);

        const captured = devtools.captureFrame();
        const lines = captured.split('\n');

        expect(lines.length).toBe(500);
        expect(lines[0]).toBe('Content 0');
        expect(lines[499]).toBe('Content 499');
    });
});

describe('DevTools timestamp edge cases', () => {
    it('screenshotFilename handles a negative timestamp deterministically', () => {
        const devtools = new DevTools();
        // JavaScript's template literal will stringify -1 as "-1"
        const filename = devtools.screenshotFilename(-1);
        expect(filename).toBe('termui-frame--1.txt');
        // Calling again with the same value must return the same string
        expect(devtools.screenshotFilename(-1)).toBe(filename);
    });

    it('screenshotFilename handles a floating-point timestamp deterministically', () => {
        const devtools = new DevTools();
        // Template literal coercion of 123.456 yields "123.456"
        const filename = devtools.screenshotFilename(123.456);
        expect(filename).toBe('termui-frame-123.456.txt');
        expect(devtools.screenshotFilename(123.456)).toBe(filename);
    });

    it('screenshotFilename handles zero timestamp', () => {
        const devtools = new DevTools();
        expect(devtools.screenshotFilename(0)).toBe('termui-frame-0.txt');
    });

    it('screenshotFilename handles very large timestamp', () => {
        const devtools = new DevTools();
        const large = Number.MAX_SAFE_INTEGER; // 9007199254740991
        const filename = devtools.screenshotFilename(large);
        expect(filename).toContain(String(large));
        expect(filename).toMatch(/\.txt$/);
    });
});

describe('DevTools filename stability', () => {
    it('same timestamp always generates the same filename across multiple calls', () => {
        const devtools = new DevTools();
        const ts = 1717200000000;

        const results = Array.from({ length: 5 }, () => devtools.screenshotFilename(ts));
        for (const result of results) {
            expect(result).toBe(results[0]);
        }
    });

    it('same timestamp produces the same filename across separate DevTools instances', () => {
        const ts = 1717200000000;
        const instances = Array.from({ length: 3 }, () => new DevTools());
        const filenames = instances.map(d => d.screenshotFilename(ts));

        const unique = new Set(filenames);
        expect(unique.size).toBe(1);
    });

    it('filename format is always termui-frame-<timestamp>.txt', () => {
        const devtools = new DevTools();
        const timestamps = [0, 1, 999, 1_000_000, 1_700_000_000_000];
        for (const ts of timestamps) {
            expect(devtools.screenshotFilename(ts)).toBe(`termui-frame-${ts}.txt`);
        }
    });
});

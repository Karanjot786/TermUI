import { describe, it, expect } from 'vitest';
import { TerminalTestDriver } from './terminal-driver.js';

describe('TerminalTestDriver', () => {
    it('parses plain text output and updates cursor position', () => {
        const driver = new TerminalTestDriver({ width: 80, height: 24 });
        driver.write('Hello World');

        expect(driver.cursorX).toBe(11);
        expect(driver.cursorY).toBe(0);
        expect(driver.getLine(0)).toBe('Hello World');
    });

    it('parses ANSI SGR red bold formatting', () => {
        const driver = new TerminalTestDriver({ width: 80, height: 24 });
        driver.write('\x1b[31;1mHeader Text\x1b[0m');

        const cell = driver.getCell(0, 0);
        expect(cell.char).toBe('H');
        expect(cell.fg).toBe('red');
        expect(cell.bold).toBe(true);

        const resetCell = driver.getCell(11, 0); // After reset
        expect(resetCell.char).toBe(' ');
        expect(resetCell.fg).toBeUndefined();
        expect(resetCell.bold).toBeUndefined();
    });

    it('handles cursor positioning sequences', () => {
        const driver = new TerminalTestDriver({ width: 80, height: 24 });
        driver.write('Line 1\nLine 2');
        expect(driver.getLine(0)).toBe('Line 1');
        expect(driver.getLine(1)).toBe('Line 2');

        driver.write('\x1b[HHi'); // Move cursor to (0,0) and overwrite
        expect(driver.getLine(0)).toBe('Hine 1');
    });

    it('asserts region content correctly', () => {
        const driver = new TerminalTestDriver({ width: 80, height: 24 });
        driver.write('Status: OK\nErrors: 0');

        expect(() => {
            driver.assertRegion(0, 0, 10, 2, 'Status: OK\nErrors: 0');
        }).not.toThrow();

        expect(() => {
            driver.assertRegion(0, 0, 10, 1, 'Status: FAIL');
        }).toThrow(/assertRegion failed/);
    });

    it('clears terminal buffer', () => {
        const driver = new TerminalTestDriver({ width: 80, height: 24 });
        driver.write('Some text');
        expect(driver.getLine(0)).toBe('Some text');

        driver.clear();
        expect(driver.getLine(0)).toBe('');
        expect(driver.cursorX).toBe(0);
        expect(driver.cursorY).toBe(0);
    });
});

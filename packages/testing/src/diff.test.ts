import { describe, it, expect, vi, afterEach } from 'vitest';
import { diffSnapshots, SnapshotReporter } from './diff.js';
import * as fs from 'node:fs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

describe('diffSnapshots', () => {
    it('returns exact match without markers', () => {
        const expected = 'hello world';
        const actual = 'hello world';
        expect(diffSnapshots(expected, actual)).toBe('hello world');
    });

    it('highlights character insertion', () => {
        const expected = 'hello world';
        const actual = 'hello! world';
        const expectedDiff = `hello${GREEN}[+!+]${RESET} world`;
        expect(diffSnapshots(expected, actual)).toBe(expectedDiff);
    });

    it('highlights character deletion', () => {
        const expected = 'hello world';
        const actual = 'helo world';
        const expectedDiff = `he${RED}[-l-]${RESET}lo world`;
        expect(diffSnapshots(expected, actual)).toBe(expectedDiff);
    });

    it('highlights character replacement', () => {
        const expected = 'hello world';
        const actual = 'hello word';
        const expectedDiff = `hello wor${RED}[-l-]${RESET}d`;
        expect(diffSnapshots(expected, actual)).toBe(expectedDiff);
    });

    it('handles multi-line diff', () => {
        const expected = 'Line 1\nLine 2';
        const actual = 'Line 1\nLine 3';
        const expectedDiff = `Line 1\nLine ${RED}[-2-]${RESET}${GREEN}[+3+]${RESET}`;
        expect(diffSnapshots(expected, actual)).toBe(expectedDiff);
    });
});

describe('SnapshotReporter', () => {
    const tempDir = './.test-snapshots-tmp';
    const tempFile = `${tempDir}/snap.txt`;

    afterEach(() => {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    });

    it('writes a snapshot file', () => {
        const reporter = new SnapshotReporter();
        reporter.writeSnapshot(tempFile, 'new content');
        
        expect(fs.existsSync(tempFile)).toBe(true);
        expect(fs.readFileSync(tempFile, 'utf8')).toBe('new content');
    });

    it('reads a snapshot file successfully', () => {
        fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(tempFile, 'mocked snapshot content', 'utf8');
        
        const reporter = new SnapshotReporter();
        const content = reporter.readSnapshot(tempFile);
        
        expect(content).toBe('mocked snapshot content');
    });

    it('returns null when snapshot file does not exist', () => {
        const reporter = new SnapshotReporter();
        const content = reporter.readSnapshot('path/to/nonexistent/snap.txt');
        expect(content).toBeNull();
    });

    it('compares expected and actual using diffSnapshots', () => {
        const reporter = new SnapshotReporter();
        const expected = 'hello world';
        const actual = 'hello word';
        
        const expectedDiff = `hello wor${RED}[-l-]${RESET}d`;
        expect(reporter.compare(expected, actual)).toBe(expectedDiff);
    });
});

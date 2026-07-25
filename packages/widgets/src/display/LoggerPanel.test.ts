import { describe, expect, it } from 'vitest';
import { LoggerPanel } from './LoggerPanel.js';

describe('LoggerPanel', () => {
    it('creates a LoggerPanel instance', () => {
        const logger = new LoggerPanel();

        expect(logger).toBeDefined();
    });

    it('adds log entries', () => {
        const logger = new LoggerPanel();

        logger.addLog('info', 'Application started');
        logger.addLog('warning', 'Low memory');
        logger.addLog('error', 'Connection failed');

        expect(logger.getLogs()).toHaveLength(3);
    });

    it('clears all logs', () => {
        const logger = new LoggerPanel();

        logger.addLog('debug', 'Debug message');
        logger.clear();

        expect(logger.getLogs()).toHaveLength(0);
    });

    it('caps the buffer and evicts oldest entries beyond maxEntries', () => {
        const logger = new LoggerPanel({}, { maxEntries: 50 });

        for (let i = 0; i < 1000; i++) {
            logger.addLog('info', `message ${i}`);
        }

        const logs = logger.getLogs();

        expect(logs).toHaveLength(50);
        // Oldest entries should have been evicted; the buffer should hold the most recent ones.
        expect(logs[0].message).toBe('message 950');
        expect(logs[logs.length - 1].message).toBe('message 999');
    });

    it('defaults maxEntries to 1000 when not provided', () => {
        const logger = new LoggerPanel();

        for (let i = 0; i < 1500; i++) {
            logger.addLog('info', `message ${i}`);
        }

        expect(logger.getLogs()).toHaveLength(1000);
    });
});
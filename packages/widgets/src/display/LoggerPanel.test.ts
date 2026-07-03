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
});
import { describe, it, expect } from 'vitest';
import { NotificationHistory } from './NotificationHistory.js';

describe('NotificationHistory', () => {
    it('should add notifications and retrieve them in reverse chronological order', () => {
        const history = new NotificationHistory();
        const first = {
            id: '1',
            message: 'First warning',
            type: 'warning' as const,
            timestamp: new Date()
        };
        const second = {
            id: '2',
            message: 'Second info',
            type: 'info' as const,
            timestamp: new Date()
        };

        history.add(first);
        history.add(second);

        const all = history.getAll();
        expect(all).toHaveLength(2);
        // newest first (unshifted)
        expect(all[0].id).toBe('2');
        expect(all[1].id).toBe('1');
    });

    it('should search notifications by query (case-insensitive) on message and type', () => {
        const history = new NotificationHistory();
        history.add({ id: '1', message: 'Hello World', type: 'info', timestamp: new Date() });
        history.add({ id: '2', message: 'Something else', type: 'error', timestamp: new Date() });

        const search1 = history.search('world');
        expect(search1).toHaveLength(1);
        expect(search1[0].id).toBe('1');

        const search2 = history.search('error');
        expect(search2).toHaveLength(1);
        expect(search2[0].id).toBe('2');

        const search3 = history.search('nonexistent');
        expect(search3).toHaveLength(0);
    });

    it('should filter notifications by type', () => {
        const history = new NotificationHistory();
        history.add({ id: '1', message: 'Msg 1', type: 'info', timestamp: new Date() });
        history.add({ id: '2', message: 'Msg 2', type: 'error', timestamp: new Date() });
        history.add({ id: '3', message: 'Msg 3', type: 'info', timestamp: new Date() });

        const infos = history.filterByType('info');
        expect(infos).toHaveLength(2);
        expect(infos.map(i => i.id)).toContain('1');
        expect(infos.map(i => i.id)).toContain('3');

        const errors = history.filterByType('error');
        expect(errors).toHaveLength(1);
        expect(errors[0].id).toBe('2');
    });

    it('should clear notifications history', () => {
        const history = new NotificationHistory();
        history.add({ id: '1', message: 'Msg', type: 'info', timestamp: new Date() });
        expect(history.getAll()).toHaveLength(1);

        history.clear();
        expect(history.getAll()).toHaveLength(0);
    });

    it('should export logs as stringified JSON', () => {
        const history = new NotificationHistory();
        const notification = { id: '1', message: 'Test log', type: 'success' as const, timestamp: new Date('2026-07-02T00:00:00.000Z') };
        history.add(notification);

        const exported = history.exportLogs();
        expect(typeof exported).toBe('string');
        const parsed = JSON.parse(exported);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].message).toBe('Test log');
        expect(parsed[0].type).toBe('success');
    });
});

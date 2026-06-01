import { describe, test, expect, vi } from 'vitest';
import { Autocomplete } from './Autocomplete.js';

describe('Autocomplete Widget Repository Format Tests', () => {
    const mockGetOptions = vi.fn(async (query: string) => {
        const dummyDb = [
            { label: 'Delhi', value: 'del' },
            { label: 'Mumbai', value: 'mum' },
            { label: 'Jaipur', value: 'jai' }
        ];
        return dummyDb.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
    });

    test('should initialize properly with base config rules', () => {
        const widget = new Autocomplete({ getOptions: mockGetOptions });
        expect((widget as any)._query).toBe('');
        expect((widget as any)._suggestions.length).toBe(0);
    });

    test('should run async fetch workflow correctly when characters are written', async () => {
        const widget = new Autocomplete({ getOptions: mockGetOptions });
        widget.handleKey({ name: '', sequence: 'M' });
        
        // Flushes microtask queue arrays to fully await async logic resolutions
        await new Promise(process.nextTick);

        expect(mockGetOptions).toHaveBeenCalledWith('M');
        expect((widget as any)._suggestions.length).toBe(1);
        expect((widget as any)._suggestions[0].label).toBe('Mumbai');
    });

    test('should cycle selection pointers loops correctly on bound key downs', async () => {
        const widget = new Autocomplete({ getOptions: mockGetOptions });
        widget.handleKey({ name: '', sequence: 'i' }); 
        
        await new Promise(process.nextTick);
        expect((widget as any)._suggestions.length).toBe(3);
        expect((widget as any)._selectedIndex).toBe(0);

        widget.handleKey({ name: 'down', sequence: '' });
        expect((widget as any)._selectedIndex).toBe(1);
    });
});
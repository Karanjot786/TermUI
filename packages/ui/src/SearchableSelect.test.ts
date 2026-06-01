import { describe, test, expect } from 'vitest';
import { SearchableSelect } from './SearchableSelect.js';

describe('SearchableSelect Widget Tests', () => {
    const mockOptions = [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' }
    ];

    test('should initialize with empty query and correct original options count', () => {
        const widget = new SearchableSelect(mockOptions);
        expect((widget as any)._searchQuery).toBe('');
        expect((widget as any)._allOptions.length).toBe(3);
    });

    test('should filter options based on search query typing', () => {
        const widget = new SearchableSelect(mockOptions);
        widget.handleKey({ name: '', sequence: 'B' }); 
        
        expect((widget as any)._searchQuery).toBe('B');
        expect((widget as any)._options.length).toBe(1);
        expect((widget as any)._options[0].label).toBe('Banana');
    });

    test('should restore all options when query is cleared via backspace', () => {
        const widget = new SearchableSelect(mockOptions);
        widget.handleKey({ name: '', sequence: 'A' }); 
        widget.handleKey({ name: 'backspace', sequence: '' }); 

        expect((widget as any)._searchQuery).toBe('');
        expect((widget as any)._options.length).toBe(3); 
    });
});
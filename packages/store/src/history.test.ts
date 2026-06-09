import { describe, it, expect, beforeEach } from 'vitest';
import { createHistoryStore, TemporalStoreActions } from './history.js';

describe('TemporalHistory Middleware', () => {
    let store: TemporalStoreActions<string>;

    // We initialize a fresh store tracking a simple string before every single test
    beforeEach(() => {
        store = createHistoryStore('State 1');
    });

    it('initializes with the correct baseline state', () => {
        const history = store.getHistory();
        expect(store.present).toBe('State 1');
        expect(history.past).toEqual([]);
        expect(history.future).toEqual([]);
    });

    it('pushes to past and updates present on set()', () => {
        store.set('State 2');
        const history = store.getHistory();
        
        expect(store.present).toBe('State 2');
        expect(history.past).toEqual(['State 1']);
        expect(history.future).toEqual([]);
    });

    it('ignores identical consecutive state updates', () => {
        store.set('State 1');
        const history = store.getHistory();
        
        // The past stack shouldn't grow if the state didn't actually change
        expect(history.past.length).toBe(0);
    });

    it('performs undo() correctly', () => {
        store.set('State 2');
        store.set('State 3');
        
        store.undo();
        
        const history = store.getHistory();
        expect(store.present).toBe('State 2');
        expect(history.past).toEqual(['State 1']);
        expect(history.future).toEqual(['State 3']); // 3 is moved to the future
    });

    it('performs redo() correctly', () => {
        store.set('State 2');
        store.set('State 3');
        
        store.undo(); // present is 'State 2', future is ['State 3']
        store.redo();
        
        const history = store.getHistory();
        expect(store.present).toBe('State 3');
        expect(history.past).toEqual(['State 1', 'State 2']);
        expect(history.future).toEqual([]);
    });

    it('does nothing when undoing at the beginning of time (Boundary Check)', () => {
        store.undo(); // Try to undo the initial state
        const history = store.getHistory();
        
        expect(store.present).toBe('State 1');
        expect(history.past).toEqual([]);
    });

    it('does nothing when redoing at the end of time (Boundary Check)', () => {
        store.set('State 2');
        store.redo(); // Try to redo when nothing has been undone
        
        const history = store.getHistory();
        expect(store.present).toBe('State 2');
        expect(history.future).toEqual([]);
    });

    it('clears the future timeline when branching time', () => {
        store.set('State 2');
        store.set('State 3'); 
        
        // Timeline: [1, 2] -> present(3) -> future[]
        store.undo();   
        // Timeline: [1] -> present(2) -> future[3]
        
        store.set('State 4'); // The user makes a new change, destroying the old future
        
        const history = store.getHistory();
        expect(store.present).toBe('State 4');
        expect(history.past).toEqual(['State 1', 'State 2']);
        expect(history.future).toEqual([]); // 'State 3' is erased forever
    });
});
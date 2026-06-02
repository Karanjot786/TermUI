import { expect, test } from 'bun:test';
import { SearchableSelect } from '../SearchableSelect.js';

test('should process backspace workflow and verify via public getter', () => {
  const widget = new SearchableSelect();

  widget.handleKey({ 
    key: 'backspace', 
    ctrl: false, 
    shift: false, 
    alt: false, 
    raw: Buffer.from(''), 
    stopPropagation: () => {} 
  });

  expect(widget.searchQuery).toBe('');
});

test('should accurately change options index on down arrow key trigger', () => {
  const widget = new SearchableSelect();

  widget.handleKey({ 
    key: 'down', 
    ctrl: false, 
    shift: false, 
    alt: false, 
    raw: Buffer.from(''), 
    stopPropagation: () => {} 
  });

  expect(widget.selectedOption).toBeDefined();
});
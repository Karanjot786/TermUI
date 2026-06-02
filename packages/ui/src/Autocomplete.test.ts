import { expect, test } from 'vitest';
import { Autocomplete } from './Autocomplete.js';

test('should handle standard key characters correctly', () => {
  const widget = new Autocomplete();

  widget.handleKey({ 
    key: 'M', 
    ctrl: false, 
    shift: false, 
    alt: false, 
    raw: Buffer.from('M'), 
    stopPropagation: () => {},
    preventDefault: () => {},
  });
});

test('should handle control keys like down arrow in lowercase format', () => {
  const widget = new Autocomplete();

  widget.handleKey({ 
    key: 'down', 
    ctrl: false, 
    shift: false, 
    alt: false, 
    raw: Buffer.from(''), 
    stopPropagation: () => {},
    preventDefault: () => {},
  });
});
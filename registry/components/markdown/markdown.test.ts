import { describe, it, expect } from 'vitest';
import { Markdown } from './index';

describe('registry markdown', () => {
  it('exports Markdown component', () => {
    expect(typeof Markdown).toBe('function');
  });
});

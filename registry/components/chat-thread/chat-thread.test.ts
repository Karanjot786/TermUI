import { describe, it, expect } from 'vitest';
import { ChatThread } from './index';

describe('registry chat-thread', () => {
  it('exports ChatThread component', () => {
    expect(typeof ChatThread).toBe('function');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); });

describe('Carousel', () => {
  it('constructs with index 0', async () => {
    const { Carousel } = await import('./Carousel.js');
    expect(new Carousel(['A','B','C']).getIndex()).toBe(0);
  });

  it('next and prev work', async () => {
    const { Carousel } = await import('./Carousel.js');
    const c = new Carousel(['A','B','C']);
    c.next(); expect(c.getIndex()).toBe(1);
    c.prev(); expect(c.getIndex()).toBe(0);
  });

  it('loop wraps', async () => {
    const { Carousel } = await import('./Carousel.js');
    const c = new Carousel(['A','B'], {}, { loop: true });
    c.prev(); expect(c.getIndex()).toBe(1);
    c.next(); expect(c.getIndex()).toBe(0);
  });

  it('non-loop stops at ends', async () => {
    const { Carousel } = await import('./Carousel.js');
    const c = new Carousel(['A','B']);
    c.prev(); expect(c.getIndex()).toBe(0);
    c.setIndex(1); c.next(); expect(c.getIndex()).toBe(1);
  });
});

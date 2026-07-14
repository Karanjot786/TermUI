import { describe, it, expect, afterEach, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Typewriter } from './Typewriter.js';

// Helper: render a Typewriter into a fresh 20×1 screen and return row 0.
function renderRow(tw: Typewriter, width = 20): string {
  const screen = new Screen(width, 1);
  tw.updateRect({ x: 0, y: 0, width, height: 1 });
  tw.render(screen);
  return screen.back[0].map((c) => c.char).join('');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Typewriter', () => {
  it('reveals nothing before the first tick', () => {
    const tw = new Typewriter('hello');
    const row = renderRow(tw);
    // No text characters visible; cursor glyph sits at position 0.
    expect(row).not.toContain('h');
  });

  it('reveals one character per tick by default', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello');
    tw.updateRect({ x: 0, y: 0, width: 20, height: 1 });

    tw.tick();
    const screen1 = new Screen(20, 1);
    tw.render(screen1);
    const row1 = screen1.back[0].map((c) => c.char).join('');
    expect(row1).toContain('h');
    expect(row1).not.toContain('he');

    tw.tick();
    const screen2 = new Screen(20, 1);
    tw.render(screen2);
    const row2 = screen2.back[0].map((c) => c.char).join('');
    expect(row2).toContain('he');
  });

  it('reveals speed characters per tick when speed > 1', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello', {}, { speed: 2 });
    tw.tick();
    const row = renderRow(tw);
    expect(row).toContain('he');
    expect(row).not.toContain('hel');
  });

  it('matches the spec snippet: two ticks on "hello" contain "he"', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const screen = new Screen(20, 1);
    const tw = new Typewriter('hello');
    tw.updateRect({ x: 0, y: 0, width: 20, height: 1 });
    tw.tick();
    tw.tick();
    tw.render(screen);
    const row = screen.back[0].map((c) => c.char).join('');
    expect(row).toContain('he');
  });

  it('tick past the end stops at the full text (no-op)', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hi');
    // Two ticks to fully reveal "hi".
    tw.tick();
    tw.tick();
    // Third tick must be a no-op.
    tw.tick();
    const row = renderRow(tw);
    // Full text present, no cursor glyph.
    expect(row).toContain('hi');
  });

  it('does not render cursor once fully revealed', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    const tw = new Typewriter('hi');
    tw.tick();
    tw.tick(); // fully revealed
    const row = renderRow(tw);
    expect(row).not.toContain('▋');
  });

  it('renders cursor glyph while text is being revealed (unicode)', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello');
    tw.tick(); // reveals 'h', cursor follows
    const row = renderRow(tw);
    expect(row).toContain('▋');
  });

  it('renders ASCII fallback cursor when caps.unicode is false', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
    const tw = new Typewriter('hello');
    tw.tick();
    const row = renderRow(tw);
    expect(row).toContain('_');
    expect(row).not.toContain('▋');
  });

  it('reset returns the revealed count to zero', () => {
    const tw = new Typewriter('hello');
    tw.tick();
    tw.tick();
    tw.tick();
    tw.reset();
    const row = renderRow(tw);
    // After reset nothing is revealed.
    expect(row).not.toContain('h');
  });

  it('setText replaces text and resets reveal counter', () => {
    const tw = new Typewriter('hello');
    tw.tick();
    tw.tick();
    tw.setText('world');
    const row = renderRow(tw);
    // Counter reset — no 'w' visible yet.
    expect(row).not.toContain('w');
    // Old text gone.
    expect(row).not.toContain('h');
  });

  it('setText then tick reveals new text', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello');
    tw.tick();
    tw.setText('world');
    tw.tick();
    const row = renderRow(tw);
    expect(row).toContain('w');
  });

  it('respects a caller-supplied cursor string', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello', {}, { cursor: '|' });
    tw.tick();
    const row = renderRow(tw);
    expect(row).toContain('|');
  });

  it('truncates content to the available width', () => {
    const tw = new Typewriter('abcdefghij'); // 10 chars
    // Tick 10 times to fully reveal.
    for (let i = 0; i < 10; i++) tw.tick();
    // Render into a 5-wide screen.
    const screen = new Screen(5, 1);
    tw.updateRect({ x: 0, y: 0, width: 5, height: 5 });
    tw.render(screen);
    const row = screen.back[0].map((c) => c.char).join('');
    expect(row.length).toBe(5);
    expect(row).toContain('abcde');
  });

  it('renders nothing when width is zero', () => {
    const tw = new Typewriter('hello');
    tw.tick();
    const screen = new Screen(20, 1);
    tw.updateRect({ x: 0, y: 0, width: 0, height: 1 });
    tw.render(screen);
    // Screen untouched — all cells remain default space chars.
    const row = screen.back[0].map((c) => c.char).join('');
    expect(row.trim()).toBe('');
  });

  it('reveals all text immediately when reduced motion is preferred', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(false);

    const tw = new Typewriter('hello');

    tw.tick();

    const row = renderRow(tw);

    expect(row).toContain('hello');
    expect(row).not.toContain('▋');
    expect(row).not.toContain('_');
  });

  it('returns correct text via getText and does not reset reveal count when same text is set', () => {
    vi.spyOn(caps, 'motion', 'get').mockReturnValue(true);
    const tw = new Typewriter('hello');
    expect(tw.getText()).toBe('hello');

    tw.tick();
    expect(renderRow(tw)).toContain('h');

    // Setting same text should not reset progress
    tw.setText('hello');
    expect(renderRow(tw)).toContain('h');

    // Setting different text resets progress
    tw.setText('world');
    expect(renderRow(tw)).not.toContain('w');
  });
});

import { describe, it, expect } from 'bun:test';
import { GridLayoutManager } from '../src/layout/gridLayout';

describe('GridLayoutManager Unit Tests', () => {
  it('should parse track specifications correctly', () => {
    const tracks = GridLayoutManager.parseTrackSpec('100px 1fr 50% auto');
    expect(tracks).toEqual([
      { value: 100, unit: 'px' },
      { value: 1, unit: 'fr' },
      { value: 50, unit: 'percent' },
      { value: 0, unit: 'auto' },
    ]);
  });

  it('should compute track sizes for mixed px, percent, and fr tracks', () => {
    const tracks = GridLayoutManager.parseTrackSpec('20px 50% 1fr');
    // Total 100px. Fixed 20px, 50% = 50px. Remaining = 30px -> 1fr gets 30px.
    const sizes = GridLayoutManager.computeTrackSizes(100, tracks);
    expect(sizes).toEqual([20, 50, 30]);
  });

  it('should compute equal track sizes for multiple fr tracks', () => {
    const tracks = GridLayoutManager.parseTrackSpec('1fr 2fr');
    const sizes = GridLayoutManager.computeTrackSizes(90, tracks);
    expect(sizes).toEqual([30, 60]);
  });

  it('should calculate correct cell rectangle coordinates', () => {
    const colSizes = [20, 30, 50];
    const rowSizes = [10, 15];

    const rect = GridLayoutManager.getCellRect(1, 1, colSizes, rowSizes, { x: 5, y: 5 });
    expect(rect).toEqual({
      x: 25, // 5 + 20
      y: 15, // 5 + 10
      width: 30,
      height: 15,
    });
  });
});

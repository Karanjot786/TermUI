export type TrackUnit = 'auto' | 'px' | 'percent' | 'fr';

export interface TrackSpec {
  value: number;
  unit: TrackUnit;
}

export interface GridCellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class GridLayoutManager {
  /**
   * Parse a track specification string like "100px 1fr 50% auto".
   */
  static parseTrackSpec(specStr: string): TrackSpec[] {
    const tokens = specStr.trim().split(/\s+/).filter(Boolean);
    return tokens.map((token) => {
      if (token === 'auto') return { value: 0, unit: 'auto' };
      if (token.endsWith('px')) {
        return { value: parseFloat(token.slice(0, -2)) || 0, unit: 'px' };
      }
      if (token.endsWith('%')) {
        return { value: parseFloat(token.slice(0, -1)) || 0, unit: 'percent' };
      }
      if (token.endsWith('fr')) {
        return { value: parseFloat(token.slice(0, -2)) || 1, unit: 'fr' };
      }
      const num = parseFloat(token);
      return isNaN(num) ? { value: 0, unit: 'auto' } : { value: num, unit: 'px' };
    });
  }

  /**
   * Calculate track sizes given total container size and track specifications.
   */
  static computeTrackSizes(totalSize: number, tracks: TrackSpec[]): number[] {
    if (tracks.length === 0) return [];

    const sizes = new Array<number>(tracks.length).fill(0);
    let remainingSize = totalSize;
    let totalFr = 0;

    // First pass: allocate fixed px and percentage units
    tracks.forEach((track, i) => {
      if (track.unit === 'px') {
        sizes[i] = Math.max(0, Math.min(remainingSize, track.value));
        remainingSize -= sizes[i];
      } else if (track.unit === 'percent') {
        const allocated = Math.floor((totalSize * track.value) / 100);
        sizes[i] = Math.max(0, Math.min(remainingSize, allocated));
        remainingSize -= sizes[i];
      } else if (track.unit === 'fr') {
        totalFr += track.value;
      }
    });

    // Second pass: allocate fr units from remaining size
    if (totalFr > 0 && remainingSize > 0) {
      tracks.forEach((track, i) => {
        if (track.unit === 'fr') {
          sizes[i] = Math.floor((remainingSize * track.value) / totalFr);
        }
      });
    }

    return sizes;
  }

  /**
   * Calculate cell rectangle for a given row and column index in the grid.
   */
  static getCellRect(
    colIndex: number,
    rowIndex: number,
    colSizes: number[],
    rowSizes: number[],
    startPoint: { x: number; y: number } = { x: 0, y: 0 }
  ): GridCellRect {
    let x = startPoint.x;
    for (let i = 0; i < colIndex && i < colSizes.length; i++) {
      x += colSizes[i];
    }

    let y = startPoint.y;
    for (let j = 0; j < rowIndex && j < rowSizes.length; j++) {
      y += rowSizes[j];
    }

    const width = colSizes[colIndex] ?? 0;
    const height = rowSizes[rowIndex] ?? 0;

    return { x, y, width, height };
  }
}

import { describe, it, expect } from 'vitest';
import {
    BarColumn,
    TextColumn,
    TimeColumn,
    SpeedColumn,
    PercentageColumn,
} from './ProgressColumn.js';
import { Progress } from './Progress.js';

describe('ProgressColumn', () => {
    it('creates a BarColumn definition', () => {
        expect(BarColumn()).toEqual({
            kind: 'bar',
        });
    });

    it('creates a TextColumn definition with template', () => {
        expect(
            TextColumn({
                template: '{task.status}',
            }),
        ).toEqual({
            kind: 'text',
            template: '{task.status}',
            maxRefresh: undefined,
        });
    });

    it('supports maxRefresh on TimeColumn', () => {
        expect(
            TimeColumn({
                maxRefresh: 0.5,
            }),
        ).toEqual({
            kind: 'time',
            maxRefresh: 0.5,
        });
    
        });

    it('creates a SpeedColumn definition', () => {
        expect(SpeedColumn()).toEqual({
            kind: 'speed',
        });
    });

    it('creates a PercentageColumn definition', () => {
        expect(PercentageColumn()).toEqual({
            kind: 'percentage',
        });
    });
   it('uses provided columns in Progress', () => {
    const progress = new Progress({
        columns: [
            BarColumn(),
            TextColumn(),
        ],
    });

    expect(
        progress.columns.map(column => column.kind),
    ).toEqual([
        'bar',
        'text',
    ]);
  });

  it('falls back to default columns', () => {
    const progress = new Progress();

    expect(
        progress.columns.map(column => column.kind),
    ).toEqual([
        'bar',
        'text',
        'percentage',
    ]);
 });

});
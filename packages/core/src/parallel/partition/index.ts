/**
 * Screen Partition Manager
 * Splits screen into sections for parallel rendering
 */

import { ScreenSection } from '../types';

export interface PartitionStrategy {
  type: 'quadrant' | 'grid' | 'dynamic';
  gridColumns?: number;
  gridRows?: number;
}

export class ScreenPartitioner {
  private width: number;
  private height: number;
  private strategy: PartitionStrategy;

  constructor(width: number, height: number, strategy: PartitionStrategy) {
    this.width = width;
    this.height = height;
    this.strategy = strategy;
  }

  /**
   * Partition screen into sections
   */
  partition(): ScreenSection[] {
    switch (this.strategy.type) {
      case 'quadrant':
        return this.partitionQuadrant();
      case 'grid':
        return this.partitionGrid();
      case 'dynamic':
        return this.partitionDynamic();
      default:
        return this.partitionQuadrant();
    }
  }

  /**
   * Quadrant partition (4 sections)
   */
  private partitionQuadrant(): ScreenSection[] {
    const halfWidth = Math.floor(this.width / 2);
    const halfHeight = Math.floor(this.height / 2);

    return [
      { x: 0, y: 0, width: halfWidth, height: halfHeight, zIndex: 0 },
      { x: halfWidth, y: 0, width: this.width - halfWidth, height: halfHeight, zIndex: 0 },
      { x: 0, y: halfHeight, width: halfWidth, height: this.height - halfHeight, zIndex: 0 },
      { x: halfWidth, y: halfHeight, width: this.width - halfWidth, height: this.height - halfHeight, zIndex: 0 }
    ];
  }

  /**
   * Grid partition (NxN sections)
   */
  private partitionGrid(): ScreenSection[] {
    const cols = this.strategy.gridColumns || 2;
    const rows = this.strategy.gridRows || 2;
    const sections: ScreenSection[] = [];

    const colWidth = Math.floor(this.width / cols);
    const rowHeight = Math.floor(this.height / rows);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        sections.push({
          x: col * colWidth,
          y: row * rowHeight,
          width: col === cols - 1 ? this.width - col * colWidth : colWidth,
          height: row === rows - 1 ? this.height - row * rowHeight : rowHeight,
          zIndex: 0
        });
      }
    }

    return sections;
  }

  /**
   * Dynamic partition based on widget density
   */
  private partitionDynamic(): ScreenSection[] {
    // This would analyze widget distribution
    // For now, use a grid with dynamic sizing
    return this.partitionGrid();
  }

  /**
   * Update screen dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * Get section for a specific position
   */
  getSectionForPosition(x: number, y: number): ScreenSection | null {
    const sections = this.partition();
    for (const section of sections) {
      if (x >= section.x && x < section.x + section.width &&
          y >= section.y && y < section.y + section.height) {
        return section;
      }
    }
    return null;
  }

  /**
   * Get sections that overlap with an area
   */
  getSectionsForArea(x: number, y: number, width: number, height: number): ScreenSection[] {
    const sections = this.partition();
    const overlapping = [];

    for (const section of sections) {
      if (section.x + section.width > x && section.x < x + width &&
          section.y + section.height > y && section.y < y + height) {
        overlapping.push(section);
      }
    }

    return overlapping;
  }
}
import { stringWidth } from './unicode';

export interface WrapOptions {
  hard?: boolean;
  trim?: boolean;
}

/**
 * Wrap text into lines of specified maximum visual column width.
 * Preserves multi-byte Unicode emoji and CJK character boundaries without splitting (#3339).
 */
export function wrapTextWithWidth(
  text: string,
  maxWidth: number,
  options: WrapOptions = {}
): string[] {
  if (!text || maxWidth <= 0) return [];

  // Segment text into grapheme clusters using Intl.Segmenter if available
  let clusters: string[] = [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    clusters = Array.from(segmenter.segment(text)).map((s) => s.segment);
  } else {
    clusters = Array.from(text);
  }

  const lines: string[] = [];
  let currentLine = '';
  let currentLineWidth = 0;

  for (const cluster of clusters) {
    if (cluster === '\n') {
      lines.push(options.trim ? currentLine.trimEnd() : currentLine);
      currentLine = '';
      currentLineWidth = 0;
      continue;
    }

    const clusterWidth = stringWidth(cluster);

    if (currentLineWidth + clusterWidth > maxWidth && currentLine.length > 0) {
      lines.push(options.trim ? currentLine.trimEnd() : currentLine);
      currentLine = cluster;
      currentLineWidth = clusterWidth;
    } else {
      currentLine += cluster;
      currentLineWidth += clusterWidth;
    }
  }

  if (currentLine.length > 0 || text.endsWith('\n')) {
    lines.push(options.trim ? currentLine.trimEnd() : currentLine);
  }

  return lines;
}

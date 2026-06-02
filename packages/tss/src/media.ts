// ─────────────────────────────────────────────────────
// Size media queries — filters @media blocks by terminal dimensions
// ─────────────────────────────────────────────────────

import { type ThemeEngine } from './engine.js';

const MEDIA_AT_RULE = '@media';

export interface TerminalDimensions {
    width: number;
    height: number;
}

export type MediaFeature = 'min-width' | 'max-height';

export interface MediaCondition {
    feature: MediaFeature;
    value: number;
}

export type MediaStyleEngine = Pick<ThemeEngine, 'load'>;

interface MediaBlock {
    condition: MediaCondition | undefined;
    body: string;
    endIndex: number;
}

/** Load a TSS source into a ThemeEngine after applying size media queries. */
export function loadMediaStyles(engine: MediaStyleEngine, source: string, dimensions: TerminalDimensions): void {
    engine.load(resolveMediaSource(source, dimensions));
}

/** Return TSS with matching @media blocks expanded and non-matching blocks removed. */
export function resolveMediaSource(source: string, dimensions: TerminalDimensions): string {
    let output = '';
    let cursor = 0;
    let mediaStart = findNextMediaAtRule(source, cursor);

    while (mediaStart !== -1) {
        output += source.slice(cursor, mediaStart);

        const block = readMediaBlock(source, mediaStart);
        if (!block) return output;

        if (block.condition && mediaConditionMatches(block.condition, dimensions)) {
            output += resolveMediaSource(block.body, dimensions);
        }

        cursor = block.endIndex;
        mediaStart = findNextMediaAtRule(source, cursor);
    }

    output += source.slice(cursor);
    return output;
}

export function parseMediaCondition(input: string): MediaCondition | undefined {
    const match = /^\(?\s*(min-width|max-height)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:cols?|columns?|rows?)?\s*\)?$/i.exec(input.trim());
    if (!match) return undefined;

    const feature = toMediaFeature(match[1]?.toLowerCase() ?? '');
    const value = Number(match[2]);
    if (!feature || !Number.isFinite(value)) return undefined;

    return { feature, value };
}

export function mediaConditionMatches(condition: MediaCondition, dimensions: TerminalDimensions): boolean {
    if (!Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height)) return false;

    switch (condition.feature) {
        case 'min-width':
            return dimensions.width >= condition.value;
        case 'max-height':
            return dimensions.height <= condition.value;
    }
}

function readMediaBlock(source: string, startIndex: number): MediaBlock | undefined {
    const headerStart = startIndex + MEDIA_AT_RULE.length;
    const blockStart = findOpeningBrace(source, headerStart);
    if (blockStart === -1) return undefined;

    const blockEnd = findMatchingBrace(source, blockStart);
    if (blockEnd === -1) return undefined;

    return {
        condition: parseMediaCondition(source.slice(headerStart, blockStart)),
        body: source.slice(blockStart + 1, blockEnd),
        endIndex: blockEnd + 1,
    };
}

function toMediaFeature(value: string): MediaFeature | undefined {
    if (value === 'min-width' || value === 'max-height') return value;
    return undefined;
}

function findNextMediaAtRule(source: string, startIndex: number): number {
    for (let index = startIndex; index < source.length; index++) {
        const skipped = skipIgnored(source, index);
        if (skipped !== index) {
            index = skipped;
            continue;
        }

        if (source.startsWith(MEDIA_AT_RULE, index) && isMediaBoundary(source[index + MEDIA_AT_RULE.length])) {
            return index;
        }
    }

    return -1;
}

function findOpeningBrace(source: string, startIndex: number): number {
    for (let index = startIndex; index < source.length; index++) {
        const skipped = skipIgnored(source, index);
        if (skipped !== index) {
            index = skipped;
            continue;
        }

        if (source[index] === '{') return index;
        if (source[index] === '}') return -1;
    }

    return -1;
}

function findMatchingBrace(source: string, openIndex: number): number {
    let depth = 0;

    for (let index = openIndex; index < source.length; index++) {
        const skipped = skipIgnored(source, index);
        if (skipped !== index) {
            index = skipped;
            continue;
        }

        if (source[index] === '{') depth++;
        if (source[index] === '}') {
            depth--;
            if (depth === 0) return index;
        }
    }

    return -1;
}

function isMediaBoundary(char: string | undefined): boolean {
    return char === undefined || /\s|\(/.test(char);
}

function skipIgnored(source: string, index: number): number {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"' || char === "'") return skipString(source, index);
    if (char === '/' && next === '*') return skipBlockComment(source, index);
    if (char === '/' && next === '/') return skipLineComment(source, index);

    return index;
}

function skipString(source: string, startIndex: number): number {
    const quote = source[startIndex];

    for (let index = startIndex + 1; index < source.length; index++) {
        if (source[index] === '\\') {
            index++;
            continue;
        }

        if (source[index] === quote) return index;
    }

    return source.length - 1;
}

function skipBlockComment(source: string, startIndex: number): number {
    const endIndex = source.indexOf('*/', startIndex + 2);
    return endIndex === -1 ? source.length - 1 : endIndex + 1;
}

function skipLineComment(source: string, startIndex: number): number {
    const endIndex = source.indexOf('\n', startIndex + 2);
    return endIndex === -1 ? source.length - 1 : endIndex;
}

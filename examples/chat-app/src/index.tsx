import { App, type KeyEvent, caps, type Screen, type Style, type Color, type NamedColor } from '@termuijs/core';
import { Widget, Box, Text, ScrollView, TextInput } from '@termuijs/widgets';

// ── Color Utilities and Hex Palette ────────────────────

function hexColor(hex: string): Color {
    return { type: 'hex', hex };
}

const PALETTE = {
    purple: hexColor('#a855f7'),
    purpleLight: hexColor('#c084fc'),
    indigo: hexColor('#6366f1'),
    indigoLight: hexColor('#818cf8'),
    emerald: hexColor('#10b981'),
    emeraldLight: hexColor('#34d399'),
    rose: hexColor('#f43f5e'),
    roseLight: hexColor('#fb7185'),
    slate: hexColor('#475569'),
    slateLight: hexColor('#94a3b8'),
    amber: hexColor('#f59e0b'),
    amberLight: hexColor('#fbbf24'),
    yellow: hexColor('#eab308'),
};

// ── Types for Styled Rendering ──────────────────────────

interface StyledChar {
    char: string;
    fg?: Color;
    bg?: Color;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    dim?: boolean;
}

interface Span {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    dim?: boolean;
    fg?: Color;
    bg?: Color;
}

interface Message {
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    widget: CustomChatMessage;
}

// ── Markdown Block Parsing ────────────────────────────

interface CodeBlock {
    type: 'code';
    lang: string;
    lines: string[];
    closed: boolean;
}

interface HeadingBlock {
    type: 'heading';
    level: number;
    text: string;
}

interface BlockquoteBlock {
    type: 'blockquote';
    lines: string[];
}

interface ListBlock {
    type: 'list';
    ordered: boolean;
    items: {
        marker: string;
        text: string;
    }[];
}

interface TableBlock {
    type: 'table';
    headers: string[];
    alignments: ('left' | 'center' | 'right')[];
    rows: string[][];
}

interface ParagraphBlock {
    type: 'paragraph';
    text: string;
}

type Block =
    | CodeBlock
    | HeadingBlock
    | BlockquoteBlock
    | ListBlock
    | TableBlock
    | ParagraphBlock;

function parseBlocks(text: string): Block[] {
    const rawLines = text.split('\n');
    const blocks: Block[] = [];
    
    let currentCodeBlock: CodeBlock | null = null;
    let currentBlockquote: BlockquoteBlock | null = null;
    let currentList: ListBlock | null = null;
    let currentTable: TableBlock | null = null;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];

        // ── Handle Code Blocks ────────────────────────
        if (currentCodeBlock) {
            if (line.trim().startsWith('```')) {
                currentCodeBlock.closed = true;
                currentCodeBlock = null;
            } else {
                currentCodeBlock.lines.push(line);
            }
            continue;
        }

        if (line.trim().startsWith('```')) {
            currentBlockquote = null;
            currentList = null;
            currentTable = null;

            const lang = line.trim().slice(3).trim();
            const codeBlock: CodeBlock = {
                type: 'code',
                lang,
                lines: [],
                closed: false,
            };
            blocks.push(codeBlock);
            currentCodeBlock = codeBlock;
            continue;
        }

        // ── Handle Blockquotes ───────────────────────
        if (line.startsWith('>')) {
            currentList = null;
            currentTable = null;

            let quoteContent = line.slice(1);
            if (quoteContent.startsWith(' ')) {
                quoteContent = quoteContent.slice(1);
            }
            if (!currentBlockquote) {
                currentBlockquote = {
                    type: 'blockquote',
                    lines: [quoteContent],
                };
                blocks.push(currentBlockquote);
            } else {
                currentBlockquote.lines.push(quoteContent);
            }
            continue;
        } else {
            currentBlockquote = null;
        }

        // ── Handle Tables ────────────────────────────
        const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|') && line.trim().split('|').length > 2;
        if (isTableRow) {
            currentList = null;
            const cells = line.trim().split('|').slice(1, -1).map(c => c.trim());

            if (!currentTable) {
                const nextLine = rawLines[i + 1];
                const isSeparator = nextLine && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|') &&
                    /^[|:\-\s]+$/.test(nextLine.trim());

                if (isSeparator) {
                    const alignments: ('left' | 'center' | 'right')[] = [];
                    const sepCells = nextLine.trim().split('|').slice(1, -1).map(c => c.trim());
                    for (const cell of sepCells) {
                        const left = cell.startsWith(':');
                        const right = cell.endsWith(':');
                        if (left && right) alignments.push('center');
                        else if (right) alignments.push('right');
                        else alignments.push('left');
                    }

                    currentTable = {
                        type: 'table',
                        headers: cells,
                        alignments,
                        rows: [],
                    };
                    blocks.push(currentTable);
                    i++; // skip separator
                    continue;
                }
            } else {
                currentTable.rows.push(cells);
                continue;
            }
        }
        
        if (!isTableRow) {
            currentTable = null;
        }

        // ── Handle Lists ─────────────────────────────
        const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.*)/);
        const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);

        if (unorderedMatch) {
            const text = unorderedMatch[3];
            const marker = unorderedMatch[2];
            if (!currentList || currentList.ordered) {
                currentList = {
                    type: 'list',
                    ordered: false,
                    items: [{ marker, text }],
                };
                blocks.push(currentList);
            } else {
                currentList.items.push({ marker, text });
            }
            continue;
        } else if (orderedMatch) {
            const text = orderedMatch[3];
            const marker = orderedMatch[2] + '.';
            if (!currentList || !currentList.ordered) {
                currentList = {
                    type: 'list',
                    ordered: true,
                    items: [{ marker, text }],
                };
                blocks.push(currentList);
            } else {
                currentList.items.push({ marker, text });
            }
            continue;
        } else {
            if (line.trim() !== '') {
                currentList = null;
            }
        }

        // ── Handle Headings ──────────────────────────
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            blocks.push({
                type: 'heading',
                level,
                text,
            });
            continue;
        }

        // ── Handle Paragraphs ────────────────────────
        if (line.trim() === '') {
            blocks.push({
                type: 'paragraph',
                text: '',
            });
        } else {
            blocks.push({
                type: 'paragraph',
                text: line,
            });
        }
    }

    return blocks;
}

// ── Markdown Inline Parsing ───────────────────────────

function splitSpans(
    spans: Span[],
    regex: RegExp,
    createAttr: (match: RegExpExecArray) => Partial<Span>
): Span[] {
    const result: Span[] = [];
    for (const span of spans) {
        if (span.fg || span.bold || span.italic || span.underline || span.dim) {
            result.push(span);
            continue;
        }

        let lastIndex = 0;
        let match;
        regex.lastIndex = 0;
        const text = span.text;

        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                result.push({ text: text.slice(lastIndex, matchIndex) });
            }

            const attrs = createAttr(match);
            result.push({
                text: match[0],
                ...attrs,
            });

            lastIndex = regex.lastIndex;
            if (match[0].length === 0) {
                regex.lastIndex++;
            }
        }

        if (lastIndex < text.length) {
            result.push({ text: text.slice(lastIndex) });
        }
    }
    return result;
}

function parseInline(text: string): Span[] {
    let spans: Span[] = [{ text }];
    
    // 1. Parse inline code
    spans = splitSpans(spans, /`([^`]+)`/g, (match) => ({
        text: match[1],
        fg: PALETTE.yellow,
        dim: true,
    }));

    // 2. Parse links/URLs
    spans = splitSpans(spans, /(https?:\/\/[^\s)]+)/g, (match) => ({
        text: match[1],
        fg: PALETTE.indigoLight,
        underline: true,
    }));

    // 3. Parse bold-italic
    spans = splitSpans(spans, /\*\*\*([^*]+)\*\*\*/g, (match) => ({
        text: match[1],
        bold: true,
        italic: true,
    }));

    // 4. Parse bold
    spans = splitSpans(spans, /\*\*([^*]+)\*\*/g, (match) => ({
        text: match[1],
        bold: true,
    }));
    spans = splitSpans(spans, /__([^_]+)__/g, (match) => ({
        text: match[1],
        bold: true,
    }));

    // 5. Parse italic
    spans = splitSpans(spans, /\*([^*]+)\*/g, (match) => ({
        text: match[1],
        italic: true,
    }));
    spans = splitSpans(spans, /_([^_]+)_/g, (match) => ({
        text: match[1],
        italic: true,
    }));

    return spans;
}

function spansToStyledChars(spans: Span[]): StyledChar[] {
    const chars: StyledChar[] = [];
    for (const span of spans) {
        for (const c of span.text) {
            chars.push({
                char: c,
                fg: span.fg,
                bg: span.bg,
                bold: span.bold,
                italic: span.italic,
                underline: span.underline,
                dim: span.dim,
            });
        }
    }
    return chars;
}

// ── Word Wrapping for Styled Chars ─────────────────────

function wrapStyledChars(chars: StyledChar[], width: number): StyledChar[][] {
    if (width <= 0) return [];
    if (chars.length === 0) return [[]];
    
    const lines: StyledChar[][] = [];
    let currentLine: StyledChar[] = [];
    
    let i = 0;
    while (i < chars.length) {
        if (chars[i].char === '\n') {
            lines.push(currentLine);
            currentLine = [];
            i++;
            continue;
        }

        const word: StyledChar[] = [];
        while (i < chars.length && chars[i].char !== ' ' && chars[i].char !== '\n') {
            word.push(chars[i]);
            i++;
        }

        if (word.length > 0) {
            const neededSpace = currentLine.length > 0 ? 1 : 0;
            if (currentLine.length + neededSpace + word.length <= width) {
                if (neededSpace > 0) {
                    currentLine.push({ char: ' ' });
                }
                currentLine.push(...word);
            } else {
                if (word.length > width) {
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = [];
                    }
                    let wordIdx = 0;
                    while (wordIdx < word.length) {
                        const chunk = word.slice(wordIdx, wordIdx + width);
                        if (chunk.length < width && wordIdx + chunk.length === word.length) {
                            currentLine.push(...chunk);
                        } else {
                            lines.push(chunk);
                        }
                        wordIdx += width;
                    }
                } else {
                    lines.push(currentLine);
                    currentLine = [...word];
                }
            }
        }

        if (i < chars.length && chars[i].char === ' ') {
            i++;
        }
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [[]];
}

// ── Syntax Highlighting for Code Blocks ────────────────

function highlightCodeLine(line: string, lang: string): StyledChar[] {
    const chars: StyledChar[] = [];
    const lowerLang = lang.toLowerCase();
    const isHighlightedLang = ['js', 'ts', 'javascript', 'typescript', 'json', 'html', 'css'].includes(lowerLang);

    if (!isHighlightedLang) {
        return line.split('').map(c => ({ char: c }));
    }

    let i = 0;
    while (i < line.length) {
        const c = line[i];

        if (c === '/' && line[i + 1] === '/') {
            const commentText = line.slice(i);
            for (const char of commentText) {
                chars.push({ char, fg: PALETTE.slateLight, dim: true });
            }
            break;
        }

        if (c === '"') {
            let strText = c;
            i++;
            while (i < line.length && line[i] !== '"') {
                if (line[i] === '\\') {
                    strText += line[i];
                    i++;
                }
                strText += line[i];
                i++;
            }
            if (i < line.length) {
                strText += '"';
                i++;
            }
            for (const char of strText) {
                chars.push({ char, fg: PALETTE.emeraldLight });
            }
            continue;
        }

        if (c === "'") {
            let strText = c;
            i++;
            while (i < line.length && line[i] !== "'") {
                if (line[i] === '\\') {
                    strText += line[i];
                    i++;
                }
                strText += line[i];
                i++;
            }
            if (i < line.length) {
                strText += "'";
                i++;
            }
            for (const char of strText) {
                chars.push({ char, fg: PALETTE.emeraldLight });
            }
            continue;
        }

        if (/\d/.test(c) && (i === 0 || !/[a-zA-Z0-9_$]/.test(line[i - 1]))) {
            let numText = '';
            while (i < line.length && /[0-9.]/.test(line[i])) {
                numText += line[i];
                i++;
            }
            for (const char of numText) {
                chars.push({ char, fg: PALETTE.amberLight });
            }
            continue;
        }

        if (/[a-zA-Z_$]/.test(c)) {
            let wordText = '';
            while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) {
                wordText += line[i];
                i++;
            }
            const keywords = [
                'const', 'let', 'var', 'function', 'return', 'if', 'else',
                'for', 'while', 'class', 'import', 'export', 'from', 'async',
                'await', 'type', 'interface', 'true', 'false', 'null', 'undefined',
                'new', 'this', 'default', 'extends', 'implements', 'as', 'any', 'number', 'string', 'boolean'
            ];
            const isKeyword = keywords.includes(wordText);
            for (const char of wordText) {
                chars.push({
                    char,
                    fg: isKeyword ? PALETTE.roseLight : undefined,
                    bold: isKeyword,
                });
            }
            continue;
        }

        chars.push({ char: c });
        i++;
    }
    return chars;
}

// ── Markdown Block Layout Formatting ──────────────────

function layoutBlock(block: Block, width: number): StyledChar[][] {
    switch (block.type) {
        case 'paragraph': {
            if (block.text === '') {
                return [[]];
            }
            const spans = parseInline(block.text);
            const chars = spansToStyledChars(spans);
            return wrapStyledChars(chars, width);
        }
        case 'heading': {
            const spans = parseInline(block.text);
            const chars = spansToStyledChars(spans);
            
            const prefix = '#'.repeat(block.level) + ' ';
            const headingChars: StyledChar[] = [];
            
            const headingColor = block.level === 1
                ? PALETTE.purpleLight
                : block.level === 2
                ? PALETTE.indigoLight
                : PALETTE.emeraldLight;
                
            for (const char of prefix) {
                headingChars.push({ char, fg: headingColor, bold: true });
            }
            
            for (const char of chars) {
                headingChars.push({
                    ...char,
                    fg: char.fg || headingColor,
                    bold: true,
                });
            }
            
            return wrapStyledChars(headingChars, width);
        }
        case 'blockquote': {
            const quoteLines: StyledChar[][] = [];
            for (const lineText of block.lines) {
                const spans = parseInline(lineText);
                const chars = spansToStyledChars(spans);
                const wrapped = wrapStyledChars(chars, width - 4);
                
                for (const line of wrapped.length > 0 ? wrapped : [[]]) {
                    const lineWithPrefix: StyledChar[] = [
                        { char: '│', fg: PALETTE.indigo, dim: true },
                        { char: ' ' }
                    ];
                    for (const char of line) {
                        lineWithPrefix.push({ ...char, dim: true });
                    }
                    quoteLines.push(lineWithPrefix);
                }
            }
            return quoteLines;
        }
        case 'list': {
            const listLines: StyledChar[][] = [];
            for (let itemIdx = 0; itemIdx < block.items.length; itemIdx++) {
                const item = block.items[itemIdx];
                const spans = parseInline(item.text);
                const chars = spansToStyledChars(spans);
                
                const wrapped = wrapStyledChars(chars, width - 4);
                
                const markerText = block.ordered
                    ? `${item.marker} `
                    : '• ';
                    
                const markerWidth = 4;
                const markerStr = markerText.padStart(markerWidth);
                
                for (let lineIdx = 0; lineIdx < wrapped.length; lineIdx++) {
                    const line = wrapped[lineIdx];
                    const lineWithPrefix: StyledChar[] = [];
                    
                    if (lineIdx === 0) {
                        for (const char of markerStr) {
                            lineWithPrefix.push({
                                char,
                                fg: PALETTE.emerald,
                                bold: true,
                            });
                        }
                    } else {
                        for (let s = 0; s < markerWidth; s++) {
                            lineWithPrefix.push({ char: ' ' });
                        }
                    }
                    
                    lineWithPrefix.push(...line);
                    listLines.push(lineWithPrefix);
                }
            }
            return listLines;
        }
        case 'code': {
            const codeWidth = width;
            if (codeWidth < 8) {
                return block.lines.map(line => highlightCodeLine(line, block.lang));
            }
            
            const useUnicode = caps.unicode;
            const codeBox = useUnicode
                ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
                : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
                
            const result: StyledChar[][] = [];
            
            const label = block.lang ? ` ${block.lang} ` : ' Code ';
            const topMiddle = codeWidth - label.length - 4;
            const topBorderLine: StyledChar[] = [
                { char: codeBox.tl, fg: PALETTE.slate },
                { char: codeBox.h, fg: PALETTE.slate }
            ];
            
            for (const char of label) {
                topBorderLine.push({ char, fg: PALETTE.purpleLight, bold: true });
            }
            
            if (topMiddle >= 0) {
                for (let j = 0; j < topMiddle; j++) {
                    topBorderLine.push({ char: codeBox.h, fg: PALETTE.slate });
                }
                topBorderLine.push({ char: codeBox.h, fg: PALETTE.slate });
                topBorderLine.push({ char: codeBox.tr, fg: PALETTE.slate });
            } else {
                const remaining = codeWidth - topBorderLine.length - 1;
                for (let j = 0; j < Math.max(0, remaining); j++) {
                    topBorderLine.push({ char: codeBox.h, fg: PALETTE.slate });
                }
                topBorderLine.push({ char: codeBox.tr, fg: PALETTE.slate });
            }
            result.push(topBorderLine);
            
            const innerCodeWidth = codeWidth - 4;
            
            for (const rawLine of block.lines) {
                const highlighted = highlightCodeLine(rawLine, block.lang);
                const wrappedCodeLines: StyledChar[][] = [];
                
                if (highlighted.length === 0) {
                    wrappedCodeLines.push([]);
                } else {
                    let idx = 0;
                    while (idx < highlighted.length) {
                        wrappedCodeLines.push(highlighted.slice(idx, idx + innerCodeWidth));
                        idx += innerCodeWidth;
                    }
                }
                
                for (const line of wrappedCodeLines) {
                    const row: StyledChar[] = [
                        { char: codeBox.v, fg: PALETTE.slate },
                        { char: ' ' }
                    ];
                    
                    row.push(...line);
                    
                    const padding = innerCodeWidth - line.length;
                    for (let p = 0; p < padding; p++) {
                        row.push({ char: ' ' });
                    }
                    
                    row.push({ char: ' ' });
                    row.push({ char: codeBox.v, fg: PALETTE.slate });
                    result.push(row);
                }
            }
            
            const bottomBorderLine: StyledChar[] = [
                { char: codeBox.bl, fg: PALETTE.slate }
            ];
            for (let j = 0; j < codeWidth - 2; j++) {
                bottomBorderLine.push({ char: codeBox.h, fg: PALETTE.slate });
            }
            bottomBorderLine.push({ char: codeBox.br, fg: PALETTE.slate });
            result.push(bottomBorderLine);
            
            return result;
        }
        case 'table': {
            const colWidths = block.headers.map((h, colIdx) => {
                let maxW = h.length;
                for (const row of block.rows) {
                    if (row[colIdx]) {
                        maxW = Math.max(maxW, row[colIdx].length);
                    }
                }
                return maxW + 2;
            });
            
            const borderSpace = colWidths.length + 1;
            let totalColWidth = colWidths.reduce((sum, w) => sum + w, 0);
            
            const maxTableWidth = width;
            if (totalColWidth + borderSpace > maxTableWidth) {
                const availableColsWidth = Math.max(colWidths.length * 4, maxTableWidth - borderSpace);
                const ratio = availableColsWidth / totalColWidth;
                for (let c = 0; c < colWidths.length; c++) {
                    colWidths[c] = Math.max(4, Math.floor(colWidths[c] * ratio));
                }
                totalColWidth = colWidths.reduce((sum, w) => sum + w, 0);
            }
            
            const useUnicode = caps.unicode;
            const tbl = useUnicode
                ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', tm: '┬', bm: '┴', ml: '├', mr: '┤', mm: '┼', h: '─', v: '│' }
                : { tl: '+', tr: '+', bl: '+', br: '+', tm: '+', bm: '+', ml: '+', mr: '+', mm: '+', h: '-', v: '|' };
                
            const result: StyledChar[][] = [];
            const fgBorder = PALETTE.slate;
            
            const formatCell = (text: string, colIdx: number, isHeader = false): StyledChar[] => {
                const colW = colWidths[colIdx];
                const contentW = colW - 2;
                const display = text.slice(0, contentW).padEnd(contentW);
                
                const align = block.alignments[colIdx] || 'left';
                let alignedText = display;
                const trimmed = text.trim();
                if (align === 'center') {
                    const padLeft = Math.floor((contentW - trimmed.length) / 2);
                    alignedText = trimmed.padStart(padLeft + trimmed.length).padEnd(contentW);
                } else if (align === 'right') {
                    alignedText = trimmed.padStart(contentW);
                } else {
                    alignedText = trimmed.padEnd(contentW);
                }
                
                const cellChars: StyledChar[] = [{ char: ' ' }];
                for (const char of alignedText) {
                    cellChars.push({
                        char,
                        fg: isHeader ? PALETTE.indigoLight : undefined,
                        bold: isHeader,
                    });
                }
                cellChars.push({ char: ' ' });
                return cellChars;
            };
            
            const topBorderLine: StyledChar[] = [{ char: tbl.tl, fg: fgBorder }];
            for (let c = 0; c < colWidths.length; c++) {
                for (let w = 0; w < colWidths[c]; w++) {
                    topBorderLine.push({ char: tbl.h, fg: fgBorder });
                }
                if (c < colWidths.length - 1) {
                    topBorderLine.push({ char: tbl.tm, fg: fgBorder });
                }
            }
            topBorderLine.push({ char: tbl.tr, fg: fgBorder });
            result.push(topBorderLine);
            
            const headerRow: StyledChar[] = [{ char: tbl.v, fg: fgBorder }];
            for (let c = 0; c < colWidths.length; c++) {
                headerRow.push(...formatCell(block.headers[c], c, true));
                headerRow.push({ char: tbl.v, fg: fgBorder });
            }
            result.push(headerRow);
            
            const midBorderLine: StyledChar[] = [{ char: tbl.ml, fg: fgBorder }];
            for (let c = 0; c < colWidths.length; c++) {
                for (let w = 0; w < colWidths[c]; w++) {
                    midBorderLine.push({ char: tbl.h, fg: fgBorder });
                }
                if (c < colWidths.length - 1) {
                    midBorderLine.push({ char: tbl.mm, fg: fgBorder });
                }
            }
            midBorderLine.push({ char: tbl.mr, fg: fgBorder });
            result.push(midBorderLine);
            
            for (const row of block.rows) {
                const dataRow: StyledChar[] = [{ char: tbl.v, fg: fgBorder }];
                for (let c = 0; c < colWidths.length; c++) {
                    dataRow.push(...formatCell(row[c] || '', c, false));
                    dataRow.push({ char: tbl.v, fg: fgBorder });
                }
                result.push(dataRow);
            }
            
            const botBorderLine: StyledChar[] = [{ char: tbl.bl, fg: fgBorder }];
            for (let c = 0; c < colWidths.length; c++) {
                for (let w = 0; w < colWidths[c]; w++) {
                    botBorderLine.push({ char: tbl.h, fg: fgBorder });
                }
                if (c < colWidths.length - 1) {
                    botBorderLine.push({ char: tbl.bm, fg: fgBorder });
                }
            }
            botBorderLine.push({ char: tbl.br, fg: fgBorder });
            result.push(botBorderLine);
            
            return result;
        }
    }
}

// ── Welcome Screen Empty State Renderer ────────────────

function renderWelcomeScreen(width: number): StyledChar[][] {
    const lines: StyledChar[][] = [];
    const colorPrimary = PALETTE.purpleLight;
    const colorGreen = PALETTE.emeraldLight;
    const bulletChar = caps.unicode ? '•' : '-';
    
    const asciiLogo = width >= 60 ? [
        "  __                  __  __ ____  ",
        " /_/______ _____ ___ / / / /  __/  ",
        "/ __/ -_) __/ __ `__ / /_/ / /_    ",
        "/_/  \\__/_/ /_/ /_/ /_\\____/___/   "
    ] : [];

    const logoColors = [PALETTE.purpleLight, PALETTE.purple, PALETTE.indigo, PALETTE.indigoLight];
    for (let l = 0; l < asciiLogo.length; l++) {
        const logoLine = asciiLogo[l];
        const leftPad = Math.max(0, Math.floor((width - logoLine.length) / 2));
        const row: StyledChar[] = [];
        for (let i = 0; i < leftPad; i++) row.push({ char: ' ' });
        for (const char of logoLine) {
            row.push({ char, fg: logoColors[l % logoColors.length], bold: true });
        }
        lines.push(row);
    }

    if (asciiLogo.length > 0) {
        lines.push([]);
    }

    const titleText = "🤖 TermUI Terminal AI Assistant";
    const titlePad = Math.max(0, Math.floor((width - titleText.length) / 2));
    const titleRow: StyledChar[] = [];
    for (let i = 0; i < titlePad; i++) titleRow.push({ char: ' ' });
    for (const char of titleText) {
        titleRow.push({ char, fg: colorGreen, bold: true });
    }
    lines.push(titleRow);
    lines.push([]);

    const cardWidth = Math.max(40, Math.min(78, width - 4));
    const cardStart = Math.max(0, Math.floor((width - cardWidth) / 2));
    const cardBox = caps.unicode
        ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
        : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };

    const topBorder: StyledChar[] = [];
    for (let i = 0; i < cardStart; i++) topBorder.push({ char: ' ' });
    topBorder.push({ char: cardBox.tl, fg: PALETTE.purple });
    for (let i = 0; i < cardWidth - 2; i++) topBorder.push({ char: cardBox.h, fg: PALETTE.purple });
    topBorder.push({ char: cardBox.tr, fg: PALETTE.purple });
    lines.push(topBorder);

    const welcome1 = "Hello! I am a terminal assistant built using TermUI.";
    const welcome2 = "Type a message below and I will stream a response back to you!";
    
    const writeCardLine = (text: StyledChar[]) => {
        const row: StyledChar[] = [];
        for (let i = 0; i < cardStart; i++) row.push({ char: ' ' });
        row.push({ char: cardBox.v, fg: PALETTE.purple });
        row.push({ char: ' ' });
        
        row.push(...text);
        
        const innerSpace = cardWidth - text.length - 4;
        for (let s = 0; s < innerSpace; s++) {
            row.push({ char: ' ' });
        }
        row.push({ char: ' ' });
        row.push({ char: cardBox.v, fg: PALETTE.purple });
        lines.push(row);
    };

    const wrapSentenceToCard = (text: string) => {
        const wrapped = wrapStyledChars(spansToStyledChars([{ text }]), cardWidth - 6);
        for (const wline of wrapped) {
            writeCardLine(wline);
        }
    };

    wrapSentenceToCard(welcome1);
    wrapSentenceToCard(welcome2);
    writeCardLine([]);

    const featuresHeader: StyledChar[] = [
        { char: '💡', fg: colorGreen }, { char: ' ' },
        { char: 'F', bold: true, fg: PALETTE.emeraldLight },
        { char: 'e', bold: true, fg: PALETTE.emeraldLight },
        { char: 'a', bold: true, fg: PALETTE.emeraldLight },
        { char: 't', bold: true, fg: PALETTE.emeraldLight },
        { char: 'u', bold: true, fg: PALETTE.emeraldLight },
        { char: 'r', bold: true, fg: PALETTE.emeraldLight },
        { char: 'e', bold: true, fg: PALETTE.emeraldLight },
        { char: 's', bold: true, fg: PALETTE.emeraldLight },
        { char: ':', bold: true, fg: PALETTE.emeraldLight }
    ];
    writeCardLine(featuresHeader);
    
    const addFeature = (text: string) => {
        const wrapped = wrapStyledChars(spansToStyledChars([{ text }]), cardWidth - 10);
        for (let idx = 0; idx < wrapped.length; idx++) {
            const row: StyledChar[] = [];
            if (idx === 0) {
                row.push({ char: ' ' }, { char: ' ' });
                row.push({ char: bulletChar, fg: colorGreen, bold: true });
                row.push({ char: ' ' });
            } else {
                row.push({ char: ' ' }, { char: ' ' }, { char: ' ' }, { char: ' ' }, { char: ' ' });
            }
            row.push(...wrapped[idx]);
            writeCardLine(row);
        }
    };
    addFeature("Live streamed responses with stable auto-scrolling");
    addFeature("Markdown rendering (headings, lists, blockquotes, tables)");
    addFeature("Rounded message bubbles and syntax highlighting");
    writeCardLine([]);

    const controlsHeader: StyledChar[] = [
        { char: '⌨', fg: colorPrimary }, { char: '️' }, { char: ' ' },
        { char: 'C', bold: true, fg: PALETTE.purpleLight },
        { char: 'o', bold: true, fg: PALETTE.purpleLight },
        { char: 'n', bold: true, fg: PALETTE.purpleLight },
        { char: 't', bold: true, fg: PALETTE.purpleLight },
        { char: 'r', bold: true, fg: PALETTE.purpleLight },
        { char: 'o', bold: true, fg: PALETTE.purpleLight },
        { char: 'l', bold: true, fg: PALETTE.purpleLight },
        { char: 's', bold: true, fg: PALETTE.purpleLight },
        { char: ':', bold: true, fg: PALETTE.purpleLight }
    ];
    writeCardLine(controlsHeader);
    
    const addControl = (key: string, desc: string) => {
        const row: StyledChar[] = [
            { char: ' ' }, { char: ' ' },
            { char: bulletChar, fg: colorPrimary, bold: true }, { char: ' ' },
            { char: '[', fg: colorPrimary }, ...key.split('').map(c => ({ char: c, fg: colorPrimary, bold: true })), { char: ']', fg: colorPrimary },
            { char: ' ' }, ...desc.split('').map(c => ({ char: c }))
        ];
        writeCardLine(row);
    };
    addControl("Enter", "Send prompt");
    addControl("Tab", "Cycle demo prompts");
    addControl("PageUp/Down", "Scroll history");
    addControl("q / Ctrl+C", "Exit app");
    
    const botBorder: StyledChar[] = [];
    for (let i = 0; i < cardStart; i++) botBorder.push({ char: ' ' });
    botBorder.push({ char: cardBox.bl, fg: PALETTE.purple });
    for (let i = 0; i < cardWidth - 2; i++) botBorder.push({ char: cardBox.h, fg: PALETTE.purple });
    botBorder.push({ char: cardBox.br, fg: PALETTE.purple });
    lines.push(botBorder);

    return lines;
}

// ── Custom Chat Message Widget ─────────────────────────

class CustomChatMessage extends Widget {
    public role: 'user' | 'assistant' | 'system' | 'error';
    public content: string;
    public timestamp?: Date;
    public preRenderedLines: StyledChar[][] = [];
    public bubbleWidth = 0;

    constructor(options: { role: 'user' | 'assistant' | 'system' | 'error'; content: string; timestamp?: Date }) {
        super();
        this.role = options.role;
        this.content = options.content;
        this.timestamp = options.timestamp;
        this.focusable = false;
    }

    setContent(content: string) {
        if (this.content === content) return;
        this.content = content;
        this.markDirty();
    }

    public calculateLayout(contentWidth: number): number {
        const isWelcomeMessage = this.role === 'assistant' && this.content === 'Hello! I am a terminal assistant built using TermUI. Type a message below and I will stream a response back to you!';
        if (isWelcomeMessage) {
            this.preRenderedLines = renderWelcomeScreen(contentWidth);
            this.bubbleWidth = contentWidth;
            return this.preRenderedLines.length;
        }

        const maxBubbleWidth = Math.max(25, Math.min(80, Math.floor(contentWidth * 0.85)));
        const innerWidth = maxBubbleWidth - 4;
        
        const blocks = parseBlocks(this.content);
        const blockLines: StyledChar[][] = [];
        
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (i > 0) {
                const prev = blocks[i - 1];
                if (!(prev.type === 'paragraph' && prev.text === '') && !(block.type === 'paragraph' && block.text === '')) {
                    blockLines.push([]);
                }
            }
            const lines = layoutBlock(block, innerWidth);
            blockLines.push(...lines);
        }
        
        let maxLineLen = 0;
        for (const line of blockLines) {
            maxLineLen = Math.max(maxLineLen, line.length);
        }
        
        const roleLabel = getRoleLabel(this.role);
        const timeStr = this.timestamp ? formatTimestamp(this.timestamp) : '';
        const headerMinW = roleLabel.length + timeStr.length + 8;
        
        this.bubbleWidth = Math.max(headerMinW, maxLineLen + 4);
        this.preRenderedLines = blockLines;
        
        return this.preRenderedLines.length + 2;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const isWelcomeMessage = this.role === 'assistant' && this.content === 'Hello! I am a terminal assistant built using TermUI. Type a message below and I will stream a response back to you!';
        if (isWelcomeMessage) {
            for (let rowIdx = 0; rowIdx < this.preRenderedLines.length; rowIdx++) {
                const line = this.preRenderedLines[rowIdx];
                const lineY = y + rowIdx;
                for (let colIdx = 0; colIdx < line.length; colIdx++) {
                    const sc = line[colIdx];
                    screen.setCell(x + colIdx, lineY, {
                        char: sc.char,
                        fg: sc.fg,
                        bg: sc.bg,
                        bold: sc.bold,
                        italic: sc.italic,
                        underline: sc.underline,
                        dim: sc.dim,
                    });
                }
            }
            return;
        }

        const contentWidth = width;
        let startX = x;
        if (this.role === 'user') {
            startX = x + (contentWidth - this.bubbleWidth);
        }

        const roleColor = getRoleColor(this.role);
        const borderColor = getBorderColor(this.role);

        const useUnicode = caps.unicode;
        const boxChars = useUnicode
            ? { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
            : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };

        const roleLabel = getRoleLabel(this.role);
        const timeStr = this.timestamp ? formatTimestamp(this.timestamp) : '';
        
        let headerLine = boxChars.tl + boxChars.h + ' ' + roleLabel + ' ';
        const middleSpace = this.bubbleWidth - headerLine.length - timeStr.length - 4;
        
        if (middleSpace >= 0) {
            headerLine += boxChars.h.repeat(middleSpace) + ' ' + timeStr + ' ' + boxChars.h + boxChars.tr;
        } else {
            const remaining = this.bubbleWidth - headerLine.length - 1;
            headerLine += boxChars.h.repeat(Math.max(0, remaining)) + boxChars.tr;
        }

        for (let col = 0; col < headerLine.length; col++) {
            const char = headerLine[col];
            let charFg = borderColor;
            let bold = false;
            
            const labelStart = 3;
            const labelEnd = labelStart + roleLabel.length;
            if (col >= labelStart && col < labelEnd) {
                charFg = roleColor;
                bold = true;
            }

            screen.setCell(startX + col, y, {
                char,
                fg: charFg,
                bold,
            });
        }

        const innerWidth = this.bubbleWidth - 4;
        for (let rowIdx = 0; rowIdx < this.preRenderedLines.length; rowIdx++) {
            const line = this.preRenderedLines[rowIdx];
            const lineY = y + 1 + rowIdx;

            screen.setCell(startX, lineY, { char: boxChars.v, fg: borderColor });
            screen.setCell(startX + 1, lineY, { char: ' ' });

            let colIdx = 0;
            for (; colIdx < line.length; colIdx++) {
                const sc = line[colIdx];
                screen.setCell(startX + 2 + colIdx, lineY, {
                    char: sc.char,
                    fg: sc.fg,
                    bg: sc.bg,
                    bold: sc.bold,
                    italic: sc.italic,
                    underline: sc.underline,
                    dim: sc.dim,
                });
            }

            for (; colIdx < innerWidth; colIdx++) {
                screen.setCell(startX + 2 + colIdx, lineY, { char: ' ' });
            }

            screen.setCell(startX + this.bubbleWidth - 2, lineY, { char: ' ' });
            screen.setCell(startX + this.bubbleWidth - 1, lineY, { char: boxChars.v, fg: borderColor });
        }

        const bottomLine = boxChars.bl + boxChars.h.repeat(this.bubbleWidth - 2) + boxChars.br;
        for (let col = 0; col < bottomLine.length; col++) {
            screen.setCell(startX + col, y + 1 + this.preRenderedLines.length, {
                char: bottomLine[col],
                fg: borderColor,
            });
        }
    }
}

function getRoleLabel(role: 'user' | 'assistant' | 'system' | 'error'): string {
    const useUnicode = caps.unicode;
    switch (role) {
        case 'user': return useUnicode ? '👤 You' : 'You';
        case 'assistant': return useUnicode ? '✦ Assistant' : 'Assistant';
        case 'system': return '⚙ System';
        case 'error': return '⚠ Error';
    }
}

function getRoleColor(role: 'user' | 'assistant' | 'system' | 'error'): Color {
    switch (role) {
        case 'user': return PALETTE.indigoLight;
        case 'assistant': return PALETTE.emeraldLight;
        case 'system': return PALETTE.amberLight;
        case 'error': return PALETTE.roseLight;
    }
}

function getBorderColor(role: 'user' | 'assistant' | 'system' | 'error'): Color {
    switch (role) {
        case 'user': return PALETTE.indigo;
        case 'assistant': return PALETTE.emerald;
        case 'system': return PALETTE.slate;
        case 'error': return PALETTE.rose;
    }
}

function formatTimestamp(d: Date): string {
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

// ── Typing Indicator Widget ───────────────────────────

class TypingIndicator extends Widget {
    private frame = 0;
    private interval: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        super({ height: 1 });
        this.focusable = false;
    }

    startAnimation() {
        if (this.interval) return;
        this.interval = setInterval(() => {
            this.frame++;
            this.markDirty();
            // Type assertion to bypass globalThis type constraint and request render
            (globalThis as any).__appInstance?.requestRender();
        }, 80);
    }

    stopAnimation() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const frames = caps.unicode
            ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
            : ['.  ', '.. ', '...', ' ..', '  .', '   '];
        const spinner = frames[this.frame % frames.length];
        const text = `🤖 Assistant is typing [ ${spinner} ]`;
        
        screen.writeString(x + 2, y, text, {
            fg: PALETTE.emeraldLight,
            italic: true,
        });
    }
}

// ── Custom Header Widget (Claude/Gemini style) ─────────

class CustomHeader extends Widget {
    private isStreaming = false;

    constructor() {
        super({ height: 2 });
    }

    setStreaming(streaming: boolean) {
        if (this.isStreaming === streaming) return;
        this.isStreaming = streaming;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const useUnicode = caps.unicode;
        const spark = useUnicode ? '✦' : '*';
        const dot = useUnicode ? '●' : '*';
        
        const appTitle = ` ${spark} TermUI Assistant `;
        const modelInfo = ` │  Model: gemini-3.5-flash `;
        
        screen.writeString(x, y, appTitle, { fg: PALETTE.purpleLight, bold: true });
        let currentX = x + appTitle.length;
        
        screen.writeString(currentX, y, modelInfo, { fg: PALETTE.slateLight });
        currentX += modelInfo.length;
        
        screen.writeString(currentX, y, ` │  Status: `, { fg: PALETTE.slateLight });
        screen.writeString(currentX + 10, y, `${dot} Online`, { fg: PALETTE.emeraldLight, bold: true });
        
        const streamText = this.isStreaming ? '⚡ Streaming' : '● Idle';
        const streamColor = this.isStreaming ? PALETTE.amberLight : PALETTE.slateLight;
        const streamX = x + width - streamText.length - 2;
        if (streamX > currentX + 20) {
            screen.writeString(streamX, y, streamText, { fg: streamColor, bold: this.isStreaming });
        }

        const dividerChar = useUnicode ? '─' : '-';
        screen.writeString(x, y + 1, dividerChar.repeat(width), { fg: PALETTE.slate, dim: true });
    }
}

// ── Custom Input Status Bar ───────────────────────────

class CustomInputStatusBar extends Widget {
    constructor() {
        super({ height: 1 });
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const useUnicode = caps.unicode;
        const divider = useUnicode ? '│' : '|';
        
        const modeText = ` Mode: Chat `;
        const cycleText = ` [Tab] Cycle templates `;
        const clearText = ` /clear to reset `;
        const exitText = ` [Ctrl+C] Exit `;

        screen.writeString(x, y, modeText, { fg: PALETTE.emeraldLight, bold: true });
        let currentX = x + modeText.length;

        screen.writeString(currentX, y, ` ${divider} ${cycleText}`, { fg: PALETTE.slateLight });
        currentX += 3 + cycleText.length;

        screen.writeString(currentX, y, ` ${divider} ${clearText}`, { fg: PALETTE.slateLight });
        currentX += 3 + clearText.length;

        screen.writeString(currentX, y, ` ${divider} ${exitText}`, { fg: PALETTE.slateLight });
    }
}

// ── Main Chat Application Widget ───────────────────────

class ChatExampleApp extends Widget {
    private messages: Message[] = [];
    private messagesScrollView: ScrollView;
    private chatContainer: Box;
    private textInput: TextInput;
    private customHeader: CustomHeader;
    private isStreaming = false;
    private lastWidth = 0;
    
    private demoPrompts = [
        "How does TermUI render UI?",
        "Show me a markdown demo.",
        "Simulate an error.",
        "/clear"
    ];
    private demoPromptIdx = 0;

    constructor() {
        super({ flexDirection: 'column', padding: 1, gap: 1 });

        this.customHeader = new CustomHeader();

        this.messagesScrollView = new ScrollView(
            {
                flexGrow: 1,
                border: 'single',
                borderColor: PALETTE.purple,
            },
            { showScrollbar: true }
        );

        this.chatContainer = new Box({
            flexDirection: 'column',
            gap: 1,
        });
        this.messagesScrollView.addChild(this.chatContainer);

        const inputContainer = new Box({
            flexDirection: 'column',
            height: 4,
            gap: 0,
        });

        const statusHelper = new CustomInputStatusBar();

        const promptRow = new Box({
            flexDirection: 'row',
            height: 3,
            gap: 1,
        });

        const spark = caps.unicode ? '✦' : '>';
        const promptLabel = new Text(` ${spark} Input: `, {
            fg: PALETTE.emeraldLight,
            bold: true,
            height: 1,
        });

        this.textInput = new TextInput(
            { flexGrow: 1 },
            {
                placeholder: 'Type a message (or hit [Tab] to cycle templates)...',
                onSubmit: (val) => this.handleSendMessage(val),
            }
        );

        promptRow.addChild(promptLabel);
        promptRow.addChild(this.textInput);

        inputContainer.addChild(statusHelper);
        inputContainer.addChild(promptRow);

        const helpText = new Text(' Controls: [Enter] Send | [Tab] Template | [PageUp/Down] Scroll | [Ctrl+C] Quit ', {
            dim: true,
            height: 1,
        });

        this.addChild(this.customHeader);
        this.addChild(this.messagesScrollView);
        this.addChild(inputContainer);
        this.addChild(helpText);

        this.textInput.isFocused = true;

        this.addMessage(
            'assistant',
            'Hello! I am a terminal assistant built using TermUI. Type a message below and I will stream a response back to you!'
        );
    }

    private addMessage(role: 'user' | 'assistant' | 'system' | 'error', content: string): Message {
        const timestamp = new Date();
        const widget = new CustomChatMessage({ role, content, timestamp });
        this.chatContainer.addChild(widget);
        
        const msg: Message = { role, content, widget };
        this.messages.push(msg);
        
        this.updateMessageHeights();
        return msg;
    }

    private updateMessageHeights() {
        const width = this.rect.width || 80;
        const scrollbarWidth = 2;
        const leftBorderWidth = 1;
        const paddingOffset = 2;
        const contentWidth = Math.max(20, width - scrollbarWidth - leftBorderWidth - paddingOffset - 4);

        let totalHeight = 0;
        for (const msg of this.messages) {
            const height = msg.widget.calculateLayout(contentWidth);
            msg.widget.setStyle({ height });
            totalHeight += height;
        }

        for (const child of this.chatContainer.children) {
            if (child instanceof TypingIndicator) {
                child.setStyle({ height: 1 });
                totalHeight += 1;
            }
        }

        const childCount = this.chatContainer.children.length;
        if (childCount > 1) {
            totalHeight += (childCount - 1) * (this.chatContainer.style.gap ?? 1);
        }

        this.chatContainer.setStyle({ height: totalHeight });
        this.messagesScrollView.setContentHeight(totalHeight);

        const scrollViewHeight = this.messagesScrollView.rect.height;
        const visibleHeight = Math.max(0, scrollViewHeight - 2);
        const maxOffset = Math.max(0, totalHeight - visibleHeight);
        this.messagesScrollView.scrollTo(maxOffset);

        this.markDirty();
    }

    override syncLayout(): void {
        super.syncLayout();
        if (this.rect.width !== this.lastWidth) {
            this.lastWidth = this.rect.width;
            this.updateMessageHeights();
            
            setTimeout(() => {
                this.markDirty();
                // Type assertion to bypass globalThis type constraint and request render
                (globalThis as any).__appInstance?.requestRender();
            }, 0);
        }
    }

    handleSendMessage(content: string) {
        const trimmed = content.trim();
        if (!trimmed) return;

        if (trimmed.toLowerCase() === '/clear') {
            this.messages = [];
            this.chatContainer.clearChildren();
            this.addMessage(
                'assistant',
                'Hello! I am a terminal assistant built using TermUI. Type a message below and I will stream a response back to you!'
            );
            this.textInput.clear();
            this.updateMessageHeights();
            // Type assertion to bypass globalThis type constraint and request render
            (globalThis as any).__appInstance?.requestRender();
            return;
        }

        if (trimmed.toLowerCase() === '/help') {
            this.addMessage('system', 'Available commands:\n- `/clear` - Clear all chat history\n- `/error` - Simulate an API error response\n- `/help` - Show this help message\n\nScroll the history using [PageUp] or [Ctrl+Up/Down].');
            this.textInput.clear();
            this.updateMessageHeights();
            // Type assertion to bypass globalThis type constraint and request render
            (globalThis as any).__appInstance?.requestRender();
            return;
        }

        this.addMessage('user', trimmed);
        this.textInput.clear();

        if (this.isStreaming) return;
        this.isStreaming = true;
        this.customHeader.setStreaming(true);

        if (trimmed.toLowerCase() === '/error' || trimmed.toLowerCase() === 'error' || trimmed.toLowerCase() === 'simulate an error.') {
            setTimeout(() => {
                this.addMessage('error', 'Error: Failed to process the request. Please verify your connection or try again.');
                this.isStreaming = false;
                this.customHeader.setStreaming(false);
                this.updateMessageHeights();
                // Type assertion to bypass globalThis type constraint and request render
                (globalThis as any).__appInstance?.requestRender();
            }, 500);
            return;
        }

        const typingIndicator = new TypingIndicator();
        this.chatContainer.addChild(typingIndicator);
        typingIndicator.startAnimation();
        this.updateMessageHeights();
        // Type assertion to bypass globalThis type constraint and request render
        (globalThis as any).__appInstance?.requestRender();

        setTimeout(() => {
            typingIndicator.stopAnimation();
            this.chatContainer.removeChild(typingIndicator);

            const assistantMsg = this.addMessage('assistant', '');

            const responses = [
                `# Chat Demo\n\nI received your message: **"${trimmed}"**.\n\nThis is a demonstration of streaming responses in TermUI. When using the \`CustomChatMessage\` widget, the content layout automatically wraps based on the available terminal width, and the \`ScrollView\` container handles history scrolling. Notice how the scrollbar updates and auto-scrolls to keep the latest lines visible!\n\nCheck out [TermUI Github](https://github.com/RosheshChaware/TermUI) for more details.`,
                `## Technical Breakdown\n\nInteresting question! Let's think about *"${trimmed}"* for a moment. Streaming in TermUI is highly reactive:\n\n> Any mutation to widget content triggers a \`markDirty()\` call, which flags the layout engine to re-render in the next frame.\n\nHere is a list of features:\n- Spacing and padding\n- Alignment based on role\n- Rounded borders\n- Inline and fenced code blocks\n- Markdown support\n\nHope this list is useful!`,
                `### TermUI Architecture\n\nHere is a quick summary of the TermUI architecture for your prompt:\n\n\`\`\`typescript\n// TermUI Core Modules\nconst core = {\n    renderer: "Differential Buffer Renderer",\n    layout: "Yoga Flexbox Layout",\n    events: "Key / Mouse Parser"\n};\nconsole.log(core);\n\`\`\`\n\nHere is a table showing features and statuses:\n\n| Feature | Status | Support |\n| :--- | :---: | ---: |\n| Markdown | Active | Native |\n| Auto-Scroll | Active | ScrollView |\n| Streaming | Active | Reactive |\n\nLet me know if you need more details!`
            ];

            const responseText = responses[trimmed.length % responses.length];

            let charIndex = 0;
            const charsPerTick = 3;

            const interval = setInterval(() => {
                charIndex += charsPerTick;
                const currentChunk = responseText.slice(0, charIndex);
                
                assistantMsg.content = currentChunk;
                assistantMsg.widget.setContent(currentChunk);
                
                this.updateMessageHeights();

                this.markDirty();
                // Type assertion to bypass globalThis type constraint and request render
                (globalThis as any).__appInstance?.requestRender();

                if (charIndex >= responseText.length) {
                    clearInterval(interval);
                    this.isStreaming = false;
                    this.customHeader.setStreaming(false);
                }
            }, 40);
        }, 800);
    }

    handleTextInputKey(event: KeyEvent): void {
        const key = event.key;
        switch (key) {
            case 'backspace':
                this.textInput.deleteBack();
                break;
            case 'delete':
                this.textInput.deleteForward();
                break;
            case 'left':
                this.textInput.moveCursorLeft();
                break;
            case 'right':
                this.textInput.moveCursorRight();
                break;
            case 'home':
                this.textInput.moveCursorHome();
                break;
            case 'end':
                this.textInput.moveCursorEnd();
                break;
            case 'space':
                this.textInput.insertChar(' ');
                break;
            case 'enter':
            case 'return':
                this.textInput.submit();
                break;
            case 'tab':
                const prompt = this.demoPrompts[this.demoPromptIdx];
                this.textInput.clear();
                for (const char of prompt) {
                    this.textInput.insertChar(char);
                }
                this.demoPromptIdx = (this.demoPromptIdx + 1) % this.demoPrompts.length;
                break;
            default:
                if (key && key.length === 1 && !event.ctrl && !event.alt) {
                    this.textInput.insertChar(key);
                }
        }
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        if (event.key === 'pageup' || (event.ctrl && event.key === 'up')) {
            this.messagesScrollView.scrollBy(-3);
            return true;
        }
        if (event.key === 'pagedown' || (event.ctrl && event.key === 'down')) {
            this.messagesScrollView.scrollBy(3);
            return true;
        }

        this.handleTextInputKey(event);
        return true;
    }

    protected _renderSelf(): void {}
}

async function main() {
    const chatApp = new ChatExampleApp();

    const app = new App(chatApp, {
        fullscreen: true,
        title: 'TermUI Streaming Chat',
        fps: 30,
    });

    // Type assertion to register appInstance on globalThis
    (globalThis as any).__appInstance = app;

    app.events.on('key', (event) => {
        const shouldContinue = chatApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
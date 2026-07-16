// ─────────────────────────────────────────────────────
// @termuijs/core — Flexbox-like Layout Engine
// ─────────────────────────────────────────────────────

import type { Style } from '../style/Style.js';
import { normalizeEdges } from '../style/Style.js';
import { borderSize } from '../style/Border.js';
import type { Rect } from './Rect.js';
import { Pos } from './pos.js';
import { Dim } from './dim.js';
import { resolveLayoutVariables, resolveConstraints, Flex } from './constraint.js';
import type { ResolvableNode } from './constraint.js';

/**
 * A node in the layout tree. Each widget produces one LayoutNode.
 */
export interface LayoutNode {
    /** Reference back to the widget/element that created this node */
    id: string;
    /** Style properties that affect layout */
    style: Style;
    /** Child nodes */
    children: LayoutNode[];
    /** Computed position and size — filled in by computeLayout() */
    computed: Rect;
    /** Dirty flag — true when this node needs to be re-laid-out. Foundation for layout caching. */
    _dirty: boolean;
    /** Last container dimensions used — separate from computed so manual computed edits don't confuse sizeChanged detection */
    _lastContainerWidth: number;
    _lastContainerHeight: number;
    /** Last computed dimensions — used to detect size changes in non-dirty nodes
     *  so grandchildren are re-laid out when a parent recomputes this node's rect. */
    _lastComputedWidth: number;
    _lastComputedHeight: number;
    /** Drag and drop support */
    _draggable?: boolean;
    _dragging?: boolean;
}

/**
 * Create a LayoutNode with default values.
 */
export function createLayoutNode(id: string, style: Style, children: LayoutNode[] = []): LayoutNode {
    return {
        id,
        style,
        children,
        computed: { x: 0, y: 0, width: 0, height: 0 },
        _dirty: true,
        _lastContainerWidth: 0,
        _lastContainerHeight: 0,
        _lastComputedWidth: 0,
        _lastComputedHeight: 0,
        _draggable: false,
        _dragging: false,
    };
}

/**
 * Compute the layout of a tree of LayoutNodes.
 *
 * This is a simplified Flexbox implementation that handles:
 * - flexDirection: row | column
 * - justifyContent: flex-start | flex-end | center | space-between | space-around
 * - alignItems: flex-start | flex-end | center | stretch
 * - flexGrow / flexShrink
 * - padding, margin, border
 * - fixed width/height, percentage width/height
 * - minWidth, maxWidth, minHeight, maxHeight
 * - gap between children
 */
export function computeLayout(root: LayoutNode, containerWidth: number, containerHeight: number): void {
    const sizeChanged = root._lastContainerWidth !== containerWidth || root._lastContainerHeight !== containerHeight;
    if (!sizeChanged && !root._dirty && !hasDirtyChild(root)) {
        return;
    }
    root._lastContainerWidth = containerWidth;
    root._lastContainerHeight = containerHeight;
    root.computed = { x: 0, y: 0, width: containerWidth, height: containerHeight };
    layoutNode(root, containerWidth, containerHeight);

    root.computed.width = containerWidth;
    root.computed.height = containerHeight;
}
export function invalidateLayout(node: LayoutNode): void {
    node._dirty = true;
    for (const child of node.children) {
        invalidateLayout(child);
    }
}
function hasDirtyChild(node: LayoutNode): boolean {
    if (node._dirty) return true;
    for (const child of node.children) {
        if (hasDirtyChild(child)) return true;
    }
    return false;
}
function layoutNode(node: LayoutNode, availWidth: number, availHeight: number, precomputed = false): void {
    // Skip only if not dirty AND dimensions are unchanged since last layout pass.
    // Note: node.computed.width/height are written by the parent before this call,
    // so comparing against them detects non-dirty nodes whose allocated size changed.
    if (!node._dirty &&
        node._lastComputedWidth === node.computed.width &&
        node._lastComputedHeight === node.computed.height) {
        return;
    }

    const style = node.style;
    const padding = normalizeEdges(style.padding);
    const margin = normalizeEdges(style.margin);
    const border = borderSize(style.border ?? 'none');

    if (!precomputed) {
        // Calculate this node's dimensions
        let nodeWidth = resolveSize(style.width, availWidth);
        let nodeHeight = resolveSize(style.height, availHeight);

        // Apply constraints
        if (nodeWidth === undefined) nodeWidth = availWidth - margin.left - margin.right;
        if (nodeHeight === undefined) nodeHeight = availHeight - margin.top - margin.bottom;

        // Validate dimensions — prevent NaN/Infinity propagation
        if (!Number.isFinite(nodeWidth)) nodeWidth = 0;
        if (!Number.isFinite(nodeHeight)) nodeHeight = 0;

        nodeWidth = clampSize(nodeWidth, style.minWidth, style.maxWidth);
        nodeHeight = clampSize(nodeHeight, style.minHeight, style.maxHeight);

        node.computed.width = nodeWidth;
        node.computed.height = nodeHeight;
    }

    if (node.children.length === 0) {
        node._dirty = false;
        node._lastComputedWidth = node.computed.width;
        node._lastComputedHeight = node.computed.height;
        return;
    }

    const nodeWidth = node.computed.width;
    const nodeHeight = node.computed.height;

    // Inner content area (after padding + border)
    // border.horizontal/vertical equals 2 (both sides), but the offset into content
    // only needs 1 (left/top border). The width/height reduction still uses the full 2.
    const innerX = padding.left + (border.horizontal > 0 ? 1 : 0);
    const innerY = padding.top + (border.vertical > 0 ? 1 : 0);
    const innerWidth = Math.max(0, nodeWidth - padding.left - padding.right - border.horizontal);
    const innerHeight = Math.max(0, nodeHeight - padding.top - padding.bottom - border.vertical);

    const direction = style.flexDirection ?? 'column';
    const isRow = direction === 'row';
    const gap = style.gap ?? 0;

    // ── Phase 0.0: CSS Grid Layout Solver ──
    if (style.display === 'grid') {
        const colGap = style.gridGap ?? style.gap ?? 0;
        const rowGap = style.gridGap ?? style.gap ?? 0;

        const colWidths = resolveTracks(style.gridTemplateColumns, innerWidth, colGap, 1);
        const numCols = colWidths.length;

        const occupied: boolean[][] = [];
        const getOccupied = (r: number, c: number): boolean => {
            if (!occupied[r]) return false;
            return !!occupied[r][c];
        };
        const setOccupied = (r: number, c: number, val: boolean) => {
            if (!occupied[r]) occupied[r] = [];
            occupied[r][c] = val;
        };

        const placements: Array<{
            child: LayoutNode;
            row: number;
            col: number;
            rowSpan: number;
            colSpan: number;
        }> = [];

        const autoChildren: LayoutNode[] = [];
        for (const child of node.children) {
            if (child.style.visible === false) continue;
            const s = child.style;

            const colInfo = getSpan(s.gridColumnStart, s.gridColumnEnd);
            const rowInfo = getSpan(s.gridRowStart, s.gridRowEnd);

            if (colInfo.start !== null || rowInfo.start !== null) {
                const cStart = colInfo.start ?? 0;
                const rStart = rowInfo.start ?? 0;

                placements.push({
                    child,
                    row: rStart,
                    col: cStart,
                    rowSpan: rowInfo.span,
                    colSpan: colInfo.span
                });

                for (let r = rStart; r < rStart + rowInfo.span; r++) {
                    for (let c = cStart; c < cStart + colInfo.span; c++) {
                        setOccupied(r, c, true);
                    }
                }
            } else {
                autoChildren.push(child);
            }
        }

        let currentAutoRow = 0;
        let currentAutoCol = 0;
        const maxAutoRow = Math.max(numCols * 100, 1000);

                for (const child of autoChildren) {
            const s = child.style;
            const colInfo = getSpan(s.gridColumnStart, s.gridColumnEnd);
            const rowInfo = getSpan(s.gridRowStart, s.gridRowEnd);

            const clampedColSpan = Math.max(1, Math.min(colInfo.span, numCols));

            let placed = false;
            while (currentAutoRow < maxAutoRow) {
                let available = true;
                for (let r = currentAutoRow; r < currentAutoRow + rowInfo.span; r++) {
                    for (let c = currentAutoCol; c < currentAutoCol + clampedColSpan; c++) {
                        if (c >= numCols) {
                            available = false;
                            break;
                        }
                        if (getOccupied(r, c)) {
                            available = false;
                            break;
                        }
                    }
                    if (!available) break;
                }

                if (available) {
                    placements.push({
                        child,
                        row: currentAutoRow,
                        col: currentAutoCol,
                        rowSpan: rowInfo.span,
                        colSpan: clampedColSpan
                    });

                    for (let r = currentAutoRow; r < currentAutoRow + rowInfo.span; r++) {
                        for (let c = currentAutoCol; c < currentAutoCol + clampedColSpan; c++) {
                            setOccupied(r, c, true);
                        }
                    }

                    currentAutoCol += clampedColSpan;
                    if (currentAutoCol >= numCols) {
                        currentAutoCol = 0;
                        currentAutoRow++;
                    }
                    placed = true;
                    break;
                } else {
                    currentAutoCol++;
                    if (currentAutoCol >= numCols) {
                        currentAutoCol = 0;
                        currentAutoRow++;
                    }
                }
            }

            if (!placed) {
                console.warn(
                    `[LayoutEngine] Grid auto-placement exhausted (maxAutoRow=${maxAutoRow}, ` +
                    `numCols=${numCols}): child "${child.id}" was not placed and will be invisible. ` +
                    `Check gridTemplateColumns or reduce colSpan values.`
                );
            }
        }

        
        let maxRowIndex = 0;
        for (const p of placements) {
            maxRowIndex = Math.max(maxRowIndex, p.row + p.rowSpan - 1);
        }

        const numRows = maxRowIndex + 1;
        const rowHeights = resolveTracks(style.gridTemplateRows, innerHeight, rowGap, numRows);

        const colOffsets: number[] = [];
        let cOffset = 0;
        for (let c = 0; c < colWidths.length; c++) {
            colOffsets.push(cOffset);
            cOffset += colWidths[c] + colGap;
        }

        const rowOffsets: number[] = [];
        let rOffset = 0;
        for (let r = 0; r < rowHeights.length; r++) {
            rowOffsets.push(rOffset);
            rOffset += rowHeights[r] + rowGap;
        }

        for (const p of placements) {
            const child = p.child;

            let itemWidth = 0;
            for (let c = p.col; c < p.col + p.colSpan; c++) {
                if (c < colWidths.length) itemWidth += colWidths[c];
            }
            if (p.colSpan > 1) {
                itemWidth += (p.colSpan - 1) * colGap;
            }

            let itemHeight = 0;
            for (let r = p.row; r < p.row + p.rowSpan; r++) {
                if (r < rowHeights.length) itemHeight += rowHeights[r];
            }
            if (p.rowSpan > 1) {
                itemHeight += (p.rowSpan - 1) * rowGap;
            }

            const xStart = colOffsets[p.col] ?? 0;
            const yStart = rowOffsets[p.row] ?? 0;

            const childMargin = normalizeEdges(child.style.margin);

            child.computed = {
                x: Math.floor(node.computed.x + innerX + xStart + childMargin.left),
                y: Math.floor(node.computed.y + innerY + yStart + childMargin.top),
                width: Math.round(Math.max(0, itemWidth - childMargin.left - childMargin.right)),
                height: Math.round(Math.max(0, itemHeight - childMargin.top - childMargin.bottom))
            };

            layoutNode(child, child.computed.width, child.computed.height, true);
        }

        node._dirty = false;
        node._lastComputedWidth = node.computed.width;
        node._lastComputedHeight = node.computed.height;
        return;
    }

    // ── Phase 0.1: 1D Layout Constraints (Overrides Flexbox) ──
    if (style.constraints && style.constraints.length > 0) {
        const mainAvail = isRow ? innerWidth : innerHeight;
        
        let flexJustify = Flex.Start;
        if (style.justifyContent === 'space-between') flexJustify = Flex.SpaceBetween;
        else if (style.justifyContent === 'space-around') flexJustify = Flex.SpaceAround;
        else if (style.justifyContent === 'center') flexJustify = Flex.Center;
        else if (style.justifyContent === 'flex-end') flexJustify = Flex.End;
        
        const results = resolveConstraints(mainAvail, style.constraints, flexJustify, gap);
        
        let visibleIndex = 0;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (visibleIndex >= results.length) break; // Ignore extra children
            if (child.style.visible === false) continue;

            const res = results[visibleIndex];
            const childMargin = normalizeEdges(child.style.margin);
            
            if (isRow) {
                child.computed = {
                    x: Math.floor(node.computed.x + innerX + res.offset + childMargin.left),
                    y: Math.floor(node.computed.y + innerY + childMargin.top),
                    width: Math.round(Math.max(0, res.size - childMargin.left - childMargin.right)),
                    height: Math.round(Math.max(0, innerHeight - childMargin.top - childMargin.bottom))
                };
            } else {
                child.computed = {
                    x: Math.floor(node.computed.x + innerX + childMargin.left),
                    y: Math.floor(node.computed.y + innerY + res.offset + childMargin.top),
                    width: Math.round(Math.max(0, innerWidth - childMargin.left - childMargin.right)),
                    height: Math.round(Math.max(0, res.size - childMargin.top - childMargin.bottom))
                };
            }
            layoutNode(child, child.computed.width, child.computed.height, true);
            visibleIndex++;
        }
        node._dirty = false;
        node._lastComputedWidth = node.computed.width;
        node._lastComputedHeight = node.computed.height;
        return;
    }

    // ── Phase 0.2: Topological Layout (Absolute positioned elements) ──
    const topologicalChildren = [];
    const flexChildren = [];

    for (const child of node.children) {
        if (child.style.visible === false) continue;
        const s = child.style;
        if (s.x instanceof Pos || s.y instanceof Pos || s.width instanceof Dim || s.height instanceof Dim || s.groupId != null) {
            topologicalChildren.push(child);
        } else {
            flexChildren.push(child);
        }
    }

    if (topologicalChildren.length > 0) {
        const resolvableNodes: ResolvableNode[] = topologicalChildren.map(child => {
            const s = child.style;
            // Provide a rough contentSize based on style or 0 if unknown
            let cw = 0, ch = 0;
            if (typeof s.width === 'number') cw = s.width;
            if (typeof s.height === 'number') ch = s.height;

            return {
                id: child.id,
                x: s.x,
                y: s.y,
                width: typeof s.width === 'string' ? undefined : s.width,
                height: typeof s.height === 'string' ? undefined : s.height,
                contentWidth: cw,
                contentHeight: ch,
                groupId: s.groupId,
                computed: { x: 0, y: 0, width: 0, height: 0 },
                _originalNode: child // keep reference
            } as ResolvableNode & { _originalNode: LayoutNode }; // we attach _originalNode during resolution to map back later
        });

        resolveLayoutVariables(resolvableNodes, innerWidth, innerHeight);

        for (const rNode of resolvableNodes) {
            const child = (rNode as ResolvableNode & { _originalNode: LayoutNode })._originalNode; // rNode is guaranteed to have _originalNode because we attached it during mapping
            child.computed = {
                x: Math.floor(node.computed.x + innerX + rNode.computed.x),
                y: Math.floor(node.computed.y + innerY + rNode.computed.y),
                width: Math.round(Math.max(0, rNode.computed.width)),
                height: Math.round(Math.max(0, rNode.computed.height))
            };
            layoutNode(child, child.computed.width, child.computed.height, true);
        }
    }

    // ── Phase 1: Measure children's desired sizes ──────

    const childInfos: Array<{
        node: LayoutNode;
        mainSize: number;
        crossSize: number;
        flexGrow: number;
        flexShrink: number;
        margin: { top: number; right: number; bottom: number; left: number };
    }> = [];

    let totalFixed = 0;
    let totalGrow = 0;
    let totalShrink = 0;

    for (const child of flexChildren) {
        const childMargin = normalizeEdges(child.style.margin);
        const childBorder = borderSize(child.style.border ?? 'none');
        const grow = child.style.flexGrow ?? 0;
        const shrink = child.style.flexShrink ?? 1;

        let mainSize: number;
        let crossSize: number;

        if (isRow) {
            mainSize = resolveSize(child.style.width, innerWidth) ?? 0;
            crossSize = resolveSize(child.style.height, innerHeight) ?? innerHeight;
            mainSize += childMargin.left + childMargin.right;
            crossSize = clampSize(crossSize, child.style.minHeight, child.style.maxHeight);
        } else {
            mainSize = resolveSize(child.style.height, innerHeight) ?? 0;
            crossSize = resolveSize(child.style.width, innerWidth) ?? innerWidth;
            mainSize += childMargin.top + childMargin.bottom;
            crossSize = clampSize(crossSize, child.style.minWidth, child.style.maxWidth);
        }

        totalFixed += mainSize;
        totalGrow += grow;
        totalShrink += shrink;

        childInfos.push({ node: child, mainSize, crossSize, flexGrow: grow, flexShrink: shrink, margin: childMargin });
    }

    const totalGaps = Math.max(0, childInfos.length - 1) * gap;
    const mainAvail = isRow ? innerWidth : innerHeight;
    const freeSpace = mainAvail - totalFixed - totalGaps;

    // ── Phase 2: Distribute free space (grow/shrink) ───

    if (freeSpace > 0 && totalGrow > 0) {
        for (const info of childInfos) {
            if (info.flexGrow > 0) {
                info.mainSize += (info.flexGrow / totalGrow) * freeSpace;
            }
        }
    } else if (freeSpace < 0 && totalShrink > 0) {
        for (const info of childInfos) {
            if (info.flexShrink > 0) {
                info.mainSize += (info.flexShrink / totalShrink) * freeSpace;
                info.mainSize = Math.max(0, info.mainSize);
            }
        }
    }

    // ── Phase 3: Position children ─────────────────────

    const totalMainUsed = childInfos.reduce((sum, i) => sum + i.mainSize, 0) + totalGaps;
    const remainingSpace = Math.max(0, mainAvail - totalMainUsed);

    let mainOffset: number;
    let spaceBetween = 0;

    const justify = style.justifyContent ?? 'flex-start';
    switch (justify) {
        case 'flex-start':
            mainOffset = 0;
            break;
        case 'flex-end':
            mainOffset = remainingSpace;
            break;
        case 'center':
            mainOffset = remainingSpace / 2;
            break;
        case 'space-between':
            mainOffset = 0;
            spaceBetween = childInfos.length > 1 ? remainingSpace / (childInfos.length - 1) : 0;
            break;
        case 'space-around':
            spaceBetween = childInfos.length > 0 ? remainingSpace / childInfos.length : 0;
            mainOffset = spaceBetween / 2;
            break;
        default:
            mainOffset = 0;
    }

    const crossAvail = isRow ? innerHeight : innerWidth;
    const align = style.alignItems ?? 'stretch';

    for (const info of childInfos) {
        // Cross axis alignment
        let crossOffset: number;
        let finalCrossSize = info.crossSize;

        switch (align) {
            case 'flex-start':
                crossOffset = 0;
                break;
            case 'flex-end':
                crossOffset = crossAvail - finalCrossSize;
                break;
            case 'center':
                crossOffset = (crossAvail - finalCrossSize) / 2;
                break;
            case 'stretch':
                crossOffset = 0;
                finalCrossSize = crossAvail;
                break;
            default:
                crossOffset = 0;
        }

        // Set computed rect
        if (isRow) {
            info.node.computed = {
                x: Math.floor(node.computed.x + innerX + mainOffset + info.margin.left),
                y: Math.floor(node.computed.y + innerY + crossOffset + info.margin.top),
                width: Math.round(Math.max(0, info.mainSize - info.margin.left - info.margin.right)),
                height: Math.round(Math.max(0, finalCrossSize - info.margin.top - info.margin.bottom)),
            };
        } else {
            info.node.computed = {
                x: Math.floor(node.computed.x + innerX + crossOffset + info.margin.left),
                y: Math.floor(node.computed.y + innerY + mainOffset + info.margin.top),
                width: Math.round(Math.max(0, finalCrossSize - info.margin.left - info.margin.right)),
                height: Math.round(Math.max(0, info.mainSize - info.margin.top - info.margin.bottom)),
            };
        }

        mainOffset += info.mainSize + gap + spaceBetween;

        // Recursively layout children — dimensions already set by parent
        layoutNode(info.node, info.node.computed.width, info.node.computed.height, true);
    }

    // Mark this node clean after layout is complete (used by future caching logic)
    node._dirty = false;
    node._lastComputedWidth = node.computed.width;
    node._lastComputedHeight = node.computed.height;
}

/**
 * Resolve a size value (fixed number or percentage string) to pixels.
 * Returns undefined if the value is not set.
 */
function resolveSize(value: number | string | undefined | Dim, available: number): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) return 0;
        return value;
    }
    if (typeof value === 'string' && value.endsWith('%')) {
        const pct = parseFloat(value) / 100;
        if (!Number.isFinite(pct) || pct < 0) return 0;
        return Math.floor(available * pct);
    }
    return undefined;
}

/**
 * Clamp a size to min/max bounds.
 */
function clampSize(value: number, min?: number, max?: number): number {
    let result = value;
    if (min !== undefined) result = Math.max(result, min);
    if (max !== undefined) result = Math.min(result, max);
    return result;
}

function getSpan(start: number | string | undefined, end: number | string | undefined): { start: number | null, span: number } {
    let startIdx: number | null = null;
    let span = 1;

    if (typeof start === 'number') {
        startIdx = start - 1;
    } else if (typeof start === 'string') {
        if (start.startsWith('span ')) {
            span = parseInt(start.substring(5)) || 1;
        } else {
            const val = parseInt(start);
            if (!isNaN(val)) startIdx = val - 1;
        }
    }

    if (typeof end === 'number') {
        if (startIdx !== null) {
            span = Math.max(1, end - 1 - startIdx);
        } else {
            // Note: When start is undefined, the numeric end value is interpreted as
            // a span count rather than a grid line number.
            span = end;
        }
    } else if (typeof end === 'string') {
        if (end.startsWith('span ')) {
            span = parseInt(end.substring(5)) || 1;
        } else {
            const val = parseInt(end);
            if (startIdx !== null && !isNaN(val)) {
                span = Math.max(1, val - 1 - startIdx);
            }
        }
    }
    return { start: startIdx, span };
}

function resolveTracks(template: string | undefined, totalSize: number, gap: number, fallbackCount: number): number[] {
    let parts: string[] = [];
    if (template) {
        parts = template.trim().split(/\s+/);
    }
    while (parts.length < fallbackCount) {
        parts.push('1fr');
    }
    const count = parts.length;
    const totalGaps = Math.max(0, count - 1) * gap;
    const sizeForTracks = Math.max(0, totalSize - totalGaps);

    let fixedSum = 0;
    let frSum = 0;
    const parsed = parts.map(part => {
        if (part.endsWith('px')) {
            const val = parseFloat(part);
            fixedSum += val;
            return { type: 'px', value: val };
        } else if (part.endsWith('fr')) {
            const val = parseFloat(part);
            frSum += val;
            return { type: 'fr', value: val };
        } else if (part.endsWith('%')) {
            const val = (parseFloat(part) / 100) * sizeForTracks;
            fixedSum += val;
            return { type: 'px', value: val };
        } else if (part === 'auto') {
            frSum += 1;
            return { type: 'fr', value: 1 };
        } else {
            const val = parseFloat(part);
            if (!isNaN(val)) {
                fixedSum += val;
                return { type: 'px', value: val };
            }
            frSum += 1;
            return { type: 'fr', value: 1 };
        }
    });

    const remaining = Math.max(0, sizeForTracks - fixedSum);
    const frUnitValue = frSum > 0 ? remaining / frSum : 0;

    return parsed.map(track => {
        if (track.type === 'px') return track.value;
        if (track.type === 'fr') return track.value * frUnitValue;
        return 0;
    });
}


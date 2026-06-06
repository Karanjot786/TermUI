// ─────────────────────────────────────────────────────
// @termuijs/core — Public API
// ─────────────────────────────────────────────────────

// ── Terminal ──────────────────────────────────────────
export { Terminal } from './terminal/Terminal.js';
export type { TerminalOptions } from './terminal/Terminal.js';
export { Screen, emptyCell, cellsEqual } from './terminal/Screen.js';
export type { Cell } from './terminal/Screen.js';
export { Renderer } from './terminal/Renderer.js';
export { LayerManager } from './terminal/LayerManager.js';
export type { Layer } from './terminal/LayerManager.js';
export { caps, prefersReducedMotion } from './terminal/env-caps.js';
export { BOX, BRAILLE_SPIN, BLOCK } from './terminal/ascii-map.js';

// ── Renderer ──────────────────────────────────────────
export { RenderHook } from './renderer/render-hook.js';
export { mergeBorders } from './renderer/border-merge.js';

// ── Input ─────────────────────────────────────────────
export { InputParser } from './input/InputParser.js';
export { ESCAPE_SEQUENCES, CTRL_KEYS, SPECIAL_KEYS } from './input/KeyMap.js';
export { parseMouseEvent, isMouseSequence } from './input/MouseParser.js';
export { MouseGestures } from './input/MouseGestures.js';
export type { MouseGesturesOptions } from './input/MouseGestures.js';
export { ChordMatcher } from './input/ChordMatcher.js';
export type { ChordMatcherOptions, Chord } from './input/ChordMatcher.js';
export { LiveRender } from './renderer/live-render.js';
// ── Layout ────────────────────────────────────────────
export { computeLayout, createLayoutNode, invalidateLayout } from './layout/LayoutEngine.js';
export type { LayoutNode } from './layout/LayoutEngine.js';
export { emptyRect, containsPoint, shrinkRect, intersectRect, unionRect } from './layout/Rect.js';
export type { Rect, Size } from './layout/Rect.js';
export { Pos } from './layout/pos.js';
export { Dim } from './layout/dim.js';
export {
    Constraint,
    LengthConstraint,
    PercentageConstraint,
    MinConstraint,
    MaxConstraint,
    FillConstraint,
    Flex,
    resolveConstraints,
    resolveLayoutVariables
} from './layout/constraint.js';
export type { ResolvableNode } from './layout/constraint.js';

// ── Events ────────────────────────────────────────────
export { EventEmitter } from './events/EventEmitter.js';
export { FocusManager } from './events/FocusManager.js';
export type { Focusable } from './events/FocusManager.js';
export type { KeyEvent, MouseEvent, ResizeEvent, FocusEvent, EventMap } from './events/types.js';
export { createKeyEvent } from './events/types.js';

// ── Style ─────────────────────────────────────────────
export { defaultStyle, mergeStyles, normalizeEdges, styleToCellAttrs, hasLayoutChanges } from './style/Style.js';
export type { Style, Edges } from './style/Style.js';
export { getBorderChars, borderSize, BORDER_CHARS } from './style/Border.js';
export type { BorderStyle, BorderChars } from './style/Border.js';
export {
    parseColor, colorToRgb, colorToAnsiFg, colorToAnsiBg,
    detectColorDepth, ColorDepth,
    relativeLuminance, contrastRatio, wcagLevel, validateThemeContrast,
} from './style/Color.js';
export type { Color, NamedColor, ContrastFailure } from './style/Color.js';

// ── Symbols ───────────────────────────────────────────
export {
    BorderSets, BarSets, ScrollbarSets, LineSets, Shade,
    VERTICAL_BAR_SYMBOLS, HORIZONTAL_BAR_SYMBOLS,
    BRAILLE_OFFSET, BRAILLE_DOTS,
} from './style/symbols.js';
export type { BorderSet, BarSet, ScrollbarSet, LineSet } from './style/symbols.js';

// ── Test Backend ──────────────────────────────────────
export {
    createTestScreen, testScreenToString, testScreenSetCell,
    testScreenGetCell, testScreenClear, testScreenSetString,
} from './terminal/TestBackend.js';
export type { TestScreen } from './terminal/TestBackend.js';

// ── App ───────────────────────────────────────────────
export { App } from './app/App.js';
export type { AppOptions, RootWidget } from './app/App.js';
export { shouldUseFallback, renderFallback } from './app/Fallback.js';
export { renderInlineToTerminal, createInlineViewport } from './inline-viewport.js';

// ── Utilities ─────────────────────────────────────────
export { stringWidth, truncate, stripAnsi, wordWrap } from './utils/unicode.js';
export * as ansi from './utils/ansi.js';
export { writeClipboard, readClipboard } from './utils/ansi.js';
export { debounce } from './utils/debounce.js';
export type { DebounceOptions } from './utils/debounce.js';
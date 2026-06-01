// ─────────────────────────────────────────────────────
// @termuijs/jsx — JSX Automatic Runtime
//
// This file is imported automatically by TypeScript
// when using "jsx": "react-jsx" with
// "jsxImportSource": "@termuijs/jsx"
// ─────────────────────────────────────────────────────

export { jsx, jsxs } from './createElement.js';
export { Fragment } from './vnode.js';

// ── JSX Intrinsic Element Types ───────────────────────
// Consumed by TypeScript's automatic JSX transform to
// type-check intrinsic (string-tag) elements.

export namespace JSX {
    export interface IntrinsicElements {
        box: {
            children?: any;
            key?: string | number;
            flexDirection?: 'row' | 'column';
            flexGrow?: number;
            flexShrink?: number;
            gap?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
            border?: string;
            borderColor?: string;
        };
        text: {
            children?: any;
            key?: string | number;
            color?: string;
            bold?: boolean;
            dim?: boolean;
            italic?: boolean;
            align?: 'left' | 'center' | 'right';
            flexGrow?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
        };
        row: {
            children?: any;
            key?: string | number;
            gap?: number;
            flexGrow?: number;
            flexShrink?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
            border?: string;
            borderColor?: string;
        };
        col: {
            children?: any;
            key?: string | number;
            gap?: number;
            flexGrow?: number;
            flexShrink?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
            border?: string;
            borderColor?: string;
        };
        column: {
            children?: any;
            key?: string | number;
            gap?: number;
            flexGrow?: number;
            flexShrink?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
            border?: string;
            borderColor?: string;
        };
        spacer: {
            key?: string | number;
            grow?: number;
        };
        divider: {
            key?: string | number;
            char?: string;
            color?: string;
        };
        progressbar: {
            key?: string | number;
            value: number;
            fillChar?: string;
            emptyChar?: string;
            fillColor?: string;
            showLabel?: boolean;
            labelFormat?: string;
            flexGrow?: number;
            width?: number | string;
            height?: number | string;
        };
        grid: {
            children?: any;
            key?: string | number;
            columns?: number;
            gap?: number;
            rowGap?: number;
            colGap?: number;
            flexGrow?: number;
            width?: number | string;
            height?: number | string;
            padding?: number;
            margin?: number;
            border?: string;
            borderColor?: string;
        };
        skeleton: {
            key?: string | number;
            variant?: 'pulse' | 'shimmer';
            intervalMs?: number;
            chars?: [string, string];
            flexGrow?: number;
            width?: number | string;
            height?: number | string;
            border?: string;
            borderColor?: string;
        };
    }
}
export { jsx as jsxDEV } from './createElement.js';

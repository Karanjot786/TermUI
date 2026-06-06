// ─────────────────────────────────────────────────────
// @termuijs/widgets — Progress Column Definitions
// ─────────────────────────────────────────────────────

export interface ProgressColumnProps {
    maxRefresh?: number;
}

export interface TextColumnProps extends ProgressColumnProps {
    template?: string;
}

export type ProgressColumnRenderer = (
    task: Record<string, unknown>,
) => string;

export interface ProgressColumnDefinition {
    kind: 'bar' | 'text' | 'time' | 'speed' | 'percentage';
    maxRefresh?: number;
    template?: string;
    render?: ProgressColumnRenderer;
}


export function BarColumn(
    props: ProgressColumnProps = {},
): ProgressColumnDefinition {
    return {
        kind: 'bar',
        ...props,
    };
}

export function TextColumn(
    props: TextColumnProps = {},
): ProgressColumnDefinition {
    return {
        kind: 'text',
        template: props.template,
        maxRefresh: props.maxRefresh,
    };
}

export function TimeColumn(
    props: ProgressColumnProps = {},
): ProgressColumnDefinition {
    return {
        kind: 'time',
        ...props,
    };
}

export function SpeedColumn(
    props: ProgressColumnProps = {},
): ProgressColumnDefinition {
    return {
        kind: 'speed',
        ...props,
    };
}

export function PercentageColumn(
    props: ProgressColumnProps = {},
): ProgressColumnDefinition {
    return {
        kind: 'percentage',
        ...props,
    };
}
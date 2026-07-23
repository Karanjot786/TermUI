// ─────────────────────────────────────────────────────
// @termuijs/widgets — Progress
// ─────────────────────────────────────────────────────

import { Widget } from '../base/Widget.js';
import type { ProgressColumnDefinition } from './ProgressColumn.js';
import {
    BarColumn,
    TextColumn,
    PercentageColumn,
} from './ProgressColumn.js';
import { type Screen, type Style, truncate } from '@termuijs/core';
export interface ProgressTask {
    label?: string;
    value?: number;
    status?: string;
    [key: string]: unknown;
}

export interface ProgressProps {
    tasks?: ProgressTask[];
    columns?: ProgressColumnDefinition[];
     children?: unknown;
}

export class Progress extends Widget {
    private _tasks: ProgressTask[];
    private _columns: ProgressColumnDefinition[];

  private _resolveColumns(
    children?: unknown,
): ProgressColumnDefinition[] {
    if (!children) return [];

    const items = Array.isArray(children)
        ? children
        : [children];

    const columns: ProgressColumnDefinition[] = [];

    for (const item of items) {
        if (
            item &&
            typeof item === 'object' &&
            'type' in (item as Record<string, unknown>)
        ) {
            const vnode = item as {
                type?: unknown;
                props?: Record<string, unknown>;
            };

            const props = vnode.props ?? {};

            if (vnode.type === BarColumn) {
                columns.push(BarColumn(props));
            } else if (vnode.type === TextColumn) {
                columns.push(TextColumn(props));
            } else if (vnode.type === PercentageColumn) {
                columns.push(PercentageColumn(props));
            }
        }
    }

    return columns;
}

    constructor(
        props: ProgressProps = {},
        style: Partial<Style> = {},
    ) {
        super(style);

        this._tasks = props.tasks ?? [];
        
        const childColumns = this._resolveColumns(
    props.children,
);

this._columns =
    childColumns.length
        ? childColumns
        : props.columns?.length
            ? props.columns
            : [
                BarColumn(),
                TextColumn(),
                PercentageColumn(),
            ];
        
     
    }

    get tasks(): ProgressTask[] {
        return this._tasks;
    }

    get columns(): ProgressColumnDefinition[] {
        return this._columns;
    }

    public setTasks(tasks: ProgressTask[]): void {
        if (tasks === this._tasks) {
            return;
        }
    this._tasks = tasks;
    this.markDirty();
}

    protected _renderSelf(screen: Screen): void {
    const rect = this._getContentRect();
    const { x, y, width, height } = rect;

    if (width <= 0 || height <= 0) return;

    this._tasks.forEach((task, index) => {
        if (index >= height) return;

        const parts: string[] = [];

        for (const [, column] of this._columns.entries()) {

            if (column.render) {
        parts.push(column.render(task));
        continue;
    }

            switch (column.kind) {
                case 'text': {
    const template = column.template;

    if (template) {
        const match = template.match(
            /^\{task\.([a-zA-Z0-9_]+)\}$/
        );

        if (match) {
            parts.push(
                String(
                    task[match[1]] ?? ''
                )
            );
        } else {
            parts.push(template);
        }
    } else {
        parts.push(String(task.label ?? ''));
    }

    break;
}

                case 'percentage':
                    parts.push(`${Math.round((task.value ?? 0) * 100)}%`);
                    break;

                case 'bar': {
                    const value = Math.max(0, Math.min(1, task.value ?? 0));
                    const filled = Math.round(value * 10);
                    const empty = 10 - filled;

                    parts.push(
                        `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`,
                    );
                    break;
                }
            }
        }

        screen.writeString(
            x,
            y + index,
            truncate(parts.join(' '), width, ''),
            this.style,
        );
    });
}
}

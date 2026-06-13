import { describe, expect, it, vi } from 'vitest';
import { Screen, type Rect } from '@termuijs/core';

import { Widget } from '../base/Widget.js';
import { AspectRatio } from './AspectRatio.js';

class TestChild extends Widget {
    renderedRect: Rect | null = null;

    protected _renderSelf(screen: Screen): void {
        this.renderedRect = { ...this._rect };

        screen.setCell(
            this._rect.x,
            this._rect.y,
            { char: '@' },
        );
    }
}

describe('AspectRatio', () => {
    it('child rect approximates requested ratio', () => {
        const child = new TestChild();

        const widget = new AspectRatio(
            child,
            {},
            { ratio: 2 },
        );

        widget.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 30,
        });

        const screen = new Screen(40, 30);

        widget.render(screen);

        expect(child.renderedRect).not.toBeNull();

        const ratio =
            child.renderedRect!.width /
            child.renderedRect!.height;

        expect(ratio).toBeCloseTo(
            2,
            0,
        );
    });

    it('contain mode leaves blank rows when container is taller', () => {
        const child = new TestChild();

        const widget = new AspectRatio(
            child,
            {},
            {
                ratio: 2,
                fit: 'contain',
            },
        );

        widget.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 30,
        });

        const screen = new Screen(40, 30);

        widget.render(screen);

        expect(child.renderedRect).not.toBeNull();

        expect(
            child.renderedRect!.height,
        ).toBe(20);

        expect(
            child.renderedRect!.y,
        ).toBe(5);
    });

    it('setChild triggers markDirty', () => {
        const child1 = new TestChild();
        const child2 = new TestChild();

        const widget = new AspectRatio(
            child1,
        );

        const spy = vi.spyOn(
            widget,
            'markDirty',
        );

        widget.setChild(child2);

        expect(spy).toHaveBeenCalled();
    });
});
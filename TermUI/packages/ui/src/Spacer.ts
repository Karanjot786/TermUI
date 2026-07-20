// Spacer — flexible empty space
import { Widget } from '@termuijs/widgets';
import { type Screen, mergeStyles, defaultStyle } from '@termuijs/core';

export class Spacer extends Widget {
    constructor(grow: number = 1) {
        super(mergeStyles(defaultStyle(), { flexGrow: grow }));
    }
    protected _renderSelf(_screen: Screen): void { /* empty */ }
}

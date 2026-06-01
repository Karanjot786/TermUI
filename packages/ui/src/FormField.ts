import { Widget } from "@termuijs/widgets";
import { type Screen, styleToCellAttrs } from "@termuijs/core";

export interface FormFieldProps {
    label: string;
    error?: string;
    child: Widget;
}

export class FormField extends Widget {
    private _label: string;
    private _error?: string;
    private _child: Widget;

    constructor({ label, error, child }: FormFieldProps) {
        super({ height: 3 });

        this._label = label;
        this._error = error;
        this._child = child;
    }

    set label(value: string) {
        this._label = value;
        this.markDirty();
    }

    get label() {
        return this._label;
    }


    set error(value: string | undefined) {
        this._error = value;
        this.markDirty();
    }

    get error() {
        return this._error;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        const attrs = styleToCellAttrs(this.style);

        const labelText = this._label.slice(0, width);
        const errorText = this._error?.slice(0, width);

        // 1. Label
        screen.writeString(x, y, labelText, attrs);

        // 2. Child
        this._child.render(screen as any);

        // 3. Error
        if (errorText) {
            screen.writeString(
                x,
                y + 2,
                errorText,
                {
                    ...attrs,
                    fg: { type: "named", name: "red" },
                }
            );
        }
    }
}
import { Widget } from '../base/Widget.js'
import type { Screen, Style } from '@termuijs/core'

export interface HexdumpOptions {
    /** Bytes per row. Default: 16 */
    bytesPerRow?: number

    /** Character shown for non-printable bytes in ASCII column. Default: '.' */
    placeholder?: string
}

export class Hexdump extends Widget {
    private data!: Uint8Array
    private opts!: HexdumpOptions

    constructor(
        data: Uint8Array,
        style?: Partial<Style>,
        opts?: HexdumpOptions,
    ) {
        super(style)

        this.data = data
        this.opts = {
            bytesPerRow: 16,
            placeholder: '.',
            ...opts,
        }
    }

    setData(data: Uint8Array): void {
        this.data = data
        this.markDirty()
    }

    protected _renderSelf(screen: Screen): void {
        // TODO: render hexdump rows
    }
}
import { Widget } from '../base/Widget.js'
import { type Screen, type Style, styleToCellAttrs } from '@termuijs/core'

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
        const rect = this._getContentRect()
        const { x, y, width, height } = rect
        if (width <= 0 || height <= 0) return

        const attrs = styleToCellAttrs(this._style)
        const bytesPerRow = this.opts.bytesPerRow!
        const placeholder = this.opts.placeholder!

        const numRows = Math.ceil(this.data.length / bytesPerRow)
        const renderRows = Math.min(height, numRows)

        const half = Math.floor(bytesPerRow / 2)

        for (let row = 0; row < renderRows; row++) {
            const offset = row * bytesPerRow
            const chunk = this.data.subarray(offset, offset + bytesPerRow)

            // 1. Offset string (8 chars)
            const offsetStr = offset.toString(16).padStart(8, '0')

            // 2. Hex strings (e.g. "41 42 43 ")
            let hexStr = ''
            for (let i = 0; i < bytesPerRow; i++) {
                if (i < chunk.length) {
                    hexStr += chunk[i].toString(16).padStart(2, '0') + ' '
                } else {
                    hexStr += '   '
                }
                
                // Add extra space halfway
                if (i === half - 1 && bytesPerRow > 1) {
                    hexStr += ' '
                }
            }

            // 3. ASCII column
            let asciiStr = '|'
            for (let i = 0; i < chunk.length; i++) {
                const byte = chunk[i]
                // Printable ASCII: 32 to 126
                if (byte >= 32 && byte <= 126) {
                    asciiStr += String.fromCharCode(byte)
                } else {
                    asciiStr += placeholder
                }
            }
            for (let i = chunk.length; i < bytesPerRow; i++) {
                asciiStr += ' '
            }
            asciiStr += '|'

            const line = `${offsetStr}  ${hexStr} ${asciiStr}`
            
            // Render line, truncate to width if necessary
            screen.writeString(x, y + row, line.substring(0, width), attrs)
        }
    }
}
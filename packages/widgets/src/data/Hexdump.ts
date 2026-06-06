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
        if (!this.data || this.data.length === 0) return

        const { x, y, width, height } = this._getContentRect()
        const bytesPerRow = this.opts.bytesPerRow || 16
        const placeholder = this.opts.placeholder || '.'
        
        const rows = Math.ceil(this.data.length / bytesPerRow)
        const maxRows = Math.min(rows, height)

        for (let row = 0; row < maxRows; row++) {
            const rowY = y + row
            
            const offset = (row * bytesPerRow).toString(16).padStart(8, '0')
            
            let currentX = x
            for (let i = 0; i < 8 && currentX < x + width; i++, currentX++) {
                screen.setCell(currentX, rowY, { char: offset[i] })
            }

            currentX++ // space after offset
            const hexStartX = currentX
            const asciiStartX = hexStartX + bytesPerRow * 3

            for (let col = 0; col < bytesPerRow; col++) {
                const idx = row * bytesPerRow + col
                if (idx < this.data.length) {
                    const byte = this.data[idx]
                    const hex = byte.toString(16).padStart(2, '0').toUpperCase()
                    
                    const hexX = hexStartX + col * 3
                    if (hexX < x + width) screen.setCell(hexX, rowY, { char: hex[0] })
                    if (hexX + 1 < x + width) screen.setCell(hexX + 1, rowY, { char: hex[1] })

                    const asciiX = asciiStartX + col
                    if (asciiX < x + width) {
                        const char = (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : placeholder
                        screen.setCell(asciiX, rowY, { char })
                    }
                }
            }
        }
    }
}
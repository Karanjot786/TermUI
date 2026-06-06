import { describe, expect, it } from "vitest"
import { Progress } from "./Progress.js"
import { Screen } from '@termuijs/core'
import { TextColumn, PercentageColumn, BarColumn } from './ProgressColumn.js'

describe("Progress", () => {
    it("renders progress bars correctly", () => {
        const widget = new Progress({
            tasks: [
                { label: 'Downloading', value: 0.5 },
                { label: 'Extracting', value: 1.0 }
            ],
            columns: [TextColumn(), BarColumn(), PercentageColumn()]
        })

        const screen = new Screen(40, 5)
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 })
        widget.render(screen)

        const row0 = screen.back[0].map(c => c.char).join('')
        const row1 = screen.back[1].map(c => c.char).join('')

        expect(row0).toContain('Downloading')
        expect(row0).toContain('50%')
        expect(row0).toContain('█████░░░░░')

        expect(row1).toContain('Extracting')
        expect(row1).toContain('100%')
        expect(row1).toContain('██████████')
    })

    it("setTasks updates the tasks list", () => {
        const widget = new Progress({
            tasks: [{ label: 'Downloading', value: 0 }],
            columns: [TextColumn(), PercentageColumn()]
        })
        const screen = new Screen(40, 5)
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 })
        widget.render(screen)
        
        expect(screen.back[0].map(c => c.char).join('')).toContain('Downloading')
        expect(screen.back[0].map(c => c.char).join('')).toContain('0%')

        widget.setTasks([{ label: 'Downloading', value: 1 }])
        widget.render(screen)
        
        expect(screen.back[0].map(c => c.char).join('')).toContain('100%')
    })
})

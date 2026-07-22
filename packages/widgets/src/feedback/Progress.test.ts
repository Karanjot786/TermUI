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

    it("does not mark dirty when setTasks receives the same array reference", () => {
        const tasks = [
            { label: 'Downloading', value: 0.5 }
        ];
    
        const widget = new Progress({
            tasks,
            columns: [TextColumn(), PercentageColumn()]
        });
    
        widget.clearDirty();
    
        widget.setTasks(tasks);
    
        expect(widget.isDirty).toBe(false);
    });
    
    it("marks dirty when setTasks receives a different array", () => {
        const widget = new Progress({
            tasks: [
                { label: 'Downloading', value: 0.5 }
            ],
            columns: [TextColumn(), PercentageColumn()]
        });
    
        widget.clearDirty();
    
        widget.setTasks([
            { label: 'Downloading', value: 0.75 }
        ]);
    
        expect(widget.isDirty).toBe(true);
    });

    it("truncates rendering output to fit available width", () => {
        const widget = new Progress({
            tasks: [{ label: 'VeryLongDownloadingLabelTaskTextDescription', value: 0.5 }],
            columns: [TextColumn(), PercentageColumn()]
        });
        const screen = new Screen(12, 1);
        widget.updateRect({ x: 0, y: 0, width: 12, height: 1 });
        widget.render(screen);

        const row = screen.back[0].map(c => c.char).join('');
        expect(row.length).toBeLessThanOrEqual(12);
        expect(row).toBe('VeryLongDown');
    });
});

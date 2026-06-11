import { describe, expect, it } from "vitest"
import { TaskList, TaskItem } from "./TaskList.js"
import { Screen } from '@termuijs/core'

describe("TaskList", () => {
    it("renders tasks with standard indicators", () => {
        const tasks: TaskItem[] = [
            { id: 1, label: 'Task 1', status: 'pending' },
            { id: 2, label: 'Task 2', status: 'running' },
            { id: 3, label: 'Task 3', status: 'done' },
            { id: 4, label: 'Task 4', status: 'error' }
        ]
        const widget = new TaskList({}, {
            pendingText: '[ ]',
            runningText: '[>_]',
            doneText: '[x]',
            errorText: '[!]'
        }, tasks)

        const screen = new Screen(40, 5)
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 })
        widget.render(screen)

        expect(screen.back[0].map(c => c.char).join('')).toContain('Task 1 [ ]')
        expect(screen.back[1].map(c => c.char).join('')).toContain('Task 2 [>_]')
        expect(screen.back[2].map(c => c.char).join('')).toContain('Task 3 [x]')
        expect(screen.back[3].map(c => c.char).join('')).toContain('Task 4 [!]')
    })

    it("setTasks updates the tasks list", () => {
        const widget = new TaskList({}, {}, [{ id: 1, label: 'Task 1', status: 'pending' }])
        const screen = new Screen(40, 5)
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 })
        widget.render(screen)
        
        expect(screen.back[0].map(c => c.char).join('')).toContain('Task 1 ...')

        widget.setTasks([{ id: 1, label: 'Task 1', status: 'done' }])
        widget.render(screen)
        
        expect(screen.back[0].map(c => c.char).join('')).toContain('Task 1 ...') // Default is '...'
    })

    it("animates spinner when wheelspin is true", () => {
        const widget = new TaskList({}, { wheelspin: true }, [{ id: 1, label: 'Task 1', status: 'running' }])
        const screen = new Screen(40, 5)
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 })
        
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('Task 1 ⠋')

        widget.tick(100)
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('Task 1 ⠙')
    })

    it("does not mark dirty when setTasks receives the same array reference", () => {
        const tasks: TaskItem[] = [
            { id: 1, label: "Task 1", status: "pending" }
        ];
    
        const widget = new TaskList({}, {}, tasks);
    
        widget.clearDirty();
    
        widget.setTasks(tasks);
    
        expect(widget.isDirty).toBe(false);
    });
    
    it("marks dirty when setTasks receives a different array", () => {
        const widget = new TaskList(
            {},
            {},
            [{ id: 1, label: "Task 1", status: "pending" }]
        );
    
        widget.clearDirty();
    
        widget.setTasks([
            { id: 2, label: "Task 2", status: "done" }
        ]);
    
        expect(widget.isDirty).toBe(true);
    });
    
})

import { describe, it, expect, beforeEach } from "vitest";
import { Screen } from "@termuijs/core";
import { DraggableWidget, DroppableWidget, DragState } from "./DragAndDrop.js";

describe("DragAndDrop", () => {
    beforeEach(() => {
        DragState.isDragging = false;
        DragState.activeDragId = null;
    });

    it("starts drag on mousedown", () => {
        let started = false;
        const drag = new DraggableWidget({
            id: "drag-1",
            onDragStart: () => { started = true; }
        });
        
        drag.handleMouse({ type: "mousedown", x: 0, y: 0, button: "left" });
        expect(started).toBe(true);
        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe("drag-1");
    });
    
    it("completes drop on mouseup over droppable", () => {
        let droppedId: string | null = null;
        
        const drag = new DraggableWidget({ id: "drag-2" });
        const drop = new DroppableWidget({
            id: "drop-1",
            onDrop: (id) => { droppedId = id; }
        });
        
        drag.handleMouse({ type: "mousedown", x: 0, y: 0, button: "left" });
        expect(DragState.isDragging).toBe(true);
        
        drop.handleMouse({ type: "mouseup", x: 0, y: 0, button: "left" });
        expect(droppedId).toBe("drag-2");
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });
    
    it("starts drag with space key", () => {
        const drag = new DraggableWidget({ id: "drag-3" });
        drag.handleKey({ key: "space" });
        expect(DragState.isDragging).toBe(true);
        expect(DragState.activeDragId).toBe("drag-3");
        
        // second space cancels drag
        drag.handleKey({ key: "space" });
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });
    
    it("completes drop with enter key", () => {
        let droppedId: string | null = null;
        const drop = new DroppableWidget({
            id: "drop-2",
            onDrop: (id) => { droppedId = id; }
        });
        
        DragState.isDragging = true;
        DragState.activeDragId = "some-drag-item";
        
        drop.handleKey({ key: "enter" });
        expect(droppedId).toBe("some-drag-item");
        expect(DragState.isDragging).toBe(false);
    });

    it("cancels drag with escape key", () => {
        const drag = new DraggableWidget({ id: "drag-4" });
        drag.handleMouse({ type: "mousedown", x: 0, y: 0, button: "left" });
        expect(DragState.isDragging).toBe(true);
        
        drag.handleKey({ key: "escape" });
        expect(DragState.isDragging).toBe(false);
        expect(DragState.activeDragId).toBeNull();
    });
    
    it("renders transparently", () => {
        const drag = new DraggableWidget({ id: "drag-5" });
        const screen = new Screen(10, 10);
        drag.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        expect(() => drag.render(screen)).not.toThrow();
        
        const drop = new DroppableWidget({ id: "drop-3" });
        drop.updateRect({ x: 0, y: 0, width: 5, height: 5 });
        expect(() => drop.render(screen)).not.toThrow();
    });
});

# RFC: Mouse Support Architecture for TermUI

- **Author:** TermUI Contributor
- **Status:** Draft / RFC
- **Date:** 2026-06-01
- **Target Version:** v0.2.0
- **Level:** Critical / RFC
- **Points:** 300–500 (GSSoC 2026)

---

## 1. Objective & Scope

This RFC proposes a high-performance, lightweight architecture for introducing interactive mouse support to TermUI.

By enabling mouse support, TermUI applications will be able to handle:

- **Click interactions** (e.g., buttons, list selection)
- **Mouse wheel scrolling** (e.g., scrolling viewports, log feeds)
- **Mouse hover transitions** (e.g., hover styles, tooltips)

The design follows a **3-Layer Architecture** to cleanly separate low-level byte parsing, spatial coordinate mapping, and widget-level lifecycle callbacks.

---

## 2. Core Architecture

The proposed design divides mouse interaction into three distinct layers, ensuring that concerns are decoupled and modular.

```mermaid
graph TD
    A[Terminal Stdin] -->|Raw ANSI Bytes| B(Layer 1: InputParser)
    B -->|MouseEvent| C(Layer 3: App Event Loop)
    D[Widget.render] -->|Register Bounds| E(Layer 2: Screen Hit Grid)
    C -->|Query Coordinates| E
    E -->|O(1) Widget ID Lookup| C
    C -->|Dispatch Events| F[Target Widget & Bubbling Chain]
```

---

### Layer 1 — Input Parsing (`@termuijs/core`)

This layer parses raw terminal mouse escape sequences from `stdin` and constructs structured, normalized `MouseEvent` objects.

To ensure maximum terminal compatibility, the input parser will detect and decode two protocols:

1. **SGR Mouse Protocol** (`\x1b[<...`) — Modern default
2. **X10 Mouse Protocol** (`\x1b[M...`) — Legacy fallback

#### Protocol 1: SGR Mouse Protocol

- **Sequence Pattern:** `\x1b[<Cb;Cx;Cy[Mm]`
- **Parsing Logic:**
  - `Cb`: Encodes button type and modifier keys (Ctrl, Alt, Shift).
  - `Cx`: 1-based column coordinate.
  - `Cy`: 1-based row coordinate.
  - `M` / `m`: `M` indicates button press or drag; `m` indicates button release.
- **Benefits:** Supports arbitrary grid sizes beyond 223 columns/rows and clearly distinguishes between press and release.

#### Protocol 2: X10 Mouse Protocol

- **Sequence Pattern:** `\x1b[M` followed by exactly 3 bytes: `Cb`, `Cx`, `Cy`.
- **Parsing Logic:**
  - Coordinates and buttons are offset by `32`.
  - `button = Cb - 32`
  - `x = Cx - 32 - 1` (0-indexed)
  - `y = Cy - 32 - 1` (0-indexed)
- **Constraints:** Limited to a grid size of 223×223 due to byte-value boundaries (255 - 32).

#### Parser Interface

The `InputParser` class will emit normalized `MouseEvent` objects matching the existing definition:

```typescript
export type MouseEventType = 'mousedown' | 'mouseup' | 'mousemove' | 'scroll';
export type MouseButton = 'left' | 'middle' | 'right' | 'none';

export interface MouseEvent {
    x: number;
    y: number;
    button: MouseButton;
    type: MouseEventType;
    scrollDelta?: number; // -1 for scroll up, 1 for scroll down
}
```

---

### Layer 2 — Hit Grid (`@termuijs/core`)

Instead of traversing the widget tree and recalculating bounding boxes on every mouse movement/click (which is O(N) and complex to manage with nesting and clipping), the screen maintains a **Hit Grid** that maps characters on the grid directly to widget IDs.

#### Grid Representation

The `Screen` class maintains a parallel flat array representing the active terminal dimensions:

```typescript
class Screen {
    // Array of size (cols * rows) containing the ID of the widget occupying each cell
    private _hitGrid: Array<string | null> = [];
}
```

#### API Methods

- **`addHit(rect: Rect, widgetId: string): void`**
  - Invoked during the widget rendering lifecycle (inside `Widget.render()`).
  - Registers the widget's bounding box in the hit grid, automatically respecting clipping boundaries.

- **`checkHit(x: number, y: number): string | null`**
  - Queried when a mouse event occurs.
  - Provides an O(1) lookup for the widget ID at coordinate `(x, y)`.

---

### Layer 3 — Widget Callbacks (`@termuijs/widgets` & `@termuijs/jsx`)

The top layer binds raw parsed coordinates and hits into widget-level event emissions and standard developer callbacks.

#### Widget Class Additions

The base `Widget` class will gain the following direct properties and event listener bindings:

- `onMouseClick(event: MouseEvent): void`
- `onMouseEnter(event: MouseEvent): void`
- `onMouseLeave(event: MouseEvent): void`

#### Event Loop Integration

The main application loop in `App.ts` coordinates Layer 1 and Layer 2:

1. Receives a raw `MouseEvent` from `InputParser`.
2. Queries the `Screen` hit grid using `checkHit(event.x, event.y)`.
3. Dispatches the corresponding event (click, scroll, mousemove) to the targeted widget.

---

## 3. Developer Workflow

Developers can handle mouse interactions by registering listeners on JSX widgets or direct class instances.

### JSX / Component Usage

```tsx
import { useState } from '@termuijs/jsx';

export function InteractiveButton() {
    const [hovered, setHovered] = useState(false);
    const [clicks, setClicks] = useState(0);

    return (
        <box
            style={{
                border: 'single',
                borderColor: hovered ? 'cyan' : 'gray',
                padding: { left: 2, right: 2 }
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseClick={() => setClicks(clicks + 1)}
        >
            Clicked {clicks} times
        </box>
    );
}
```

---

## 4. Discussion Points & Optional Considerations

The following design options, buffering patterns, and edge cases are isolated for maintainer/community feedback before implementation begins.

### 4.1 Hit Grid Buffering Strategy

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A — Single Buffer** | One hit grid cleared at the start of each render pass and repopulated as widgets draw. | Simpler; lower memory footprint. | Mid-frame or async render events may hit an incomplete layout. |
| **B — Double Buffer** | Parallel to `Screen`'s existing double-buffer design: `frontHitGrid` for active hit testing, `backHitGrid` for writes during rendering. Swapped during `Screen.swap()`. | Thread/render safe; consistent with rest of TermUI buffer design. | Slightly higher memory consumption. |

### 4.2 Z-Index and Overlapping Widgets

Overlapping layers (e.g., modals, dropdown menus) require careful hit testing.

**Proposed Solution:** Since rendering writes cells sequentially from bottom to top (base layout → active overlay layers), later render calls naturally overwrite earlier IDs in the hit grid. This handles z-index ordering without extra sorting code.

### 4.3 Bubbling and Event Propagation

Should mouse clicks bubble up the layout tree (e.g., clicking a button inside a box also triggers listeners on the container)?

**Proposed Solution:** Yes — implement bubbling identical to key events:

1. Identify target widget via `checkHit()`.
2. Walk parent chain up to the root widget.
3. Dispatch event at each node unless `event.stopPropagation()` is explicitly invoked.

### 4.4 Hover Simulation Details

To simulate `mouseenter` and `mouseleave`, the application loop must track `lastHoveredWidgetId`.

On each `mousemove` event:

1. Let `currentWidgetId = screen.checkHit(x, y)`.
2. If `currentWidgetId !== lastHoveredWidgetId`:
   - If `lastHoveredWidgetId` is not null → dispatch `mouseleave` on `lastHoveredWidgetId`.
   - If `currentWidgetId` is not null → dispatch `mouseenter` on `currentWidgetId`.
   - Update `lastHoveredWidgetId = currentWidgetId`.

---

## 5. Implementation Roadmap

Upon approval, this RFC will be divided into three independently mergeable sub-issues:

### Sub-Issue 1: Layer 1 — Parser Implementation

- **Scope:** Extend `MouseParser.ts` and `InputParser.ts` to fully support SGR and X10 protocols. Expand test suites (`MouseParser.test.ts`) to cover edge cases.
- **Mergeable:** Independently (does not require visual output).

### Sub-Issue 2: Layer 2 — Hit Grid Implementation

- **Scope:** Introduce `_hitGrid` to `Screen.ts`, implement `addHit` / `checkHit`, and hook grid updates to the render loop.
- **Mergeable:** Independently (tested via headless screen test harness).

### Sub-Issue 3: Layer 3 — Callbacks & Event Loop Hookup

- **Scope:** Update `Widget.ts` and the event-dispatching loop in `App.ts` to match hits with event handlers and enable hover state tracking.
- **Mergeable:** Full integration (depends on Sub-Issues 1 & 2).

---

## 6. References

- [opentui `addToHitGrid` / `checkHit` pattern](https://github.com/nicktindall/cyclon.p2p-rtc-client) *(reference implementation)*
- [GSSoC 2026 — Issue #60](https://github.com/Karanjot786/TermUI/issues/60)
- TermUI existing `Screen` double-buffer design (`front` / `back` cell grids)
# @termuijs/motion

Animation utilities for terminal interfaces.

`@termuijs/motion` provides spring-based animations for natural physical movement and easing-based transitions for time-driven animations. It is designed specifically for terminal UIs where smooth updates and low CPU usage matter.

All animations automatically respect reduced-motion environments. When `NO_MOTION=1` is set, animations instantly resolve to their final value without running animation loops. This keeps applications accessible and CI-friendly without requiring extra logic in your code.

---

## Install

```bash
npm install @termuijs/motion
```

Requires `@termuijs/core`.

---

# Springs

Spring animations simulate physical motion using stiffness, damping, and mass. Instead of manually controlling animation timing, the spring calculates realistic movement automatically.

```typescript
import { animateSpring } from '@termuijs/motion'

animateSpring(
    { from: 0, to: 100 },
    (value) => progressBar.setValue(value / 100),
    () => console.log('done'),
)
```

---

## Spring Presets

Preset configurations provide common motion styles without manually tuning physics values.

```typescript
import { SPRING_PRESETS, animateSpring } from '@termuijs/motion'

animateSpring(
    {
        from: 0,
        to: 1,
        ...SPRING_PRESETS.stiff,
    },
    onFrame,
)
```

| Preset     | Description                                       |
| ---------- | ------------------------------------------------- |
| `default`  | Balanced motion suitable for most UI interactions |
| `stiff`    | Fast and responsive with minimal bounce           |
| `gentle`   | Smooth and relaxed motion                         |
| `wobbly`   | Playful motion with noticeable bounce             |
| `slow`     | Slower movement for dramatic transitions          |
| `molasses` | Extremely slow motion with heavy easing           |

---

## Spring Options

| Option      | Type     | Default | Description                                                           |
| ----------- | -------- | ------- | --------------------------------------------------------------------- |
| `stiffness` | `number` | `170`   | Controls spring tension. Higher values create snappier motion         |
| `damping`   | `number` | `26`    | Controls how quickly oscillation settles. Higher values reduce bounce |
| `mass`      | `number` | `1`     | Controls inertia. Higher values create heavier movement               |

---

# Transitions

Transitions are useful for animations that should complete within a fixed duration rather than following physical behavior.

```typescript
import { transition } from '@termuijs/motion'

transition({
    from: 0,
    to: 1,
    duration: 300,
    easing: 'ease-out',
    onFrame: (v) => widget.setOpacity(v),
})
```

---

## Easing Curves

Easing curves define how values accelerate and decelerate during a transition.

| Easing        | Description                           |
| ------------- | ------------------------------------- |
| `linear`      | Constant animation speed              |
| `ease-in`     | Starts slowly and accelerates         |
| `ease-out`    | Starts quickly and slows near the end |
| `ease-in-out` | Smooth acceleration and deceleration  |

---

## Transition Options

| Option       | Type                      | Description                            |
| ------------ | ------------------------- | -------------------------------------- |
| `from`       | `number`                  | Starting value                         |
| `to`         | `number`                  | Final value                            |
| `duration`   | `number`                  | Duration in milliseconds               |
| `easing`     | `string`                  | Easing curve used during interpolation |
| `onFrame`    | `(value: number) => void` | Called on every animation frame        |
| `onComplete` | `() => void`              | Called after the transition finishes   |

---

# NO_MOTION Support

When `NO_MOTION=1` is enabled, both `animateSpring` and `transition` skip animation frames and immediately resolve to their final values.

```bash
NO_MOTION=1 node app.js
```

This behavior is automatic and does not require additional checks in application code.

---

# Performance Notes

`@termuijs/motion` is optimized for terminal rendering performance.

Animations internally use `timerPoolSubscribe` from `@termuijs/core` instead of creating independent timers. Multiple animations share a single update loop, helping CPU usage remain stable even when many animations run simultaneously.

For best performance:

| Recommendation                          | Reason                                           |
| --------------------------------------- | ------------------------------------------------ |
| Reuse animations when possible          | Reduces unnecessary allocations                  |
| Avoid excessive simultaneous animations | Prevents unnecessary terminal redraws            |
| Prefer springs for interactive motion   | Produces smoother and more natural updates       |
| Keep durations reasonable               | Improves responsiveness in terminal environments |

---

# Timer Pool Integration

All active animations share a centralized 16ms timer managed by `@termuijs/core`.

This avoids creating multiple `setTimeout` or `setInterval` loops and keeps rendering performance predictable across large terminal applications.

---
# Animation Guide

## Overview

@termuijs/motion provides utilities for creating smooth and expressive animations in terminal applications. It includes spring-based animations for natural physical movement, transition-based animations for fixed-duration effects, stagger utilities for coordinating multiple animations, and sequencing helpers for composing complex animation flows.

The library is designed specifically for terminal environments where efficient rendering and predictable performance are important. It offers reusable animation primitives that can be combined to build responsive and visually appealing interfaces.

@termuijs/motion also respects reduced-motion environments automatically. When the NO_MOTION=1 environment variable is set, animations immediately resolve to their final value instead of running animation loops. This behavior improves accessibility and makes automated testing and CI environments deterministic without requiring additional application logic.

---

## Springs

Spring animations simulate natural physical movement by using configurable physics parameters such as stiffness, damping, and mass. They are ideal for interactive UI elements that should feel responsive rather than moving at a fixed speed.

### Using animateSpring

animateSpring continuously updates a value until the spring reaches equilibrium, invoking a callback on every animation frame.

```typescript
import { animateSpring } from '@termuijs/motion'

animateSpring(
    0,
    100,
    {},
    (value) => progressBar.setValue(value / 100),
    () => console.log('done'),
)
```


### Using stepSpring

stepSpring can be used when you want to manually advance the spring simulation one step at a time, giving you fine-grained control over the animation loop.

```typescript
import { stepSpring, SPRING_PRESETS } from '@termuijs/motion'

let state = {
    value: 0,
    velocity: 0,
    target: 100,
    done: false,
}

state = stepSpring(
    state,
    SPRING_PRESETS.default,
    0.016,
)

console.log(state.value)
```


### Using SPRING_PRESETS

SPRING_PRESETS provides predefined configurations for common animation styles, allowing consistent motion without manually tuning spring parameters.

```typescript
import { animateSpring, SPRING_PRESETS } from '@termuijs/motion'

animateSpring(
    0,
    1,
    SPRING_PRESETS.stiff,
    onFrame,
)
```


Choose a preset that matches the desired interaction style, such as quick and responsive motion or slower, more expressive animations.

## Transitions and easings

Transitions are useful when an animation should complete within a fixed duration instead of following spring physics. The library provides a generic `transition` utility along with several pre-built helpers for common effects.

### Using `transition`

`transition` animates a value from `0` to `1` over a specified duration and calls `onFrame` on every update.

```typescript
import { transition, easings } from '@termuijs/motion'

transition({
    durationMs: 300,
    easing: easings.easeOut,
    onFrame: (progress) => {
        widget.setOpacity(progress)
    },
    onComplete: () => {
        console.log('Transition complete')
    },
})
```

### Pre-built transition helpers

Common animation effects are available as reusable helpers:

* `fadeIn` – gradually increases opacity.
* `fadeOut` – gradually decreases opacity.
* `slideIn` – animates an element from an offset position.
* `typewriter` – reveals text character by character.
* `pulse` – continuously oscillates an intensity value.

Example:

```typescript
import {
    fadeIn,
    fadeOut,
    slideIn,
    typewriter,
} from '@termuijs/motion'

fadeIn(250, (opacity) => {
    widget.setOpacity(opacity)
})

slideIn(20, 300, (offset) => {
    widget.setOffset(offset)
})

typewriter("Hello, TermUI!", 500, (visibleChars) => {
    widget.setText(
        "Hello, TermUI!".slice(0, visibleChars)
    )
})
```

### Easings

The `easings` object provides reusable easing functions for controlling animation speed and acceleration. Depending on the desired effect, animations can use linear, ease-in, ease-out, ease-in-out, and cubic easing functions.

```typescript
import { transition, easings } from '@termuijs/motion'

transition({
    durationMs: 400,
    easing: easings.easeInOutCubic,
    onFrame: (progress) => {
        widget.setProgress(progress)
    },
})
```

## Stagger

When multiple animations should not start simultaneously, `stagger` can be used to introduce a fixed delay between their start times. The first animation begins immediately, the second starts after the specified delay, the third after twice the delay, and so on.

This is useful for creating cascading effects such as animated lists, menus, or sequential UI elements.

```typescript
import { stagger } from '@termuijs/motion'

const cancel = stagger(
    [
        runner1,
        runner2,
        runner3,
    ],
    100,
    () => {
        console.log('All staggered animations completed')
    },
)
```
The function returns a cancel function that can be called to stop any pending or active animations.

## Sequencing

Complex animation flows can be composed using `sequence` and `parallel`.

* `sequence` executes animations one after another.
* `parallel` executes multiple animations simultaneously and invokes the completion callback when all have finished.

Both utilities operate on `AnimationRunner` functions, allowing animation logic to be composed and reused.

### Running animations sequentially

```typescript
import { sequence } from '@termuijs/motion'

sequence(
    [
        runner1,
        runner2,
        runner3,
    ],
    () => {
        console.log('Sequence complete')
    },
)
```

### Running animations in parallel

```typescript
import { parallel } from '@termuijs/motion'

parallel(
    [
        runner1,
        runner2,
        runner3,
    ],
    () => {
        console.log('Parallel animations complete')
    },
)
```
Using these helpers makes it easy to build complex animation pipelines while keeping animation logic modular and readable.

## Testing motion

Animations can be tested deterministically using the virtual clock utilities provided by the testing ecosystem. Instead of waiting for real time to pass, tests can advance time synchronously, making animation behavior predictable and CI-friendly.

```typescript
import type { VirtualClock } from '@termuijs/motion'
```

When reduced-motion mode is enabled through the `NO_MOTION` environment variable, animations immediately resolve to their final state rather than running animation loops. This behavior simplifies automated testing while maintaining accessibility for users who prefer reduced motion.

For application tests, the virtual clock available through `@termuijs/testing` can be used to advance animation time synchronously without relying on real timers.

---

# Documentation

Additional documentation is available at:

https://www.termui.io/docs/motion/springs

---

# License

MIT

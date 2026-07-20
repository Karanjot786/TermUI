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

# Documentation

Additional documentation is available at:

https://www.termui.io/docs/motion/springs

---

# License

MIT

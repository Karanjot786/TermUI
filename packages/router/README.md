# @termuijs/router

Routing utilities for terminal applications.

`@termuijs/router` provides screen-based navigation for terminal UIs with support for manual route registration, file-system routing, dynamic route parameters, navigation history, guards, and error boundaries.

The router is designed for predictable navigation flow while keeping screen management lightweight and memory-safe.

---

# Install

```bash id="p0x8b1"
npm install @termuijs/router
```

Requires `@termuijs/core` and `@termuijs/widgets`.

---

# Manual Routing

Routes can be registered programmatically using screen names and widget instances.

```typescript id="s44dbe"
import { Router } from '@termuijs/router'

const router = new Router()

router.register('home', homeWidget)
router.register('settings', settingsWidget)
router.register('help', helpWidget)

router.push('settings')
router.back()

console.log(router.current)
```

---

## Router Methods

| Method                   | Description                          |
| ------------------------ | ------------------------------------ |
| `register(name, screen)` | Registers a screen with the router   |
| `push(route)`            | Navigates to a new route             |
| `back()`                 | Navigates to the previous route      |
| `guard(route, handler)`  | Adds a navigation guard              |
| `current`                | Returns the active route             |
| `history`                | Returns the navigation history stack |

---

# File-Based Routing

The router can automatically generate routes from a directory structure.

Each file inside the configured directory becomes a route.

```text id="4d9xv0"
screens/
  index.ts      -> /
  settings.ts   -> /settings
  help.ts       -> /help
  users/
    [id].ts     -> /users/[id]
```

```typescript id="aqh0oi"
const router = new Router({
    dir: './screens',
})

router.push('/users/42')
```

Dynamic routes automatically receive extracted parameters.

---

# Route Parameters

Dynamic route segments use bracket syntax.

Parameters are passed directly into the screen component.

```typescript id="f0glfi"
// screens/logs/[level].ts

export default function LogScreen({ params }) {
    const { level } = params

    return <LogView filter={level} />
}
```

Navigating to:

```text id="cvag00"
/logs/error
```

Provides:

```typescript id="8lwy74"
params = {
    level: 'error'
}
```

---

## Route Parameter Behavior

| Pattern       | Example Route       | Result                    |
| ------------- | ------------------- | ------------------------- |
| `[id]`        | `/users/42`         | `{ id: '42' }`            |
| `[level]`     | `/logs/warn`        | `{ level: 'warn' }`       |
| Nested params | `/users/42/posts/7` | Multiple extracted params |

---

# History Management

The router maintains an internal navigation stack for backward navigation and route tracking.

```typescript id="l8epck"
router.push('/settings')
router.push('/help')

router.back()
```

History entries are stored in:

```typescript id="3jlb1x"
router.history
```

---

## History Behavior

| Action       | Result                                                      |
| ------------ | ----------------------------------------------------------- |
| `push()`     | Adds a new route to the stack                               |
| `back()`     | Removes the current route and returns to the previous route |
| `history`    | Exposes the complete navigation stack                       |
| Route change | Previous screen fibers are safely unmounted                 |

The router automatically cleans up inactive screen fibers before mounting new screens, helping prevent stale state and memory leaks.

---

# Error Handling

All routed screens are wrapped in an internal `ErrorBoundary`.

If a screen throws an exception during rendering, the router prevents the application from crashing and displays a fallback error screen instead.

```typescript id="22e3v6"
const router = new Router({
    dir: './screens',

    errorFallback: (err) => (
        <Box borderColor="red">
            <Text color="red">
                Screen error: {err.message}
            </Text>
        </Box>
    ),
})
```

---

## Error Handling Options

| Option          | Type                       | Description                                     |
| --------------- | -------------------------- | ----------------------------------------------- |
| `errorFallback` | `(error: Error) => Widget` | Custom UI displayed when a routed screen throws |

---

# Route Guards

Guards allow routes to be conditionally blocked or redirected before navigation completes.

Return:

* `true` to allow navigation
* `false` to block navigation
* a route path to redirect

```typescript id="m41fdm"
router.guard('/settings', () => {
    if (!isAuthenticated) {
        return '/login'
    }

    return true
})
```

---

## Guard Behavior

| Return Value | Result                                |
| ------------ | ------------------------------------- |
| `true`       | Navigation continues                  |
| `false`      | Navigation is blocked                 |
| `'/path'`    | Navigation redirects to another route |

---

# Router Options

| Option          | Type                       | Description                                     |
| --------------- | -------------------------- | ----------------------------------------------- |
| `dir`           | `string`                   | Directory used for automatic file-based routing |
| `errorFallback` | `(error: Error) => Widget` | Custom error screen renderer                    |

---

# Documentation

Additional documentation is available at:

https://www.termui.io/docs/router/overview

---

# License

MIT

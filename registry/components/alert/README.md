# Alert Component

A notification badge that displays a count at a corner position. Useful for showing unread counts, alert indicators, and notification overlays.

## Usage

```typescript
import { Alert } from './components/alert';

// Create a notification badge with count
const alert = new Alert({ count: 5 });

// Create a badge at a specific corner
const topLeftAlert = new Alert({ count: 3, position: 'top-left' });

// Available positions: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
```

## Features

- Count display with "99+" overflow indicator
- Four corner position options
- Hides automatically when count is 0
- Updateable count without recreating component

## API

### Constructor

```typescript
constructor(opts?: NotificationBadgeOptions, style?: Partial<Style>)
```

### Methods

- `setCount(count: number): void` - Update the notification count
- `getCount(): number` - Get the current notification count
- `setPosition(position: BadgePosition): void` - Change corner position
- `getPosition(): BadgePosition` - Get the current position

## Example

```typescript
const container = new Box({ height: 10, width: 30 });
const alert = new Alert({ count: 5, position: 'top-right' });
container.addChild(alert);

// Update count when notification arrives
alert.setCount(6);
```

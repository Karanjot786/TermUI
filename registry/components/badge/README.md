# Badge Component

A short inline label with a colored background, used for displaying status indicators like "online", "beta", or "new".

## Usage

```typescript
import { Badge } from './index';

// Create a badge with default variant
const badge = new Badge('online');

// Create a badge with a specific variant
const successBadge = new Badge('verified', {}, { variant: 'success' });
const errorBadge = new Badge('error', {}, { variant: 'error' });

// Available variants: 'info', 'success', 'warning', 'error', 'neutral'
```

## Features

- Multiple color variants (info, success, warning, error, neutral)
- Inline rendering with box drawing
- Unicode and ASCII fallback support
- Settable text and variant after creation

## API

### Constructor

```typescript
constructor(text: string, style?: Partial<Style>, opts?: BadgeOptions)
```

### Methods

- `setText(text: string): void` - Update the badge text
- `getText(): string` - Get the current badge text
- `setVariant(variant: BadgeVariant): void` - Update the badge variant
- `getVariant(): BadgeVariant` - Get the current badge variant

## Example

```typescript
const container = new Box({ height: 5, width: 40 });
container.addChild(new Badge('online', {}, { variant: 'success' }));
container.addChild(new Badge('offline', {}, { variant: 'error' }));
```

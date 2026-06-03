# Progress Component

A horizontal progress indicator that displays completion status with customizable fill characters and optional labels.

## Usage

```typescript
import { Progress } from './components/progress';

// Create a progress bar at 50%
const progress = new Progress({
  value: 0.5
});

// Create with custom fill character and label
const customProgress = new Progress({
  value: 0.75,
  fillChar: '▓',
  emptyChar: '░',
  showLabel: true,
  labelFormat: 'percent'
});
```

## Features

- Smooth value animation ready
- Customizable fill and empty characters
- Percentage or fraction label display
- Configurable fill color
- Unicode and ASCII fallback support
- Range: 0.0 (empty) to 1.0 (full)

## API

### Constructor

```typescript
constructor(style?: Partial<Style>, options?: ProgressBarOptions)
```

### Methods

- `setValue(value: number): void` — Set progress (0–1)
- `getValue(): number` — Get current progress value
- `setFillChar(char: string): void` — Update fill character
- `setEmptyChar(char: string): void` — Update empty character
- `setShowLabel(show: boolean): void` — Toggle label display
- `setLabelFormat(format: 'percent' | 'fraction'): void` — Change label format

## Example

```typescript
const container = new Box({ height: 5, width: 50 });

const progress = new Progress({ value: 0.3 });
container.addChild(progress);

// Simulate progress
let value = 0.3;
setInterval(() => {
  value = Math.min(1, value + 0.1);
  progress.setValue(value);
}, 500);
```

## Label Formats

- **percent** — Shows "75%" style label
- **fraction** — Shows "75/100" style label

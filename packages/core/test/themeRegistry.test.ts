import { describe, it, expect, beforeEach } from 'bun:test';
import { ThemeRegistryManager } from '../src/theme/themeRegistry';

describe('ThemeRegistryManager Unit Tests', () => {
  let registry: ThemeRegistryManager;

  beforeEach(() => {
    registry = new ThemeRegistryManager();
  });

  it('should initialize with default theme', () => {
    const active = registry.getActiveTheme();
    expect(active.name).toBe('default');
    expect(active.palette.primary).toBe('#3b82f6');
  });

  it('should register and switch to custom themes dynamically', () => {
    registry.registerTheme({
      name: 'dracula',
      palette: {
        primary: '#bd93f9',
        secondary: '#6272a4',
        background: '#282a36',
        text: '#f8f8f2',
      },
    });

    expect(registry.listThemes()).toContain('dracula');
    const switched = registry.setActiveTheme('dracula');
    expect(switched).toBe(true);
    expect(registry.getActiveTheme().palette.primary).toBe('#bd93f9');
  });

  it('should allow extending existing palette colors', () => {
    registry.extendPalette('default', { primary: '#ff0000' });
    expect(registry.getActiveTheme().palette.primary).toBe('#ff0000');
  });
});

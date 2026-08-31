export interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border?: string;
  accent?: string;
}

export interface ThemeDefinition {
  name: string;
  palette: ColorPalette;
}

/**
 * ThemeRegistryManager - Extensible Color Palette & Dynamic Theme Registry Subsystem (#3334).
 */
export class ThemeRegistryManager {
  private themes: Map<string, ThemeDefinition> = new Map();
  private activeThemeName: string = 'default';

  constructor() {
    this.registerTheme({
      name: 'default',
      palette: {
        primary: '#3b82f6',
        secondary: '#64748b',
        background: '#0f172a',
        text: '#f8fafc',
        border: '#334155',
        accent: '#eab308',
      },
    });
  }

  registerTheme(theme: ThemeDefinition): void {
    if (!theme || !theme.name) return;
    this.themes.set(theme.name, theme);
  }

  setActiveTheme(name: string): boolean {
    if (this.themes.has(name)) {
      this.activeThemeName = name;
      return true;
    }
    return false;
  }

  getActiveTheme(): ThemeDefinition {
    return this.themes.get(this.activeThemeName) || Array.from(this.themes.values())[0];
  }

  extendPalette(themeName: string, customPalette: Partial<ColorPalette>): void {
    const existing = this.themes.get(themeName);
    if (existing) {
      existing.palette = {
        ...existing.palette,
        ...customPalette,
      };
    }
  }

  listThemes(): string[] {
    return Array.from(this.themes.keys());
  }
}

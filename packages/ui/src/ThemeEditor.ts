export interface ThemeConfig {
  foreground: string;
  background: string;
  primary: string;
  secondary: string;
}

const THEME_KEYS: (keyof ThemeConfig)[] = ['foreground', 'background', 'primary', 'secondary'];

export class ThemeEditor {
  private theme: ThemeConfig;

  constructor(initialTheme?: Partial<ThemeConfig>) {
    this.theme = {
      foreground: '#ffffff',
      background: '#000000',
      primary: '#00ff00',
      secondary: '#888888',
      ...initialTheme,
    };
  }

  setColor(key: keyof ThemeConfig, value: string): void {
    this.theme[key] = value;
  }

  getTheme(): ThemeConfig {
    return this.theme;
  }

  preview(): string {
    return Object.entries(this.theme).map(([k, v]) => `${k}: ${v}`).join('\n');
  }

  exportTheme(): string {
    return JSON.stringify(this.theme, null, 2);
  }

  importTheme(json: string): void {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid theme JSON');
    for (const k of THEME_KEYS) {
      if (typeof parsed[k] === 'string') this.theme[k] = parsed[k];
    }
  }
}

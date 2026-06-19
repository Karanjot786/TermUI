export interface ThemeConfig {
  foreground: string;
  background: string;
  primary: string;
  secondary: string;
}

export class ThemeEditor {
  private theme: ThemeConfig;

  constructor(initialTheme?: Partial<ThemeConfig>) {
    this.theme = {
      foreground: "#ffffff",
      background: "#000000",
      primary: "#00ff00",
      secondary: "#888888",
      ...initialTheme,
    };
  }

  setColor(
    key: keyof ThemeConfig,
    value: string
  ): void {
    this.theme[key] = value;
  }

  getTheme(): ThemeConfig {
    return this.theme;
  }

  preview(): string {
    return `
Theme Preview
-------------
Foreground: ${this.theme.foreground}
Background: ${this.theme.background}
Primary: ${this.theme.primary}
Secondary: ${this.theme.secondary}
`;
  }

  exportTheme(): string {
    return JSON.stringify(this.theme, null, 2);
  }

  importTheme(json: string): void {
    this.theme = JSON.parse(json);
  }
}
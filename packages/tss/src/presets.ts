// ─────────────────────────────────────────────────────
// @termuijs/tss — Theme Preset Manager
// ─────────────────────────────────────────────────────
import { ThemeProvider } from './themeProvider.js';
import { BUILTIN_THEMES } from './themes.js';
export interface ThemePreset {
    name: string;
    displayName: string;
    description: string;
    category: 'dark' | 'light' | 'high-contrast' | 'colorful' | 'minimal' | 'custom';
    source: string;
    overrides?: Record<string, string>;
    tags?: string[];
}
export interface CustomPreset {
    name: string;
    displayName: string;
    source: string;
    createdAt: number;
    lastUsed: number;
}
export type PresetListener = (presetName: string) => void;
class ThemePresetManagerClass {
    private _presets: Map<string, ThemePreset> = new Map();
    private _customPresets: Map<string, CustomPreset> = new Map();
    private _currentPresetName = 'default';
    private _listeners = new Set<PresetListener>();
    constructor() {
        this._registerBuiltinPresets();
        this._loadCustomPresets();
    }
    getAllPresets(): ThemePreset[] {
        const builtins = Array.from(this._presets.values());
        const customs = Array.from(this._customPresets.values()).map(c => ({
            name: c.name,
            displayName: c.displayName,
            description: 'Custom theme preset',
            category: 'custom' as const,
            source: c.source,
            tags: ['custom'] as string[],
        }));
        return [...builtins, ...customs];
    }
    getPresetsByCategory(category: string): ThemePreset[] {
        return this.getAllPresets().filter(p => p.category === category || p.tags?.includes(category));
    }
    getPreset(name: string): ThemePreset | undefined {
        if (this._presets.has(name)) return this._presets.get(name);
        const custom = this._customPresets.get(name);
        if (custom) {
            return { name: custom.name, displayName: custom.displayName, description: 'Custom theme preset', category: 'custom' as const, source: custom.source, tags: ['custom'] };
        }
        return undefined;
    }
    getCurrentPresetName(): string { return this._currentPresetName; }
    switchToPreset(name: string): boolean {
        const preset = this.getPreset(name);
        if (!preset) return false;
        this._currentPresetName = name;
        const custom = this._customPresets.get(name);
        if (custom) { custom.lastUsed = Date.now(); this._saveCustomPresets(); }
        for (const listener of this._listeners) { listener(name); }
        return true;
    }
    subscribe(listener: PresetListener): () => void {
        this._listeners.add(listener);
        return () => { this._listeners.delete(listener); };
    }
    saveCustomPreset(name: string, displayName: string, source: string): void {
        const existing = this._customPresets.get(name);
        this._customPresets.set(name, { name, displayName, source, createdAt: existing?.createdAt ?? Date.now(), lastUsed: Date.now() });
        this._saveCustomPresets();
    }
    deleteCustomPreset(name: string): boolean { return this._customPresets.delete(name); }
    getCustomPresets(): CustomPreset[] { return Array.from(this._customPresets.values()); }
    getPresetPreview(name: string): string {
        const preset = this.getPreset(name);
        if (!preset) return '';
        return preset.source.split('\n').slice(1, 6).join('\n').trim();
    }
    getCategories(): { name: string; presets: ThemePreset[] }[] {
        const categories = new Map<string, ThemePreset[]>();
        for (const preset of this._presets.values()) {
            const catName = preset.category;
            if (!categories.has(catName)) categories.set(catName, []);
            categories.get(catName)!.push(preset);
        }
        const customs = this.getCustomPresets();
        if (customs.length > 0) {
            categories.set('custom', customs.map(c => ({ name: c.name, displayName: c.displayName, description: 'Custom theme preset', category: 'custom' as const, source: c.source, tags: ['custom'] })));
        }
        return Array.from(categories.entries()).map(([name, presets]) => ({ name, presets }));
    }
    private _registerBuiltinPresets(): void {
        const builtinInfo = [
            { name: 'default', displayName: 'Default', description: 'Standard terminal colors with cyan accents', category: 'dark' as const, tags: ['default', 'simple'] },
            { name: 'cyberpunk', displayName: 'Cyberpunk', description: 'Neon magenta and cyan on deep blue', category: 'colorful' as const, tags: ['neon', 'vibrant'] },
            { name: 'nord', displayName: 'Nord', description: 'Cool arctic blues with a clean aesthetic', category: 'dark' as const, tags: ['clean', 'blue'] },
            { name: 'dracula', displayName: 'Dracula', description: 'Dark theme with purple and pink accents', category: 'dark' as const, tags: ['purple', 'popular'] },
            { name: 'gruvbox', displayName: 'Gruvbox', description: 'Retro earth tones with warm contrast', category: 'dark' as const, tags: ['retro', 'warm'] },
            { name: 'catppuccin', displayName: 'Catppuccin', description: 'Soft pastel dark theme', category: 'dark' as const, tags: ['pastel', 'soft'] },
            { name: 'solarized', displayName: 'Solarized Dark', description: 'Precision dark colors for readability', category: 'dark' as const, tags: ['readable', 'scientific'] },
            { name: 'tokyo-night', displayName: 'Tokyo Night', description: 'Deep blue with vibrant accent colors', category: 'dark' as const, tags: ['blue', 'vibrant'] },
            { name: 'solarizedLight', displayName: 'Solarized Light', description: 'Light theme with scientific color harmony', category: 'light' as const, tags: ['light', 'readable'] },
            { name: 'highContrast', displayName: 'High Contrast', description: 'Maximum readability with strong contrast', category: 'high-contrast' as const, tags: ['accessible', 'a11y'] },
            { name: 'everforest', displayName: 'Everforest', description: 'Green-tinted forest theme for eye comfort', category: 'dark' as const, tags: ['green', 'nature'] },
            { name: 'rose-pine', displayName: 'Rose Pine', description: 'Soft rose and pine tones on dark background', category: 'dark' as const, tags: ['rose', 'soft'] },
        ];
        for (const info of builtinInfo) {
            const source = BUILTIN_THEMES[info.name];
            if (source) this._presets.set(info.name, { ...info, source });
        }
    }
    private _loadCustomPresets(): void {
        try {
            const stored = this._getStorage().getItem('termui_custom_presets');
            if (stored) {
                for (const preset of JSON.parse(stored) as CustomPreset[]) {
                    this._customPresets.set(preset.name, preset);
                }
            }
        } catch { /* ignore */ }
    }
    private _saveCustomPresets(): void {
        try { this._getStorage().setItem('termui_custom_presets', JSON.stringify(Array.from(this._customPresets.values()))); } catch { /* ignore */ }
    }
    private _getStorage(): Storage {
        if (typeof localStorage !== 'undefined') return localStorage;
        return new (class implements Storage {
            private _data = new Map<string, string>();
            get length(): number { return this._data.size; }
            clear(): void { this._data.clear(); }
            getItem(key: string): string | null { return this._data.get(key) ?? null; }
            key(index: number): string | null { return Array.from(this._data.keys())[index] ?? null; }
            removeItem(key: string): void { this._data.delete(key); }
            setItem(key: string, value: string): void { this._data.set(key, value); }
        })();
    }
}
export const themePresetManager = new ThemePresetManagerClass();

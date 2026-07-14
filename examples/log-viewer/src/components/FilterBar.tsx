import { Box, Text, TextInput, Button } from '@termuijs/widgets';
import { type Style, caps } from '@termuijs/core';

export interface FilterBarProps {
    onSearchChange: (value: string) => void;
    onLevelChange: (level: string) => void;
    onClear: () => void;
    style?: Partial<Style>;
}

export class FilterBar extends Box {
    public searchInput: TextInput;
    private levelLabel: Text;
    private clearButton: Button;
    private chipTexts: Text[] = [];
    
    private levels = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
    private selectedLevelIdx = 0;
    
    // Focus tracking (within the FilterBar)
    // 0: Search, 1: Level Dropdown, 2: Chips, 3: Clear Button
    private activeField = 0; 
    private onSearchChangeCb: (value: string) => void;
    private onLevelChangeCb: (level: string) => void;
    private onClearCb: () => void;

    constructor(props: FilterBarProps) {
        super({
            flexDirection: 'column',
            gap: 1,
            height: 6,
            padding: { left: 1, right: 1, top: 0, bottom: 0 },
            border: 'single',
            borderColor: { type: 'hex', hex: '#2c3143' },
            bg: { type: 'hex', hex: '#161821' },
            ...props.style
        });

        this.onSearchChangeCb = props.onSearchChange;
        this.onLevelChangeCb = props.onLevelChange;
        this.onClearCb = props.onClear;

        // Row 1: Search + Dropdown + Clear
        const row1 = new Box({ flexDirection: 'row', gap: 2, alignItems: 'center', height: 3 });
        
        // Search Input
        const searchIcon = caps.unicode ? '🔍 ' : 'S ';
        const searchLabel = new Text(searchIcon, { fg: { type: 'hex', hex: '#7a8c9e' } });
        this.searchInput = new TextInput({ width: 35, flexShrink: 0 }, {
            placeholder: "Search logs...",
            onChange: () => this.onSearchChangeCb(this.searchInput.value)
        });
        
        const searchWrapper = new Box({ flexDirection: 'row', alignItems: 'center', gap: 1, width: 40 });
        searchWrapper.addChild(searchLabel);
        searchWrapper.addChild(this.searchInput);

        // Level Dropdown Selector
        this.levelLabel = new Text(" Level: [ ALL ▾ ] ", {
            bold: true,
            fg: { type: 'hex', hex: '#ffffff' },
            bg: { type: 'hex', hex: '#2c3143' },
            padding: { left: 1, right: 1 }
        });

        const dropdownWrapper = new Box({ flexDirection: 'row', alignItems: 'center', gap: 1 });
        dropdownWrapper.addChild(this.levelLabel);

        // Clear Button
        this.clearButton = new Button("Clear", { width: 10, height: 3 }, {
            variant: 'ghost',
            onPress: () => this.clearAll()
        });

        row1.addChild(searchWrapper);
        row1.addChild(dropdownWrapper);
        row1.addChild(this.clearButton);

        // Row 2: Quick Filter Chips
        const row2 = new Box({ flexDirection: 'row', gap: 1, alignItems: 'center', height: 1 });
        row2.addChild(new Text("Quick Filters: ", { fg: { type: 'hex', hex: '#7a8c9e' } }));

        this.levels.forEach((lvl, idx) => {
            const isSelected = idx === this.selectedLevelIdx;
            const chip = new Text(` ${lvl} `, this._getChipStyle(lvl, isSelected));
            this.chipTexts.push(chip);
            row2.addChild(chip);
        });

        this.addChild(row1);
        this.addChild(row2);

        // Initial focus state
        this.updateVisuals();
    }

    private _getChipStyle(level: string, selected: boolean): Partial<Style> {
        if (!selected) {
            return {
                fg: { type: 'hex', hex: '#7a8c9e' },
                bg: { type: 'hex', hex: '#1c1e2a' }
            };
        }
        
        // Match level design colors
        let colorHex = '#3b82f6'; // default ALL is blue
        if (level === 'INFO') colorHex = '#10b981';
        if (level === 'WARN') colorHex = '#f59e0b';
        if (level === 'ERROR') colorHex = '#ef4444';
        if (level === 'DEBUG') colorHex = '#6b7280';

        return {
            fg: { type: 'hex', hex: '#0c0d12' },
            bg: { type: 'hex', hex: colorHex },
            bold: true
        };
    }

    cycleLevel(forward = true): void {
        if (forward) {
            this.selectedLevelIdx = (this.selectedLevelIdx + 1) % this.levels.length;
        } else {
            this.selectedLevelIdx = (this.selectedLevelIdx - 1 + this.levels.length) % this.levels.length;
        }
        const newLvl = this.levels[this.selectedLevelIdx];
        this.levelLabel.setContent(` Level: [ ${newLvl} ▾ ] `);
        this.onLevelChangeCb(newLvl);
        this.updateVisuals();
    }

    setLevel(level: string): void {
        const idx = this.levels.indexOf(level.toUpperCase());
        if (idx >= 0) {
            this.selectedLevelIdx = idx;
            this.levelLabel.setContent(` Level: [ ${level.toUpperCase()} ▾ ] `);
            this.onLevelChangeCb(level);
            this.updateVisuals();
        }
    }

    getSelectedLevel(): string {
        return this.levels[this.selectedLevelIdx];
    }

    clearAll(): void {
        this.searchInput.clear();
        this.setLevel('ALL');
        this.onSearchChangeCb('');
        this.onClearCb();
    }

    // Highlighting current focused sub-element
    setFocusedField(field: number): void {
        this.activeField = field;
        this.updateVisuals();
    }

    getFocusedField(): number {
        return this.activeField;
    }

    private updateVisuals(): void {
        // Reset styles first
        this.searchInput.isFocused = (this.activeField === 0);
        
        // Level Dropdown Highlight
        if (this.activeField === 1) {
            this.levelLabel.setStyle({
                fg: { type: 'hex', hex: '#0c0d12' },
                bg: { type: 'hex', hex: '#3b82f6' } // active blue highlight
            });
        } else {
            this.levelLabel.setStyle({
                fg: { type: 'hex', hex: '#ffffff' },
                bg: { type: 'hex', hex: '#2c3143' }
            });
        }

        // Clear Button Highlight
        this.clearButton.isFocused = (this.activeField === 3);

        // Update Chips highlight
        this.levels.forEach((lvl, idx) => {
            const isSelected = idx === this.selectedLevelIdx;
            const style = this._getChipStyle(lvl, isSelected);
            if (this.activeField === 2 && isSelected) {
                // Flash underline if active chips focus and selected
                style.underline = true;
            }
            this.chipTexts[idx].setStyle(style);
        });

        this.markDirty();
    }
}

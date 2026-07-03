// ─────────────────────────────────────────────────────
// Components Tab — Select, MultiSelect, Tree
// ─────────────────────────────────────────────────────
//
// This tab demonstrates interactive UI widgets. Because the
// framework's Select/MultiSelect/Tree widgets render at fixed
// layout positions (height:1), we supplement them with explicit
// Text indicators that make state changes clearly visible.

import { Widget, Box, Text, CommandPalette } from '@termuijs/widgets';
import type { Command } from '@termuijs/widgets';
import { Select, MultiSelect, Tree, Divider } from '@termuijs/ui';
import { caps } from '@termuijs/core';
import type { Screen } from '@termuijs/core';

// ── Helper: themed option labels ──
const SELECT_OPTIONS = [
    { label: 'Cyberpunk', value: 'cyberpunk' },
    { label: 'Nord', value: 'nord' },
    { label: 'Dracula', value: 'dracula' },
    { label: 'Catppuccin', value: 'catppuccin' },
    { label: 'Solarized', value: 'solarized' },
];

const MULTISELECT_OPTIONS = [
    { label: 'Screen Router', value: 'router' },
    { label: 'Data Providers', value: 'data' },
    { label: 'Hot Reload', value: 'hot-reload' },
    { label: 'Animations', value: 'motion' },
    { label: 'DevTools', value: 'devtools' },
];

const TREE_DATA = [
    {
        label: 'termui-app',
        expanded: true,
        children: [
            {
                label: '📦 packages',
                expanded: true,
                children: [
                    { label: '@termuijs/core' },
                    { label: '@termuijs/widgets' },
                    { label: '@termuijs/ui' },
                    { label: '@termuijs/tss' },
                    { label: '@termuijs/motion' },
                ],
            },
            {
                label: '📂 examples',
                children: [
                    { label: 'dashboard/' },
                    { label: 'showcase/' },
                ],
            },
            { label: '📄 package.json' },
        ],
    },
];

export class ComponentsTab extends Widget {
    private _select: Select;
    private _multiSelect: MultiSelect;
    private _tree: Tree;
    private _focusedWidget: 'select' | 'multiselect' | 'tree' | 'commandpalette' = 'select';

    // Explicit visual state indicators (these are what make changes visible)
    private _selectIndicator: Text;
    private _multiIndicator: Text;
    private _treeIndicator: Text;
    private _focusIndicator: Text;
    private _paletteIndicator: Text;
    private _selectItems: Text[];
    private _multiItems: Text[];
    private _paletteItems: Text[];
    private _selectIndex = 0;
    private _multiIndex = 0;
    private _multiChecked: boolean[] = [false, false, false, false, false];
    private _commandPalette: CommandPalette;
    private _paletteIndex = 0;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1, gap: 0 });

        // Header
        const header = new Text('🧩 Components — Interactive UI Widgets', {
            bold: true, fg: { type: 'named', name: 'magenta' }, height: 1,
        });

        // Focus indicator bar
        this._focusIndicator = new Text(
            '  ⊕ Focus: [SELECT]   Tab to switch  •  ↑↓ Navigate  •  Space Toggle  •  Enter Confirm',
            { height: 1, fg: { type: 'named', name: 'cyan' }, bold: true },
        );

        const mainRow = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // ── Left Panel: Select & MultiSelect ──
        const leftPanel = new Box({
            border: 'round', borderColor: { type: 'named', name: 'magenta' },
            flexGrow: 1, padding: 1, flexDirection: 'column', gap: 0,
        });

        // Select section header
        leftPanel.addChild(new Text('📋 Select — Choose a theme:', {
            height: 1, bold: true, fg: { type: 'named', name: 'yellow' },
        }));

        // Create select widget (hidden, used for internal state)
        this._select = new Select(SELECT_OPTIONS, {
            placeholder: 'Choose a theme...',
            activeColor: { type: 'named', name: 'cyan' },
        });
        this._select.open();

        // Manual select list rendering (explicit text items)
        this._selectItems = SELECT_OPTIONS.map((opt, i) => {
            const isSelected = i === 0;
            return new Text(
                `  ${isSelected ? (caps.unicode ? '● ' : '* ') : '  '}${opt.label}`,
                {
                    height: 1,
                    fg: isSelected
                        ? { type: 'named', name: 'cyan' }
                        : { type: 'named', name: 'white' },
                    bold: isSelected,
                },
            );
        });
        for (const item of this._selectItems) leftPanel.addChild(item);

        // Select result indicator
        this._selectIndicator = new Text('  → Selected: Cyberpunk', {
            height: 1, fg: { type: 'named', name: 'green' }, bold: true,
        });
        leftPanel.addChild(this._selectIndicator);

        // Divider
        leftPanel.addChild(new Divider({ title: 'Multi-Select', color: { type: 'named', name: 'brightBlack' } }));

        // Multi-select section
        this._multiSelect = new MultiSelect(MULTISELECT_OPTIONS, {
            activeColor: { type: 'named', name: 'green' },
        });

        // Manual multi-select list rendering
        this._multiItems = MULTISELECT_OPTIONS.map((opt) => {
            return new Text(
                `  ☐ ${opt.label}`,
                { height: 1, fg: { type: 'named', name: 'white' } },
            );
        });
        for (const item of this._multiItems) leftPanel.addChild(item);

        // Multi result indicator
        this._multiIndicator = new Text('  → Selected: (none)', {
            height: 1, fg: { type: 'named', name: 'green' },
        });
        leftPanel.addChild(this._multiIndicator);

        // ── Right Panel: Tree ──
        const rightPanel = new Box({
            border: 'single', borderColor: { type: 'named', name: 'cyan' },
            flexGrow: 1, padding: 1, flexDirection: 'column',
        });

        rightPanel.addChild(new Text('🌳 Tree Component', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        }));

        this._tree = new Tree(TREE_DATA, {
            activeColor: { type: 'named', name: 'cyan' },
        });
        rightPanel.addChild(this._tree);

        this._treeIndicator = new Text('  → Navigate with ↑↓, toggle with Space', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        });
        rightPanel.addChild(this._treeIndicator);

        // ── Far-Right Panel: CommandPalette ──
        const PALETTE_COMMANDS: Command[] = [
            { id: 'open', label: 'Open File', description: 'Ctrl+O', action: () => { this._paletteIndicator.setContent('  → Executed: Open File'); } },
            { id: 'save', label: 'Save', description: 'Ctrl+S', action: () => { this._paletteIndicator.setContent('  → Executed: Save'); } },
            { id: 'quit', label: 'Quit', description: 'Ctrl+Q', action: () => { this._paletteIndicator.setContent('  → Executed: Quit'); } },
        ];

        const palettePanel = new Box({
            border: 'single', borderColor: { type: 'named', name: 'yellow' },
            flexGrow: 1, padding: 1, flexDirection: 'column', gap: 0,
        });

        palettePanel.addChild(new Text('🎛  CommandPalette', {
            height: 1, bold: true, fg: { type: 'named', name: 'yellow' },
        }));
        palettePanel.addChild(new Divider({ color: { type: 'named', name: 'brightBlack' } }));

        this._commandPalette = new CommandPalette(
            { commands: PALETTE_COMMANDS, placeholder: 'Search commands...' },
            { flexGrow: 1 },
        );
        this._commandPalette.open();

        // Manual palette list rendering for explicit visual feedback
        this._paletteItems = PALETTE_COMMANDS.map((cmd, i) => {
            const isActive = i === 0;
            return new Text(
                `  ${isActive ? '▸ ' : '  '}${cmd.label}${cmd.description ? '   ' + cmd.description : ''}`,
                {
                    height: 1,
                    fg: isActive ? { type: 'named', name: 'yellow' } : { type: 'named', name: 'white' },
                    bold: isActive,
                },
            );
        });
        for (const item of this._paletteItems) palettePanel.addChild(item);

        this._paletteIndicator = new Text('  → ↑↓ Navigate  •  Enter Execute', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        });
        palettePanel.addChild(this._paletteIndicator);

        mainRow.addChild(leftPanel);
        mainRow.addChild(rightPanel);
        mainRow.addChild(palettePanel);

        this.addChild(header);
        this.addChild(this._focusIndicator);
        this.addChild(mainRow);

        // Initial visual state
        this._updateSelectVisuals();
        this._updateMultiVisuals();
        this._updatePaletteVisuals();
    }

    handleKey(key: string): void {
        // Tab to cycle focus between widgets
        if (key === 'tab') {
            const order: Array<'select' | 'multiselect' | 'tree' | 'commandpalette'> = ['select', 'multiselect', 'tree', 'commandpalette'];
            const idx = order.indexOf(this._focusedWidget);
            this._focusedWidget = order[(idx + 1) % order.length];
            this._updateFocusIndicator();
            return;
        }

        switch (this._focusedWidget) {
            case 'select':
                if (key === 'up' && this._selectIndex > 0) {
                    this._selectIndex--;
                    this._select.selectPrev();
                    this._updateSelectVisuals();
                } else if (key === 'down' && this._selectIndex < SELECT_OPTIONS.length - 1) {
                    this._selectIndex++;
                    this._select.selectNext();
                    this._updateSelectVisuals();
                } else if (key === 'enter' || key === 'space') {
                    this._selectIndicator.setContent(`  → Selected: ${SELECT_OPTIONS[this._selectIndex].label}${caps.unicode ? ' ✓' : ' *'}`);
                }
                break;
            case 'multiselect':
                if (key === 'up' && this._multiIndex > 0) {
                    this._multiIndex--;
                    this._multiSelect.selectPrev();
                    this._updateMultiVisuals();
                } else if (key === 'down' && this._multiIndex < MULTISELECT_OPTIONS.length - 1) {
                    this._multiIndex++;
                    this._multiSelect.selectNext();
                    this._updateMultiVisuals();
                } else if (key === 'space') {
                    this._multiChecked[this._multiIndex] = !this._multiChecked[this._multiIndex];
                    this._multiSelect.toggleCurrent();
                    this._updateMultiVisuals();
                } else if (key === 'enter') {
                    const selected = MULTISELECT_OPTIONS.filter((_, i) => this._multiChecked[i]).map(o => o.label);
                    this._multiIndicator.setContent(`  → Submitted: ${selected.length > 0 ? selected.join(', ') : '(none)'}${caps.unicode ? ' ✓' : ' *'}`);
                }
                break;
            case 'tree':
                if (key === 'up') this._tree.selectPrev();
                else if (key === 'down') this._tree.selectNext();
                else if (key === 'left' || key === 'right' || key === 'space') this._tree.toggleExpand();
                else if (key === 'enter') this._tree.confirm();
                break;
            case 'commandpalette':
                if (key === 'up' && this._paletteIndex > 0) {
                    this._paletteIndex--;
                    this._updatePaletteVisuals();
                } else if (key === 'down' && this._paletteIndex < 2) {
                    this._paletteIndex++;
                    this._updatePaletteVisuals();
                } else if (key === 'enter') {
                    this._commandPalette.handleKey('Enter');
                }
                break;
        }
    }

    private _updateFocusIndicator(): void {
        const labels: Record<string, string> = { select: 'SELECT', multiselect: 'MULTI-SELECT', tree: 'TREE', commandpalette: 'COMMAND PALETTE' };
        this._focusIndicator.setContent(
            `  ⊕ Focus: [${labels[this._focusedWidget]}]   Tab to switch  •  ↑↓ Navigate  •  Space Toggle  •  Enter Confirm`,
        );
    }

    private _updatePaletteVisuals(): void {
        const PALETTE_LABELS = ['Open File', 'Save', 'Quit'];
        const PALETTE_SHORTCUTS = ['Ctrl+O', 'Ctrl+S', 'Ctrl+Q'];
        for (let i = 0; i < this._paletteItems.length; i++) {
            const isActive = i === this._paletteIndex;
            this._paletteItems[i].setContent(`  ${isActive ? '▸ ' : '  '}${PALETTE_LABELS[i]}   ${PALETTE_SHORTCUTS[i]}`);
            this._paletteItems[i].setStyle({
                fg: isActive ? { type: 'named', name: 'yellow' } : { type: 'named', name: 'white' },
                bold: isActive,
            });
        }
        this._paletteIndicator.setContent('  → ↑↓ Navigate  •  Enter Execute');
    }

    private _updateSelectVisuals(): void {
        for (let i = 0; i < this._selectItems.length; i++) {
            const isActive = i === this._selectIndex;
            const prefix = isActive ? '▸ ' : '  ';
            this._selectItems[i].setContent(`  ${prefix}${SELECT_OPTIONS[i].label}`);
            this._selectItems[i].setStyle({
                fg: isActive ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'white' },
                bold: isActive,
            });
        }
        this._selectIndicator.setContent(`  → Highlighted: ${SELECT_OPTIONS[this._selectIndex].label}`);
    }

    private _updateMultiVisuals(): void {
        for (let i = 0; i < this._multiItems.length; i++) {
            const isActive = i === this._multiIndex;
            const checked = this._multiChecked[i];
            const checkbox = checked ? '☑' : '☐';
            const pointer = isActive ? '▸' : ' ';
            this._multiItems[i].setContent(`  ${pointer} ${checkbox} ${MULTISELECT_OPTIONS[i].label}`);
            this._multiItems[i].setStyle({
                fg: isActive
                    ? { type: 'named', name: 'green' }
                    : checked
                        ? { type: 'named', name: 'yellow' }
                        : { type: 'named', name: 'white' },
                bold: isActive,
            });
        }
        const selected = MULTISELECT_OPTIONS.filter((_, i) => this._multiChecked[i]).map(o => o.label);
        this._multiIndicator.setContent(`  → Checked: ${selected.length > 0 ? selected.join(', ') : '(none)'}`);
    }

    getDebugState(): string {
        return `focus=${this._focusedWidget} selectIdx=${this._selectIndex} multiIdx=${this._multiIndex} checked=${this._multiChecked.map(c => c ? '1' : '0').join('')} paletteIdx=${this._paletteIndex}`;
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

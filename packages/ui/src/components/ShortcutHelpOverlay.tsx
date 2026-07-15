/** @jsxImportSource @termuijs/jsx */
import { useState, useRef, useEffect, useKeymap, useFocusTrap, useFocus, getCurrentApp } from '@termuijs/jsx';

export type Shortcut = {
    key: string;
    label: string;
    category?: string;
};

export interface ShortcutHelpOverlayProps {
    shortcuts?: Shortcut[];
    showCategories?: boolean;
    searchable?: boolean;
    title?: string;
    closeKeys?: string[];
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
    { key: '?', label: 'Show Help', category: 'General' },
    { key: 'Ctrl+C', label: 'Exit Application', category: 'General' },
    { key: 'Ctrl+S', label: 'Save Changes', category: 'General' },
    { key: '/', label: 'Search', category: 'Navigation' },
    { key: 'ArrowUp/k', label: 'Move Up', category: 'Navigation' },
    { key: 'ArrowDown/j', label: 'Move Down', category: 'Navigation' },
    { key: 'Enter', label: 'Confirm Selection', category: 'Navigation' },
    { key: 'Escape', label: 'Close/Cancel', category: 'Navigation' },
    { key: 'Tab', label: 'Next Focusable', category: 'Navigation' },
    { key: 'Shift+Tab', label: 'Previous Focusable', category: 'Navigation' },
    { key: 'Ctrl+P', label: 'Command Palette', category: 'Commands' },
    { key: 'Ctrl+F', label: 'Find', category: 'Commands' },
    { key: 'Ctrl+N', label: 'New Item', category: 'Commands' },
    { key: 'Ctrl+O', label: 'Open File', category: 'Commands' },
    { key: 'Ctrl+Z', label: 'Undo', category: 'Editing' },
    { key: 'Ctrl+Y', label: 'Redo', category: 'Editing' },
    { key: 'Ctrl+A', label: 'Select All', category: 'Editing' },
    { key: 'Delete', label: 'Delete Item', category: 'Editing' },
];

function ShortcutHelpOverlayContent({
    shortcuts, onClose, showCategories, searchable, title, closeKeys,
}: {
    shortcuts: Shortcut[]; onClose: () => void;
    showCategories: boolean; searchable: boolean;
    title: string; closeKeys: string[];
}) {
    const ids = ['shortcut-sentinel'];
    useFocusTrap(ids);
    const [searchQuery, setSearchQuery] = useState('');

    function Sentinel() {
        useFocus({ id: 'shortcut-sentinel', autoFocus: true });
        return null as any;
    }

    const filteredShortcuts = searchQuery
        ? shortcuts.filter(
              s => s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (s.category ?? '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : shortcuts;

    const groupedShortcuts = showCategories
        ? filteredShortcuts.reduce((groups, s) => {
              const category = s.category ?? 'General';
              if (!groups[category]) groups[category] = [];
              groups[category].push(s);
              return groups;
          }, {} as Record<string, Shortcut[]>)
        : { All: filteredShortcuts };

    return (
        <box width="100%" height="100%">
            <box width="100%" height="100%" padding={0}>
                <center>
                    <card title={title} padding={1} borderColor="cyan">
                        <col>
                            {searchable && (
                                <row>
                                    <text bold={true} dim={true}>Search: </text>
                                    <textInput value={searchQuery} onChange={(v: string) => setSearchQuery(v)} placeholder="Type to filter shortcuts..." flexGrow={1} />
                                </row>
                            )}
                            <row><text bold={true} dim={true}>{filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''}{searchQuery ? ' matching "' + searchQuery + '"' : ''}</text></row>
                            <divider />
                            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                                <col>
                                    {showCategories && <row><text bold color="yellow">[{category}]</text></row>}
                                    {categoryShortcuts.map((s) => (
                                        <row><text bold={true} color="cyan">  [{s.key}]</text><text> {s.label}</text></row>
                                    ))}
                                    <row><text dim>{''}</text></row>
                                </col>
                            ))}
                            <divider />
                            <row><col><text dim={true}>Press {closeKeys.map((k, i) => (<text bold color="cyan">{k}{i < closeKeys.length - 1 ? ' / ' : ''}</text>))} to close</text></col></row>
                        </col>
                    </card>
                </center>
            </box>
            <Sentinel />
        </box>
    );
}

export function ShortcutHelpOverlay({
    shortcuts = DEFAULT_SHORTCUTS,
    showCategories = true,
    searchable = true,
    title = 'Keyboard Shortcuts',
    closeKeys,
}: ShortcutHelpOverlayProps) {
    const [visible, setVisible] = useState(false);
    const effectiveCloseKeys = closeKeys ?? ['Escape', 'q', '?'];

    useKeymap([
        { key: '?', action: () => setVisible(true) },
        ...effectiveCloseKeys.map((k) => ({ key: k, action: () => setVisible(false) })),
    ]);

    if (!visible) return null as any;
    return <ShortcutHelpOverlayContent shortcuts={shortcuts} onClose={() => setVisible(false)} showCategories={showCategories} searchable={searchable} title={title} closeKeys={effectiveCloseKeys} />;
}

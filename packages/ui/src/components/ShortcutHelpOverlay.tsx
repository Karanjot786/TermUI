/** @jsxImportSource @termuijs/jsx */
import { useState, useRef, useEffect, useKeymap, useFocusTrap, useFocus, getCurrentApp } from '@termuijs/jsx';

export type Shortcut = {
    key: string;
    label: string;
};

export interface ShortcutHelpOverlayProps {
    shortcuts?: Shortcut[];
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
    { key: '?', label: 'Show Help' },
    { key: 'Ctrl+C', label: 'Exit Application' },
    { key: 'Ctrl+S', label: 'Save Changes' },
    { key: '/', label: 'Search' },
];

function ShortcutHelpOverlayContent({ shortcuts, onClose }: { shortcuts: Shortcut[]; onClose: () => void }) {
    const ids = ['shortcut-sentinel'];
    useFocusTrap(ids);

    function Sentinel() {
        useFocus({ id: 'shortcut-sentinel', autoFocus: true });
        return null as any; // as any: reconciler requires non-null return; null as any is workaround for no-content state
    }


    return (
        // Outer full-screen box — clicking outside the card closes the overlay
        <box width="100%" height="100%">
            <box width="100%" height="100%" padding={0}>
                {/* Centered card */}
                <center>
                    <card title="Keyboard Shortcuts" padding={1} borderColor="cyan">
                        <col>
                            <row>
                                <text bold={true} dim={true}>{''}</text>
                            </row>
                            {shortcuts.map((s) => (
                                <row>
                                    <text bold={true} color="cyan">[{s.key}]</text>
                                    <text> {s.label}</text>
                                </row>
                            ))}
                            <divider />

                            {/* Descriptive help content explaining the dashboard */}
                            <row>
                                <col>
                                    <text bold>About this view</text>
                                    <text>Top bars: CPU / MEM / DSK show current utilization.</text>
                                    <text>Left: CPU sparkline and service status indicators.</text>
                                    <text>Right: Process table with PID, CPU%, MEM% and status.</text>
                                    <text dim={true}>Click outside this box or press Esc / q to close</text>
                                </col>
                            </row>
                        </col>
                    </card>
                </center>
            </box>
            <Sentinel />
        </box>
    );
}

export function ShortcutHelpOverlay({ shortcuts = DEFAULT_SHORTCUTS }: ShortcutHelpOverlayProps) {
    const [visible, setVisible] = useState(false);

    // Global key bindings: ? opens, Esc and q close
    useKeymap([
        { key: '?', action: () => setVisible(true) },
        { key: 'escape', action: () => setVisible(false) },
        { key: 'q', action: () => setVisible(false) },
    ]);

    if (!visible) return null as any;
    return <ShortcutHelpOverlayContent shortcuts={shortcuts} onClose={() => setVisible(false)} />;
}

import { useEffect, useRef, useState } from '../hooks.js';

type Widget = any;

export function useHover(): [boolean, (widget: Widget | null) => void] {
    const [hovered, setHovered] = useState(false);
    const widgetRef = useRef<Widget | null>(null);

    const attach = (widget: Widget | null) => {
        widgetRef.current = widget;
    };

    useEffect(() => {
        const widget = widgetRef.current;

        // No widget attached → must be false
        if (!widget) {
            setHovered(false);
            return;
        }

        const onEnter = () => setHovered(true);
        const onLeave = () => setHovered(false);

        // safe subscription (tests will mock these)
        widget.on?.('mouseenter', onEnter);
        widget.on?.('mouseleave', onLeave);

        // cleanup required by spec
        return () => {
            widget.off?.('mouseenter', onEnter);
            widget.off?.('mouseleave', onLeave);
        };
    }, []);

    return [hovered, attach];
}
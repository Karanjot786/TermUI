import { useState, useEffect, type VNode } from '@termuijs/jsx';
import { transition } from '@termuijs/motion';
import { Dim, Pos } from '@termuijs/core';
import { type Router, type NavigateEvent } from './router.js';

// Custom position constraint that offsets by a percentage of the parent's width
class SlidePos extends Pos {
    constructor(public offsetRatio: number) { super(); }
    dependencies() { return ['parentSize']; }
    evaluate(ctx: any) {
        return Math.max(0, Math.floor(ctx.parentWidth * this.offsetRatio));
    }
}

export interface RouterViewProps {
    router: Router;
}

export function RouterView({ router }: RouterViewProps) {
    const [screens, setScreens] = useState<{
        previous: VNode | null;
        current: VNode | null;
        direction: 'push' | 'back' | 'replace' | 'forward';
        progress: number;
    }>({
        previous: null,
        current: router.current ? router.wrapScreen(router.current) : null,
        direction: 'push',
        progress: 1,
    });

    useEffect(() => {
        router.autoUnmount = false;
        let cancelTransition: (() => void) | null = null;
        let alive = true;

        const handleNavigate = (e: NavigateEvent) => {
            if (!alive) return;
            if (cancelTransition) {
                cancelTransition();
                cancelTransition = null;
            }

            const dir = e.direction ?? 'push';
            
            // Prepare for transition
            setScreens(prev => ({
                previous: prev.current,
                current: e.screen,
                direction: dir,
                progress: 0,
            }));

            // Animate using the motion transition runner
            cancelTransition = transition({
                durationMs: 350,
                onFrame: (p) => {
                    if (!alive) return;
                    setScreens(prev => ({ ...prev, progress: p }));
                },
                onComplete: () => {
                    if (!alive) return;
                    setScreens(prev => ({ ...prev, previous: null, progress: 1 }));
                    cancelTransition = null;
                }
            });
        };

        const onNav = (e: NavigateEvent) => handleNavigate(e);
        const onBack = (e: NavigateEvent | null) => {
            if (e) handleNavigate(e);
        };

        router.events.on('navigate', onNav);
        router.events.on('back', onBack);
        
        return () => {
            alive = false;
            router.autoUnmount = true;
            if (cancelTransition) {
                cancelTransition();
                cancelTransition = null;
            }
            router.events.off('navigate', onNav);
            router.events.off('back', onBack);
        };
    }, [router]);

    const { previous, current, direction, progress } = screens;
    
    // Calculate ratio offsets from -1 to 1 (left to right)
    let currentOffset = 0;
    let prevOffset = 0;

    if (direction === 'back') {
        currentOffset = -(1 - progress);
        prevOffset = progress;
    } else {
        currentOffset = (1 - progress);
        prevOffset = -progress;
    }

    return (
        <box flexGrow={1}>
            {previous && (
                <box {...{ x: new SlidePos(prevOffset), y: 0, width: Dim.fill(), height: Dim.fill() } as any}>
                    {previous}
                </box>
            )}
            
            <box {...{ x: new SlidePos(currentOffset), y: 0, width: Dim.fill(), height: Dim.fill() } as any}>
                {current}
            </box>
        </box>
    );
}

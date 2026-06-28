import { useState, useEffect, type VNode } from '@termuijs/jsx';
import { transition } from '@termuijs/motion';
import { Dim, Pos } from '@termuijs/core';
import { type Router, type NavigateEvent } from './router.js';

// Custom position constraint that offsets by a percentage of the parent's width
class SlidePos extends Pos {
    constructor(public offsetRatio: number) { super(); }
    dependencies() { return ['parentSize']; }
    evaluate(ctx: any) {
        return Math.floor(ctx.parentWidth * this.offsetRatio);
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
        current: router.current ? (router as any)._wrapScreen(router.current) : null,
        direction: 'push',
        progress: 1,
    });

    useEffect(() => {
        const handleNavigate = (e: NavigateEvent) => {
            const dir = e.direction ?? 'push';
            
            // Prepare for transition
            setScreens(prev => ({
                previous: prev.current,
                current: e.screen,
                direction: dir,
                progress: 0,
            }));

            // Animate using the motion transition runner
            transition({
                durationMs: 350,
                onFrame: (p) => {
                    setScreens(prev => ({ ...prev, progress: p }));
                },
                onComplete: () => {
                    setScreens(prev => ({ ...prev, previous: null, progress: 1 }));
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

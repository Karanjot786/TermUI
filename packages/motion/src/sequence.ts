// ─────────────────────────────────────────────────────
// Animation Sequencing — chained and parallel execution
// ─────────────────────────────────────────────────────

export type AnimationRunner = (onComplete: () => void) => () => void;

/**
 * Run a list of animations in order, one after the next.
 * Starts the next animation only when the previous one triggers its onComplete.
 * Returns a master cancel function to stop the sequence immediately.
 */
export function sequence(animations: AnimationRunner[], onComplete?: () => void): () => void {
    let currentIndex = 0;
    let cancelCurrent: (() => void) | null = null;
    let isCancelled = false;
    let isFinished = false;

    if (animations.length === 0) {
        onComplete?.();
        return () => {};
    }

    function runNext() {
        if (isCancelled || isFinished) return;

        if (currentIndex >= animations.length) {
            isFinished = true;
            onComplete?.();
            return;
        }

        const runner = animations[currentIndex];
        cancelCurrent = runner(() => {
            cancelCurrent = null;
            currentIndex++;
            runNext();
        });
    }

    runNext();

    return () => {
        if (isCancelled || isFinished) return;
        isCancelled = true;
        cancelCurrent?.();
        cancelCurrent = null;
    };
}

/**
 * Run several animations at the same time.
 * Fires the completion callback when every animation in the group has finished.
 * Returns a master cancel function to cancel all active animations concurrently.
 */
export function parallel(animations: AnimationRunner[], onComplete?: () => void): () => void {
    let completedCount = 0;
    let isCancelled = false;
    let isFinished = false;
    const cancels: (() => void)[] = [];

    if (animations.length === 0) {
        onComplete?.();
        return () => {};
    }

    animations.forEach((runner, index) => {
        const cancel = runner(() => {
            if (isCancelled || isFinished) return;
            completedCount++;
            if (completedCount === animations.length) {
                isFinished = true;
                onComplete?.();
            }
        });
        cancels.push(cancel);
    });

    return () => {
        if (isCancelled || isFinished) return;
        isCancelled = true;
        cancels.forEach(cancel => cancel());
    };
}

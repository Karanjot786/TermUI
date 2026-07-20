export class ScrollAcceleration {
    private lastScrollTime: number | null = null;

    getMultiplier(now: number): number {
        if (this.lastScrollTime === null) {
            this.lastScrollTime = now;
            return 1;
        }

        const deltaMs = now - this.lastScrollTime;
        this.lastScrollTime = now;

        if (deltaMs > 300) return 1;
        if (deltaMs > 200) return 2;
        if (deltaMs > 100) return 3;
        if (deltaMs > 50) return 4;
        if (deltaMs > 25) return 5;

        return 6;
    }

    reset(): void {
        this.lastScrollTime = null;
    }
}
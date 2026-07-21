import { type Color, contrastRatio, colorToRgb } from './Color.js';

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    s /= 100;
    l /= 100;
    let r = l;
    let g = l;
    let b = l;

    if (s !== 0) {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Adjust `fg` so it meets `targetRatio` against `bg`, returning the original
 * colour when it already passes. When adjustment is needed, the lightness of
 * `fg` is nudged along its own hue/saturation toward the nearer contrast
 * extreme (black or white). `none`-typed colours are returned unchanged.
 */
export function adjustForContrast(fg: Color, bg: Color, targetRatio = 4.5): Color {
    if (fg.type === 'none' || bg.type === 'none') return fg;

    const ratio = contrastRatio(fg, bg);
    if (ratio >= targetRatio) return fg;

    const [r, g, b] = colorToRgb(fg);
    const [h, s, l] = rgbToHsl(r, g, b);

    // Binary search for the lowest L that meets targetRatio (dark end, L→0)
    // and the highest L that meets targetRatio (light end, L→100).
    // Then pick whichever is closer to the original L.

    const bsearch = (lo: number, hi: number, findMax: boolean): number => {
        while (lo < hi) {
            const mid = findMax ? Math.ceil((lo + hi) / 2) : Math.floor((lo + hi) / 2);
            const [nr, ng, nb] = hslToRgb(h, s, mid);
            const midRatio = contrastRatio({ type: 'rgb', r: nr, g: ng, b: nb }, bg);
            if (midRatio >= targetRatio) {
                if (findMax) lo = mid; else hi = mid;
            } else {
                if (findMax) hi = mid - 1; else lo = mid + 1;
            }
        }
        const [nr, ng, nb] = hslToRgb(h, s, lo);
        return contrastRatio({ type: 'rgb', r: nr, g: ng, b: nb }, bg) >= targetRatio ? lo : -1;
    };

    const [nr0, ng0, nb0] = hslToRgb(h, s, 0);
    const darkBest = contrastRatio({ type: 'rgb', r: nr0, g: ng0, b: nb0 }, bg) >= targetRatio
        ? bsearch(0, Math.floor(l), true)
        : -1;

    const [nr100, ng100, nb100] = hslToRgb(h, s, 100);
    const lightBest = contrastRatio({ type: 'rgb', r: nr100, g: ng100, b: nb100 }, bg) >= targetRatio
        ? bsearch(Math.ceil(l), 100, false)
        : -1;

    let bestL: number;

    if (darkBest === -1 && lightBest === -1) {
        // No valid L found — fall back to white or black
        const whiteRatio = contrastRatio({ type: 'rgb', r: 255, g: 255, b: 255 }, bg);
        const blackRatio = contrastRatio({ type: 'rgb', r: 0, g: 0, b: 0 }, bg);
        const [nr, ng, nb] = whiteRatio > blackRatio ? [255, 255, 255] : [0, 0, 0];
        return { type: 'rgb', r: nr, g: ng, b: nb };
    } else if (darkBest === -1) {
        bestL = lightBest;
    } else if (lightBest === -1) {
        bestL = darkBest;
    } else {
        // Pick the closer boundary to the original L
        bestL = (l - darkBest) <= (lightBest - l) ? darkBest : lightBest;
    }

    const [fr, fg_, fb] = hslToRgb(h, s, bestL);

    if (fg.type === 'hex') {
        const hexStr = '#' + [fr, fg_, fb].map(x => x.toString(16).padStart(2, '0')).join('');
        return { type: 'hex', hex: hexStr };
    }
    return { type: 'rgb', r: fr, g: fg_, b: fb };
}

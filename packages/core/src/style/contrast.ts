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

export function adjustForContrast(fg: Color, bg: Color, targetRatio = 4.5): Color {
    if (fg.type === 'none' || bg.type === 'none') return fg;

    const ratio = contrastRatio(fg, bg);
    if (ratio >= targetRatio) return fg;

    const [r, g, b] = colorToRgb(fg);
    const [h, s, l] = rgbToHsl(r, g, b);

    let bestL = l;
    let minDiff = Infinity;

    for (let newL = 0; newL <= 100; newL++) {
        const [nr, ng, nb] = hslToRgb(h, s, newL);
        const candidateColor: Color = { type: 'rgb', r: nr, g: ng, b: nb };
        const candRatio = contrastRatio(candidateColor, bg);
        if (candRatio >= targetRatio) {
            const diff = Math.abs(newL - l);
            if (diff < minDiff) {
                minDiff = diff;
                bestL = newL;
            }
        }
    }

    if (minDiff === Infinity) {
        const whiteRatio = contrastRatio({ type: 'rgb', r: 255, g: 255, b: 255 }, bg);
        const blackRatio = contrastRatio({ type: 'rgb', r: 0, g: 0, b: 0 }, bg);
        const [nr, ng, nb] = whiteRatio > blackRatio ? [255, 255, 255] : [0, 0, 0];
        return { type: 'rgb', r: nr, g: ng, b: nb };
    }

    const [fr, fg_, fb] = hslToRgb(h, s, bestL);

    if (fg.type === 'hex') {
        const hexStr = '#' + [fr, fg_, fb].map(x => x.toString(16).padStart(2, '0')).join('');
        return { type: 'hex', hex: hexStr };
    }
    return { type: 'rgb', r: fr, g: fg_, b: fb };
}

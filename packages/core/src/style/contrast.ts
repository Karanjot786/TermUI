// WCAG Contrast calculator
export const getRelativeLuminance = (r: number, g: number, b: number) => {
    const linearize = (c: number): number => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
};

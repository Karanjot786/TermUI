// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for WorldMap widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('WorldMap', () => {
    it('initializes empty and renders without crashing', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        const { Screen } = await import('@termuijs/core');

        const map = new WorldMap({});
        map.updateRect({ x: 0, y: 0, width: 60, height: 20 });

        const screen = new Screen(60, 20);
        map.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        // Map should contain dots from the landmasses
        expect(rendered).toContain('.');
        // Map shouldn't contain markers
        expect(rendered).not.toContain('*');
    });

    it('adds and clears markers', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        
        const map = new WorldMap();
        expect(map.getMarkers().length).toBe(0);

        map.addMarker({ lat: 40.7, lon: -74, label: 'NY' });
        expect(map.getMarkers().length).toBe(1);

        map.clearMarkers();
        expect(map.getMarkers().length).toBe(0);
    });

    it('renders a marker at correct scaled position', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        const { Screen } = await import('@termuijs/core');

        const map = new WorldMap({});
        // Equator (0,0) -> Maps to x:30, y:10 in the internal 60x20 map
        map.addMarker({ lat: 0, lon: 0, char: 'X' });

        map.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        const screen = new Screen(60, 20);
        map.render(screen);

        const cell = screen.back[10][30];
        expect(cell.char).toBe('X');
    });

    it('renders marker labels if showLabels is true', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        const { Screen } = await import('@termuijs/core');

        const map = new WorldMap({}, { showLabels: true });
        map.addMarker({ lat: 0, lon: 0, char: 'X', label: 'Equator' });

        map.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        const screen = new Screen(60, 20);
        map.render(screen);

        const rendered = screen.back[10].map(c => c.char).join('');
        expect(rendered).toContain('X');
        expect(rendered).toContain('Equator');
    });

    it('hides marker labels if showLabels is false', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        const { Screen } = await import('@termuijs/core');

        const map = new WorldMap({}, { showLabels: false });
        map.addMarker({ lat: 0, lon: 0, char: 'X', label: 'Equator' });

        map.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        const screen = new Screen(60, 20);
        map.render(screen);

        const rendered = screen.back[10].map(c => c.char).join('');
        expect(rendered).toContain('X');
        expect(rendered).not.toContain('Equator');
    });

    it('does not render labels that exceed widget bounds', async () => {
        const { WorldMap } = await import('./WorldMap.js');
        const { Screen } = await import('@termuijs/core');

        const map = new WorldMap({}, { showLabels: true });
        // Place a marker far on the right edge (lon: 179)
        map.addMarker({ lat: 0, lon: 179, char: 'X', label: 'Very Long Label Name' });

        map.updateRect({ x: 0, y: 0, width: 60, height: 20 });
        const screen = new Screen(60, 20);
        map.render(screen);

        const rendered = screen.back[10].map(c => c.char).join('');
        expect(rendered).toContain('X');
        // The label should be truncated or hidden because it doesn't fit within width 60
        expect(rendered).not.toContain('Very Long Label Name');
    });
});

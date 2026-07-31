// ─────────────────────────────────────────────────────
// @termuijs/widgets — WorldMap widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface MapMarker {
    /** Latitude of the marker (-90 to 90) */
    lat: number;
    /** Longitude of the marker (-180 to 180) */
    lon: number;
    /** Optional text label to display next to the marker */
    label?: string;
    /** Character to represent the marker (default: '*') */
    char?: string;
    /** Color of the marker */
    color?: Color;
}

export interface WorldMapOptions {
    /** Color of the landmasses */
    mapColor?: Color;
    /** Default color for markers */
    markerColor?: Color;
    /** Whether to render marker labels (default: true) */
    showLabels?: boolean;
}

/**
 * A lightweight, dependency-free ASCII world map projection.
 * Equirectangular projection mapped to 60x20 terminal cells.
 */
const ASCII_WORLD_MAP = [
    "                                                            ",
    "        .......             ......                          ",
    "      ...........        ...........     .......            ",
    "     ..............    ...........................          ",
    "     ...............  .............................         ",
    "      ..............  ..............................        ",
    "       .............   ............................         ",
    "        ...........     ..........................          ",
    "         .........       ........................           ",
    "          .......         ......................            ",
    "           .....           ....................             ",
    "            ....             ................      ...      ",
    "            ...               ............        .....     ",
    "             ..                ..........          ...      ",
    "             .                  ........                    ",
    "                                 ......                     ",
    "                                  ....                      ",
    "                                   ..                       ",
    "                                                            ",
    "                                                            ",
];

const MAP_WIDTH = 60;
const MAP_HEIGHT = 20;

/**
 * WorldMap — a geographical map widget for plotting coordinates.
 *
 * Example:
 *   const map = new WorldMap({ mapColor: { type: 'named', name: 'blue' } });
 *   map.addMarker({ lat: 40.7128, lon: -74.0060, label: 'New York' });
 */
export class WorldMap extends Widget {
    private _markers: MapMarker[] = [];
    private _mapColor: Color;
    private _markerColor: Color;
    private _showLabels: boolean;

    constructor(style: Partial<Style> = {}, opts: WorldMapOptions = {}) {
        super(style);
        this._mapColor = opts.mapColor ?? { type: 'named', name: 'green' };
        this._markerColor = opts.markerColor ?? { type: 'named', name: 'red' };
        this._showLabels = opts.showLabels ?? true;
    }

    /** Add a marker to the map */
    addMarker(marker: MapMarker): void {
        this._markers.push(marker);
        this.markDirty();
    }

    /** Remove all markers from the map */
    clearMarkers(): void {
        this._markers = [];
        this.markDirty();
    }

    /** Get the current list of markers */
    getMarkers(): MapMarker[] {
        return [...this._markers];
    }

    /** Set whether marker labels are displayed */
    setShowLabels(show: boolean): void {
        this._showLabels = show;
        this.markDirty();
    }

    /**
     * Map (lat, lon) to internal ASCII map coordinates (x, y).
     * Equirectangular projection:
     *   lon: -180 to 180 -> x: 0 to MAP_WIDTH
     *   lat:  90 to -90  -> y: 0 to MAP_HEIGHT
     */
    private _project(lat: number, lon: number): { x: number; y: number } {
        const x = Math.floor(((lon + 180) / 360) * MAP_WIDTH);
        const y = Math.floor(((90 - lat) / 180) * MAP_HEIGHT);
        return {
            x: Math.max(0, Math.min(MAP_WIDTH - 1, x)),
            y: Math.max(0, Math.min(MAP_HEIGHT - 1, y)),
        };
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Scale factor to map the internal ASCII map to the widget's render area.
        // We preserve the aspect ratio of the internal map.
        const scaleX = width / MAP_WIDTH;
        const scaleY = height / MAP_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        const renderWidth = Math.max(1, Math.floor(MAP_WIDTH * scale));
        const renderHeight = Math.max(1, Math.floor(MAP_HEIGHT * scale));

        // Center the map in the available rect
        const offsetX = x + Math.floor((width - renderWidth) / 2);
        const offsetY = y + Math.floor((height - renderHeight) / 2);

        // Draw the base ASCII map
        for (let r = 0; r < renderHeight; r++) {
            for (let c = 0; c < renderWidth; c++) {
                // Map the screen cell back to the ASCII map index
                const mapX = Math.floor((c / renderWidth) * MAP_WIDTH);
                const mapY = Math.floor((r / renderHeight) * MAP_HEIGHT);
                
                const char = ASCII_WORLD_MAP[mapY]?.[mapX] ?? ' ';
                
                if (char !== ' ') {
                    screen.setCell(offsetX + c, offsetY + r, {
                        ...attrs,
                        char,
                        fg: this._mapColor,
                    });
                }
            }
        }

        // Draw markers
        for (const marker of this._markers) {
            const pos = this._project(marker.lat, marker.lon);
            
            // Map the internal projection coordinates to the scaled screen coordinates
            const screenX = offsetX + Math.floor((pos.x / MAP_WIDTH) * renderWidth);
            const screenY = offsetY + Math.floor((pos.y / MAP_HEIGHT) * renderHeight);

            // Draw marker character
            const char = marker.char ?? '*';
            const markerColor = marker.color ?? this._markerColor;
            
            screen.setCell(screenX, screenY, {
                ...attrs,
                char,
                fg: markerColor,
                bold: true,
            });

            // Draw label next to marker if requested
            if (this._showLabels && marker.label) {
                const labelX = screenX + 2;
                
                // Only draw label if it fits inside the widget's content rect
                if (labelX + stringWidth(marker.label) <= x + width) {
                    screen.writeString(labelX, screenY, marker.label, {
                        ...attrs,
                        fg: markerColor,
                    });
                }
            }
        }
    }
}

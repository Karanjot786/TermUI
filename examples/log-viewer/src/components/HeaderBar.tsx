import { Box, Text } from '@termuijs/widgets';
import { type Style, type Color, caps } from '@termuijs/core';

export interface HeaderBarProps {
    totalLogs: number;
    errorCount: number;
    connectionState: 'connected' | 'reconnecting' | 'disconnected';
    style?: Partial<Style>;
}

export class HeaderBar extends Box {
    private _totalLogs = 0;
    private _errorCount = 0;
    private _connectionState: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
    
    private titleText: Text;
    private statusText: Text;
    private statsText: Text;

    constructor(props: HeaderBarProps) {
        super({
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 3,
            padding: { left: 1, right: 1 },
            border: 'single',
            borderColor: { type: 'hex', hex: '#2c3143' },
            bg: { type: 'hex', hex: '#161821' },
            ...props.style
        });

        this._totalLogs = props.totalLogs;
        this._errorCount = props.errorCount;
        this._connectionState = props.connectionState;

        // Title
        this.titleText = new Text(" ⚡ REALTIME LOG MONITOR ", {
            bold: true,
            fg: { type: 'hex', hex: '#06b6d4' } // cyan accent
        });

        // Connection Status
        this.statusText = new Text(this._getStatusString(), {
            fg: this._getStatusColor(),
            bold: true
        });

        // Stats summary
        this.statsText = new Text(this._getStatsString(), {
            bold: true
        });

        // Left section box
        const leftSection = new Box({ flexDirection: 'row', gap: 2, alignItems: 'center' });
        leftSection.addChild(this.titleText);
        leftSection.addChild(this.statusText);

        this.addChild(leftSection);
        this.addChild(this.statsText);
    }

    setStats(totalLogs: number, errorCount: number): void {
        this._totalLogs = totalLogs;
        this._errorCount = errorCount;
        this.statsText.setContent(this._getStatsString());
        this.markDirty();
    }

    setConnectionState(state: 'connected' | 'reconnecting' | 'disconnected'): void {
        this._connectionState = state;
        this.statusText.setContent(this._getStatusString());
        this.statusText.setStyle({ fg: this._getStatusColor() });
        this.markDirty();
    }

    private _getStatusString(): string {
        const dot = caps.unicode ? '●' : '*';
        switch (this._connectionState) {
            case 'connected':
                return `${dot} Connected`;
            case 'reconnecting':
                return `${dot} Reconnecting...`;
            case 'disconnected':
                return `${dot} Disconnected`;
        }
    }

    private _getStatusColor(): Color {
        switch (this._connectionState) {
            case 'connected':
                return { type: 'hex', hex: '#10b981' }; // Emerald green
            case 'reconnecting':
                return { type: 'hex', hex: '#f59e0b' }; // Amber yellow
            case 'disconnected':
                return { type: 'hex', hex: '#ef4444' }; // Rose red
        }
    }

    private _getStatsString(): string {
        return `Total Logs: ${this._totalLogs}  |  Errors: ${this._errorCount} `;
    }
}

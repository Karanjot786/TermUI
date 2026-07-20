// ─────────────────────────────────────────────────────
// @termuijs/data — Network interface info via Node.js os
// ─────────────────────────────────────────────────────

import * as os from 'node:os';

export interface NetworkInterface {
    name: string;
    address: string;
    family: string;
    mac: string;
    internal: boolean;
}

/** Network data provider */
export const network = {
    /** Active (non-internal) network interfaces */
    get interfaces(): NetworkInterface[] {
        const ifaces = os.networkInterfaces();
        const result: NetworkInterface[] = [];

        for (const [name, addrs] of Object.entries(ifaces)) {
            if (!addrs) continue;
            for (const addr of addrs) {
                if (!addr.internal && addr.family === 'IPv4') {
                    result.push({
                        name,
                        address: addr.address,
                        family: addr.family,
                        mac: addr.mac,
                        internal: addr.internal,
                    });
                }
            }
        }

        return result;
    },

    /** Primary IP address */
    get ip(): string {
        const ifaces = network.interfaces;
        return ifaces.length > 0 ? ifaces[0].address : '127.0.0.1';
    },

    /** Hostname */
    get hostname(): string {
        return os.hostname();
    },
};

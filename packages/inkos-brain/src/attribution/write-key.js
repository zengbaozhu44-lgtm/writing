/**
 * Unforgeable write capability for Attribution Registry.
 * NOT re-exported from packages/inkos-brain/src/index.js public surface.
 * Only Attribution Gate (and registry tests importing this file) may hold it.
 */
export const ATTRIBUTION_GATE_WRITE_KEY = Symbol('inkos.attribution_gate_write_key');

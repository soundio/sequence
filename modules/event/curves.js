import mirror from '../object/mirror.js';

export const CURVENUMBERS = {
    "step":        0,
    "linear":      1,
    "exponential": 2,
    "target":      3,
    "curve":       4,
    "hold":        5,
    "cancel":      6
};

export const CURVENAMES = mirror(CURVENUMBERS);

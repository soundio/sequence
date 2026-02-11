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

/**
toCurveName(value)
Converts a curve name or number to a curve name string.
**/
export function toCurveName(value) {
    return typeof value === 'number' ?
        (CURVENAMES[value] || 'step') :
        value;
}

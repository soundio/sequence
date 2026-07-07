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

export const CURVEBYTES = {
    0: 4,    // step        Float32
    1: 4,    // linear      Float32
    2: 4,    // exponential Float32
    3: 12,   // target      Float32, Float64
    //4: 10, // curve       Float64, Int16, n * Float32
    5: 0,    // hold        no data
    6: 0     // cancel      no data

    // TODO: Unknown event types. We either do this or we make pluggable schemas
    // for unknown events?
    // 8:  1  // Int8 bytes, Int8 * n values
    // 9:  1  // Int8 bytes, Uint8 * n values
    // 10: 2  // Int8 bytes, Int16 * n values
    // 11: 2  // Int8 bytes, Uint16 * n values
    // 12: 4  // Int8 bytes, Float32 * n values
    // 13: 8  // Int8 bytes, Float64 * n values
    // 14: 8  // Float32 Float32
    // 15: 12 // Float32 Float64
};

/**
toCurveName(value)
Converts a curve name or number to a curve name string.
**/
export function toCurveName(value) {
    return typeof value === 'number' ?
        (CURVENAMES[value] || 'step') :
        value;
}

/**
toCurveNumber(name)
Converts a curve name or number to a curve number.
**/
export function toCurveName(name) {
    return typeof name === 'string' ?
        (CURVENUMBERS[name] || 'step') :
        name;
}

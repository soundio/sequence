import mirror from '../object/mirror.js';

export const TRANSFORMNUMBERS = {
    displace:  1,
    rate:      2,
    gain:      3,
    quantize:  4,
    transpose: 5
};

export const TRANSFORMNAMES = mirror(TRANSFORMNUMBERS);

export const TRANSFORMBYTES = {
    1: 9, // name (1) + time (8)
    2: 5, // name (1) + rate (4)
    3: 5, // name (1) + gain (4)
    4: 5, // name (1) + TBD (4)
    5: 2  // name (1) + transposition (1)
};

export const TRANSFORMLENGTHS = {
    1: 1, // displace   time
    2: 1, // rate       rate
    3: 1, // gain       gain
    4: 1, // quantize   TBD
    5: 1  // transpose  value
};

/**
toTransformName(value)
Converts a transform name or number to a transform name string.
**/
export function toTransformName(value) {
    if (typeof value === 'string' && value in TRANSFORMNUMBERS) return value;
    if (typeof value === 'number' && value in TRANSFORMNAMES) return TRANSFORMNAMES[value];
    throw new Error(`Transform "${ value }" not recognised`);
}

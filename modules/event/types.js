import mirror from '../object/mirror.js';

export const TYPENUMBERS = {
    sequence: 1,
    note:     2,
    param:    3,
    rate:     4,
    key:      5,
    meter:    6,
    chord:    7,
    text:     8,
    start:    9,
    stop:     10,
    clef:     11
};

export const TYPENAMES = mirror(TYPENUMBERS);

export const TYPEBYTES = {
    2:  16, // note    4 pitch     4 dynamic  8 duration
    5:  1,  // key     1 root
    6:  4,  // meter   2 duration  2 divisor
    7:  18, // chord   1 root      8 hsid     8 duration  1 bass
    9:  8,  // start   4 pitch     4 dynamic
    10: 8,  // stop    4 pitch     4 dynamic
    11: 1   // clef    1 clef
}

/**
toTypeName(value)
Converts a type name or number to a type name string.
**/
export function toTypeName(value) {
    if (typeof value === 'string' && value in TYPENUMBERS) return value;
    if (value in TYPENAMES) return TYPENAMES[value];
    throw new Error(`Event type ${ value } not recognised`);
}

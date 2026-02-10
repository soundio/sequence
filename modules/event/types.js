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
    3:  15, // param   2 name      4 value    1 curve     8 duration
    4:  13, // rate    4 rate      1 curve    8 duration
    5:  1,  // key     1 root
    6:  4,  // meter   2 duration  2 divisor
    7:  11, // chord   1 root      1 mode     8 duration  1 bass
    9:  8,  // start   4 pitch     4 dynamic
    10: 8,  // stop    4 pitch     4 dynamic
    11: 1   // clef    1 clef
}

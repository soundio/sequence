
import { names } from 'midi/control.js';

const assign = Object.assign;

export const ADDRESSBITS  = 10;
export const ADDRESSMASK  = Math.pow(2, ADDRESSBITS) - 1;
export const NAMEBITS     = 9;
export const NAMEMASK     = Math.pow(2, NAMEBITS) - 1;
export const TYPEBITS     = 3;
export const TYPEMASK     = Math.pow(2, TYPEBITS) - 1;
export const NAMETYPEMASK = Math.pow(2, NAMEBITS + TYPEBITS) - 1;

export const NAMES = assign({}, names, {
    3:   'mute',
    6:   'gain',
    9:   'angle',
    12:  'distance',
    13:  'azimuth',
    14:  'mix',
    15:  'phase',
    16:  'frequency',
    17:  'Q',
    18:  'depth',
    19:  'cutoff',
    20:  'type',
    21:  'delay',
    22:  'feedback',
    //20 - 63 are basically free, although 32 to 63 are reserved as fine-grained add-ons for 0-31
    128: 'stop',
    129: 'start',
    130: 'record',
    131: 'pitch',
    132: 'rate',
    133: 'meter',
    134: 'key',
    135: 'touch'
});

export const NAMENUMBERS = Object
    .entries(NAMES)
    .reduce(toObject, {});

export const TYPES = {
    0: 'set',
    1: 'linear',
    2: 'exponential',
    3: 'target',
    4: 'curve',
    5: 'hold',
    6: 'cancel'
};

export const TYPENUMBERS = Object
    .entries(TYPES)
    .reduce(toObject, {});


function toObject(object, [number, name]) {
    object[name] = parseInt(number, 10);
    return object;
}

export function parseAddress(path) {
    const array = path.split('.');
    let part = array.pop();
    let n    = TYPENUMBERS[part] || 0;
    part = TYPENUMBERS[part] !== undefined ? array.pop() || 0 : part ;
    n |= NAMENUMBERS[part] << TYPEBITS;
    part = array.pop() || 0;
    n |= part << (NAMEBITS + TYPEBITS);
    part = array.pop() || 0;
    n |= part << (ADDRESSBITS + NAMEBITS + TYPEBITS);
    part = array.pop() || 0;
    n |= part << (2 * ADDRESSBITS + NAMEBITS + TYPEBITS);
    return n;
}

export function toPath(n) {
    let m = n & TYPEMASK;
    let path = TYPES[m];
    n >>= TYPEBITS;
    if (!n) return path;
    path = (NAMES[n & NAMEMASK] || n & NAMEMASK) + (m ? '.' + path : '');
    n >>= NAMEBITS;
    if (!n) return path;
    path = (n & ADDRESSMASK) + '.' + path;
    n >>= ADDRESSBITS;
    if (!n) return path;
    path = (n & ADDRESSMASK) + '.' + path;
    n >>= ADDRESSBITS;
    return path;
}

export function toRoute(n) {
    return n >> (NAMEBITS + TYPEBITS);
}

export function toNameNumber(n) {
    return n >> TYPEBITS & NAMEMASK;
}

export function toTypeNumber(n) {
    return n & TYPEMASK;
}

export function toName(n) {
    return NAMES[toNameNumber(n)];
}

export function toType(n) {
    return TYPES[toTypeNumber(n)];
}

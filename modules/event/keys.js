
import mod    from 'fn/mod.js';
import mirror from '../object/mirror.js';
import { rflatsharp, toUnicode }    from '../pitch.js';
import { toRootName, toRootNumber } from 'midi/note.js';
import Event from './event.js';


const define = Object.defineProperties;

export const KEYNUMBERS = {
    "F𝄫": -15,
    "C𝄫": -14,
    "G𝄫": -13,
    "D𝄫": -12,
    "A𝄫": -11,
    "E𝄫": -10,
    "B𝄫": -9,
    "F♭": -8,
    "C♭": -7,
    "G♭": -6,
    "D♭": -5,
    "A♭": -4,
    "E♭": -3,
    "B♭": -2,
    "F":  -1,
    "C":   0,
    "G":   1,
    "D":   2,
    "A":   3,
    "E":   4,
    "B":   5,
    "F♯":  6,
    "C♯":  7,
    "G♯":  8,
    "D♯":  9,
    "A♯":  10,
    "E♯":  11,
    "B♯":  12,
    "F𝄪":  13,
    "C𝄪":  14,
    "G𝄪":  15,
    "D𝄪":  16,
    "A𝄪":  17,
    "E𝄪":  18,
    "B𝄪":  19
};

export const KEYNAMES = mirror(KEYNUMBERS);

export function toKeyName(value) {
    if (typeof value === 'number') {
        if (value in KEYNAMES) return KEYNAMES[value];
        throw new Error(`Key ${ value } not recognised`);
    }

    return KEYNAMES[toKeyNumber(value)] ;
}

export function toKeyNumber(value) {
    if (typeof value === 'number') return value;
    const name = value.replaceAll(rflatsharp, toUnicode);
    if (name in KEYNUMBERS) return KEYNUMBERS[name];
    throw new Error(`Key "${ value }" not recognised`);
}

export function keyToRootNumber(value) {
    const n = toKeyNumber(value);
    return mod(12, n * 7);
}

export function rootToKeyNumber(value) {
    const name = toRootName(value);
    return KEYNUMBERS[name];
}



export default class KeyEvent extends Event {
    constructor(beat, type, key) {
        super(beat);
        this.key = key;
    }

    get key()            { return toKeyName(this[2]); }
    set key(name)        { this[2] = toKeyNumber(name); }

    toString() {
        return super.toString() + ' ' + this[2];
    }
}

define(KeyEvent.prototype, {
    1:    { value: Event.TYPENUMBERS.key, enumerable: true }
    type: { value: 'key' }
});

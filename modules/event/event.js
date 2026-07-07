import mirror from '../object/mirror.js';

const define = Object.defineProperties;

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





const writable = { writable: true };

function stringify(number) {
    return number.toFixed(4).replace(/\.?0+$/, '');
}

function getEvent(event) {
    let e;
    while (e = event.event) event = e;
    return event;
}

export default class Event {
    constructor(beat) {
        this.beat = beat;
        define(this, 'event',    writable);
        define(this, 'events',   writable);
        define(this, 'target',   writable);
    }

    get beat()       { return this[0]; }
    set beat(number) { this[0] = parseFloat(number); }

    remove() {
        const event  = getEvent(this);
        const events = event.events;
        if (events) remove(events, event);
        return this;
    }

    toJSON() {
        const array = [];
        let n = -1;
        while (this[++n] !== undefined) array.push(this[n]);
        return array;
    }

    toString() {
        // Beat and type
        return stringify(this[0]) + ' ' + this[1];
    }

    // Enable event object to be spread by making it iterable
    *[Symbol.iterator]() {
        let i = -1;
        while (this[++i] !== undefined) yield this[i];
    }

    static TYPENUMBERS = TYPENUMBERS;
    static TYPENAMES   = TYPENAMES;
    static TYPEBYTES   = TYPEBYTES;

    static constructors = {};
    static of() { return this.from(arguments); }
    static from(data) {
        const type = toTypeName(data[1]);
        return new Event.constructors[type](...data);
    }

    static isChord(event)    { return event[1] === TYPENUMBERS.chord; }
    static isKey(event)      { return event[1] === TYPENUMBERS.key; }
    static isMeter(event)    { return event[1] === TYPENUMBERS.meter; }
    static isNote(event)     { return event[1] === TYPENUMBERS.note; }
    static isParam(event)    { return event[1] === TYPENUMBERS.param; }
    static isRate(event)     { return event[1] === TYPENUMBERS.rate; }
    static isSequence(event) { return event[1] === TYPENUMBERS.sequence; }
}

define(Event.prototype, {
    1:    { value: 0, enumerable: true },
    type: { value: 'unknown' }
});

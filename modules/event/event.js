import remove from 'fn/remove.js';
import mirror from '../object/mirror.js';


const assign   = Object.assign;
const define   = Object.defineProperties;
const writable = { writable: true };

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

function stringify(number) {
    return number.toFixed(4).replace(/\.?0+$/, '');
}

function getEvent(event) {
    let e;
    while (e = event.event) event = e;
    return event;
}

export default class Event {
    constructor(data) {
        assign(this, data);
        define(this, {
            event:  writable,
            events: writable,
            target: writable
        });
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

    static of(beat, type, ...data) {
        // Send data through Event.type() where it is validated
        const name = toTypeName(type);
        return Event[name](beat, ...data);
    }

    static from(object) {
        return object instanceof Event ?
            // If data is an Event object fast clone it via its subclass
            new object.constructor(object) :
            // Otherwise destructure it to of()
            Event.of(...object) ;
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
    type: { value: 'unknown' }
});

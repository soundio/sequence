import remove from 'fn/remove.js';
import mirror from '../object/mirror.js';
import { CURVES, CURVENAMES } from './curves.js';


const define     = Object.defineProperties;
const $sequence  = Symbol('sequence');
const $sequencer = Symbol('sequencer');
const $event     = Symbol('event');
const $events    = Symbol('events');
const $target    = Symbol('target');

export const TYPES = {
    sequence: 1,
    note:     2,
    control:  3,
    rate:     4,
    key:      5,
    meter:    6,
    chord:    7,
    text:     8
    //start:    9,
    //stop:     10,
    //clef:     11
};

export const TYPENAMES = mirror(TYPES);

export const TYPEBYTES = {
    2:  16, // note    4 pitch     4 dynamic  8 duration
    5:  1,  // key     1 root
    6:  5,  // meter   4 rsid      1 divisor
    7:  17, // chord   1 root      8 hsid     8 duration
    9:  8,  // start   4 pitch     4 dynamic
    10: 8,  // stop    4 pitch     4 dynamic
    11: 1   // clef    1 clef
}


/**
toTypeName(value)
Converts a type name or number to a type name string.
**/
export function toTypeName(type) {
    if (typeof type === 'string' && type in TYPES) return type;
    if (type in TYPENAMES) return TYPENAMES[type];
}

export function stringify(number) {
    if (typeof number !== 'number') return number;
    return Number.isInteger(number) ?
        String(number) :
        number.toFixed(4).replace(/\.?0+$/, '');
}

function getEvent(event) {
    let e;
    while (e = event.event) event = e;
    return event;
}

export default class Event {
    constructor(data) {
        // Assign enumerable string properties
        let key;
        for (key in data) this[key] = data[key];
    }

    get beat()        { return this[0]; }
    set beat(number)  { this[0] = parseFloat(number); }

    get type()        { return TYPENAMES[this[1]] || this[1]; }
    set type(value)   { this[1] = typeof value === 'string' ? TYPES[value] : value; }

    displace(n) {
        this[0] += parseFloat(n);
        return this;
    }

    transpose() {
        return this;
    }

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
        return stringify(this[0]);
    }

    // Enable event object to be spread by making it iterable
    *[Symbol.iterator]() {
        let i = -1;
        while (this[++i] !== undefined) yield this[i];
    }

    static CURVES    = CURVES;
    static TYPES     = TYPES;
    static TYPENAMES = TYPENAMES;
    static TYPEBYTES = TYPEBYTES;

    static of(beat, type, ...data) {
        // Send data through Event.type() where it is validated
        const name = toTypeName(type);
        return name ?
            // Event with type constructor
            Event[name](beat, ...data) :
            // Default event type
            new Event(arguments) ;
    }

    static from(object) {
        return object instanceof Event ?
            // If data is an Event object fast clone it via its subclass
            new object.constructor(object) :
            // Otherwise destructure it to of()
            Event.of(...object) ;
    }

    static isValid(event) {
        return event instanceof Event
            && event[2] !== undefined
            && !Number.isNaN(event[2]);
    }
}
// Store runtime back-references (`sequence`, `sequencer`, `event`, `events`,
// `target`) on Symbol keys via prototype accessors rather than calling
// Object.defineProperties(this, ...) in the constructor on every Event.
// Symbol keys are invisible to `for..in` (used by `Event.from()` cloning),
// `Object.keys()`, and deep equality checks, avoiding circular reference
// leaks (`event.events[0] === event`) with zero per-instance allocation cost.
// We use Symbols over private fields here so that events can have computed
// properties defined on their Data.of() proxies (private fields error out).
define(Event.prototype, {
    sequence:  { get() { return this[$sequence]; },  set(v) { this[$sequence]  = v; } },
    sequencer: { get() { return this[$sequencer]; }, set(v) { this[$sequencer] = v; } },
    event:     { get() { return this[$event]; },     set(v) { this[$event]     = v; } },
    events:    { get() { return this[$events]; },    set(v) { this[$events]    = v; } },
    target:    { get() { return this[$target]; },    set(v) { this[$target]    = v; } }
});


import remove   from 'fn/remove.js';
import { toNoteName, toNoteNumber, toRootName, toRootNumber } from 'midi/note.js';
import parseGain from './parse/parse-gain.js';
import mod12     from './number/mod-12.js';
import { rflatsharp, toUnicode } from './pitch.js';
import { toTypeName, TYPENUMBERS }  from './event/types.js';
import { toCurveName, toCurveNumber } from './event/curves.js';
import { toChordHSID, toChordName }   from './event/chords.js';
import { toParamName, toParamNumber } from './event/params.js';
import { toKeyNumber, toKeyName }     from './event/keys.js';
import { toTransformName, TRANSFORMNUMBERS, TRANSFORMLENGTHS } from './event/transforms.js';


const DEBUG    = globalThis.DEBUG;
const define   = Object.defineProperty;
const writable = { writable: true };
const rcommaspace = /\s*,\s*|\s+/;

function arrayify(event) {
    const array = [];
    let n = -1;
    while (event[++n] !== undefined) array.push(event[n]);
    return array;
}

function stringify(number) {
    return number.toFixed(4).replace(/\.?0+$/, '');
}

function getEvent(event) {
    let e;
    while (e = event.event) event = e;
    return event;
}

// --------

const getSet = {
    // Transform beat
    0: {
        get() {},
        set() {}
    },

    // Transform data
    2: {
        get() {},
        set() {}
    },
    // etc
};

function TransformEvent(event) {
    return Object.create(event, getSet);
}

// --------

export default class Event {
    constructor(beat, type) {
        this[0] = beat;
        this[1] = toTypeName(type);

        // Normalise event data
        switch (this[1]) {
            case "chord":
                // Root number
                this[2] = toRootNumber(arguments[2]);
                // Harmonic structure id - handle number or name string
                this[3] = toChordHSID(arguments[3]);
                // Duration
                this[4] = arguments[4] || 0;
                // Chord bass
                if (arguments[5]) this[5] = arguments[5] || 0;
                break;
            case "text":
                // String
                this[2] = arguments[2];
                // Duration
                this[3] = arguments[3];
                break;
            case "key":
                // Key root number
                this[2] = toKeyNumber(arguments[2]);
                break;
            case "note":
                // Note number
                this[2] = toNoteNumber(arguments[2]);
                // Gain
                this[3] = parseGain(arguments[3]);
                // Duration
                this[4] = arguments[4] || 0;
                break;
            case "rate":
                // Rate
                this[2] = arguments[2];
                // Curve - handle number or string
                this[3] = toCurveName(arguments[3]);
                // Duration
                if (this[3] === 'target' || this[3] === 'curve') this[4] = arguments[4] || 0 ;
                break;
            case "param":
                // Name - handle number or string
                this[2] = toParamName(arguments[2]);
                // Value
                this[3] = arguments[3];
                // Curve - handle number or string
                this[4] = toCurveName(arguments[4]);
                // Duration
                if (this[4] === 'target' || this[4] === 'curve') this[5] = arguments[5] || 0 ;
                break;
            case "sequence":
                // Id
                this[2] = arguments[2];
                // Target
                this[3] = arguments[3];
                // Duration
                this[4] = arguments[4] || 0;
                // Transforms
                let n = 5;
                while(arguments[n] !== undefined) {
                    // Convert transform name from number to string
                    this[n] = toTransformName(arguments[n]);

                    // Get transform number for looking up parameter count
                    const number = TRANSFORMNUMBERS[this[n]];

                    // Copy parameters without conversion
                    const m = n + TRANSFORMLENGTHS[number];
                    while (n++ < m) this[n] = arguments[n] || 0;
                }
                break;
            case "start":
            case "stop":
                // Note number
                this[2] = toNoteNumber(arguments[2]);
                // Gain
                this[3] = parseGain(arguments[3]);
                break;

            default:
                this[2] = arguments[2];
                this[3] = arguments[3];
        }

        // Set by Sequence.create()
        //define(this, 'sequence', writable);
        define(this, 'event',    writable);
        define(this, 'events',   writable);
        //define(this, 'index',    writable);
        // Set by SequenceIterator
        define(this, 'target',   writable);
    }

    get beat()       { return this[0]; }
    set beat(number) { this[0] = parseFloat(number); }

    transform(transforms) {
        const transformedEvent = Object.create(this, {});
        transformedEvent.transforms = transforms;
        return transformedEvent;
    }

    remove() {
        const event  = getEvent(this);
        const events = event.events;

        if (events) {
            remove(events, event);
        }

        return this;
    }

    move(n) {
        const event = getEvent(this);
        event[0] = this[0] = this[0] + n;
        return this;
    }

    transpose(n) {
        const event = getEvent(this);

        switch (this[1]) {
            case "chord":
            case "key":
                event[2] = this[2] = mod12(this[2] + n);
                break;
            case "note":
            case "start":
            case "stop":
                event[2] = this[2] = this[2] + n;
                break;
            case "sequence":
                console.log('TODO: transpose sequence');
                break;
        }

        return this;
    }

    // Enable event object to be spread by making it iterable
    *[Symbol.iterator]() {
        let i = -1;
        while (this[++i] !== undefined) yield this[i];
    }

    toJSON() {
        return arrayify(this);
    }

    toString() {
        // Beat and type
        let string = stringify(this[0]) + ' ' + this[1];

        // Stringify rest of data based on event type
        switch (this[1]) {
            case "chord":
                string += ' ' + toRootName(this[2])
                    // Extension
                    + ' ' + toChordName(this[3])
                    // Duration
                    + ' ' + stringify(this[4]);
                break;
            case "key":
                string += ' ' + toKeyName(this[2]);
                break;
            case "note":
                string += ' ' + toNoteName(this[2])
                    // Gain
                    + ' ' + this[3]
                    // Duration
                    + ' ' + stringify(this[4]) ;
                break;
            case "param":
                string += ' ' + this[2]
                    // Value
                    + ' ' + this[3]
                    // Duration
                    + ' ' + stringify(this[4])
                    // Curve
                    + ' ' + this[5] ;
                break;
            case "rate":
                string += ' ' + stringify(this[2]);
                break;
            case "sequence":
                string += ' ' + this[2]
                    // Target address
                    + ' ' + this[3]
                    // Duration
                    + ' ' + stringify(this[4]);
                break;
            case "start":
            case "stop":
                string += ' ' + toNoteName(this[2])
                    // Gain
                    + ' ' + this[3] ;
                break;
            // Handle "meter" and other events
            default:
                let n = 1;
                while (this[++n] !== undefined) string += this[n];
        }

        return string;
    }

    static of(...data) {
        return new Event(...data);
    }

    static from(data/*, index, events*/) {
        //if (DEBUG && index  !== undefined && typeof index  !== 'number') throw new Error('Event() cannot create event with index ' + index);
        //if (DEBUG && events !== undefined && typeof events !== 'object') throw new Error('Event() cannot create event with events ' + events);

        const event = new Event(...data) ;
        //event.event  = data; // Dodgy, what if we are making event from arguments object, which we do?
        //event.events = events;
        //event.index  = index;
        return event;
    }

    static isChord    = isChordEvent;
    static isKey      = isKeyEvent;
    static isMeter    = isMeterEvent;
    static isNote     = isNoteEvent;
    static isParam    = isParamEvent;
    static isRate     = isRateEvent;
    static isSequence = isSequenceEvent;
}

class ChordEvent extends Event {
    get root()           { return toRootName(this[2]); }
    set root(number)     { this[2] = toRootNumber(number); }
    get extension()      { return toChordName(this[3]); }
    set extension(name)  { this[3] = toChordHSID(name); }
    get duration()       { return this[4]; }
    set duration(number) { this[4] = parseFloat(number); }
    // TODO
    get bass()           { return this[5]; }
    set bass(number)     { this[5] = parseInt(number, 10); }
}

defineProperties(ChordEvent.prototype, {
    1:    { value: TYPENUMBERS.chord, enumerable: true }
    type: { value: 'chord' }
});

class NoteEvent extends Event {
    // Make .name reference .number for reactive Signal graph to react to both
    // Claude says:
    /* The reactivity comment on NoteEvent is the crux — and it won't work
    as-is. Your note "make .name reference .number so the Signal graph reacts to
    both" is exactly the right intent, but the current Data proxy defeats it.
    When you read Data.of(note).name in a compute, the trap computes the value
    via object[name] (and PropertySignal.evaluate does this.object[this.name]) —
    where object is the raw target. So the getter runs with this = raw event,
    and its internal this.number → this[2] reads bypass the proxy entirely. They
    never hit the get trap, so they never register on the signal graph. Net:
    setting [2] invalidates the [2] signal, but your name/number accessors never
    depended on it → .name doesn't re-evaluate. Same story on the write side:
    proxy.number = 5 invokes the setter with this = raw, so this[2] = … skips
    the set trap and invalidates nothing.

    To make derived accessors reactive you'd have to change data.js to invoke
    accessors with the proxy as receiver — Reflect.get(object, name, proxy) /
    Reflect.set(..., proxy) (and thread the receiver into PropertySignal). Then
    this inside the getter is the reactive proxy, and its slot reads route back
    through the trap. That's the identical enabler the transformed-event
    prototype idea needed — so these two features share one prerequisite in
    data.js. I'd spike it before building all the classes: Data.of(note), read
    .name in a Signal.from, set [2], see if it invalidates. I'm fairly sure it
    currently won't.
    */
    get name()           { return toNoteName(this.number); }
    set name(name)       { this.number = name; }
    get number()         { return this[2]; }
    set number(number)   { this[2] = toNoteNumber(number); }
    get gain()           { return this[3]; }
    set gain(name)       { this[3] = parseGain(name); }
    get duration()       { return this[4]; }
    set duration(number) { this[4] = parseFloat(number); }
}

defineProperties(NoteEvent.prototype, {
    1:    { value: TYPENUMBERS.note, enumerable: true }
    type: { value: 'note' }
});

class KeyEvent extends Event {
    get key()            { return toKeyName(this[2]); }
    set key(name)        { this[2] = toKeyNumber(name); }
}

defineProperties(KeyEvent.prototype, {
    1:    { value: TYPENUMBERS.key, enumerable: true }
    type: { value: 'key' }
});

class MeterEvent extends Event {
    get timesig()        { return toTimeSig(this[2], this[3]); }
    set timesig(string)  { console.log('TODO!! timesig'); assign(this, toMeter(string)); }
}

defineProperties(MeterEvent.prototype, {
    1:    { value: TYPENUMBERS.meter, enumerable: true }
    type: { value: 'meter' }
});

class ParamEvent extends Event {
    get name()           { return toParamName(this[2]); }
    set name(name)       { this[2] = toParamNumber(name); }
    get value()          { return this[3]; }
    set value(number)    { this[3] = fround(number); }
    get curve()          { return toCurveName(this[4]); }
    set curve(name)      { this[4] = toCurveNumber(name); }
    get duration()       { return this[4] === CURVENAMES.target || this[4] === CURVENAMES.curve ? this[5] : 0 ; }
    set duration(number) { this[5] = parseFloat(number); }
}

defineProperties(ParamEvent.prototype, {
    1:    { value: TYPENUMBERS.param, enumerable: true }
    type: { value: 'param' }
});

class RateEvent extends Event {
    get value()          { return this[2]; }
    set value(number)    { this[2] = fround(number); }
    get curve()          { return toCurveName(this[3]); }
    set curve(name)      { this[3] = toCurveNumber(name); }
    get duration()       { return this[3] === CURVENAMES.target || this[3] === CURVENAMES.curve ? this[4] : 0 ; }
    set duration(number) { this[4] = parseFloat(number); }
}

defineProperties(RateEvent.prototype, {
    1:    { value: TYPENUMBERS.rate, enumerable: true }
    type: { value: 'rate' }
});

class SequenceEvent extends Event {
    get id()               { return this[2]; }
    set id(number)         { this[2] = parseInt(number); }
    get TARGET()           { return this[3]; }
    set TARGET(name)       { this[3] = name; }
    get duration()         { return this[4]; }
    set duration(number)   { this[4] = parseFloat(number); }
    get transforms()       {
        console.log('TODO: parse transform numbers to array of instructions');
    }
    set transforms(array) {
        // Split string by spaces and/or commas
        if (typeof array === 'string') array = array.split(rcommaspace);

        let n = 0;
        while(array[n] !== undefined) {
            // Get transform number for looking up parameter count
            const name   = toTransformName(array[n]);
            const number = TRANSFORMNUMBERS[name];
            this[n + 5] = number;

            // Copy parameters without conversion
            const m = n + 5 + TRANSFORMLENGTHS[number];
            while (n++ < m) this[n + 5] = array[n] || 0;
        }
    }
}

defineProperties(SequenceEvent.prototype, {
    1:    { value: TYPENUMBERS.sequence, enumerable: true }
    type: { value: 'sequence' }
});

class TextEvent extends Event {
    get string()         { return ''; }
    set string(name)     { console.log('TODO convert string to binary'); }
    get duration()       { return this[3]; }
    set duration(number) { this[3] = parseFloat(number); }
}

defineProperties(TextEvent.prototype, {
    1:    { value: TYPENUMBERS.text, enumerable: true }
    type: { value: 'text' }
});
                // String

export function isChordEvent(event) {
    return event[1] === 'chord';
}

export function isNoteEvent(event) {
    return event[1] === 'note';
}

export function isSequenceEvent(event) {
    return event[1] === 'sequence';
}

export function isMeterEvent(event) {
    return event[1] === 'meter';
}

export function isKeyEvent(event) {
    return event[1] === 'key';
}

export function isParamEvent(event) {
    return event[1] === 'param';
}

export function isRateEvent(event) {
    return event[1] === 'rate';
}

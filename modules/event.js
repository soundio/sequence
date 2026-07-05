
import { toNoteName, toNoteNumber, toRootName, toRootNumber } from 'midi/note.js';
import parseGain from './parse/parse-gain.js';
import mod12     from './number/mod-12.js';
import { rflatsharp, toUnicode } from './pitch.js';
import { toTypeName }  from './event/types.js';
import { toCurveName } from './event/curves.js';
import { toChordHSID, toChordName } from './event/chords.js';
import { toParamName } from './event/params.js';
import { toKeyNumber, toKeyName } from './event/keys.js';
import { toTransformName, TRANSFORMNUMBERS, TRANSFORMLENGTHS } from './event/transforms.js';


const DEBUG    = globalThis.DEBUG;
const define   = Object.defineProperty;
const writable = { writable: true };


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

        define(this, 'event',  writable);
        define(this, 'events', writable);
        define(this, 'index',  writable);
        define(this, 'target', writable);
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

    static from(data, index, events) {
        if (DEBUG && index  !== undefined && typeof index  !== 'number') throw new Error('Event() cannot create event with index ' + index);
        if (DEBUG && events !== undefined && typeof events !== 'object') throw new Error('Event() cannot create event with events ' + events);

        const event = new Event(...data) ;
        event.event  = data; // Dodgy, what if we are making event from arguments object?
        event.events = events;
        event.index  = index;
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
    return event[1] === 'timesig';
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

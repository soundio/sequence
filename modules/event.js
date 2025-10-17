
import { toNoteName, toRootName } from 'midi/note.js';
import normalise from './event/normalise.js';

const assign   = Object.assign;
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

export default class Event {
    constructor() {
        assign(this, normalise(arguments));
        define(this, 'event',  writable);
        define(this, 'events', writable);
        define(this, 'index',  writable);
        define(this, 'target', writable);
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
                    + ' ' + this[3]
                    // Duration
                    + ' ' + stringify(this[4]);
                break;
            case "key":
                string += ' ' + toRootName(this[2]);
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

    static from(data, events, index) {
        const event = new Event(...data);
        event.event  = data;
        event.events = events;
        event.index  = index;
        return event;
    }

    static isChordEvent    = isChordEvent;
    static isNoteEvent     = isNoteEvent;
    static isSequenceEvent = isSequenceEvent;
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

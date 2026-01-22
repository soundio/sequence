
import { toNoteName, toNoteNumber, toRootName, toRootNumber } from 'midi/note.js';
import parseGain from './parse/parse-gain.js';
import mod12     from './number/mod-12.js';
import { rflatsharp, toUnicode } from './pitch.js';


const define     = Object.defineProperty;
const writable   = { writable: true };


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
        this[1] = type;

        // Normalise event data
        switch (type) {
            case "chord":
                // Chord root number
                this[2] = toRootNumber(arguments[2]);
                // Chord extension
                this[3] = arguments[3].replaceAll(rflatsharp, toUnicode);
                // Duration
                this[4] = arguments[4];
                break;
            case "lyric":
                // Warn user over pold version
                console.warn('Old data contains "lyric" event, should be "text"');
                // Change type to "text"
                this[1] = "text";
            case "text":
                // String
                this[2] = arguments[2];
                // Duration
                this[3] = arguments[3];
                break;
            case "key":
                // Key root number
                this[2] = toRootNumber(arguments[2]);
                break;
            case "note":
                // Note number
                this[2] = toNoteNumber(arguments[2]);
                // Gain
                this[3] = parseGain(arguments[3]);
                // Duration
                this[4] = arguments[4];
                break;
            case "sequence":
                this[2] = arguments[2];
                this[3] = arguments[3];
                this[4] = arguments[4];
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
        const event =
            data[5] !== undefined ? new Event(data[0], data[1], data[2], data[3], data[4], data[5]) :
            data[4] !== undefined ? new Event(data[0], data[1], data[2], data[3], data[4]) :
            data[3] !== undefined ? new Event(data[0], data[1], data[2], data[3]) :
            new Event(data[0], data[1], data[2]) ;

        event.event  = data; // Dodgy, what if we are making event from arguments object?
        event.events = events;
        event.index  = index;
        return event;
    }

    static isChord    = isChordEvent;
    static isNote     = isNoteEvent;
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

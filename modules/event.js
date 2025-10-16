
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

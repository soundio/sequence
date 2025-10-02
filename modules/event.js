
const assign = Object.assign;
const define = Object.defineProperties;
const properties = {
    event:    { writable: true },
    sequence: { writable: true }
};

export default class Event {
    constructor() {
        assign(this, arguments);
        define(this, properties);
    }

    static from(event, sequence) {
        return new Event(...event);
    }
}

export function isSequenceEvent(event) {
    return event[1] === 'sequence';
}

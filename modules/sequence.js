
import { isSequenceEvent } from './event.js';

const assign = Object.assign;

const nothing = [];

const done = {
    done: true,
    value: undefined
};

const valueless = {
    value: undefined
};

const priorities = {
    // The higher the priority, the earlier an event is ordered when
    // sorting events
    key: 2,
    meter: 1,
    default: 0
};

const temp = {};

function getPriority(event) {
    return priorities[event[1]] || priorities.default;
}

function byPriority(b, a) {
        // a is before b
    return a[0] < b[0] ? 1 :
        // a is after b
        a[0] > b[0] ? -1 :
        // a and b are at the same time, prioritise by event type
        getPriority(a) - getPriority(b) ;
}

function get0(object) {
    return object[0];
}

function getValue0(object) {
    return object.value[0];
}

function insertBy(by, array, object) {
    let n = -1;
    while (array[++n] && by(array[n]) <= by(object));
    array.splice(--n, 0, object);
    return n;
}

function getSequence(sequences, id) {
    return sequences.find((sequence) => sequence.id === id);
}

const types = {
    offset: (transforms, n, event) => {
        event[0] -= transforms[++n];
        return n;
    },

    rate: (transforms, n, event) => {
        event[0] /= transforms[++n];
        return n;
    },

    quantize: (transforms, n, event) => {
        // TODO: Quantise!
    },

    transpose: (transforms, n, event) => {
        switch (event[1]) {
            case "note":
            case "chord":
            case "key":
                event[2] += transforms[++n];
                break;
        }

        return n;
    }
};

function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}


export class SequenceIterator {
    constructor(sequence, beat = 0, duration = Infinity, transforms = nothing) {
        this.sequence   = sequence;
        this.beat       = beat;
        this.duration   = duration;
        this.transforms = transforms;

        // Set n to index before event falling on or after beat
        let n = -1, event;
        while ((event = sequence.events[++n]) && transform(this.transforms, assign(temp, event))[0] < 0);
        this.n = --n;
    }

    next() {
        const { buffer, sequence, n } = this;
        const event = sequence.events[n + 1];
        const value = event && transform(this.transforms, assign({ event, sequence }, event));

        let iterator;
        let i = 0, j = 0;
        let b = event ? value[0] : this.duration;
        let x;
        while (iterator = this[--i]) {
            if (!iterator.value) {
                if (iterator.next().value) transform(this.transforms, iterator.value);
                if (iterator.done) ++j;
            }

            if (iterator.value && iterator.value[0] < b) {
                x = iterator;
                b = iterator.value[0];
            }

            // If iterator is done remove it by reassigning remaining iterators
            if (j) this[i] = this[i - j];
        }

        if (x) {
            x.value[0] += this.beat;
            this.value = x.value;
            x.value = undefined;
            return this;
        }

        // We're out of events TODO: we may not be out of iterators??
        if (!value || this.duration <= value[0]) return assign(this, done);

        // Advance index and assign event as iterator.value
        this.n += 1;
        value[0] += this.beat;
        this.value = value;

        //
        if (isSequenceEvent(event)) {
            const sequences  = this.sequence.sequences;
            if (!sequences) return this;

            const sequence   = getSequence(sequences, event[2]);
            if (!sequence) return this;

            const transforms = event.slice(5);
            const iterator   = new SequenceIterator(sequence, value[0], value[4], transforms);

            // Add iterator (indexed as -n) directly to this
            let i = 0;
            while (this[--i]);
            this[i] = iterator;
        }

        // Return iterator
        return this;
    }

    [Symbol.iterator]() {
        return this;
    }
}

export default class Sequence {
    constructor(events, sequences = [], name = '') {
        this.name      = name;
        this.events    = events;
        this.sequences = sequences;
    }

    of(...events) {
        return new Sequence(events);
    }

    from(data) {
        return data.length ?
            new Sequence(data) :
            new Sequence(data.events, data.sequences, data.name) ;
    }

    [Symbol.iterator]() {
        return new SequenceIterator(this);
    }
}

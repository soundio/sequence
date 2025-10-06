
import get from 'fn/get.js';
import { toNoteNumber, toRootNumber } from 'midi/note.js';
import { isSequenceEvent } from './event.js';
import mod12 from './number/mod-12.js';

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

const get0 = get(0);

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
    displace: (transforms, n, event) => {
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
            case "note": {
                const number = typeof event[2] === 'string' ?
                    toNoteNumber(event[2]) :
                    event[2];

                event[2] = number + transforms[n + 1];
                break;
            }

            case "chord":
            case "key": {
                const number = typeof event[2] === 'string' ?
                    toRootNumber(event[2]) :
                    event[2];

                event[2] = mod12(number + transforms[n + 1]);
                break;
            }
        }

        return n + 1;
    }
};

function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}



export class SequenceIterator {
    constructor(events, sequences = nothing, beat = 0, duration = Infinity, transforms = nothing) {
        // Sort events
        events.sort(byPriority);

        this.events     = events,
        this.sequences  = sequences;
        this.beat       = beat;
        this.duration   = duration;
        this.transforms = transforms;

        // Set n to index before event falling on or after beat
        let n = -1, event;
        while ((event = events[++n]) && transform(this.transforms, assign(temp, event))[0] < 0);
        this.n = n - 1;
    }

    next() {
        const { buffer, events, sequences, n } = this;
        const event = events[n + 1];
        // TODO Make event property non-enumerable: use Event() constructor?
        const value = event && transform(this.transforms, assign({ event, events }, event));

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
            this.value = x.value;
            this.value[0] += this.beat;
            x.value = undefined;
            return this;
        }

        // We're out of events TODO: we may not be out of iterators??
        if (!value || this.duration <= value[0]) return assign(this, done);

        //
        if (isSequenceEvent(event)) {
            const sequences = this.sequences;
            const sequence  = getSequence(sequences, event[2]);
            if (!sequence) throw new Error('Sequence "' + event[2] + '" not found');

            const transforms = event.slice(5);
            const iterator   = new SequenceIterator(
                sequence.events,
                sequence.sequences ? sequence.sequences.concat(sequences) : sequences,
                value[0],
                value[4],
                transforms
            );

            // Add iterator (indexed as -n) directly to this
            let i = 0;
            while (this[--i]);
            this[i] = iterator;
        }

        // Advance index and assign event as iterator.value
        this.n += 1;
        this.value = value;
        this.value[0] += this.beat;

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
        return new SequenceIterator(this.events, this.sequences);
    }
}

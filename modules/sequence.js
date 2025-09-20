
import { isSequenceEvent } from './event.js';

const assign = Object.assign;

const priorities = {
    // The higher the priority, the earlier an event is ordered when
    // sorting events
    key: 2,
    meter: 1,
    default: 0
};

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

function getSequence(sequences, event) {
    return sequences.find((sequence) => sequence.id === event[2]);
}

function toBeat(transform, event) {
    return (event[0] - transform.startBeat) / transform.rate;
}


export default class SequenceIterator {
    constructor(sequence, location = 0, startBeat = 0, rate = 1) {
        if (rate <= 0) throw new Error('SequenceIterator may not be created with rate=' + rate);

        this.sequence  = sequence;
        this.location  = location;
        this.startBeat = startBeat;
        this.rate      = rate;
        this.buffer    = [];

        // Set this.n to index before first event on or after start beat
        let n = -1, event;
        while ((event = sequence.events[++n]) && toBeat(this, event) < startBeat);
        this.n = n - 1;
    }

    next(beat) {
        const { buffer, n } = this;
        const { events } = this.sequence;

        // Push any iterators not already in buffer into buffer if they have
        // next value
        let iterator;
        let i = 0;
        while ((iterator = this[--i]) && !buffer.includes(iterator)) if (iterator.next(beat).value) {
            // Keep buffer sorted by time
            insertBy(getValue0, buffer, iterator);
        }

        // If first iterator in buffer value falls before next event in events
        iterator = buffer[0];
        if (iterator
            && (!events[n + 1] || toBeat(this, iterator.value) < events[n + 1][0])
            && (beat === undefined || beat > toBeat(this, iterator.value))
        ) {

            // Remove iterator from buffer
            const event = buffer.shift().value;

            // Update beat to this context - WATCH OUT, this will change beat of iterator!! Is this problematic??
            // I don't think so because we dont inspect it again here, and we dont inspect it again inside the child,
            // do we?
            event[0] = this.location + toBeat(this, event);
            this.value = event;
            // Return this
            return this;
        }

        const event = events[++this.n];

        // We're out of events TODO: we may not be out of iterators!
        if (!event) {
            this.done  = true;
            this.value = undefined;
            return this;
        }

        // If beat is before this event beat - where beat is undefined this is false
        if (beat <= toBeat(this, event)) {
            --this.n;
            this.value = undefined;
            return this;
        }

        // Assign event as iterator.value
        this.value = assign({}, event, {
            0: this.location + toBeat(this, event),
            event
        });

        //
        if (isSequenceEvent(event)) {
            const { name, sequences } = this.sequence;
            const sequence = getSequence(sequences, event);

            if (!sequence) {
                console.warn('SequenceIterator: sequence with id "' + event[2] + '" not found in sequence "' + this.sequence.name + '"');
                return this;
            }

            const iterator = new SequenceIterator(sequence, event[0], event[3], event[4]);

            // Add iterator indexed as -n directly on this
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

export class Sequence {
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

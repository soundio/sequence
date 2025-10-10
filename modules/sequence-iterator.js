
import Event     from './event.js';
import transform from './transform.js';

const assign = Object.assign;

const nothing = [];

const done = {
    done: true,
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

function insertBy(by, array, object) {
    let n = -1;
    while (array[++n] && by(array[n]) <= by(object));
    array.splice(--n, 0, object);
    return n;
}

function getSequence(sequences, id) {
    return sequences.find((sequence) => sequence.id === id);
}

export default class SequenceIterator {
    constructor(events, sequences = nothing, transforms = nothing) {
        // Sort events by beat and type
        events.sort(byPriority);

        // Assign properties
        this.events     = events,
        this.sequences  = sequences;
        this.transforms = transforms;

        // Set n to index before event falling on or after beat
        let n = -1, event;
        while ((event = events[++n]) && transform(transforms, assign(temp, event))[0] < 0);
        this.n = n - 1;
    }

    next() {
        const { events, sequences, transforms, n } = this;
        const event = events[n + 1];
        const value = event && transform(transforms, Event.from(event, events, n + 1));

        let iterator;
        let i = -1, j = 0;
        let b = value ? value[0] : Infinity ;
        let x;
        while (iterator = this[++i]) {
            if (!iterator.value) {
                if (iterator.next().value) {
                    transform(this.transforms, iterator.value);
                    // Add stored startBeat
                    iterator.value[0] += iterator.startBeat;
                    iterator.value.target = iterator.target;
                }

                // Mark iterator for removal
                if (iterator.done || iterator.value[0] >= iterator.stopBeat) ++j;
            }

            if (iterator.value && iterator.value[0] < iterator.stopBeat && iterator.value[0] < b) {
                x = iterator;
                b = iterator.value[0];
            }

            // If iterator is done remove it by reassigning remaining iterators
            if (j) this[i] = this[i + j];
        }

        if (x) {
            // Make this iterator value the child iterator's transformed value
            this.value = x.value;
            // Mark child iterator as consumed
            x.value = undefined;
            return this;
        }

        // We're out of events TODO: we may not be out of iterators??
        if (!value) return assign(this, done);

        // Advance index and assign event as this.value
        this.n += 1;
        this.value = value;

        // If it is a sequence event spawn a new iterator
        if (Event.isSequenceEvent(event)) {
            const sequences = this.sequences;
            const sequence  = getSequence(sequences, event[2]);
            if (!sequence) throw new Error('Sequence id "' + event[2] + '" not found');

            const iterator = new SequenceIterator(
                sequence.events,
                // Join parent sequences to sequences
                sequence.sequences ?
                    sequence.sequences.concat(sequences) :
                    sequences ,
                // Transforms
                event.slice(5)
            );

            // Store info about the event on the iterator object
            iterator.startBeat = value[0];
            iterator.stopBeat  = value[0] + value[4];
            iterator.target    = value[3];

            // Add iterator (indexed as -n) directly to this
            let i = -1;
            while (this[++i]);
            this[i] = iterator;
        }

        // Return iterator
        return this;
    }

    static from(sequence) {
        return new SequenceIterator(sequence.events, sequence.sequences);
    }

    [Symbol.iterator]() {
        return this;
    }
}


import get        from 'fn/get.js';
import Event      from './event.js';
import Transform  from './transform.js';
import byPriority from './events/by-priority.js';


const assign = Object.assign;

const nothing = [];

const done = {
    done: true,
    value: undefined
};

function getSequence(sequences, id) {
    return sequences.find((sequence) => sequence.id === id);
}

export default class SequenceIterator extends Iterator {
    constructor(events, sequences = nothing, transform = Transform.identity) {
        super();

        // Sort events by beat and type
        events.sort(byPriority);

        // Assign properties
        this.events    = events,
        this.sequences = sequences;
        this.transform = transform;

        // Set n to index before first event falling on or after beat
        let n = -1, event;
        while ((event = events[++n]) && transform.apply(Event.from(event))[0] < 0);
        this.n = n - 1;
    }

    next() {
        const { events, transform, n } = this;
        const event = events[n + 1];

        let value;

        if (event) {
            value = transform.apply(Event.from(event));
            value.events = events;
            value.event = event;
        }

        //const value = event && transform(transforms, Event.from(event/*, n + 1, events*/));

        let iterator;
        let i = -1, j = 0;
        let b = value ? value[0] : Infinity ;
        let x;
        while (iterator = this[++i]) {
            let value = iterator.value;

            if (!value) {
                // Get next value from iterator and transform it for current context
                if (value = iterator.next().value) {
                    transform.apply(value);
                    value[0] += iterator.startBeat;
                    value.target = (value.target || 0) + iterator.target;
                }

                // If done or beyond stop beat, mark iterator for removal
                if (iterator.done || value[0] >= iterator.stopBeat) ++j;
            }

            // Select iterator/value with earliest beat
            if (value && value[0] < iterator.stopBeat && value[0] < b) {
                x = iterator;
                b = value[0];
            }

            // Remove marked iterators by reassigning remaining iterators
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
        if (Event.isSequence(event)) {
            const sequences = this.sequences;
            const sequence  = getSequence(sequences, event[2]);
            if (!sequence) throw new Error(`Sequence id ${ typeof event[2] === 'string' ? `"${ event[2] }"` : event[2] } not found in sequences ids ${ sequences.map(get('id')) }`);

            const iterator = new SequenceIterator(
                sequence.events,
                // Join parent sequences to sequences
                sequence.sequences ?
                    sequence.sequences.concat(sequences) :
                    sequences ,
                // Transform
                event.transform
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

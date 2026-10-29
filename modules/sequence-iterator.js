
import get                from 'fn/get.js';
import Event              from './event.js';
import Transform          from './transform.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import byPriority         from './events/by-priority.js';
import { CURVES }   from './event/curves.js';


const DEBUG   = globalThis.DEBUG;
const assign  = Object.assign;
const nothing = [];
const done = {
    done: true,
    value: undefined
};


function getSequence(sequences, id) {
    return sequences.find((sequence) => sequence.id === id);
}

function intoIdMap(object, item) {
    object[item.id] = item;
    return object;
}

function readRateEvents(rates, events) {
//    // Read last rate event
//    const br = rates[rates.length - 4];
//
//    // Get event location
//    let location = sequencer.locationAtBeat(br);
//    let type;
//
//    // If it was before the end of this frame
//    if (location < l2) {
//        // Advance n past it
//        i = i - Events.SIZE;
//        while (events[i += Events.SIZE] < br || (events[i] === br && !Event.isRate(events, i)));

        // Read rate events into rates
        let n = -1, event;
        while (event = events[++n]) {
            // Ignore non-rate events
            if (!Event.isRate(event)) continue;

            // Read rate event into rates and get location at beat, re-route to set
            rates.push(event[0], event[2], event[3], event[4] || 0);
//            location = sequencer.locationAtBeat(events[i]);
//
//            // Rate event is beyond end of frame
//            if (l2 < location) {
//                // If event is not a ramp truncate rates back down
//                if (type !== CURVES.linear && type !== CURVES.exponential) rates.length -= 4;
//                // Make like a tree (and get out of here)
//                break;
//            }
        }
//    }

    return rates;
}

/**
SequenceIterator(events, sequences, transform, parent = null, trigger = null)
**/

export default class SequenceIterator extends Iterator {
    // Rates are represented as a flat array of 4-number param events
    #rates = [0, CURVES.step, 1, 0];

    startBeat = 0;
    stopBeat  = Infinity;

    constructor(sequence, transform = Transform.identity, startBeat = 0, stopBeat = Infinity, sequences = nothing, objects) {
        const { events } = sequence;

        super();

console.log('new Iterator()', sequence.events.length, sequences && sequences.length, '------------------------');
        //if (DEBUG && !(transform instanceof Transform)) throw new TypeError(`SequenceIterator() transform must be an instance of Transform`);

        // Sort events by beat and type
        events.sort(byPriority);

        // Sequence object being iterated
        this.sequence = sequence;
        // Events array to iterate over
        this.events = events;
        // Transform that mutates playback events
        this.transform = transform;
        // Beat this sequence starts
        this.startBeat = startBeat;
        // Beat this iterator stops
        this.stopBeat = stopBeat;
        // Sequence library for lookups
        this.sequences = sequence.sequences ?
            sequence.sequences.concat(sequences) :
            sequences ;
        // Target objects
        this.objects = sequence.objects ?
            sequence.objects.reduce(intoIdMap, {}) :
            objects ;

        // Read rate events into #rates automation array
        readRateEvents(this.#rates, events)

        // Set n to index before first event falling on or after beat 0
        let n = -1, event;
        while ((event = events[++n]) && transform.apply(Event.from(event))[0] < 0);
        this.n = n - 1;
    }

    next() {
        const { sequence, events, objects, transform, n } = this;
        const event = events[n + 1];

        let value;

        if (event) {
            value = Event.from(event);
//console.log(1, value);
            // Modify event by sequence's rate events
            value[0] = locationAtBeat(this.#rates, value[0]);
//console.log(2, value);
            // Modify event by sequence event's transforms
            value = transform.apply(value);
//console.log(3, value);
            // Modify event sequence event's start beat
            value[0] += this.startBeat;
//console.log(4, value);
            // Keep some internal data
            value.sequence = sequence;
            value.events   = events;
            value.event    = event;
//            value.sequencer = this;
        }

        //const value = event && transform(transforms, Event.from(event/*, n + 1, events*/));

        let iterator;
        let i = -1, j = 0;
        let b = value ? value[0] : Infinity ;
        let x;
        while (iterator = this[++i]) {
            let value = iterator.value;
            const stopBeat = this.startBeat + iterator.stopBeat;

            if (!value) {
                // Get next value from iterator and transform it for current context
                if (value = iterator.next().value) {
                    // Modify event by sequence's rate events
                    value[0] = locationAtBeat(this.#rates, value[0]);
                    // Modify event by sequence event's transforms
                    transform.apply(value);
                    // Modify event sequence event's start beat
                    value[0] += this.startBeat;
                    // Modify target destination
//                    value.target = (value.target || 0) + iterator.target;
                    // Assign target object
                    if (iterator.target) value.object = objects[iterator.target];
                }

                // If done or beyond stop beat, mark iterator for removal
                if (iterator.done || value[0] >= stopBeat) ++j;
            }

            // Select iterator/value with earliest beat
            if (value && value[0] < stopBeat && value[0] < b) {
                x = iterator;
                b = value[0];
            }

            // Remove marked iterators by reassigning remaining iterators on this
            if (j) this[i] = this[i + j];
        }

        if (x) {
            // Make this iterator value the child iterator's transformed value
            this.value = x.value;
            // Mark child iterator as consumed
            x.value = undefined;
            // Return this as next object
            return this;
        }

        // We're out of events TODO: we may not be out of iterators??
        if (!value) return assign(this, done);

        // Advance index and assign event as this.value
        this.n += 1;
        this.value = value;

        // If it is a sequence event spawn a new iterator
        if (Event.isSequence(event)) {
            // Find sequence
            const sequences = this.sequences;
            const sequence = getSequence(sequences, event[2]);
            if (!sequence) throw new Error(`Sequence id ${ typeof event[2] === 'string' ? `"${ event[2] }"` : event[2] } not found in sequences ids ${ sequences.map(get('id')) }`);
            // Create iterator
            const iterator = new SequenceIterator(
                sequence,
                // Transform
                event.transform,
                // Start beat
                event[0],
                // Stop beat
                event[0] + event[4],
                // Reference to sequences
                this.sequences,
                // Reference to objects map
                this.objects
            );
            // Store info about the event on the iterator object
            iterator.target = value[3];
            // Add iterator (indexed as -n) directly to this
            let i = -1;
            while (this[++i]);
            this[i] = iterator;
        }

        // Return iterator, as it has the required { value, done } structure
        return this;
    }

    beatAtLocation(location) {
        return beatAtLocation(this.#rates, location - this.startLocation);
    }

    locationAtBeat(beat) {
        return this.startLocation + locationAtBeat(this.#rates, beat)
    }

    static from(sequence) {
        return new SequenceIterator(sequence.events, sequence.sequences);
    }

    [Symbol.iterator]() {
        return this;
    }
}

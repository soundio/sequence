
import get        from 'fn/get.js';
import matches    from 'fn/matches.js';
import Event      from './event.js';
import Transform  from './transform.js';
import { beatAtLocation, locationAtBeatWithCursor, rateAtBeatOfValues } from './location.js';
import byPriority from './events/by-priority.js';
import { CURVES } from './event/curves.js';


const DEBUG   = globalThis.DEBUG;
const assign  = Object.assign;
const nothing = [];
const done = {
    done: true,
    value: undefined
};

const getId = get('id');

function getSequence(sequences, id) {
    return sequences.find(matches({ id }));
}

function readRateEvents(rates, events) {
    // Track previous segment state and running rate v0 at b0
    let [b0, c0, v0, d0] = rates;
    let n = -1;
    let event;
    while (event = events[++n]) {
        if (!Event.isRate(event)) continue;

        const b1 = event[0];
        const c1 = event[2];
        const d1 = event[4] || 0;
        const v1 = c0 === CURVES.target ?
            rates[rates.length - 2] :
            event[3] ;

        // Running rate arriving at b1 from [b0, b1]
        const v = rateAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, b1 - b0);

        // A hold event freezes the running rate as a step event at b1
        const curve = c1 === CURVES.hold ? CURVES.step : c1;
        const value = c1 === CURVES.hold ? v : event[3];

        // Overwrite initial/previous event if at the same beat (unless starting a target curve)
        if (b1 === b0 && curve !== CURVES.target) {
            rates[rates.length - 3] = curve;
            rates[rates.length - 2] = value;
            rates[rates.length - 1] = d1;
        }
        else {
            // If transitioning directly from one target curve to another,
            // insert the arrival rate as a step so the next target has its
            // starting rate in rates
            if (c0 === CURVES.target && curve === CURVES.target) {
                rates.push(b1, CURVES.step, v, 0);
            }
            rates.push(b1, curve, value, d1);
        }

        b0 = b1;
        c0 = curve;
        v0 = curve === CURVES.target ? v : value;
        d0 = d1;
    }

    return rates;
}

function applyTransform(rates, cursor, startBeat, transform, event) {
    // Find location after rates transforms
    const location = locationAtBeatWithCursor(rates, event[0], cursor);
    if (event.duration && !Event.isMeter(event)) {
        event.duration = locationAtBeatWithCursor(rates, event[0] + event.duration, cursor) - location;
    }
    // Apply location as beat
    event[0] = location;
    // Modify event by sequence event's transforms
    event = transform.apply(event);
    // Modify event sequence event's start beat
    event[0] += startBeat;

    return event;
}

/**
SequenceIterator(events, sequences, transform, parent = null, trigger = null)
**/

export default class SequenceIterator extends Iterator {
    // Rates are represented as a flat array of 4-number param events
    #rates = [0, CURVES.step, 1, 0];
    // Cursor for lookups along #rates used by locationAtBeat()
    #cursor = {};
    // Cached next transformed event from this sequence's own events array
    #next;

    startBeat = 0;
    stopBeat  = Infinity;

    constructor(sequence, transform = Transform.identity, startBeat = 0, stopBeat = Infinity, sequences = nothing, settings = {}) {
        const { events } = sequence;

        super();

        if (DEBUG && !transform.apply) throw new TypeError(`SequenceIterator() object transform has no method .apply(object)`);

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

        // Read rate events into #rates automation array
        if (!settings.outputInBeats) readRateEvents(this.#rates, events)

        // Set n to index before first event falling on or after beat 0
        let n = -1, event;
        while ((event = events[++n]) && transform.apply(Event.from(event))[0] < 0);
        this.n = n - 1;
    }

    next() {
        const { sequence, events, n } = this;

        let value = this.#next;
        if (!value) {
            const event = events[n + 1];
            if (event) {
                //value = this.#transform(Event.from(event));
                value = applyTransform(this.#rates, this.#cursor, this.startBeat, this.transform, Event.from(event));
                // Keep some internal data
                value.sequence = sequence;
                value.events   = events;
                value.event    = event;
                // Cache transformed event
                this.#next = value;
            }
        }

        let iterator;
        let i = -1, j = 0;
        let b = value ? value[0] : Infinity ;
        let x;
        while (iterator = this[++i]) {
            let value = iterator.value;
            const stopBeat = Math.min(this.stopBeat, this.startBeat + iterator.stopBeat);

            if (!value) {
                // Get next value from iterator and transform it for current context
                if (value = iterator.next().value) {
                    //this.#transform(value);
                    value = applyTransform(this.#rates, this.#cursor, this.startBeat, this.transform, value);
                    // Modify target destination
                    if (iterator.target !== undefined) {
                        value.target = typeof value.target === 'number' && typeof iterator.target === 'number' ?
                            value.target + iterator.target :
                            iterator.target ;
                    }
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
        if (!value || value[0] >= this.stopBeat) {
            this.#next = undefined;
            return assign(this, done);
        }

        // Advance index, consume cached next event, and assign event as this.value
        this.n += 1;
        this.#next = undefined;
        this.value = value;

        // If it is a sequence event spawn a new iterator
        const event = value.event;
        if (Event.isSequence(event)) {
            // Find sequence
            const sequences = this.sequences;
            const sequence = getSequence(sequences, event[2]);
            // Check for problems
            if (!sequence) throw new Error(`Sequence${ this.sequence.id ? ' #' + this.sequence.id : '' } event ${ n } (${ value }) sequence #${ event[2] } not found in sequence.sequences (${ sequences.map(getId) })`);
            // Create child iterator
            const iterator = new SequenceIterator(
                sequence,
                // Transform
                event.transform,
                // Start beat
                event[0],
                // Stop beat
                event[0] + event[4],
                // Reference to sequences
                sequences
            );
            // Store info about the event on the iterator object
            iterator.target = value[3];
            // Add iterator (indexed as -n) directly to this
            let i = -1;
            while (this[++i]);
            this[i] = iterator;
        }

        // Cheekily return iterator, as it has the required { value, done }
        // structure but be aware that it is not an immutable object
        return this;
    }

    beatAtLocation(location) {
        return beatAtLocation(this.#rates, location - this.startLocation);
    }

    locationAtBeat(beat) {
        return this.startLocation + locationAtBeat(this.#rates, beat, this.#cursor);
    }

    static from(sequence) {
        return new SequenceIterator(sequence.events, sequence.sequences);
    }

    [Symbol.iterator]() {
        return this;
    }
}

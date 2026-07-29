
import get     from 'fn/get.js';
import matches from 'fn/matches.js';
import { toNoteNumber } from 'midi/note.js';
import SequenceIterator from './sequence-iterator.js';
import Event     from './event.js';
import insert    from './events/insert.js';


const assign = Object.assign;


function setEventsProperty(event, _n, events) {
    event.events = events;
}

function generateUnique(values) {
    let value = 0;
    while (values.indexOf(++value) !== -1);
    return value;
}

export default class Sequence {
    constructor(events, sequences) {
        this.events = events.map(Event.from);
        this.events.forEach(setEventsProperty);
        if (sequences) this.sequences = sequences.map(Sequence.from);
    }

    add(event) {
        // Validate event TODO: improve validation
        if (!Event.isValid(event)) {
            throw new Error(`Sequence.add() cannot add invalid ${ event.constructor.name } ${ JSON.stringify(event.toJSON) }`);
        }

        // Enforce sequence rules
        switch (event[1]) {
            // No overlapping chords or text
            case Event.TYPES.chord:
            case Event.TYPES.text: {
                // Find previous event of same type
                let n = -1, prev;
                while (this.events[++n] && this.events[n][0] <= event[0]) {
                    if (this.events[n].constructor === event.constructor) {
                        prev = this.events[n];
                    }
                }
                // Existing event on same beat, remove it
                if (prev && prev[0] === event[0]) {
                    prev.remove();
                }
                // If overlapping event found truncate it
                else if (prev && prev[0] + prev.duration > event[0]) {
                    prev.duration = event[0] - prev[0];
                }
                // Find next event of type
                --n;
                while (this.events[++n] && this.events[n].constructor !== event.constructor);
                const next = this.events[n];
                // If event overlaps next event truncate it
                if (next && event[0] + event.duration > next[0]) {
                    event.duration = next[0] - event[0];
                }
                break;
            }

            // Sequence events should refer to sequences that actually exist
            case Event.TYPES.sequence: {
                if (!this.get(event.identifier)) {
                    console.warn('Added SequenceEvent refers to sequence not in sequences');
                }
                break;
            }
        }

        event.events = this.events;
        insert(this.events, event);
        return this;
    }

    create() {
        const event = Event.from(arguments);
        this.add(event);
        return event;
    }

    createEvent() {
        const event = Event.from(arguments);
        this.add(event);
        return event;
    }

    delete(beat, type) {
        if (type === 'note' && arguments[2] !== undefined) {
            arguments[2] = toNoteNumber(arguments[2]);
        }

        const i = this.events.findIndex(matches(arguments));
        if (i > -1) this.events.splice(i, 1);
        return this;
    }

    find(object) {
        return typeof object === 'object' ?
            // Allow find by object keys
            this.events.find(matches(object)) :
            // Allow find by argument values
            this.events.find(matches(arguments)) ;
    }

    get(id) {
        return this.sequences && this.sequences.find(matches({ id }));
    }

    createSequence(object) {
        const sequence = Sequence.from(object);
        this.addSequence(sequence);
        return sequence;
    }

    addSequence(sequence) {
        // Validate event TODO: improve validation
        if (!(sequence instanceof Sequence)) {
            throw new Error(`Sequence.addSequence() cannot add ${ event.constructor.name } ${ JSON.stringify(event.toJSON) }`);
        }

        const sequences = this.sequences || (this.sequences = []);
        const ids = sequences.map(get('id'));

        if (!sequence.id || ids.includes(sequence.id)) {
            sequence.id = generateUnique(ids);
        }

        sequences.push(sequence);
        return sequence;
    }

    getSequence(id) {
        return this.sequences && this.sequences.find(matches({ id }));
    }

    splice(b1, b2) {
        // Find index of event at b1
        let i1 = -1;
        while (this.events[++i1] && this.events[i1][0] < b1);
        // Find index of event at b2
        let i2 = i1 - 1;
        if (b2) { while (this.events[++i2] && this.events[i2][0] < b2); }
        else    { i2 = this.events.length; }
        // Make new sequence from spliced events
        const name   = this.name;
        const events = this.events.splice(i1, i2);
        // Retime events to start beat of new sequence
        let n = -1;
        while (events[++n]) events[n][0] -= b1;
        // Note we don't copy this sequence's id
        return Sequence.from({ name, events });
    }

    select(beat, type) {
        return this.events.filter((event) => (
            typeof beat === 'number' ?
                event[0] === beat :
                event[0] >= beat.min && event[0] < beat.max
        ) && (
            typeof type === 'string' ?
                event.type === type :
                type.includes(event.type)
        ));
    }

    static of(...events) {
        return new Sequence(events);
    }

    static from(data) {
        const { events, sequences, ...props } = data;
        return data.length ?
            new Sequence(data) :
            assign(new Sequence(events, sequences), props) ;
    }

    [Symbol.iterator]() {
        return new SequenceIterator(this.events, this.sequences);
    }
}

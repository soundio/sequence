
import matches from 'fn/matches.js';
import { toNoteNumber } from 'midi/note.js';
import SequenceIterator, { insert } from './sequence-iterator.js';
import Event     from './event.js';


const assign = Object.assign;


function toJSON(object) {
    return object.toJSON();
}

function toPriority(event) {
    return event[0] + '|' + priority(event);
}

function setEvents(event, n, events) {
    event.events = events;
}

export default class Sequence {
    constructor(events, sequences) {
        this.events = events.map(Event.from);
        this.events.forEach(setEvents);
        if (sequences) this.sequences = sequences.map(Sequence.from);
    }

    add(event) {
        // Validate event TODO: improve validation
        if (!Event.isValid(event)) {
            throw new Error(`Sequence.add() cannot add invalid ${ event.constructor.name } ${ JSON.stringify(event.toJSON) }`);
        }

        // Enforce sequence rules
        switch (event[1]) {
            // No overlapping chords
            case Event.TYPES.chord: {
                // Find previous chord
                let n = -1, chord;
                while (this.events[++n] && this.events[n][0] <= event[0]) {
                    if (Event.isChord(this.events[n])) chord = this.events[n];
                }
                // Existing chord on same beat, remove it
                if (chord && chord[0] === event[0]) {
                    chord.remove();
                    break;
                }
                // If overlapping chord found truncate it
                if (chord && chord[0] + chord[4] > event[0]) {
                    chord[4] = event[0] - chord[0];
                }
                // Find next chord
                --n;
                while (this.events[++n] && !Event.isChord(this.events[n]));
                // If event overlaps next chord truncate it
                if (chord && event[0] + event[4] > chord[0]) {
                    event[4] = chord[0] - event[0];
                }
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

    delete(beat, type) {
        if (type === 'note' && arguments[2] !== undefined) {
            arguments[2] = toNoteNumber(arguments[2]);
        }

        const i = this.events.findIndex(matches(arguments));
        if (i > -1) this.events.splice(i, 1);
        return this;
    }

    find(beat, type) {
        if (type === 'note' && arguments[2] !== undefined) {
            arguments[2] = toNoteNumber(arguments[2]);
        }

        return this.events.find(matches(arguments));
    }

    get(id) {
        return this.sequences && this.sequences.find(matches({ id }));
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

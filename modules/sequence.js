
import matches from 'fn/matches.js';
import { toNoteNumber } from 'midi/note.js';
import SequenceIterator, { insert } from './sequence-iterator.js';
import Event  from './event.js';

function toPriority(event) {
    return event[0] + '|' + priority(event);
}

export default class Sequence {
    constructor(events, sequences = [], name = '') {
        this.name      = name;
        this.events    = events;
        this.sequences = sequences;
    }

    create() {
        const event = new Event(...arguments);
        insert(this.events, event);
        return event;
    }

    delete(beat, type, $2) {
        const i = this.events.findIndex(matches({ 0: beat, 1: type, 2: toNoteNumber($2) }));
        if (i > -1) this.events.splice(i, 1);
        return this;
    }

    find(beat, type, $2) {
        return this.events.find(matches({ 0: beat, 1: type, 2: toNoteNumber($2) }));
    }

    select(beat, type) {
        return this.events.filter(matches({ 0: beat, 1: type }));
    }

    static of(...events) {
        return new Sequence(events);
    }

    static from(data) {
        return data.length ?
            new Sequence(data) :
            new Sequence(data.events, data.sequences, data.name) ;
    }

    [Symbol.iterator]() {
        return new SequenceIterator(this.events, this.sequences);
    }
}

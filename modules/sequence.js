
import matches from 'fn/matches.js';
import { toNoteNumber } from 'midi/note.js';
import SequenceIterator, { insert } from './sequence-iterator.js';
import Event  from './event.js';

const assign = Object.assign;

function toPriority(event) {
    return event[0] + '|' + priority(event);
}

export default class Sequence {
    constructor(events, sequences) {
        this.events    = events;
        if (sequences) this.sequences = sequences.map(Sequence.from);
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

    get(id) {
        return this.sequences && this.sequences.find(matches({ id }));
    }

    select(beat, type) {
        return this.events.filter(matches({ 0: beat, 1: type }));
    }

    compress() {

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

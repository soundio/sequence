
import SequenceIterator from './sequence-iterator.js';

export default class Sequence {
    constructor(events, sequences = [], name = '') {
        this.name      = name;
        this.events    = events;
        this.sequences = sequences;
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


import dB from 'fn/to-db.js';
import { toNoteName, toNoteNumber } from 'midi/note.js';
import parseGain from '../parse/parse-gain.js';
import Event from './event.js';


const { fround } = Math;
const define = Object.defineProperties;


export default class NoteEvent extends Event {
    static of(beat, name, gain, duration) {
        return new NoteEvent({ beat, name, gain, duration });
    }

    [1] = Event.TYPES.note;

    get name()           { return toNoteName(this.number); }
    set name(name)       { this.number = name; }
    get number()         { return this[2]; }
    set number(number)   { this[2] = toNoteNumber(number); }
    get gain() {
        // Crudely deal with rounding errors to get nice dB strings from Float32
        return dB(this[3]).toFixed(5).replace(/\.?[0]+$/, '') + 'dB';
    }
    set gain(value)      { this[3] = fround(parseGain(value)); }
    get duration()       { return this[4]; }
    set duration(number) { this[4] = parseFloat(number); }

    transpose(n) {
        this[2] = this[2] + parseFloat(n);
        return this;
    }

    toString() {
        return `${ super.toString() } ${ this.name } ${ this.gain } ${ this.duration }`;
    }
}

define(NoteEvent.prototype, {
    type: { value: 'note' }
});

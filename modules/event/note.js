

import { toNoteName, toNoteNumber } from 'midi/note.js';
import parseGain from '../parse/parse-gain.js';
import Event from './event.js';


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
    get gain()           { return this[3]; }
    set gain(name)       { this[3] = parseGain(name); }
    get duration()       { return this[4]; }
    set duration(number) { this[4] = parseFloat(number); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3]  + ' ' + this[4];
    }
}

define(NoteEvent.prototype, {
    type: { value: 'note' }
});

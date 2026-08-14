
import dB from 'fn/to-db.js';
import { toDrumName, toNoteName, toNoteNumber } from 'midi/note.js';
import parseGain from '../parse/parse-gain.js';
import { packAddress }  from './address.js';
import Event from './event.js';


const { fround } = Math;
const define     = Object.defineProperties;
const rnotename  = /^([A-G][♭♯#b]?)(-?\d)$/;


export default class NoteEvent extends Event {
    static of(beat, pitch, gain, duration) {
        return new NoteEvent({ beat, pitch, gain, duration });
    }

    [1] = packAddress(0, Event.TYPES.note, Event.CURVES.step);

    get name() {
        console.trace('Deprecated noteEvent.name now noteEvent.pitch');
        return this.pitch;
    }

    set name(name) {
        console.trace('Deprecated noteEvent.name now noteEvent.pitch');
        this.pitch = name;
    }

    get pitch() {
        return this.isDrumNote ?
            toDrumName(this.number) :
            toNoteName(this.number) ;
    }

    set pitch(pitch) {
        this.isDrumNote = !rnotename.test(pitch);
        this.number = pitch;
    }

    get number() {
        return this[2];
    }

    set number(number) {
        this[2] = toNoteNumber(number);
    }

    get gain() {
        // Crudely deal with rounding errors to get nice dB strings from Float32
        return dB(this[3]).toFixed(5).replace(/\.?[0]+$/, '') + 'dB';
    }

    set gain(value) {
        this[3] = fround(parseGain(value));
    }

    get duration() {
        return this[4];
    }

    set duration(number) {
        this[4] = parseFloat(number);
    }

    transpose(n) {
        if (!this.isDrumNote) this[2] += parseFloat(n);
        return this;
    }

    toString() {
        return `${ super.toString() } ${ this.pitch } ${ this.gain } ${ this.duration }`;
    }
}

define(NoteEvent.prototype, {
    type: { value: 'note' }
});

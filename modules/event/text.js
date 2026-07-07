
import Event from './event.js';


const define = Object.defineProperties;

class TextEvent extends Event {
    constructor(beat) {
        super(beat);
    }

    get string()         { return ''; }
    set string(name)     { console.log('TODO convert string to binary'); }
    get duration()       { return this[3]; }
    set duration(number) { this[3] = parseFloat(number); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(TextEvent.prototype, {
    1:    { value: Event.TYPENUMBERS.text, enumerable: true }
    type: { value: 'text' }
});

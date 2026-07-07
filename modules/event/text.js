
import Event from './event.js';


const define = Object.defineProperties;

/**
Calculate byte length for a text event including string
**/
export function getTextEventLength(event) {
    const string = event[2];
    const encoded = new TextEncoder().encode(string);
    return EVENT_BASE_LENGTHS.text + encoded.length;
}


class TextEvent extends Event {
    constructor(beat, _type, string, duration) {
        super(beat);
        this.string   = string;
        this.duration = duration;
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
    1:    { value: Event.TYPENUMBERS.text, enumerable: true },
    type: { value: 'text' }
});

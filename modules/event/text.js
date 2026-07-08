
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


export default class TextEvent extends Event {
    static of(beat, text, duration) {
        return new TextEvent({ beat, text, duration });
    }

    [1] = Event.TYPENUMBERS.text;

    get text()           { return ''; }
    set text(name)       { console.log('TODO convert string to binary'); }
    get duration()       { return this[3]; }
    set duration(number) { this[3] = parseFloat(number); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(TextEvent.prototype, {
    type: { value: 'text' }
});

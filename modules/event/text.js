
import Event from './event.js';

// Maximum string bytes for text events
// length field stores string bytes only (0-255)
export const MAX_TEXT_BYTES = 255;

const define = Object.defineProperties;

export default class TextEvent extends Event {
    static of(beat, duration, text) {
        return new TextEvent({ beat, duration, text });
    }

    [1] = Event.TYPES.text;

    get duration()       { return this[2]; }
    set duration(number) { this[2] = parseFloat(number); }
    get text()           { return this[3]; }
    set text(string)     { this[3] = string + ''; }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(TextEvent.prototype, {
    type: { value: 'text' }
});

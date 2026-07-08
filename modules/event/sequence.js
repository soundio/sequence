
import Event from './event.js';
import { toTransformName, TRANSFORMNUMBERS, TRANSFORMNAMES, TRANSFORMLENGTHS } from './transforms.js';


const define = Object.defineProperties;

/**
Calculate byte length for a sequence event including transforms
**/
export function getSequenceEventLength(event) {
    let length = EVENT_BASE_LENGTHS.sequence;

    // Transforms start at index 5: [beat, "sequence", id, target, duration, transform1, param1, ...]
    for (let i = 5; i < event.length; ) {
        const transformType = event[i];
        const paramCount = TRANSFORM_PARAM_COUNTS[transformType] || 0;

        // type(1) + paramCount(1) + params(4 * paramCount)
        length += 2 + (paramCount * 4);

        // Move to next transform
        i += 1 + paramCount;
    }

    return length;
}


export default class SequenceEvent extends Event {
    static of(beat, id, TARGET, duration, ...transforms) {
        return new SequenceEvent({ beat, id, TARGET, duration, transforms });
    }

    [1] = Event.TYPENUMBERS.sequence;

    get id()               { return this[2]; }
    set id(number)         { this[2] = parseInt(number); }
    get TARGET()           { return this[3]; }
    set TARGET(name)       { this[3] = name; }
    get duration()         { return this[4]; }
    set duration(number)   { this[4] = parseFloat(number); }

    get transforms()       {
        const array = [];
        let n = 4;
        while(this[++n] !== undefined) {
            const name = TRANSFORMNAMES[this[n]];
            array.push(name);
            let m = TRANSFORMLENGTHS[this[n]];
            while (m--) array.push(this[++n]);
        }
        return array;
    }

    set transforms(array) {
        // Split string by spaces and/or commas
        if (typeof array === 'string') array = array.split(rcommaspace);
        let n = -1;
        while(array[++n] !== undefined) {
            // Get transform number for looking up parameter count
            const name   = toTransformName(array[n]);
            const number = TRANSFORMNUMBERS[name];
            this[n + 5] = number;
            // Copy transform parameters without conversion
            let m = TRANSFORMLENGTHS[number];
            while (m--) {
                ++n;
                this[n + 5] = array[n] || 0;
            }
        }
    }
}

define(SequenceEvent.prototype, {
    type: { value: 'sequence' }
});

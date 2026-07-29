
import Event     from './event.js';
import Transform from '../transform.js';


const define = Object.defineProperties;
const { TRANSFORMLENGTHS } = Transform;

/**
Calculate byte length for a sequence event including transforms
**/
export function getSequenceEventLength(event) {
    let length = EVENT_BASE_LENGTHS.sequence;

    // Transforms start at index 5: [beat, "sequence", identifier, address, duration, transform1, param1, ...]
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

// Hackaround - cant set #private members before super() is complete
const $transform = Symbol('transform');

export default class SequenceEvent extends Event {
    [$transform] = null;

    constructor(object) {
        super(object);
        // Validate event
        if (!this.identifier) throw new Error(`SequenceEvent() bad id ${ this.identifier }`);
        if (!this.TARGET && this.TARGET !== 0) throw new Error(`SequenceEvent() bad TARGET ${ this.TARGET }`);
        if (!this.duration) throw new Error(`SequenceEvent() bad duration ${ this.duration }`);
    }

    static of(beat, identifier, TARGET, duration, ...transforms) {
        return new SequenceEvent({ beat, identifier, TARGET, duration, transforms });
    }

    [1] = Event.TYPES.sequence;

    get id()               { console.trace('GET id deprecated, now GET identifier'); return this[2]; }
    set id(number)         { console.trace('SET id deprecated, now SET identifier'); this[2] = parseInt(number); }
    get identifier()       { return this[2]; }
    set identifier(number) { this[2] = parseInt(number); }
    get TARGET()           { return this[3]; }
    set TARGET(name)       { this[3] = name; }
    get duration()         { return this[4]; }
    set duration(number)   { this[4] = parseFloat(number); }

    get transform() {
        if (!this[$transform]) this[$transform] = Transform.from(this, 5);
        return this[$transform];
    }

    get transforms() {
        if (!this[$transform]) this[$transform] = Transform.from(this, 5);
        return this[$transform].toJSON();
    }

    set transforms(array) {
        // Split string by spaces and/or commas
        if (typeof array === 'string') array = array.split(rcommaspace);
        let n = -1;
        while(array[++n] !== undefined) {
            // Get transform number for looking up parameter count
            const number = typeof array[n] === 'string' ?
                Transform.TYPES[array[n]] :
                array[n] ;

            this[n + 5] = number;

            // Copy transform parameters without conversion
            let m = TRANSFORMLENGTHS[number];
            while (m--) {
                ++n;
                this[n + 5] = array[n] || 0;
            }
        }
    }

    transpose(n) {
        const { transforms } = this;
        // If the last transform is already a transpose, use it
        if (transforms[transforms.length - 2] === 'transpose') {
            transforms[transforms.length - 1] += parseFloat(n);
        }
        // Otherwise append a transpose transform
        else {
            transforms.push('transpose', parseFloat(n));
            this.transforms = transforms;
        }
        return this;
    }
}

define(SequenceEvent.prototype, {
    type: { value: 'sequence' }
});

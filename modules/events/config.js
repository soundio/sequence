/**
Event and transform configuration for binary serialization
**/

export const TYPE_IDS = {
    note: 1,
    param: 2,
    rate: 3,
    meter: 4,
    chord: 5,
    key: 6,
    sequence: 7,
    text: 8,
    start: 9,
    stop: 10
};

export const TRANSFORM_IDS = {
    displace: 1,
    rate: 2,
    gain: 3,
    quantize: 4,
    transpose: 5
};

// Number of float32 parameters each transform takes
export const TRANSFORM_PARAM_COUNTS = {
    displace: 1,
    rate: 1,
    gain: 1,
    quantize: 1,  // TODO: not yet implemented
    transpose: 1
};

// Fixed byte lengths for event types (excluding variable parts)
export const EVENT_BASE_LENGTHS = {
    note: 30,      // beat(8) + type(1) + pitch(4) + dynamic(4) + duration(8) + padding(5)
    param: 30,     // beat(8) + type(1) + name(2) + value(4) + curve(1) + duration(8) + padding(6)
    rate: 22,      // beat(8) + type(1) + rate(4) + curve(1) + duration(8)
    meter: 17,     // beat(8) + type(1) + duration(4) + divisor(4)
    chord: 20,     // beat(8) + type(1) + root(1) + mode(1) + duration(8) + padding(1)
    key: 10,       // beat(8) + type(1) + name(1)
    sequence: 22,  // beat(8) + type(1) + id(2) + target(2) + duration(8) + transformCount(1)
    text: 19,      // beat(8) + type(1) + length(2) + duration(8) [+ string bytes]
    start: 10,     // beat(8) + type(1) + reserved(1)
    stop: 10       // beat(8) + type(1) + reserved(1)
};

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

/**
Calculate byte length for a text event including string
**/
export function getTextEventLength(event) {
    const string = event[2];
    const encoded = new TextEncoder().encode(string);
    return EVENT_BASE_LENGTHS.text + encoded.length;
}

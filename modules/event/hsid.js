
import cache from 'fn/cache.js';


const DEBUG = globalThis.DEBUG;
const { floor, log } = Math;


/**
In JavaScript Float64 numbers safely represent up to 53-bit integers, giving
us a 2^53 space to identify harmonic structures. If we consider harmonic
structures to be composed of stacked intervals up to 36 semitones, that allows
for:

- Max interval 35 semitones
- Max notes 11 (10 intervals)
- Max id 36^10 = 3656158440062976
**/

const BASE         = 36;                            // 36
const MAX_INTERVAL = BASE - 1;                      // 35

// How many times you can multiply BASE by itself before exceeding
// MAX_SAFE_INTEGER, plus 1 (for the root note)
const MAX_LENGTH   = floor(log(Number.MAX_SAFE_INTEGER) / log(BASE)) + 1; // 11


/**
hsidFrom(notes)
Generates an integer id from an ascending collection of note numbers. Using base
36 maths, no interval between note numbers can be greater than 35. 10 intervals
(11 notes) can be encoded in the `Number.MAX_SAFE_INTEGER` space. A single note
always has an id of `0`, and simple intervals map so that a semitone `[0, 1]`
has id `1`, a second `[0, 2]` has id `2` and so on.
**/

export function hsidFrom(numbers) {
    // If numbers contains a single note return 0, or no notes return -1
    if (numbers.length < 2) return numbers.length ? 0 : -1;

    // If numbers contains more than 11 notes throw an error
    if (numbers.length > MAX_LENGTH) {
        throw new Error(`Cannot generate harmonic id, more than 11 notes ` + numbers);
    }

    let id = 0, n = 0, m = 1;
    while (++n < numbers.length) {
        const interval = numbers[n] - numbers[n - 1];

        // Validate interval range to 1-31 semitones
        if (interval < 1 || interval > MAX_INTERVAL) {
            throw new Error(`Cannot generate harmonic id, interval out of range 1-${ MAX_INTERVAL } ` + numbers);
        }

        // Pack interval directly into 5-bit number width
        id += interval * m;
        m *= BASE;
    }

    return id;
}

export function hsidOf() {
    return hsidFrom(arguments);
}


/**
hsidToNumbers(hsid)
Unpacks a harmonic structure id to an ascending collection of note numbers.
Returns a Uint8Array.
**/

export const hsidToNumbers = cache((hsid) => {
    if (DEBUG && typeof hsid !== 'number') throw new Error(`hsidToNumbers() takes number, called with ${ typeof hsid }`)

    // If id is -ve it's an empty array
    if (hsid === -1) return Uint8Array.of();

    // Single note hsid always results in [0]
    if (hsid === 0) return Uint8Array.of(0);

    // Calculate length of output array from BASE-bit magnitude of hsid
    let length = 2;
    while (hsid >= BASE ** (length - 1)) ++length;

    // Create integer tones array and unpack hsid to tones
    const numbers = new Uint8Array(length);
    numbers[0] = 0;
    let i = 1;
    while (hsid > 0) {
        const interval = hsid % BASE;
        numbers[i] = numbers[i - 1] + interval;
        hsid = floor(hsid / BASE);
        ++i;
    }

    return numbers;
});

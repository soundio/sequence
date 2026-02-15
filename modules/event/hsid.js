
const { floor } = Math;

/**
In JavaScript Float64 numbers safely represent up to 53-bit integers, giving
us a 53-bit space to identify harmonic structures. If we consider harmonic
structures to be composed of stacked intervals, that allows for:

4-bit intervals:
- Max interval 15 semitones
- Max notes 14 (13 intervals)
- Max id 4503599627370496

5-bit intervals:
- Max interval 31 semitones
- Max notes 11 (10 intervals)
- Max id 1125899906842624

6-bit intervals:
- Max interval 63 semitones
- Max notes 9 (8 intervals)
- Max id 281474976710656
**/

const BITS_PER_INTERVAL = 5;
const BASE              = 1 << BITS_PER_INTERVAL;        // 32
const MAX_INTERVAL      = BASE - 1;                      // 31
const MAX_LENGTH        = floor(53 / BITS_PER_INTERVAL); // 11


/**
hsidFrom(notes)
Generates a safe 53-bit integer id from an ascending collection of note numbers,
up to 11 notes where no interval is greater than 31 semitones. A single note
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
hsidToNotes(hsid)
Unpacks a harmonic structure id to an ascending collection of note numbers.
Returns a Uint8Array.
**/

export function hsidToNotes(hsid) {
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
}

/**
Rhythmic Structure ID

An RSID identifies a rhythm as a single integer. The binary representation of an
RSID integer describes a grid of notes as 1s and rests as 0s. All rhythms that
can be described in up to a 32 cell grid have a UInt32 id.

For example, a cascara pattern is `1010110110110101`.

The number of grid cells in an RSID can be determined from its magnitude.

- RSID 5 - Rhythm 101 - 3 cells
- RSID 11 - Rhythm 1011 - 4 cells
- RSID 13 - Rhythm 1101 - 4 cells
- RSID 45 - Rhythm 101101 - 6 cells

Some RSIDs are equivalent. A rhythm of 100100 is equivalent to a rhythm of 1010.
But both those rhythms are equal to rhythm 11, so have RSID 3. This means that
not all integers are valid RSIDs.
**/


/**
lengthOfRSID(rsid)
Returns the number of grid cells in an RSID based on its magnitude.
**/
export function lengthOfRSID(rsid) {
    return 32 - Math.clz32(rsid);
}


/**
trimRSID(rsid)
Shifts 0s off the end of a rhythm, giving the smallest representation of the
rhythmic cell ending on a hit without retaining trailing rest duration.
**/
export function trimRSID(rsid) {
    while (rsid && (rsid & 1) === 0) rsid >>>= 1;
    return rsid;
}


/**
compressRSID(rsid)
Returns the lowest common (irreducible) RSID for a given rhythm by checking
all divisor factors of its grid length.
**/
export function compressRSID(rsid) {
    const len = 32 - Math.clz32(rsid);

    // Test divisors k from len down to 2 for possible grid decimation
    for (let k = len; k >= 2; k--) {
        if (len % k !== 0) continue;

        // In bitwise order (MSB = time 0 at bit len - 1), hits on multiples of k
        // must satisfy bit index i % k === k - 1
        let canCompress = true;
        const rem = k - 1;

        for (let i = 0; i < len; i++) {
            if (((rsid >>> i) & 1) && (i % k !== rem)) {
                canCompress = false;
                break;
            }
        }

        // If all onsets fall on multiples of k, extract every k-th bit
        if (canCompress) {
            let compressed = 0;
            const newLen = len / k;
            for (let j = 0; j < newLen; j++) {
                if ((rsid >>> (j * k + rem)) & 1) {
                    compressed |= (1 << j);
                }
            }
            return compressed >>> 0;
        }
    }

    return rsid;
}


/**
isRSID(rsid)
Returns true if an integer is already in its irreducible, valid RSID form.
**/
export function isRSID(rsid) {
    return compressRSID(rsid) === rsid;
}


/**
sameRhythm(a, b)
Returns true if two rhythms reduce to the same canonical RSID.
**/
export function sameRhythm(a, b) {
    return compressRSID(a) === compressRSID(b);
}


/**
toRSID(rhythm)
Converts a sequence of cells (arguments, array, or binary string) or raw integer
to a canonical, reduced RSID.
**/
export function toRSID(rhythm) {
    if (arguments.length === 1) {
        if (typeof rhythm === 'number') {
            return compressRSID(rhythm >>> 0);
        }
        if (typeof rhythm === 'string') {
            return compressRSID(parseInt(rhythm, 2) >>> 0);
        }
    }

    const args = (rhythm && typeof rhythm === 'object' && Symbol.iterator in rhythm) ?
        Array.from(rhythm) :
        arguments;

    let rsid = 0;
    let a = args.length;
    let n = 1;

    // Pack cell values into bits, starting with the least significant bit
    while (a--) {
        if (args[a]) rsid += n;
        n *= 2;
    }

    return compressRSID(rsid >>> 0);
}


/**
densityOfRSID(rsid)
Returns the number of note hits (Hamming weight / popcount) in an RSID.
**/
export function densityOfRSID(rsid) {
    // Parallel bit count (SWAR popcount)
    let x = rsid >>> 0;
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0F0F0F0F;
    x = x + (x >>> 8);
    x = x + (x >>> 16);
    return x & 0x3F;
}


/**
clashRSID(a, b)
Returns the bitwise intersection of two rhythmic patterns (the simultaneous hits).
**/
export function clashRSID(a, b) {
    return (a & b) >>> 0;
}


/**
rotateRSID(rsid, n, length)
Performs a circular phase rotation of the rhythm by n steps in time.
**/
export function rotateRSID(rsid, n, length = lengthOfRSID(rsid)) {
    // Normalise shift to [0, length). Advancing time by +n circular-shifts bits right.
    const shift = ((n % length) + length) % length;
    const mask  = (2 ** length) - 1;
    return (((rsid >>> shift) | (rsid << (length - shift))) & mask) >>> 0;
}


/**
reverseRSID(rsid, length)
Reverses a rhythm in time (retrograde). Trailing rests become leading rests,
which are dropped to yield the canonical RSID starting on the first onset.
**/
export function reverseRSID(rsid, length = lengthOfRSID(rsid)) {
    // Reverse bit order across the specified grid length
    let reversed = 0;
    let i = length;
    while (i--) {
        reversed = (reversed << 1) | (rsid & 1);
        rsid >>>= 1;
    }

    return compressRSID(reversed >>> 0);
}


/**
euclideanRSID(hits, cells)
Generates an Euclidean rhythm E(k, n) as a canonical RSID using Bjorklund's algorithm.
**/
export function euclideanRSID(hits, cells) {
    if (hits >= cells) return compressRSID((2 ** cells) - 1);

    // Initialise groups of hits [1] and rests [0]
    const groups = [];
    for (let i = 0; i < cells; i++) {
        groups.push(i < hits ? [1] : [0]);
    }

    // Bjorklund reduction: repeatedly distribute remainder groups into leading groups
    while (true) {
        const last = groups[groups.length - 1];
        let numLast = 0;
        for (let i = groups.length - 1; i >= 0; i--) {
            if (groups[i].length === last.length && groups[i].every((v, j) => v === last[j])) {
                numLast++;
            }
            else {
                break;
            }
        }

        const numFirst = groups.length - numLast;
        if (numLast <= 1 || numFirst === 0) break;

        const count = Math.min(numFirst, numLast);
        for (let i = 0; i < count; i++) {
            groups[i] = groups[i].concat(groups.pop());
        }
    }

    // Flatten concatenated groups into integer bits
    const bits = groups.flat();
    let num = 0;
    let p = 1;
    for (let i = bits.length - 1; i >= 0; i--) {
        if (bits[i]) num += p;
        p *= 2;
    }

    return compressRSID(num >>> 0);
}


/**
rsidToString(rsid, length)
Returns the binary string representation of an RSID padded to the given length.
**/
export function rsidToString(rsid, length = lengthOfRSID(rsid)) {
    return (rsid >>> 0).toString(2).padStart(length, '0');
}


/**
rsidToArray(rsid, length)
Returns an array of 1s and 0s representing the grid cells of the RSID.
**/
export function rsidToArray(rsid, length = lengthOfRSID(rsid)) {
    return Array.from(rsidToString(rsid, length), Number);
}

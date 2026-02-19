
import get     from 'fn/get.js';
import mod12   from '../number/mod-12.js';
import mirror  from '../object/mirror.js';
import { rflatsharp, toUnicode } from '../pitch.js';
import { hsidOf, hsidFrom, hsidToNumbers } from './hsid.js';


const DEBUG = globalThis.DEBUG;


/*
Chord symbols

Chords are identified by HSIDs with a maximum range of 12 (1 octave). These
serve as maximal harmonic identifiers for each symbol, in some cases as mode
identifiers. That is to say, a group of notes should be considered 'of a chord'
if all of them are found in its identity – that doesn't mean that all the
notes of the identity need to be present in the group.

Here be dragons. Chord maps are created from an ordered list of entries. Entry
order is important to `getChordFrom(numbers)`, which chooses the first entry
with the highest matching ratio of notes (up to a limit of 6 notes ie. any
chord identifier with over 6 notes is treated as if it has 6, evening out the
scores between whole tone (6-note), major, minor (7-note) and diminished (8-note)
scales).

It's fragile, but it is efficient. There is a full suite of tests for various
groups of notes in test/chord.js. Consult it before changing anything.

Chord extensions containing `/{n}` number tags are slash chords. The tag should
be replaced with the chord bass note name, while the number denotes the interval
from the bass note to the root note of the chord (within the range 1-12), which
should be prepended to the symbol as usual.
*/

const CHORDENTRIES = [
    // Chords without 7ths
    ['',          hsidOf(0, 2, 4, 7)],              // Before '+' so that 0,2,4 shows identifies with this
    ['+',         hsidOf(0, 2, 4, 8)],
    ['sus',       hsidOf(0, 2, 5, 7)],
    ['sus♭9',     hsidOf(0, 1, 5, 7)],
    ['-',         hsidOf(0, 2, 3, 7)],
    ['°',         hsidOf(0, 2, 3, 6)],
    ['/{4}',      hsidOf(0, 3, 8, 10)],             // C/E   1st inversion
    ['/{7}',      hsidOf(0, 5, 7, 9)],              // C/G   2nd inversion
    ['/{8}',      hsidOf(0, 4, 8, 11)],             // C/A♭
    ['-/{3}',     hsidOf(0, 4, 9, 11)],             // C-/E♭ 1st inversion
    ['-/{7}',     hsidOf(0, 5, 7, 8)],              // C-/G  2nd inversion
    ['/{11}',     hsidOf(0, 1, 5, 8)],              // C/B                       - must come after -/{7}
    ['/{1}',      hsidOf(0, 3, 6, 11)],             // C/D♭
    ['ø',         hsidOf(0, 3, 6, 10)],
    ['∆6',        hsidOf(0, 4, 7, 9)],
    ['∆',         hsidOf(0, 2, 4, 7, 9, 11)],       // 1st mode major (ionian)   - must come before ∆♯11
    ['∆6/9',      hsidOf(0, 2, 4, 7, 9)],
    ['∆♯11',      hsidOf(0, 2, 4, 6, 7, 9, 11)],    // 4th mode major lydian)
    ['7sus',      hsidOf(0, 2, 5, 7, 10)],          // - must come before 7 to classify 0,2,7,10 (Gm/C) as 7sus
    ['7',         hsidOf(0, 2, 4, 7, 10)],          // 5th mode major (myxolydian)
    ['7sus♭9',    hsidOf(0, 1, 5, 7, 10)],
    ['13',        hsidOf(0, 2, 4, 7, 9, 10)],
    ['13sus',     hsidOf(0, 2, 5, 7, 9, 10)],
    ['-6',        hsidOf(0, 2, 3, 5, 7, 9)],
    ['-7',        hsidOf(0, 2, 3, 5, 7, 9, 10)],    // 2nd mode major (dorian)
    ['-11',       hsidOf(0, 2, 3, 5, 10)],
    ['7♯11',      hsidOf(0, 2, 4, 6, 7, 9, 10)],    // 4th mode melodic minor
    ['-∆',        hsidOf(0, 2, 3, 5, 7, 9, 11)],    // 1st mode melodic minor
    ['7♭13',      hsidOf(0, 2, 4, 5, 7, 8, 10)],    // 5th mode melodic minor
    ['13sus♭9',   hsidOf(0, 1, 3, 5, 7, 9, 10)],    // 2nd mode melodic minor
    ['+7',        hsidOf(0, 2, 4, 6, 8, 10)],       // Whole tone                - this must come before 7alt, ø9 and ∆♯4♯5
    ['°7',        hsidOf(0, 2, 3, 5, 6, 8, 9, 11)], // Whole step / half step
    ['7♯9',       hsidOf(0, 3, 4, 6, 7, 9, 10)],    // Hendrix chord             - must come before 7alt and 7♭9
    ['7alt',      hsidOf(0, 1, 3, 4, 6, 8, 10)],    // 7th mode melodic minor    - before 7♭9 if F♯ triad / C is to be classified as 7alt, after if it is to be classified as 7♭9
    ['7♭9',       hsidOf(0, 1, 3, 4, 6, 7, 10)],    // Half step / whole step no 13th
    ['13♭9',      hsidOf(0, 1, 3, 4, 6, 7, 9, 10)], // Half step / whole step    - must come before 7♭9♭13
    ['7♭9♭13',    hsidOf(0, 1, 4, 5, 7, 8, 10)],    // 5th mode harmonic minor
    ['-♭6',       hsidOf(0, 2, 3, 5, 7, 8, 10)],    // 6th mode major (aoelian)  - must come after 13sus♭9
    ['-♭9',       hsidOf(0, 1, 3, 5, 7, 8, 10)],    // 3rd mode major (phrygian) - must come after -♭6
    ['ø9',        hsidOf(0, 2, 3, 5, 6, 8, 10)],    // 6th mode melodic minor
    ['∆♯4♯5',     hsidOf(0, 2, 4, 6, 8, 9, 11)],    // 3rd mode melodic minor
    ['-∆♭6',      hsidOf(0, 2, 3, 5, 7, 8, 11)],    // 1st mode harmonic minor
    ['∆♯5',       hsidOf(0, 2, 4, 8, 11)],          // 3rd mode harmonic minor
    ['∆♭6',       hsidOf(0, 2, 4, 5, 7, 8, 11)],    // 1st mode harmonic major
];

export const CHORDNUMBERS = Object.fromEntries(CHORDENTRIES);
export const CHORDNAMES   = mirror(CHORDNUMBERS);

/**
toHSID(value)
Converts a chord name or harmonic structure of note numbers to an HSID.
**/

const rparenthesis = /[()]/g;

export function toHSID(value) {
    return typeof value === 'string' ?
            CHORDNUMBERS[
                value
                .replaceAll(rparenthesis, '')
                .replaceAll(rflatsharp, toUnicode)
            ] :
        typeof value === 'object' ?
            hsidFrom(value) :
        value ;
}


export function toChordName(value) {
    const hsid = toHSID(value);
    return CHORDNAMES[hsid] || hsidToNumbers(hsid);
}


/**
getChordOf()
getChordFrom()
Experimental chord identification.
**/

const CHORDIDS = CHORDENTRIES.map(get(1));
const array = [];

function scoreNumbers(chord, numbers) {
    const r = numbers[0];
    let n = numbers.length, score = 0;
    array.length = 0;
    while (n--) {
        const number = mod12(numbers[n] - r);
        if (array.includes(number)) continue;
        if (!chord.includes(number)) return -1;
        array.push(number);
    }

    return array.length / Math.min(6, chord.length);
}

export function getChordFrom(numbers) {
    // A chord must have more than 2 notes, otherwise it's an interval
    if (numbers.length < 3) return;

    let hsid, s = 0, h;
    // Here we must loop in the order of HSIDs declared in CHORDENTRIES
    for (hsid of CHORDIDS) {
        const chord = hsidToNumbers(hsid);
        const score = scoreNumbers(chord, numbers);
        if (score <= s) continue;
        h = hsid;
        s = score;
    }

    return h && CHORDNAMES[h];
}

export function getChordOf() {
    return getChordFrom(arguments);
}

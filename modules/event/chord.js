
import get     from 'fn/get.js';
import { toRootName, toRootNumber } from 'midi/note.js';
import mod12   from '../number/mod-12.js';
import mirror  from '../object/mirror.js';
import { normalisePitch } from '../pitch.js';
import { toKeyNumber, keyToRootNumber, KEYNAMES } from './key.js';
import Event, { stringify } from './event.js';
import { hsidOf, hsidFrom, hsidToNumbers } from '../harmony/hsid.js';


const DEBUG  = globalThis.DEBUG;
const define = Object.defineProperties;
const { round } = Math;
const rslashextension = /^\{(\d{1,2})\}/;
const rchordsymbol = /^([A-G](?:bb|##|[𝄫𝄪♭♯#b])?)\s*([^\/\s]*)\s*(?:\/\s*(\S+))?$/u;

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

Chord extensions matching /^\{\d{1,2}\}.*\/$/ are slash chords. The `{n}` tag
denotes the interval from the bass note to the root note of the chord (within
the range 1-11), which is replaced with the root note name, and the bass note
name is appended after the slash.
*/

const CHORDENTRIES = [
    ['',          hsidOf(0, 2, 4, 7)],              // Before '+' so that 0,2,4 shows identifies with this
    ['+',         hsidOf(0, 2, 4, 8)],
    ['sus',       hsidOf(0, 2, 5, 7)],
    ['sus♭9',     hsidOf(0, 1, 5, 7)],
    ['-',         hsidOf(0, 2, 3, 7)],
    ['°',         hsidOf(0, 2, 3, 6)],
    ['{8}/',      hsidOf(0, 3, 8, 10)],             // C/E   1st inversion
    ['{5}/',      hsidOf(0, 5, 7, 9)],              // C/G   2nd inversion
    ['{4}/',      hsidOf(0, 4, 8, 11)],             // C/A♭
    ['{9}-/',     hsidOf(0, 4, 9, 11)],             // C-/E♭ 1st inversion
    ['{5}-/',     hsidOf(0, 5, 7, 8)],              // C-/G  2nd inversion
    ['{1}/',      hsidOf(0, 1, 5, 8)],              // C/B                       - must come after {5}-/
    ['{11}/',     hsidOf(0, 3, 6, 11)],             // C/D♭
    ['{8}7/',     hsidOf(0, 3, 6, 8, 10)],          // C7/E
    ['{5}7/',     hsidOf(0, 3, 5, 9)],              // C7/G
    ['ø',         hsidOf(0, 3, 6, 10)],
    ['∆6',        hsidOf(0, 4, 7, 9)],
    ['∆6/9',      hsidOf(0, 2, 4, 7, 9)],
    ['∆',         hsidOf(0, 2, 4, 7, 9, 11)],       // 1st mode major (ionian)   - must come before ∆♯11
    ['∆♯11',      hsidOf(0, 2, 4, 6, 7, 9, 11)],    // 4th mode major lydian)
    ['7sus',      hsidOf(0, 2, 5, 7, 10)],          // - must come before 7 to classify 0,2,7,10 (Gm/C) as 7sus
    ['7',         hsidOf(0, 2, 4, 7, 10)],          // 5th mode major (myxolydian)
    ['13sus',     hsidOf(0, 2, 5, 7, 9, 10)],       // - must come before 13 to classify 0,2,9,10 (Gm/C) as 13sus
    ['13',        hsidOf(0, 2, 4, 7, 9, 10)],
    ['-11',       hsidOf(0, 2, 3, 5, 10)],
    ['-6',        hsidOf(0, 2, 3, 5, 7, 9)],
    ['-7',        hsidOf(0, 2, 3, 5, 7, 9, 10)],    // 2nd mode major (dorian)
    ['-∆',        hsidOf(0, 2, 3, 5, 7, 9, 11)],    // 1st mode melodic minor
    ['7♯11',      hsidOf(0, 2, 4, 6, 7, 9, 10)],    // 4th mode melodic minor
    ['7♭13',      hsidOf(0, 2, 4, 5, 7, 8, 10)],    // 5th mode melodic minor
    ['+7',        hsidOf(0, 2, 4, 6, 8, 10)],       // Whole tone                - this must come before 7alt, ø9 and ∆♯4♯5
    ['°7',        hsidOf(0, 2, 3, 5, 6, 8, 9, 11)], // Whole step / half step
    ['7♯9',       hsidOf(0, 3, 4, 6, 7, 9, 10)],    // Hendrix chord             - must come before 7alt and 7♭9
    ['7alt',      hsidOf(0, 1, 3, 4, 6, 8, 10)],    // 7th mode melodic minor    - before 7♭9 if F♯ triad / C is to be classified as 7alt, after if it is to be classified as 7♭9
    ['7♭9',       hsidOf(0, 1, 3, 4, 6, 7, 10)],    // Half step / whole step no 13th
    ['13♭9',      hsidOf(0, 1, 3, 4, 6, 7, 9, 10)], // Half step / whole step    - must come before 7♭9♭13
    ['7sus♭9',    hsidOf(0, 1, 5, 7, 10)],          // Japanese insen scale
    ['13sus♭9',   hsidOf(0, 1, 3, 5, 7, 9, 10)],    // 2nd mode melodic minor
    ['7♭9♭13',    hsidOf(0, 1, 4, 5, 7, 8, 10)],    // 5th mode harmonic minor
    ['-♭6',       hsidOf(0, 2, 3, 5, 7, 8, 10)],    // 6th mode major (aoelian)  - must come after 13sus♭9
    ['-♭9',       hsidOf(0, 1, 3, 5, 7, 8, 10)],    // 3rd mode major (phrygian) - must come after -♭6
    ['ø9',        hsidOf(0, 2, 3, 5, 6, 8, 10)],    // 6th mode melodic minor
    ['∆♯4♯5',     hsidOf(0, 2, 4, 6, 8, 9, 11)],    // 3rd mode melodic minor
    ['-∆♭6',      hsidOf(0, 2, 3, 5, 7, 8, 11)],    // 1st mode harmonic minor
    ['∆♭6',       hsidOf(0, 2, 4, 7, 8, 11)],       // 1st mode harmonic major
];

export const CHORDNUMBERS = Object.fromEntries(CHORDENTRIES);
export const CHORDNAMES   = mirror(CHORDNUMBERS);

// Aliases

CHORDNUMBERS['aug']    = CHORDNUMBERS['+'];
CHORDNUMBERS['dim']    = CHORDNUMBERS['°'];
CHORDNUMBERS['dim7']   = CHORDNUMBERS['°7'];
CHORDNUMBERS['maj']    = CHORDNUMBERS[''];
CHORDNUMBERS['maj7']   = CHORDNUMBERS['∆'];
CHORDNUMBERS['min']    = CHORDNUMBERS['-'];
CHORDNUMBERS['min7']   = CHORDNUMBERS['-7'];
CHORDNUMBERS['m']      = CHORDNUMBERS['-'];
CHORDNUMBERS['m7']     = CHORDNUMBERS['-7'];
CHORDNUMBERS['m6']     = CHORDNUMBERS['-6'];
CHORDNUMBERS['m9']     = CHORDNUMBERS['-9'];
CHORDNUMBERS['m11']    = CHORDNUMBERS['-11'];
CHORDNUMBERS['m7♭5']   = CHORDNUMBERS['ø'];
CHORDNUMBERS['min7♭5'] = CHORDNUMBERS['ø'];

/**
toChordHSID(value)
Converts a chord name or harmonic structure of note numbers to an HSID.
**/

const rparenthesis = /[()]/g;

export function toChordHSID(value) {
    return typeof value === 'string' ?
            CHORDNUMBERS[normalisePitch(value.replaceAll(rparenthesis, ''))] :
        typeof value === 'object' ?
            hsidFrom(value) :
        value ;
}

export function toChordName(value) {
    const hsid = toChordHSID(value);
    return CHORDNAMES[hsid] || '';
}


/**
getChordOf()
getChordFrom()
Experimental chord identification.
**/

const CHORDIDS = CHORDENTRIES.map(get(1));
const results = [];

function scoreNumbers(chord, numbers) {
    const r = numbers[0];
    let n = numbers.length;
    results.length = 0;
    while (n--) {
        const number = mod12(numbers[n] - r);
        if (results.includes(number)) continue;
        if (!chord.includes(number)) return -1;
        results.push(number);
    }
    //console.log(numbers, chord, results.length);
    return results.length;
}

export function getChordFrom(numbers) {
    // A chord must have more than 2 notes, otherwise it's an interval
    if (numbers.length < 3) return;

    // If numbers is a chord identifier, fast out
    const chordHSID = hsidFrom(numbers);
    if (CHORDNAMES[chordHSID]) return CHORDNAMES[chordHSID];

    let hsid, s = 0, h;
    // Loop in the order of HSIDs declared in CHORDENTRIES, find the first of
    // the highest scoring matches
    for (hsid of CHORDIDS) {
        const chord = hsidToNumbers(hsid);
        const score = scoreNumbers(chord, numbers);
        if (score <= s) continue;
        s = score;
        h = hsid;
    }

    return h && CHORDNAMES[h];
}

export function getChordOf() {
    return getChordFrom(arguments);
}





// Line-of-fifths offsets from key for semitone degrees 0..11 relative to tonic
//           0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11
// In C:     C  D♭   D  E♭   E   F  F♯   G  A♭   A  B♭   B
const FIFTHS_OFFSETS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];

// Sharp line-of-fifths offsets for secondary leading tone / diminished chords:
// In C:     C  C♯   D  D♯   E   F  F♯   G  G♯   A  A♯   B
const DIM_FIFTHS_OFFSETS = [0, 7, 2, 9, 4, -1, 6, 1, 8, 3, 10, 5];

function spell(key, hsid, n) {
    const root   = toRootNumber(n);
    const tonic  = keyToRootNumber(key);
    const degree = mod12(root - tonic);

    // If diminished chord, use sharp offsets for secondary leading tones
    const name = hsid !== undefined && hsid !== null ?
        (typeof hsid === 'string' ? hsid : toChordName(hsid)) :
        '';

    const isDim = name === '°' || name === '°7' || name === 'dim' || name === 'dim7';
    const offsets = isDim ? DIM_FIFTHS_OFFSETS : FIFTHS_OFFSETS;
    const fifths = toKeyNumber(key) + offsets[degree];
    return KEYNAMES[fifths] || toRootName(root);
}


export default class ChordEvent extends Event {
    static of(beat, root, extension = '', duration = 2) {
        if (root === undefined) {
            // Create invalid event
            return new ChordEvent({ beat, extension, duration });
        }

        // If root is a string, check if it is a chord symbol
        if (typeof root === 'string') {
            const match = rchordsymbol.exec(root);
            if (match) {
                // If slash chord symbol (e.g. "C/E", "C7/G", "C-/E♭")
                if (match[3] !== undefined) {
                    const upperRoot = toRootNumber(match[1]);
                    const bass      = toRootNumber(match[3]);
                    const interval  = mod12(upperRoot - bass);
                    const quality   = match[2] ? (toChordName(toChordHSID(match[2])) || match[2]) : '';
                    const dur       = extension !== '' && extension !== undefined ?
                        (typeof extension === 'number' ? extension : parseFloat(extension)) :
                        (duration !== undefined ? duration : 2);

                    return new ChordEvent({
                        beat,
                        root: match[3],
                        extension: `{${ interval }}${ quality }/`,
                        duration: dur
                    });
                }

                // If non-slash chord symbol and called as (beat, symbol, duration) or (beat, symbol)
                if (arguments.length === 2 || (arguments.length === 3 && (typeof extension === 'number' || (!Number.isNaN(Number(extension)) && !(extension in CHORDNUMBERS))))) {
                    const dur = arguments.length === 3 ?
                        (typeof extension === 'number' ? extension : parseFloat(extension)) :
                        2;
                    const quality = match[2] ? (toChordName(toChordHSID(match[2])) || match[2]) : '';

                    return new ChordEvent({
                        beat,
                        root: match[1],
                        extension: quality,
                        duration: dur
                    });
                }
            }
        }

        // Create valid event
        return new ChordEvent({ beat, root, extension, duration }) ;
    }

    [1] = Event.TYPES.chord;

    get root()           { return toRootName(this[2]); }
    set root(name)       { this[2] = toRootNumber(name); }
    get extension()      { return toChordName(this[3]); }
    set extension(name)  { this[3] = toChordHSID(name); }
    get duration()       { return this[4]; }
    set duration(number) { this[4] = parseFloat(number); }

    transpose(n) {
        this[2] = mod12(this[2] + round(n));
        return this;
    }

    toChordSymbol(key = 0) {
        const root      = this[2];
        const hsid      = this[3];
        const extension = toChordName(hsid);
        const isSlash   = rslashextension.test(extension) && extension.endsWith('/');

        if (isSlash) {
            let bassName;
            const symbol = extension.replace(rslashextension, ($0, $1) => {
                const interval      = parseInt($1, 10);
                const upperRoot     = mod12(root + interval);
                const upperRootName = spell(key, null, upperRoot);
                const bassInterval  = mod12(12 - interval);
                const bassFifths    = toKeyNumber(upperRootName) + FIFTHS_OFFSETS[bassInterval];
                bassName            = KEYNAMES[bassFifths] || toRootName(root);
                return upperRootName;
            });
            return symbol + bassName;
        }

        return spell(key, hsid, root) + extension;
    }

    toString(key = 0) {
        return `${ super.toString() } chord ${ this.toChordSymbol(key) } ${ stringify(this.duration) }`;
    }
}

define(ChordEvent.prototype, {
    type: { value: 'chord' }
});

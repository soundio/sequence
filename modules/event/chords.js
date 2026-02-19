
import { rflatsharp, toUnicode } from '../pitch.js';
import mod12 from '../number/mod-12.js';
import mirror from '../object/mirror.js';
import { hsidOf, hsidFrom, hsidToNumbers } from './hsid.js';


const DEBUG = globalThis.DEBUG;


/*
Chord symbols.
The idea is these serve as maximal harmonic identifiers for each symbol, almost
as mode identifiers. That is to say, a group of notes should be considered of a
chord symbol if all of them are found in its identity, but that doesn't mean
that all the notes of the identity need to be present. The smallest matching
identity should be preferred.
*/

export const CHORDNUMBERS = {
    // Triads
    '+':         hsidOf(0, 4, 8),
    'sus':       hsidOf(0, 5, 7),
    '':          hsidOf(0, 4, 7),
    '-':         hsidOf(0, 3, 7),
    '°':         hsidOf(0, 3, 6),

    //'${n+4}/${n}':  hsidOf(0, 3, 8),             // C/E   1st inversion
    //'${n+7}/${n}':  hsidOf(0, 5, 9),             // C/G   2nd inversion
    //'${n+3}-/${n}': hsidOf(0, 4, 9),             // C-/Eb 1st inversion
    //'${n+7}-/${n}': hsidOf(0, 5, 8),             // C-/G  2nd inversion

    // Major scale
    '∆♯11':      hsidOf(0, 2, 4, 6, 7, 9, 11),  // 4th mode lydian)
    '∆':         hsidOf(0, 2, 4, 7, 9, 11),     // 1st mode (ionian)
    '∆6/9':      hsidOf(0, 2, 4, 7, 9),
    '7':         hsidOf(0, 2, 4, 7, 10),        // 5th mode (myxolydian)
    //'9':         hsidOf(0, 2, 4, 7, 10),
    '13':        hsidOf(0, 2, 4, 7, 9, 10),
    '7sus':      hsidOf(0, 2, 5, 7, 9, 10),
    '-7':        hsidOf(0, 2, 3, 5, 7, 9, 10),  // 2nd mode (dorian)
    '-6':        hsidOf(0, 2, 3, 5, 7, 9),
    '-9':        hsidOf(0, 2, 3, 7, 9, 10),
    '-11':       hsidOf(0, 2, 3, 5, 7, 10),
    '-♭6':       hsidOf(0, 2, 3, 5, 7, 8, 10),  // 6th mode (aoelian)
    'sus♭9':     hsidOf(0, 1, 5, 7),            // 3rd mode (phrygian)
    '7sus♭9':    hsidOf(0, 1, 5, 7, 10),
    '-♭9':       hsidOf(0, 1, 3, 5, 7, 8, 10),
    'ø':         hsidOf(0, 3, 6, 10),        // 7th mode (locrian)

    // Melodic minor modes
    '7♯11':      hsidOf(0, 2, 4, 6, 7, 9, 10),  // 4th mode
    '-∆':        hsidOf(0, 2, 3, 5, 7, 9, 11),  // 1st mode
    '7♭13':      hsidOf(0, 2, 4, 5, 7, 8, 10),  // 5th mode
    '13sus♭9':   hsidOf(0, 1, 3, 5, 7, 9, 10),  // 2nd mode
    'ø9':        hsidOf(0, 2, 3, 5, 6, 8, 10),  // 6th mode
    '∆♯4♯5':     hsidOf(0, 2, 4, 6, 8, 9, 11),  // 3rd mode
    '7alt':      hsidOf(0, 1, 3, 4, 6, 8, 10),  // 7th mode

    // Harmonic minor (I'm not convinced all of these are useful)
    // '-♯11':   hsidOf(0, 2, 3, 6, 7, 8, 11),  // 4th mode
    '-∆♭6':      hsidOf(0, 2, 3, 5, 7, 8, 11),  // 1st mode
    '7♭9♭13':    hsidOf(0, 1, 4, 5, 7, 8, 10),  // 5th mode
    // 'ø♮6':    hsidOf(0, 1, 3, 5, 6, 9, 10),  // 2nd mode
    // '∆♯9♯11': hsidOf(0, 3, 4, 6, 7, 9, 11),  // 6th mode
    '∆♯5':       hsidOf(0, 2, 4, 8, 11),        // 3rd mode
    // '':       hsidOf(0, 2, 4, 5, 8, 9, 11),  // 7th mode

    // Harmonic major (I'm not convinced all of these are useful)
    // '-∆♯11':  hsidOf(0, 2, 4, 5, 7, 8, 11),  // 4th mode
    '∆♭6':       hsidOf(0, 2, 4, 5, 7, 8, 11),        // 1st mode
    // '13♭9':   hsidOf(0, 1, 4, 5, 7, 9, 10),  // 5th mode
    // 'ø9♮6':   hsidOf(0, 2, 3, 5, 6, 9, 10),  // 2nd mode
    // '':       hsidOf(0, 3, 4, 6, 8, 9, 11),  // 6th mode
    // '':       hsidOf(0, 1, 3, 4, 7, 8, 10),  // 3rd mode
    // '':       hsidOf(0, 1, 3, 5, 6, 8, 9),   // 7th mode

    // Diminished
    '7♯9':       hsidOf(0, 3, 4, 6, 7, 9, 10),
    '7♭9':       hsidOf(0, 1, 3, 4, 6, 7, 10),
    '13♭9':      hsidOf(0, 1, 3, 4, 6, 7, 9, 10), // Half step / whole step
    '°7':        hsidOf(0, 2, 3, 5, 6, 8, 9, 11), // Whole step / half step

    // Whole tone
    '+7':        hsidOf(0, 2, 4, 6, 8, 10)
};

export const CHORDNAMES = mirror(CHORDNUMBERS);

//if (DEBUG) {
    console.log('CHORDNUMBERS', Object.keys(CHORDNUMBERS).length, CHORDNUMBERS);
    console.log('CHORDNAMES  ', Object.keys(CHORDNAMES).length, CHORDNAMES);
//}

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
Experimental getChordOf() getChrodFrom()
**/

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
//console.log(CHORDNAMES[hsidFrom(chord)], array.sort(), array.length / chord.length);
    return array.length / chord.length;
}

export function getChordFrom(numbers) {
    let hsid, s = 0, h;
    for (hsid in CHORDNAMES) {
        const chord = hsidToNumbers(hsid);
        const score = scoreNumbers(chord, numbers);
        if (score < s) continue;
        if (score > s)     { h = hsid; }
        else if (hsid < h) { h = hsid; }
        s = score;
    }
console.log(CHORDNAMES[h]);
    return h && CHORDNAMES[h];
}

export function getChordOf() {
    return getChordFrom(arguments);
}

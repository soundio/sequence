
import { rflatsharp, toUnicode } from '../pitch.js';
import mirror from '../object/mirror.js';
import { hsidOf, hsidFrom, hsidToNotes } from './hsid.js';


export const CHORDNUMBERS = {
    // Triads
    'aug':       hsidOf(0, 4, 8),
    'sus':       hsidOf(0, 5, 7),
    'maj':       hsidOf(0, 4, 7),
    'min':       hsidOf(0, 3, 7),
    'dim':       hsidOf(0, 3, 6),

    // Major scale
    '∆♯11':      hsidOf(0, 4, 6, 7, 11),        // 4th mode lydian)
    '∆':         hsidOf(0, 4, 7, 11),           // 1st mode (ionian)
    '7':         hsidOf(0, 4, 7, 10),           // 5th mode (myxolydian)
    '9':         hsidOf(0, 2, 4, 7, 10),
    '13':        hsidOf(0, 4, 7, 9, 10),
    '7sus':      hsidOf(0, 5, 7, 10),
    '7sus4':     hsidOf(0, 5, 7, 10),
    '-7':        hsidOf(0, 3, 7, 10),           // 2nd mode (dorian)
    '-9':        hsidOf(0, 2, 3, 7, 10),
    '-11':       hsidOf(0, 3, 5, 7, 10),
    '-♭6':       hsidOf(0, 3, 7, 8, 10),        // 6th mode (aoelian)
    'sus♭9':     hsidOf(0, 1, 5, 7, 10),        // 3rd mode (phrygian)
    '7sus♭9':    hsidOf(0, 1, 5, 7, 10),
    'ø':         hsidOf(0, 3, 6, 10),           // 7th mode (locrian)

    // Melodic minor modes
    '7♯11':      hsidOf(0, 2, 4, 6, 7, 9, 10),  // 4th mode
    '-∆':        hsidOf(0, 2, 3, 5, 7, 9, 11),  // 1st mode
    '7♭13':      hsidOf(0, 2, 4, 5, 7, 8, 10),  // 5th mode
    '13sus♭9':   hsidOf(0, 1, 3, 5, 7, 9, 10),  // 2nd mode
    'ø9':        hsidOf(0, 2, 3, 5, 6, 8, 10),  // 6th mode
    '∆+':        hsidOf(0, 2, 4, 6, 8, 9, 11),  // 3rd mode
    '∆♯4♯5':     hsidOf(0, 2, 4, 6, 8, 9, 11),
    '7alt':      hsidOf(0, 1, 3, 4, 6, 8, 10),  // 7th mode

    // Harmonic minor (I'm not convinced all of these are useful)
    // '-♯11':   hsidOf(0, 2, 3, 6, 7, 8, 11),  // 4th mode
    '-∆♭6':      hsidOf(0, 2, 3, 5, 7, 8, 11),  // 1st mode
    '7♭9♭13':    hsidOf(0, 1, 4, 5, 7, 8, 10),  // 5th mode
    // 'ø♮6':    hsidOf(0, 1, 3, 5, 6, 9, 10),  // 2nd mode
    // '∆♯9♯11': hsidOf(0, 3, 4, 6, 7, 9, 11),  // 6th mode
    '∆♯5':       hsidOf(0, 2, 4, 5, 8, 9, 11),  // 3rd mode
    // '':       hsidOf(0, 2, 4, 5, 8, 9, 11),  // 7th mode

    // Harmonic major (I'm not convinced all of these are useful)
    // '-∆♯11':  hsidOf(0, 2, 4, 5, 7, 8, 11),  // 4th mode
    '∆♭6':       hsidOf(0, 2, 4, 5, 7, 8, 11),  // 1st mode
    // '13♭9':   hsidOf(0, 1, 4, 5, 7, 9, 10),  // 5th mode
    // 'ø9♮6':   hsidOf(0, 2, 3, 5, 6, 9, 10),  // 2nd mode
    // '':       hsidOf(0, 3, 4, 6, 8, 9, 11),  // 6th mode
    // '':       hsidOf(0, 1, 3, 4, 7, 8, 10),  // 3rd mode
    // '':       hsidOf(0, 1, 3, 5, 6, 8, 9),   // 7th mode

    // Diminished
    '7♯9':       hsidOf(0, 3, 4, 7, 10),
    '7♭9':       hsidOf(0, 1, 3, 4, 6, 7, 9, 10), // Half step / whole step
    '°':         hsidOf(0, 2, 3, 5, 6, 8, 9, 11), // Whole step / half step

    // Whole tone
    '+':         hsidOf(0, 2, 4, 6, 8, 10),
    '+7':        hsidOf(0, 2, 4, 6, 8, 10)
};

export const CHORDNAMES = mirror(CHORDNUMBERS);

/**
toHSID(value)
Converts a chord name or harmonic structure of note numbers to an HSID.
**/

export function toHSID(value) {
    return typeof value === 'string' ?
            CHORDNUMBERS[value.replaceAll(/\(\)/g, '').replaceAll(rflatsharp, toUnicode)] :
        typeof value === 'object' ?
            hsidFrom(value) :
        value ;
}


export function toHSName(value) {
    const hsid = toHSID(value);
    return CHORDNAMES[hsid] || hsidToNotes(hsid);
}


import { rflatsharp, toUnicode } from '../pitch.js';
import mirror from '../object/mirror.js';
import { hsidOf, hsidFrom, hsidToNotes } from './hsid.js';


export const CHORDNUMBERS = {
    // Triads
    'sus4':      hsidOf(0, 5, 7),
    'sus':       hsidOf(0, 5, 7),
    'maj':       hsidOf(0, 4, 7),
    'min':       hsidOf(0, 3, 7),
    'dim':       hsidOf(0, 3, 6),
    // Major scale
    'maj7♯11':   hsidOf(0, 4, 6, 7, 11),
    'maj7':      hsidOf(0, 4, 7, 11),
    '7':         hsidOf(0, 4, 7, 10),
    '9':         hsidOf(0, 2, 4, 7, 10),
    '13':        hsidOf(0, 4, 7, 9, 10),
    '7sus':      hsidOf(0, 5, 7, 10),
    '7sus4':     hsidOf(0, 5, 7, 10),
    'min7':      hsidOf(0, 3, 7, 10),
    'min♭6':     hsidOf(0, 3, 7, 8, 10),
    'sus♭9':     hsidOf(0, 1, 5, 7, 10),
    '7sus♭9':    hsidOf(0, 1, 5, 7, 10),
    'ø':         hsidOf(0, 3, 6, 10),
    // Melodic minor modes
    '-∆':        hsidOf(0, 2, 3, 5, 7, 9, 11),
    '13sus♭9':   hsidOf(0, 1, 3, 5, 7, 9, 10),
    'maj+':      hsidOf(0, 2, 4, 6, 8, 9, 11),
    'maj♯4♯5':   hsidOf(0, 2, 4, 6, 8, 9, 11),
    '7♯11':      hsidOf(0, 2, 4, 6, 7, 9, 11),
    '7♭13':      hsidOf(0, 2, 4, 5, 7, 8, 10),
    'ø9':        hsidOf(0, 2, 3, 5, 6, 8, 10),
    '7alt':      hsidOf(0, 1, 3, 4, 6, 8, 10),
    // Harmonic minor
    '7♭9♭13':    hsidOf(0, 1, 4, 5, 7, 8, 10),
    // Harmonic major
    'maj♭6':     hsidOf(0, 4, 7, 8, 11),
    // Diminished
    '7♭9':       hsidOf(0, 1, 4, 7, 10),
    '7♯9':       hsidOf(0, 3, 4, 7, 10),
    'dim7':      hsidOf(0, 3, 6, 9),
    // Whole tone
    '+':         hsidOf(0, 4, 8),
    '7+':        hsidOf(0, 2, 4, 6, 8, 10)
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

import mirror from '../object/mirror.js';

export const CHORDNUMBERS = {
    // Triads
    'maj':       1,
    'min':       2,
    'dim':       4,
    // Major scale
    'maj7':      5,
    'min7':      6,
    'sus♭9':     7,
    '7sus♭9':    7,
    'maj7♯11':   8,
    'maj7(♯11)': 8,
    '7':         9,
    '9':         10,
    '13':        11,
    'sus':       12,
    'sus4':      12,
    '7sus':      12,
    '7sus4':     12,
    'min♭6':     13,
    'ø':         14,
    // Melodic minor
    '-∆':        16,
    '13sus♭9':   17,
    'maj+':      18,
    'maj♯4♯5':   18,
    '7♯11':      19,
    '7♭13':      20,
    'ø(9)':      21,
    '7alt':      22,
    // Harmonic minor
    '7♭9♭13':    32,
    // Harmonic major
    'maj♭6':     33,
    // Diminished
    '7♭9':       48,
    '7♯9':       49,
    'dim7':      50,
    // Whole tone
    '+':         64,
    '7+':        64
};

export const CHORDNAMES = mirror(CHORDNUMBERS);


import { toNoteNumber, toRootNumber } from 'midi/note.js';
import parseGain from '../parse/parse-gain.js';

const rflatsharp = /b|#/g;

const flatsharps = {
    'b': '♭',
    '#': '♯'
};

function toUnicode(char) {
    return flatsharps[char];
}





/*
const extensions = [
    // Triads
    '∆',
    '-',
    // Major
    '∆7',
    '-7',
    'sus♭9',
    '7sus♭9',
    '∆♯11',
    '∆(♯11)',
    '7',
    '13',
    'sus',
    '7sus',
    '-♭6',
    'ø',
    // Harmonic minor
    '7♭9♭13',
    // Melodic minor
    '-∆',
    '13sus♭9',
    '∆+',
    '∆♯5',
    '7♯11',
    '7♭13',
    'ø(9)',
    '7alt',
    // Harmonic major
    '∆♭6',
    // Diminished
    '7♭9',
    '7♯9',
    'º',
    // Whole tone
    '+',
    '7+'
];
*/

export default function normalise(event) {
    switch (event[1]) {
        case "chord":
            // Chord root number
            event[2] = toRootNumber(event[2]);
            // Chord extension
            event[3] = event[3].replaceAll(rflatsharp, toUnicode);
            break;
        case "lyric":
            // Warn user over pold version
            console.warn('Old data contains "lyric" event, should be "text"');
            // Change type to "text"
            event[1] = "text";
            break;
        case "key":
            // Key root number
            event[2] = toRootNumber(event[2]);
            break;
        case "note":
            // Note number
            event[2] = toNoteNumber(event[2]);
            // Gain
            event[3] = parseGain(event[3]);
            break;
    }

    return event;
}

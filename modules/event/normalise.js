
import { toNoteNumber, toRootNumber } from 'midi/note.js';

const rflatsharp = /b|#/g;

const flatsharps = {
    'b': '♭',
    '#': '♯'
};

function toUnicode(char) {
    return flatsharps[char];
}

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
            break;
    }

    return event;
}

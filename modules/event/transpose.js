
import id       from 'fn/id.js';
import overload from 'fn/overload.js';
import { toNoteNumber, toRootNumber } from 'midi/note.js';

export default overload((n, event) => event[1], {
    note: (n, event) => {
        // TODO: do not n GM drum string names
        event[2] = toNoteNumber(event[2]) + n;
        return event;
    },

    chord: (n, event) => {
        // Root note
        event[2] = toRootNumber(toRootNumber(event[2]) + n);
        // Pedal note
        if (event[5] !== undefined) event[5] = toRootNumber(toRootNumber(event[2]) + n);
        return event;
    },

    key: (n, event) => {
        // TODO: this is supposed to indicate spelling, really
        event[2] = toRootNumber(toRootNumber(event[2]) + n);
        return event;
    },

    default: id
});

/* Alternative TODO: test speed!
switch (event[1]) {
    case "note": {
        const number = typeof event[2] === 'string' ?
            toNoteNumber(event[2]) :
            event[2];

        event[2] = number + transforms[n + 1];
        break;
    }

    case "chord":
    case "key": {
        const number = typeof event[2] === 'string' ?
            toRootNumber(event[2]) :
            event[2];

        event[2] = mod12(number + transforms[n + 1]);
        break;
    }
}
*/

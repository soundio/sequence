
import id       from 'fn/id.js';
import overload from 'fn/overload.js';
import { toRootNumber } from 'midi/note.js';
import { rootToKeyNumber, keyToRootNumber } from './key.js';

export default overload((n, event) => event[1], {
    note: (n, event) => {
        // TODO: do not n GM drum string names
        event[2] = event[2] + n;
        return event;
    },

    chord: (n, event) => {
        // Root note
        event[2] = toRootNumber(event[2] + n);
        // Pedal note
        if (event[5] !== undefined) event[5] = toRootNumber(event[2] + n);
        return event;
    },

    key: (n, event) => {
        event[2] = rootToKeyNumber(keyToRootNumber(event[2]) + n);
        return event;
    },

    default: id
});

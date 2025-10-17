
import { toNoteNumber, toRootNumber } from 'midi/note.js';
import transpose from './event/transpose.js';
import mod12 from './number/mod-12.js';


const types = {
    displace: (transforms, n, event) => {
        event[0] -= transforms[++n];
        return n;
    },

    rate: (transforms, n, event) => {
        event[0] /= transforms[++n];

        // Transform duration
        switch (event[1]) {
            case "chord":
            case "note":
            case "sequence":
                event[4] /= transforms[n];
                break;
            case "text":
                event[3] /= transforms[n];
                break;
        }

        return n;
    },

    quantize: (transforms, n, event) => {
        // TODO: Quantise!
    },

    transpose: (transforms, n, event) => {
        transpose(transforms[n + 1], event);
        return n + 1;
    }
};


export default function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}

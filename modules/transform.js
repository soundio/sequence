
import { toNoteNumber, toRootNumber } from 'midi/note.js';
import parseGain from './parse/parse-gain.js';
import { toTransformName } from './event/transforms.js';
import mod12 from './number/mod-12.js';


const types = {
    displace: (transforms, n, event) => {
        // TODO: Why -ve????
        event.displace(-1 * transforms[++n]);
        return n;
    },

    rate: (transforms, n, event) => {
        // Transform beat
        event[0] /= transforms[++n];

        // Transform duration
        switch (event.type) {
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

    gain: (transforms, n, event) => {
        ++n;

        // Transform gain
        switch (event.type) {
            case "note":
                event[3] *= parseGain(transforms[n]);
                break;
        }

        return n;
    },

    quantize: (transforms, n, event) => {
        // TODO: Quantise!
    },

    transpose: (transforms, n, event) => {
        event.transpose(transforms[++n]);
        return n;
    }
};


export default function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}

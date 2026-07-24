
import { toNoteNumber, toRootNumber } from 'midi/note.js';
import parseGain from './parse/parse-gain.js';
import { toTransformName } from './event/transforms.js';
import { quantiseReversedSin } from './transform/quantise-sin.js';
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

    swing: (transforms, n, event) => {
        // TODO Combine with beat detection - we should only be swinging duplets,
        // triplets should probably be quantised to triplets, other tuplets
        // should be left alone.
        const ratio     = transforms[++n]; // Swing ratio 0-1
        const strength  = transforms[++n]; // Quantisation strength 0-1
        const beat      = event[0];

        event[0] = quantiseReversedSin(ratio, strength, beat);

        switch (event.type) {
            case "chord":
            case "note":
                // TODO: Do duration better ??
                event[4] = quantiseReversedSin(ratio, strength, beat + event[4]) - event[0];
                break;
        }
        return n;
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

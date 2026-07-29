
import parseGain from '../parse/parse-gain.js';

export const name = 'gain';

export function apply(event, gain) {
    switch (event.type) {
        case "note":
            event[3] *= parseGain(gain);
            break;
    }
    return event;
}

export function unapply(event, gain) {
    switch (event.type) {
        case "note":
            event[3] /= parseGain(gain);
            break;
    }
    return event;
}

export const BYTES = 5; // Uint8 name Float32 gain

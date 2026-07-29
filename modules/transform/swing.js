
import { quantiseReversedSin } from './quantise-sin.js';


export const name = 'swing';

export function apply(event, swing, strength) {
    event[0] = quantiseReversedSin(swing, strength, event[0]);
    return event;
}

export function unapply(event, swing, strength) {
    event[0] = quantiseReversedSin(swing, 1 / strength, event[0]);
    return event;
}

export const BYTES = 9; // Uint8 name Float32 swing Float32 strength

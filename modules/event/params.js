
import { names } from 'midi/control.js';

const assign = Object.assign;

export const PARAMNAMES = assign({}, names, {
    3:   'mute',
    6:   'gain',
    9:   'angle',
    12:  'distance',
    13:  'azimuth',
    14:  'mix',
    15:  'phase',
    16:  'frequency',
    17:  'Q',
    18:  'depth',
    19:  'cutoff',
    20:  'type',
    21:  'delay',
    22:  'feedback',
    //20 - 63 are basically free, although 32 to 63 are reserved as fine-grained add-ons for 0-31
    128: 'stop',
    129: 'start',
    130: 'record',
    131: 'pitch',
    132: 'rate',
    133: 'meter',
    134: 'key',
    135: 'touch'
});

export const PARAMNUMBERS = Object.entries(PARAMNAMES)
    .reduce((object, [key, value]) => {
        object[value] = parseInt(key, 10);
        return object;
    }, {});

/**
toParamName(value)
Converts a param name or number to a param name string.
**/
export function toParamName(value) {
    return typeof value === 'number' ?
        (PARAMNAMES[value] || value) :
        value;
}


import { names } from 'midi/control.js';
import Event from './event.js';


const assign = Object.assign;
const define = Object.defineProperties;

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


export default class ParamEvent extends Event {
    constructor(beat, type, name, value, curve, duration) {
        super(beat);
        this.name     = name;
        this.value    = value;
        this.curve    = curve;
        this.duration = duration;
    }

    get name()           { return toParamName(this[2]); }
    set name(name)       { this[2] = toParamNumber(name); }
    get value()          { return this[3]; }
    set value(number)    { this[3] = fround(number); }
    get curve()          { return toCurveName(this[4]); }
    set curve(name)      { this[4] = toCurveNumber(name); }
    get duration()       { return this[4] === CURVENAMES.target || this[4] === CURVENAMES.curve ? this[5] : 0 ; }
    set duration(number) { this[5] = parseFloat(number); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3] + ' ' + this[4] + ' ' + this[5];
    }
}

define(ParamEvent.prototype, {
    1:    { value: Event.TYPENUMBERS.param, enumerable: true }
    type: { value: 'param' }
});

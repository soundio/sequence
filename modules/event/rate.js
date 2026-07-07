
import Event from './event.js';
import { toCurveName, toCurveNumber } from './curves.js';


const define = Object.defineProperties;
const { fround } = Math;


export default class RateEvent extends Event {
    constructor(beat, _type, value, curve, duration) {
        super(beat);
        this.value    = value;
        this.curve    = curve;
        this.duration = duration;
    }

    get value()          { return this[2]; }
    set value(number)    { this[2] = fround(number); }
    get curve()          { return toCurveName(this[3]); }
    set curve(name)      { this[3] = toCurveNumber(name); }
    get duration()       { return this[3] === CURVENAMES.target || this[3] === CURVENAMES.curve ? this[4] : 0 ; }
    set duration(number) { this[4] = parseFloat(number); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3] + ' ' + this[4];
    }
}

define(RateEvent.prototype, {
    1:    { value: Event.TYPENUMBERS.rate, enumerable: true },
    type: { value: 'rate' }
});

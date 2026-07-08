
import Event from './event.js';
import { toCurveName, toCurveNumber } from './curves.js';


const define = Object.defineProperties;
const { fround } = Math;


export default class RateEvent extends Event {
    static of(beat, value, curve = 0, duration = 0) {
        return new RateEvent({ beat, value, curve, duration });
    }

    [1] = Event.TYPENUMBERS.rate;

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
    type: { value: 'rate' }
});

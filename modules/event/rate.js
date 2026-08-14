
import { packAddress } from './address.js';
import Event from './event.js';
import { toCurveName, toCurveNumber } from './curves.js';


const define = Object.defineProperties;
const { fround } = Math;


export default class RateEvent extends Event {
    static of(beat, value, curve = 0, duration = 0) {
        return new RateEvent({ beat, value, curve, duration });
    }

    [1] = packAddress(0, Event.TYPES.rate, Event.CURVES.step);

    get value() {
        return this[2];
    }

    set value(number) {
        this[2] = fround(number);
    }

    get curve() {
        const curve = getCurveNumber(this[1]);
        return toCurveName(curve);
    }

    set curve(name) {
        this[1] = packAddress(0, Event.TYPES.rate, toCurveNumber(name));
    }

    get duration() {
        const curve = getCurveNumber(this[1]);
        return curve === Event.CURVES.target || curve === Event.CURVES.curve ?
            this[3] :
            0 ;
    }

    set duration(number) {
        this[3] = parseFloat(number);
    }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(RateEvent.prototype, {
    type: { value: 'rate' }
});


import Event, { stringify } from './event.js';
import { toCurveName, toCurveNumber } from './curves.js';


const define = Object.defineProperties;
const { fround } = Math;


export default class RateEvent extends Event {
    static of(beat, curve = 0, value = 0, duration = 0) {
        return new RateEvent({ beat, curve, value, duration });
    }

    [1] = Event.TYPES.rate;

    get curve() {
        const curve = this[2];
        return toCurveName(curve);
    }

    set curve(name) {
        this[2] = toCurveNumber(name);
    }

    get value() {
        return this[3];
    }

    set value(number) {
        this[3] = fround(number);
    }

    get duration() {
        const curve = this[2];
        return curve === Event.CURVES.target || curve === Event.CURVES.curve ?
            this[4] :
            0 ;
    }

    set duration(number) {
        this[4] = parseFloat(number);
    }

    toString() {
        const curve = this.curve === 'step' ? '' : `${ this.curve } `;
        const dur = this.duration ? ` ${ stringify(this.duration) }` : '';
        return `${ super.toString() } rate ${ curve }${ stringify(this.value) }${ dur }`;
    }
}

define(RateEvent.prototype, {
    type: { value: 'rate' }
});

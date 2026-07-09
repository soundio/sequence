import Event     from './event.js';
import roundPow2 from '../number/round-pow-2.js';


const assign = Object.assign;
const define = Object.defineProperties;
const rtimesig = /^(\d+)\/(\d+)$/;


export function timesigToMeter(string) {
    const groups = rtimesig.exec(string);
    const num = parseInt(groups[1], 10);
    const div = 4 / parseInt(groups[2], 10);
    // Returns an object that can be assigned to a meter event
    return { 2: num * div, 3: div };
}

export function meterToTimesig(meter) {
    const dur = meter[2];
    const div = meter[3];
    const num = dur / div;
    const den = 4 / div;
    return num + '/' + den;
}

export default class MeterEvent extends Event {
    static of(beat, numerator, denominator) {
        return new MeterEvent({ beat, numerator, denominator });
    }

    [1] = Event.TYPES.meter;

    get numerator()         { return this[2]; }
    set numerator(number)   { this[2] = parseInt(number, 10); }
    get denominator()       { return this[3]; }
    set denominator(number) { this[3] = roundPow2(number); }
    get timesig()           { return meterToTimesig(this); }
    set timesig(string)     { assign(this, timesigToMeter(string)); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(MeterEvent.prototype, {
    type: { value: 'meter' }
});

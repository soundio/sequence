import Event from './event.js';


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
    static of(beat, timesig) {
        return new MeterEvent({ beat, timesig });
    }

    [1] = Event.TYPENUMBERS.meter;

    get timesig()        { return meterToTimesig(this); }
    set timesig(string)  { assign(this, timesigToMeter(string)); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(MeterEvent.prototype, {
    type: { value: 'meter' }
});

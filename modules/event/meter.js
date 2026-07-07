import Event from './event.js';

const define = Object.defineProperties;

export default class MeterEvent extends Event {
    constructor(beat) {
        super(beat);
    }

    get timesig()        { return toTimeSig(this[2], this[3]); }
    set timesig(string)  { console.log('TODO!! timesig'); assign(this, toMeter(string)); }

    toString() {
        return super.toString() + ' ' + this[2] + ' ' + this[3];
    }
}

define(MeterEvent.prototype, {
    1:    { value: Event.TYPENUMBERS.meter, enumerable: true }
    type: { value: 'meter' }
});

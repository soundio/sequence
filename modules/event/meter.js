
import mod       from 'fn/mod.js';
import nothing   from 'fn/nothing.js';
import Event     from './event.js';
import roundPow2 from '../number/round-pow-2.js';


const assign = Object.assign;
const define = Object.defineProperties;
const rtimesig = /^(\d+)\/(\d+)$/;

const barDivisions = {
    // The last number in bar divisions is the bar duration
    // 2/2
    '4,2': [2,4],
    // 3/2
    '6,2': [2,4,6],
    // 2/4
    '2,1': [2],
    // 3/4
    '3,1': [3],
    // 4/4
    '4,1': [2,4],
    // 5/4
    '5,1': [1.5,3,5],
    // 6/4
    '6,1': [3,6],
    // 7/4
    '7,1': [4,7],
    // 9/4
    '9,1': [3,6,9],
    // 3/8
    '1.5,0.5': [1.5],
    // 5/8
    '2.5,0.5': [1.5,2.5],
    // 6/8
    '3,0.5': [1.5,3],
    // 6/8
    '3,1.5': [1.5,3],
    // 7/8
    '3.5,0.5': [2,3.5],
    // 9/8
    '4.5,0.5': [1.5,3,4.5],
    // 11/8 - 3:3:3:2
    '5.5,0.5': [1.5,3,4.5,5.5],
    // 12/8
    '6,0.5': [1.5,3,4.5,6],
    // 13/8
    '6.5,0.5': [1.5,3,4.5,6.5]
};

export function getDivisions(duration, divisor) {
    return barDivisions[duration + ',' + divisor] || nothing;
}

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
    get divisions()         { return getDivisions(this[2], this[3]); }

    toString() {
        return `${ super.toString() } meter ${ this.timesig }`;
    }
}

define(MeterEvent.prototype, {
    type: { value: 'meter' }
});





export function isDivision(divisions, beat) {
    return beat === 0 || divisions.includes(beat);
}

function divisionBefore(divisions, beat) {
    let n = -1;
    while (divisions[++n] <= beat);
    return divisions[n - 1] || 0;
}

function divisionAfter(divisions, beat) {
    let n = -1;
    while (divisions[++n] <= beat);
    return divisions[n];
}



export function getDivisionBefore(meter, beat) {
    // Bar divisions
    const divisions = meter.divisions;
    // Beat from start of bar
    const b1 = mod(meter[2], beat - meter[0]);
    // Beat from start of bar to end of current meter division
    const b2 = divisionBefore(divisions, b1);
    // Beat at next division
    return beat - b1 + b2;
}

export function getDivisionAfter(meter, beat) {
    // Bar divisions
    const divisions = meter.divisions;
    // Beat from start of bar
    const b1 = mod(meter[2], beat - meter[0]);
    // Beat from start of bar to end of current meter division
    const b2 = divisionAfter(divisions, b1);
    // Beat at next division
    return beat - b1 + b2;
}

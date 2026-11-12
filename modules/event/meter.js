
import mod       from 'fn/mod.js';
//import nothing   from 'fn/nothing.js';
import Event     from './event.js';
import roundPow2 from '../number/round-pow-2.js';
import * as RSID from '../rsid.js';


//const assign = Object.assign;
const define = Object.defineProperties;
const rtimesig = /^(\d+)\/(\d+)$/;

// -------------------------------------------------------------------
/*const barDivisions = {
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
}*/
// -------------------------------------------------------------------





const rsids = {
    '4,2':     0b11,            // 2/2
    '6,2':     0b111,           // 3/2
    '2,1':     0b10,            // 2/4
    '3,1':     0b100,           // 3/4
    '4,1':     0b1010,          // 4/4
    '5,1':     0b10010,         // 5/4
    '6,1':     0b101010,        // 6/4
    '7,1':     0b1000100,       // 7/4
    '9,1':     0b100100100,     // 9/4
    '1.5,0.5': 0b100,           // 3/8
    '2.5,0.5': 0b10010,         // 5/8
    '3,0.5':   0b100100,        // 6/8
    '3.5,0.5': 0b1010100,       // 7/8
    '4.5,0.5': 0b100100100,     // 9/8
    '5.5,0.5': 0b10010010010,   // 11/8 - 3:3:3:2
    '6,0.5':   0b100100100100,  // 12/8
    '6.5,0.5': 0b1001001001000  // 13/8
};

export default class MeterEvent extends Event {
    static of(beat, rsid, divisor) {
        return new MeterEvent({ beat, rsid, divisor });
    }

    [1] = Event.TYPES.meter;

    get rsid() {
        return this[2];
    }

    set rsid(rsid) {
        this[2] = rsid;
    }

    get divisor() {
        return this[3];
    }

    set divisor(divisor) {
        if (divisor !== roundPow2(divisor)) throw new Error(`MeterEvent: divisor ${ divisor } not a power-of-2 number`)
        this[3] = divisor;
    }

    get divisions()      {
        const divisor = this[3];
        const hits = RSID.stringify(this[2]);
        const divisions = [];

        let n = 0;
        while (++n < hits.length) if (hits[n] === '1') {
            divisions.push(n * divisor);
        }

        // Push in duration
        divisions.push(this.duration);
        return divisions;
    }

    get duration()          {
        return RSID.lengthOf(this[2]) * this[3];
    }

    set duration(duration) {
        const rsid = rsids[duration + ',' + this[3]];
        if (!rsid) throw new Error(`MeterEvent: metric RSID of duration ${ duration } divisor ${ this[3] } not found`);
        this.rsid = rsid;
    }

    // Time signature

    get numerator() {
        return RSID.lengthOf(this[2]);
    }

    get denominator() {
        return 4 / this[3];
    }

    get timesig() {
        return `${ this.numerator }/${ this.denominator }`;
    }

    set timesig(string)  {
        const groups    = rtimesig.exec(string);
        const numerator = parseInt(groups[1], 10);
        const divisor   = 4 / parseInt(groups[2], 10);
        this.divisor  = divisor;
        this.duration = numerator * divisor;
    }

    // Human readable string

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
    const b1 = mod(meter.duration, beat - meter[0]);
    // Beat from start of bar to end of current meter division
    const b2 = divisionBefore(divisions, b1);
    // Beat at next division
    return beat - b1 + b2;
}

export function getDivisionAfter(meter, beat) {
    // Bar divisions
    const divisions = meter.divisions;
    // Beat from start of bar
    const b1 = mod(meter.duration, beat - meter[0]);
    // Beat from start of bar to end of current meter division
    const b2 = divisionAfter(divisions, b1);
    // Beat at next division
    return beat - b1 + b2;
}

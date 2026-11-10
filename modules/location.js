
import { CURVES } from './event/curves.js';


const INV_E = 1 / Math.E;


function targetTimeConstant(value0, value1, beatConstant) {
    // Converts a beat constant into the equivalent WebAudio timeConstant τ
    // such that exactly beatConstant beats elapse over one time constant (t = τ),
    // where the rate has moved (1 - 1/e) of the way from value0 to value1.
    return beatConstant / (value0 * (1 - INV_E) + value1 * INV_E);
}


// Beat at...

export function beatAtTimeStep(value0, time) {
    // value0 = start rate
    // time   = current time
    return time * value0;
}

export function beatAtTimeLinear(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    return time * (value0 + 0.5 * (value1 - value0) * (time / duration));
}

export function beatAtTimeLinearBeats(value0, value1, beats, time) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // time     = current time
    // Duration D = 2 * beats / (value0 + value1), so time-slope k = (value1^2 - value0^2) / (2 * beats)
    return time * value0 + 0.25 * ((value1 * value1 - value0 * value0) / beats) * time * time;
}

export function beatAtTimeExponential(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    if (value0 === value1) return time * value0;
    const n = value1 / value0;
    return duration * value0 * (Math.pow(n, time / duration) - 1) / Math.log(n);
}

export function beatAtTimeExponentialBeats(value0, value1, beats, time) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // time     = current time
    if (value0 === value1) return time * value0;
    const n = value1 / value0;
    const d = beats * Math.log(n) / (value0 * (n - 1));
    return beatAtTimeExponential(value0, value1, d, time);
}

export function beatAtTimeTarget(value0, value1, timeConstant, time) {
    // value0       = start rate
    // value1       = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // time         = current time
    // Integral of r(t) = value1 - (value1 - value0) * exp(-t / timeConstant)
    if (value0 === value1 || timeConstant === 0) return time * value1;
    return value1 * time - (value1 - value0) * timeConstant * (1 - Math.exp(-time / timeConstant));
}

export function beatAtTimeTargetBeats(value0, value1, beatConstant, time) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // time         = current time
    const d = targetTimeConstant(value0, value1, beatConstant);
    return beatAtTimeTarget(value0, value1, d, time);
}


// Time at...

export function timeAtBeatStep(value0, beat) {
    // value0 = start rate
    // beat   = current beat
    return beat / value0;
}

export function timeAtBeatLinear(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    const rate = rateAtBeatLinear(value0, value1, duration, beat);
    return (2 * beat) / (value0 + rate);
}

export function timeAtBeatLinearBeats(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beats from start to end
    // beat   = current beat
    // Since b = ((v0 + r) / 2) * t, t = 2 * b / (v0 + r(b))
    const rate = rateAtBeatLinearBeats(value0, value1, beats, beat);
    return (2 * beat) / (value0 + rate);
}

export function timeAtBeatExponential(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    if (value0 === value1) return beat / value0;
    const n    = value1 / value0;
    const logn = Math.log(n);
    return duration * Math.log(1 + beat * logn / (duration * value0)) / logn;
}

export function timeAtBeatExponentialBeats(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beats from start to end
    // beat   = current beat
    if (value0 === value1) return beat / value0;
    const n = value1 / value0;
    return beats * Math.log(1 + beat * (n - 1) / beats) / (value0 * (n - 1));
}

export function timeAtBeatTarget(value0, value1, timeConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // beat         = current beat
    if (beat === 0) return 0;
    if (value0 === value1 || timeConstant === 0) return beat / value1;

    const dv = value1 - value0;
    // Use asymptotic linear approximation for large beats, initial rate for small beats
    let time = beat > value0 * timeConstant ?
        (beat + dv * timeConstant) / value1 :
        beat / value0 ;
    if (time <= 0) time = beat / value0;

    // Halley's method on f(t) = beatAtTimeTarget(t) - beat = 0
    for (let i = 0; i < 8; i++) {
        const e   = Math.exp(-time / timeConstant);
        const f   = value1 * time - dv * timeConstant * (1 - e) - beat;
        if (Math.abs(f) < 1e-12) break;
        const df  = value1 - dv * e;
        const d2f = dv * e / timeConstant;
        time -= f / (df - 0.5 * f * d2f / df);
        if (time < 0) time = 0;
    }

    return time;
}

export function timeAtBeatTargetBeats(value0, value1, beatConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // beat         = current beat
    const d = targetTimeConstant(value0, value1, beatConstant);
    return timeAtBeatTarget(value0, value1, d, beat);
}


// Rate at ...

export function rateAtTimeStep(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    return time >= duration ? value1 : value0;
}

export function rateAtTimeLinear(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    return value0 + (value1 - value0) * (time / duration);
}

export function rateAtTimeExponential(value0, value1, duration, time) {
    // Same algo as automation getValueAtTime - this is the curve
    // descriptor after all.
    return value0 * Math.pow(value1 / value0, time / duration);
}

export function rateAtTimeTarget(value0, value1, timeConstant, time) {
    // value0       = start rate
    // value1       = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // time         = current time
    return value0 + (value1 - value0) * (1 - Math.exp(-time / timeConstant));
}

export function rateAtBeatStep(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    return beat >= duration * value0 ? value1 : value0;
}

export function rateAtBeatStepBeats(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beats from start to end
    // beat   = current beat
    return beat >= beats ? value1 : value0;
}

export function rateAtBeatLinear(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    return Math.sqrt(value0 * value0 + 2 * ((value1 - value0) / duration) * beat);
}

export function rateAtBeatLinearBeats(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beat count from start to end
    // beat   = current beat
    return Math.sqrt(value0 * value0 + (value1 * value1 - value0 * value0) * (beat / beats));
}

export function rateAtBeatExponential(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    if (value0 === value1) return value0;
    return value0 + beat * Math.log(value1 / value0) / duration;
}

export function rateAtBeatExponentialBeats(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beat count from start to end
    // beat   = current beat
    // For an exponential ramp in time, dr/dt = k * r = k * db/dt, so dr/db = k:
    // rate varies linearly with beat.
    return value0 + (value1 - value0) * (beat / beats);
}

export function rateAtBeatTarget(value0, value1, timeConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // beat         = current beat
    const time = timeAtBeatTarget(value0, value1, timeConstant, beat);
    return rateAtTimeTarget(value0, value1, timeConstant, time);
}

export function rateAtBeatTargetBeats(value0, value1, beatConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // beat         = current beat
    const d = targetTimeConstant(value0, value1, beatConstant);
    return rateAtBeatTarget(value0, value1, d, beat);
}


/**
.rateAtBeatOfValues(v0, v1, c0, c1, d0, beats, beat)
Returns the rate at `beat` (relative to segment start) for a segment.
**/

export function rateAtBeatOfValues(v0, v1, c0, c1, d0, beats, beat) {
    return beat === 0 ? v0 :
        c1 === CURVES.linear ?      rateAtBeatLinearBeats(v0, v1, beats, beat) :
        c1 === CURVES.exponential ? rateAtBeatExponentialBeats(v0, v1, beats, beat) :
        c0 === CURVES.target ?      rateAtBeatTargetBeats(v0, v1, d0, beat) :
        v0 ;
}


/**
.locationAtBeat(events, beat)
Returns the location of a given `beat` in a flat array of automation events.
**/

export function locationAtBeatOfValues(v0, v1, c0, c1, d0, beats, beat) {
    // Returns time relative to e0 time, where b is beat from e0[0]
    return beat === 0 ? 0 :
        c1 === CURVES.linear ?      timeAtBeatLinearBeats(v0, v1, beats, beat) :
        c1 === CURVES.exponential ? timeAtBeatExponentialBeats(v0, v1, beats, beat) :
        c0 === CURVES.target ?      timeAtBeatTargetBeats(v0, v1, d0, beat) :
        timeAtBeatStep(v0, beat) ;
}

export function locationAtBeat(events, beat) {
    if (!beat) return 0;

    let loc = 0;
    let n = 0;
    let b0, c0, v0, d0, b1, c1, v1;

    while (events[n += 4] < beat) {
        b0 = events[n - 4];
        c0 = events[n - 3];
        v0 = c0 === CURVES.target ? events[n - 6] : events[n - 2];
        d0 = events[n - 1];
        b1 = events[n];
        c1 = events[n + 1];
        v1 = c0 === CURVES.target ? events[n - 2] : events[n + 2];
        loc += locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, b1 - b0);
    }

    b0 = events[n - 4];
    c0 = events[n - 3];
    v0 = c0 === CURVES.target ? events[n - 6] : events[n - 2];
    d0 = events[n - 1];
    b1 = events[n];
    c1 = events[n + 1];
    v1 = c0 === CURVES.target ? events[n - 2] : events[n + 2];
    return loc + locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, beat - b0);
}


/**
.beatAtLocation(events, location)
Returns the beat at a given `location` in a flat array of automation events.
**/

export function beatAtLocationOfValues(v0, v1, c0, c1, d0, beats, location) {
    // Returns beat relative to e0[0], where l is location from e0 time
    return location === 0 ? 0 :
        c1 === CURVES.linear ?      beatAtTimeLinearBeats(v0, v1, beats, location) :
        c1 === CURVES.exponential ? beatAtTimeExponentialBeats(v0, v1, beats, location) :
        c0 === CURVES.target ?      beatAtTimeTargetBeats(v0, v1, d0, location) :
        beatAtTimeStep(v0, location) ;
}

export function beatAtLocation(events, location) {
    if (!location) return 0;

    let loc = 0;
    let n = 0;
    let b0, c0, v0, d0, b1, c1, v1;

    while (events[n] !== undefined) {
        b0 = events[n];
        c0 = events[n + 1];
        v0 = c0 === CURVES.target ? events[n - 2] : events[n + 2];
        d0 = events[n + 3];
        b1 = events[n + 4];
        c1 = events[n + 5];
        v1 = c0 === CURVES.target ? events[n + 2] : events[n + 6];

        if (b1 === undefined) break;

        const d = locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, b1 - b0);
        if (b1 > b0 && loc + d >= location) break;

        loc += d;
        n += 4;
    }

    return b0 + beatAtLocationOfValues(v0, v1, c0, c1, d0, b1 - b0, location - loc);
}

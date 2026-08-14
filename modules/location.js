
import { CURVENUMBERS } from './event/curves.js';


// Beat at...

export function beatAtTimeStep(value0, time) {
    // value0 = start rate
    // time   = current time
    return time * value0;
}

export function beatAtTimeLinearBeats(value0, value1, beats, time) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // time     = current time
    const slope = (value1 - value0) / beats;
    return time * value0 + 0.5 * slope * time * time;
}

export function beatAtTimeExponentialBeats(value0, value1, beats, time) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // time     = current time
    const n = value1 / value0;
    const d = beats * Math.log(n) / (value0 * (n - 1));
    return beatAtTimeExponential(value0, value1, d, time);
}

export function beatAtTimeExponential(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    const n = value1 / value0;
    return duration * value0 * (Math.pow(n, time / duration) - 1) / Math.log(n);
}


// Time at...

export function timeAtBeatStep(value0, beat) {
    // value0 = start rate
    // beat   = current beat
    return beat / value0;
}

export function timeAtBeatLinear(value0, value1, beats, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // beat     = current beat
    const slope = (value1 - value0) / beats;

    // For a linear rate change, we solve the quadratic equation:
    // beat = value0 * t + 0.5 * slope * t^2
    if (Math.abs(slope) < 1e-10) return beat / value0;

    // Quadratic formula: (-b + sqrt(b^2 + 4ac)) / 2a where
    // a = 0.5 * slope, b = value0, c = -beat
    return (Math.sqrt(value0 * value0 + 2 * slope * beat) - value0) / slope;
}

export function timeAtBeatExponential(value0, value1, beats, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // beat     = current beat
    const n = value1 / value0;
    return beats * Math.log(1 + beat * (n - 1) / beats) / (value0 * (n - 1));
}

export function timeAtBeatExponentialDuration(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    const n = value1 / value0;
    const c = 1 / duration;
    const logn = Math.log(n);
    return duration * Math.log(1 + beat * c * logn / value0) / logn;
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

export function rateAtTimeTarget(value0, value1, constant, time) {
    // value0   = start rate
    // value1   = target rate
    // constant = time constant for the exponential approach
    // time     = current time
    return value0 + (value1 - value0) * (1 - Math.exp(-time / constant));
}

export function rateAtBeatStep(value0, value1, beats, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // beat     = current beat
    return beat >= beats ? value1 : value0;
}

export function rateAtBeatLinear(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beat count from start to end
    // beat   = current beat
    const time     = timeAtBeatLinear(value0, value1, beats, beat);
    const duration = timeAtBeatLinear(value0, value1, beats, beats);
    return rateAtTimeLinear(value0, value1, duration, time);
}

export function rateAtBeatExponential(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beat count from start to end
    // beat   = current beat
    const n = value1 / value0;
    const a = Math.pow(n, 1 / beats);
    const x = (1 - Math.pow(a, -beat)) / (1 - Math.pow(a, -beats));
    return value0 * Math.pow(n, x);
}

export function rateAtBeatTargetDuration(value0, value1, timeConstant, beat) {
    // value0      = start rate
    // value1      = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // beat        = current beat
    const time = timeAtBeatTargetDuration(value0, value1, timeConstant, beat);
    return rateAtTimeTarget(value0, value1, timeConstant, time);
}

export function rateAtBeatTarget(value0, value1, beatConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // beat         = current beat

    // When automating rate with a target curve, the rate at a given beat position
    // requires calculating what time corresponds to that beat position, then
    // evaluating the target function at that time.

    // First find the corresponding time for this beat
    const time = timeAtBeatTarget(value0, value1, beatConstant, beat);

    // Then calculate the rate at that time using the beat-based formula
    return value0 + (value1 - value0) * (1 - Math.exp(-value0 * time / beatConstant));
}


/**
.locationAtBeat(events, beat)
Returns the location of a given `beat` in a flat array of automation events.
**/

export function locationAtBeatOfValues(v0, v1, c0, c1, d0, beats, beat) {
    // Returns time relative to e0 time, where b is beat from e0[0]
    return beat === 0 ? 0 :
        c1 === CURVENUMBERS.linear ?      timeAtBeatLinear(v0, v1, beats, beat) :
        c1 === CURVENUMBERS.exponential ? timeAtBeatExponential(v0, v1, beats, beat) :
        c0 === CURVENUMBERS.target ?      timeAtBeatTarget(v0, v1, d0, beat) :
        c0 === CURVENUMBERS.curve ?       timeAtBeatCurve(v0, d0, beat) :
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
        v0 = events[n - 2];
        d0 = events[n - 1];
        b1 = events[n];
        c1 = events[n + 1];
        v1 = events[n + 2];
        loc += locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, b1 - b0);
    }

    b0 = events[n - 4];
    c0 = events[n - 3];
    v0 = events[n - 2];
    d0 = events[n - 1];
    b1 = events[n];
    c1 = events[n + 1];
    v1 = events[n + 2];
    return loc + locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, beat - b0);
}


/**
.beatAtLocation(events, location)
Returns the beat at a given `location` in a flat array of automation events.
**/

export function beatAtLocationOfValues(v0, v1, c0, c1, d0, beats, location) {
    // Returns beat relative to e0[0], where l is location from e0 time
    return location === 0 ? 0 :
        c1 === CURVENUMBERS.linear ?      beatAtTimeLinearBeats(v0, v1, beats, location) :
        c1 === CURVENUMBERS.exponential ? beatAtTimeExponentialBeats(v0, v1, beats, location) :
        c0 === CURVENUMBERS.target ?      beatAtTimeTargetBeats(v0, v1, d0, location) :
        c0 === CURVENUMBERS.curve ?       beatAtTimeCurveBeats(v0, d0, location) :
        beatAtTimeStep(v0, location) ;
}

export function beatAtLocation(events, location) {
    if (!location) return 0;

    let loc = 0;
    let l1  = 0;
    let n = -4;
    let b0, c0, v0, d0, b1, c1, v1;

    while (events[n += 4] !== undefined || (loc + l1 >= location)) {
        b0 = events[n];
        c0 = events[n + 1];
        v0 = events[n + 2];
        d0 = events[n + 3];
        b1 = events[n + 4];
        c1 = events[n + 5];
        v1 = events[n + 6];
        loc += l1;
        l1 = locationAtBeatOfValues(v0, v1, c0, c1, d0, b1 - b0, b1 - b0);
    }

    return b0 + beatAtLocationOfValues(v0, v1, c0, c1, d0, b1 - b0, location - loc);
}

















// --------------- Potential AI slop, to be checked and tested --------------- //


export function beatAtTimeTargetBeats(value0, value1, beatConstant, time) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // time         = current time

    // For a target curve where the parameter being automated is the rate itself,
    // we need to numerically integrate to find accumulated beats.

    // Calculate beat position using numerical integration
    let beatTotal = 0;
    const steps = 50;
    const dt = time / steps;

    for (let i = 0; i < steps; i++) {
        const t1 = i * dt;
        const t2 = (i + 1) * dt;

        // Rate at step boundaries with time constant in beats
        // The formula accounts for the self-referential nature of rate automation
        const rate1 = value0 + (value1 - value0) * (1 - Math.exp(-value0 * t1 / beatConstant));
        const rate2 = value0 + (value1 - value0) * (1 - Math.exp(-value0 * t2 / beatConstant));

        // Integrate with trapezoidal rule
        beatTotal += (rate1 + rate2) * 0.5 * dt;
    }

    return beatTotal;
}

export function beatAtTimeTarget(value0, value1, timeConstant, time) {
    // value0      = start rate
    // value1      = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // time        = current time
    const factor = 1 - Math.exp(-time / timeConstant);
    const avgRate = value0 + (value1 - value0) * (1 - 1 / factor * (1 - Math.exp(-factor)));
    return time * avgRate;
}

export function timeAtBeatTarget(value0, value1, beatConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // beatConstant = time constant expressed in beats
    // beat         = current beat

    // For a target curve where the parameter being automated is the rate itself,
    // we need to account for the recursive relationship between rate and beats.
    // The time constant in beats means we need to account for the changing beat length.

    // Start with a rough estimate based on average rate
    const avgRate = (value0 + value1) / 2;
    let time = beat / avgRate;

    // Use Newton-Raphson to find the time where we reach the beat
    const maxIterations = 20;
    const epsilon = 1e-10;

    for (let i = 0; i < maxIterations; i++) {
        // Calculate the beat accumulation at this time using numerical integration
        let currentBeat = 0;
        const steps = 50;
        const dt = time / steps;

        for (let j = 0; j < steps; j++) {
            const t1 = j * dt;
            const t2 = (j + 1) * dt;

            // Rate at step boundaries with time constant in beats
            // The instantaneous rate depends on the integral of rate itself
            const rate1 = value0 + (value1 - value0) * (1 - Math.exp(-value0 * t1 / beatConstant));
            const rate2 = value0 + (value1 - value0) * (1 - Math.exp(-value0 * t2 / beatConstant));

            // Integrate with trapezoidal rule
            currentBeat += (rate1 + rate2) * 0.5 * dt;
        }

        // Current rate at this time
        const currentRate = value0 + (value1 - value0) * (1 - Math.exp(-value0 * time / beatConstant));

        // Check convergence
        if (Math.abs(currentBeat - beat) < epsilon) {
            break;
        }

        // Update estimate
        time -= (currentBeat - beat) / currentRate;
        if (time < 0) time = 0;
    }

    return time;
}

export function timeAtBeatTargetDuration(value0, value1, timeConstant, beat) {
    // value0       = start rate
    // value1       = target rate
    // timeConstant = time constant for the exponential approach (in time units)
    // beat         = current beat

    // Requires numerical approximation since there's no closed-form solution.
    // Use Newton-Raphson method to find t where beatAtTimeTarget(t) = beat
    let time = beat / value0;

    // Usually converges in a few iterations
    for (let i = 0; i < 10; i++) {
        const currentBeat = beatAtTimeTarget(value0, value1, timeConstant, time);
        const rate        = value0 + (value1 - value0) * (1 - Math.exp(-time / timeConstant));
        if (Math.abs(currentBeat - beat) < 1e-10) break;
        time -= (currentBeat - beat) / rate;
        if (time < 0) time = 0;
    }

    return time;
}


/**
Curve automation functions
Functions for handling setCurveAtTime() style automation where
rate follows an arbitrary curve shape defined by an array of values.

In the following functions:
- curve (formerly value0/v0) contains the array of rate values over time
- beats parameter represents the beat duration over which the curve is applied

These functions adapt the WebAudio setCurveAtTime concept to work with
sequences defined in beats rather than absolute time.
**/

export function beatAtTimeCurveBeats(curve, beats, time) {
    // curve = array of actual values defining the curve shape
    // beats = beat duration over which the curve is applied
    // time  = current time

    // The curve array contains rate values that correspond to positions
    // in the beat duration. We need to calculate how many beats have
    // passed in the given time, considering that the rate changes.

    // For times beyond the curve duration, we need the total beats in the curve
    const totalBeats = beats; // The curve spans exactly 'beats' beats

    // Calculate the approximate time duration of the curve based on average rate
    const avgRate = curve.reduce((sum, val) => sum + val, 0) / curve.length;
    const estimatedTimeDuration = beats / avgRate;

    // Handle extrapolation beyond the curve
    if (time > estimatedTimeDuration) {
        // After the curve ends, continue at the final rate
        const finalRate = curve[curve.length - 1];
        return totalBeats + finalRate * (time - estimatedTimeDuration);
    }

    // For the region within the curve, use numerical integration
    // to account for continuously changing rate
    const segments = 100; // More segments = more accuracy
    const dt = time / segments;
    let beatTotal = 0;

    // Use a self-correcting approach that accounts for rate changes:
    // 1. Initial mapping from time to beat position based on average rate
    // 2. Look up the rate at that beat position
    // 3. Integrate to find actual beat accumulation
    let currentBeatPos = 0;

    for (let i = 0; i < segments; i++) {
        // Time points for this segment
        const t1 = i * dt;
        const t2 = (i + 1) * dt;

        // Estimate current beat position as percentage through total time
        // This is an approximation that gets refined through integration
        const beatRatio1 = t1 / estimatedTimeDuration;
        const beatRatio2 = t2 / estimatedTimeDuration;

        // Map to positions in the curve array (curve is defined over beat space)
        const pos1 = beatRatio1 * (curve.length - 1);
        const pos2 = beatRatio2 * (curve.length - 1);

        // Get integer and fractional parts for interpolation
        const idx1 = Math.floor(pos1);
        const idx2 = Math.floor(pos2);
        const frac1 = pos1 - idx1;
        const frac2 = pos2 - idx2;

        // Get interpolated rates at segment boundaries
        const rate1 = (idx1 >= curve.length - 1) ?
            curve[curve.length - 1] :
            curve[idx1] + frac1 * (curve[idx1 + 1] - curve[idx1]);

        const rate2 = (idx2 >= curve.length - 1) ?
            curve[curve.length - 1] :
            curve[idx2] + frac2 * (curve[idx2 + 1] - curve[idx2]);

        // Trapezoidal rule: average rate * time segment
        beatTotal += (rate1 + rate2) * 0.5 * dt;
    }

    return beatTotal;
}

// Helper function to calculate total beats across a curve
function calculateCurveBeatTotal(curve, beats) {
    // For curves representing rates, the total beats is exactly the beat duration
    // since the curve defines the entire span from 0 to beats
    return beats;
}

export function timeAtBeatCurve(curve, beats, beat) {
    // curve = array of actual values defining the curve shape
    // beats = beat duration over which the curve is applied
    // beat  = current beat

    // For finding time at a given beat with a curve, we need to use a
    // numerical approach since the rate changes across the curve

    // Calculate average rate from the curve to estimate time duration
    const avgRate = curve.reduce((sum, val) => sum + val, 0) / curve.length;
    const estimatedDuration = beats / avgRate;

    // Handle special cases
    if (beat > beats) {
        // Beyond the curve, use final rate for linear extrapolation
        const finalRate = curve[curve.length - 1];
        return estimatedDuration + (beat - beats) / finalRate;
    }

    if (beat < 0.00001) {
        return 0;
    }

    // For a beat within the curve range, directly sample the curve to get an initial rate estimate
    const beatRatio = beat / beats;
    const curvePos = beatRatio * (curve.length - 1);
    const idx = Math.floor(curvePos);
    const frac = curvePos - idx;

    // Get interpolated rate at this beat position
    const initialRate = (idx >= curve.length - 1) ?
        curve[curve.length - 1] :
        curve[idx] + frac * (curve[idx + 1] - curve[idx]);

    // Initial guess based on this rate (closer than using average rate)
    let t = beat / initialRate;

    // Refine using Newton-Raphson method
    const maxIterations = 20;
    const epsilon = 1e-10;

    for (let i = 0; i < maxIterations; i++) {
        const currentBeat = beatAtTimeCurveBeats(curve, beats, t);

        if (Math.abs(currentBeat - beat) < epsilon) {
            break;
        }

        // Get current rate for use as derivative approximation
        const timeRatio = t / estimatedDuration;
        const position = timeRatio * (curve.length - 1);
        const index = Math.floor(position);
        const fraction = position - index;

        // Get interpolated rate at this time position
        const currentRate = (index >= curve.length - 1) ?
            curve[curve.length - 1] :
            curve[index] + fraction * (curve[index + 1] - curve[index]);

        // Use current rate as derivative approximation (this is a simplification)
        const derivative = Math.max(currentRate, 0.001); // Prevent division by zero

        // Newton-Raphson step
        t = t - (currentBeat - beat) / derivative;

        // Constraints
        if (t < 0) t = 0;
        if (t > estimatedDuration && currentBeat < beat) {
            // If we're past duration but haven't reached target beat,
            // exit and use linear extrapolation
            return estimatedDuration + (beat - currentBeat) / curve[curve.length - 1];
        }
    }

    return t;
}

export function rateAtTimeCurve(curve, beats, time) {
    // curve = array of actual values defining the curve shape
    // beats = beat duration over which the curve is applied
    // time  = current time

    // For rate at time with a curve, we need to:
    // 1. Map from time to a position in the curve (which is defined in beat space)
    // 2. Interpolate between curve values to get the current rate

    // Calculate average rate to estimate the time span of the curve
    const avgRate = curve.reduce((sum, val) => sum + val, 0) / curve.length;
    const estimatedDuration = beats / avgRate;

    // Handle the case where time is beyond curve duration
    if (time >= estimatedDuration) {
        return curve[curve.length - 1]; // Final rate
    }

    // An approximate way to map from time to beat position:
    // 1. Find how far through time duration we are (0-1)
    // 2. Apply that same ratio to beats
    // 3. Look up the corresponding rate in the curve

    // This is an approximation since the rate changes non-linearly
    const timeRatio = time / estimatedDuration;
    const beatPosition = timeRatio * beats;
    const beatRatio = beatPosition / beats;

    // Map to position in curve array
    const position = beatRatio * (curve.length - 1);
    const index = Math.floor(position);
    const fraction = position - index;

    // Linear interpolation between adjacent curve points
    return (index >= curve.length - 1) ?
        curve[curve.length - 1] :
        curve[index] + fraction * (curve[index + 1] - curve[index]);
}

export function rateAtBeatCurve(curve, beats, beat) {
    // curve = array of actual values defining the curve shape
    // beats = beat duration over which the curve is applied
    // beat  = current beat

    // For rate at beat with a curve, we have a direct mapping since
    // the curve is defined in beat space - we just need to find where
    // in the curve array this beat position falls

    // Handle case where beat is beyond the curve
    if (beat >= beats) {
        return curve[curve.length - 1]; // Final rate
    }

    // Direct lookup in beat space - no time conversion needed
    const beatRatio = beat / beats;
    const position = beatRatio * (curve.length - 1);
    const index = Math.floor(position);
    const fraction = position - index;

    // Handle boundaries and perform linear interpolation
    if (index < 0) {
        return curve[0]; // Before start of curve
    }

    if (index >= curve.length - 1) {
        return curve[curve.length - 1]; // At or beyond end of curve
    }

    // Linear interpolation between adjacent points
    return curve[index] + fraction * (curve[index + 1] - curve[index]);
}

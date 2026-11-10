
import {
    assert,
    assertEquals as equals,
    assertAlmostEquals as almost
} from 'jsr:@std/assert@1';

import { CURVES } from '../modules/event/curves.js';
import {
    beatAtTimeStep,
    beatAtTimeLinear,
    beatAtTimeLinearBeats,
    beatAtTimeExponential,
    beatAtTimeExponentialBeats,
    beatAtTimeTarget,
    beatAtTimeTargetBeats,
    timeAtBeatStep,
    timeAtBeatLinear,
    timeAtBeatLinearBeats,
    timeAtBeatExponential,
    timeAtBeatExponentialBeats,
    timeAtBeatTarget,
    timeAtBeatTargetBeats,
    rateAtTimeStep,
    rateAtTimeLinear,
    rateAtTimeExponential,
    rateAtTimeTarget,
    rateAtBeatStep,
    rateAtBeatStepBeats,
    rateAtBeatLinear,
    rateAtBeatLinearBeats,
    rateAtBeatExponential,
    rateAtBeatExponentialBeats,
    rateAtBeatTarget,
    rateAtBeatTargetBeats,
    locationAtBeat,
    beatAtLocation
} from '../modules/location.js';


Deno.test('location: step curve functions', () => {
    equals(beatAtTimeStep(2, 3), 6);
    equals(timeAtBeatStep(2, 6), 3);
    equals(rateAtTimeStep(2, 4, 5, 3), 2);
    equals(rateAtTimeStep(2, 4, 5, 5), 4);
    equals(rateAtBeatStep(2, 4, 2.5, 3), 2);
    equals(rateAtBeatStep(2, 4, 2.5, 5), 4);
    equals(rateAtBeatStepBeats(2, 4, 5, 3), 2);
    equals(rateAtBeatStepBeats(2, 4, 5, 5), 4);
});

Deno.test('location: linear ramp functions (WebAudio linearRampToValueAtTime)', () => {
    // Ramp from rate 1 to rate 3 over 4 beats:
    // Average rate = (1 + 3) / 2 = 2, so total time duration = 4 / 2 = 2s
    const v0 = 1, v1 = 3, beats = 4, duration = 2;

    almost(timeAtBeatLinearBeats(v0, v1, beats, 0), 0, 1e-12);
    almost(timeAtBeatLinearBeats(v0, v1, beats, beats), duration, 1e-12);
    almost(beatAtTimeLinearBeats(v0, v1, beats, duration), beats, 1e-12);
    almost(beatAtTimeLinear(v0, v1, duration, duration), beats, 1e-12);

    // Rate at endpoints
    almost(rateAtBeatLinearBeats(v0, v1, beats, 0), v0, 1e-12);
    almost(rateAtBeatLinearBeats(v0, v1, beats, beats), v1, 1e-12);

    // At half duration (t = 1s), rate is 2, and accumulated beats = 1*1 + 0.5*1*1 = 1.5
    almost(beatAtTimeLinearBeats(v0, v1, beats, 1), 1.5, 1e-12);
    almost(timeAtBeatLinearBeats(v0, v1, beats, 1.5), 1, 1e-12);
    almost(rateAtBeatLinearBeats(v0, v1, beats, 1.5), 2, 1e-12);

    // Round-trip across intermediate beats
    for (const b of [0.25, 1, 2, 3.5, 4]) {
        const t = timeAtBeatLinearBeats(v0, v1, beats, b);
        almost(beatAtTimeLinearBeats(v0, v1, beats, t), b, 1e-12);
        almost(timeAtBeatLinear(v0, v1, duration, b), t, 1e-12);
        almost(rateAtBeatLinearBeats(v0, v1, beats, b), rateAtTimeLinear(v0, v1, duration, t), 1e-12);
        almost(rateAtBeatLinear(v0, v1, duration, b), rateAtTimeLinear(v0, v1, duration, t), 1e-12);
    }

    // Degenerate case: flat ramp (v0 === v1)
    almost(timeAtBeatLinearBeats(2, 2, 4, 3), 1.5, 1e-12);
    almost(beatAtTimeLinearBeats(2, 2, 4, 1.5), 3, 1e-12);
    almost(rateAtBeatLinearBeats(2, 2, 4, 3), 2, 1e-12);
});

Deno.test('location: exponential ramp functions (WebAudio exponentialRampToValueAtTime)', () => {
    const v0 = 1, v1 = 4, beats = 6;
    const duration = beats * Math.log(v1 / v0) / (v1 - v0);

    almost(timeAtBeatExponentialBeats(v0, v1, beats, 0), 0, 1e-12);
    almost(timeAtBeatExponentialBeats(v0, v1, beats, beats), duration, 1e-12);
    almost(beatAtTimeExponentialBeats(v0, v1, beats, duration), beats, 1e-12);
    almost(beatAtTimeExponential(v0, v1, duration, duration), beats, 1e-12);

    // Rate at endpoints and midpoint
    almost(rateAtBeatExponentialBeats(v0, v1, beats, 0), v0, 1e-12);
    almost(rateAtBeatExponentialBeats(v0, v1, beats, beats), v1, 1e-12);
    almost(rateAtBeatExponentialBeats(v0, v1, beats, 3), 2.5, 1e-12);

    // Round-trip and consistency between time-space and beat-space
    for (const b of [0.5, 1.5, 3, 4.5, 6]) {
        const t = timeAtBeatExponentialBeats(v0, v1, beats, b);
        almost(beatAtTimeExponentialBeats(v0, v1, beats, t), b, 1e-12);
        almost(timeAtBeatExponential(v0, v1, duration, b), t, 1e-12);
        almost(rateAtBeatExponentialBeats(v0, v1, beats, b), rateAtTimeExponential(v0, v1, duration, t), 1e-12);
        almost(rateAtBeatExponential(v0, v1, duration, b), rateAtTimeExponential(v0, v1, duration, t), 1e-12);
    }

    // Degenerate case: flat ramp (v0 === v1)
    almost(timeAtBeatExponentialBeats(2, 2, 4, 3), 1.5, 1e-12);
    almost(beatAtTimeExponentialBeats(2, 2, 4, 1.5), 3, 1e-12);
});

Deno.test('location: target curve functions (WebAudio setTargetAtTime)', () => {
    const v0 = 1, v1 = 4, tau = 2, beatConstant = 3;

    // At t = 0, beat is 0; at t = tau, beat = v1*tau - (v1 - v0)*tau*(1 - 1/e)
    almost(beatAtTimeTarget(v0, v1, tau, 0), 0, 1e-12);
    const expectedAtTau = v1 * tau - (v1 - v0) * tau * (1 - 1 / Math.E);
    almost(beatAtTimeTarget(v0, v1, tau, tau), expectedAtTau, 1e-12);
    almost(timeAtBeatTarget(v0, v1, tau, expectedAtTau), tau, 1e-12);

    // At beat = beatConstant, rate has moved (1 - 1/e) of the way from v0 to v1
    const expectedRateAtBeatConstant = v0 + (v1 - v0) * (1 - 1 / Math.E);
    almost(rateAtBeatTargetBeats(v0, v1, beatConstant, beatConstant), expectedRateAtBeatConstant, 1e-12);

    // Round-trip for accelerating (1 -> 4) and decelerating (4 -> 1) target curves
    for (const [start, target] of [[1, 4], [4, 1], [2, 2]]) {
        for (const b of [0, 0.1, 1, 3, 10, 25]) {
            const t = timeAtBeatTargetBeats(start, target, beatConstant, b);
            almost(beatAtTimeTargetBeats(start, target, beatConstant, t), b, 1e-11);

            const td = timeAtBeatTarget(start, target, tau, b);
            almost(beatAtTimeTarget(start, target, tau, td), b, 1e-11);
            almost(rateAtBeatTarget(start, target, tau, b), rateAtTimeTarget(start, target, tau, td), 1e-11);
        }
    }
});

Deno.test('location: locationAtBeat() and beatAtLocation() multi-segment round-trip', () => {
    // [beat, curve, value, duration]
    // 0..4:   linear ramp from rate 1 to 2 (duration = 2*4/(1+2) = 8/3)
    // 4..8:   exponential ramp from rate 2 to 4 (duration = 4*ln(2)/2 = 2*ln(2))
    // 8..12:  step at rate 4 (duration = 4/4 = 1)
    // 12..16: target from rate 4 toward rate 1 with beatConstant 2
    // 16..20: step at rate 2
    const events = [
        0,  CURVES.step,        1, 0,
        4,  CURVES.linear,      2, 0,
        8,  CURVES.exponential, 4, 0,
        12, CURVES.target,      1, 2,
        16, CURVES.step,        2, 0
    ];

    almost(locationAtBeat(events, 0), 0, 1e-12);
    almost(locationAtBeat(events, 4), 8 / 3, 1e-12);
    almost(locationAtBeat(events, 8), 8 / 3 + 2 * Math.log(2), 1e-12);
    almost(locationAtBeat(events, 12), 8 / 3 + 2 * Math.log(2) + 1, 1e-12);

    // Every beat from 0 to 20 should invert cleanly via beatAtLocation
    for (let b = 0; b <= 20; b += 0.5) {
        const loc = locationAtBeat(events, b);
        almost(beatAtLocation(events, loc), b, 1e-10);
    }
});

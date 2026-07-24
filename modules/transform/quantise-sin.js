// Swing quantisation for 4πx^n formula
// y = cos(4πx^n) maps beats to phase values in [-1, 1]
// We invert this to quantise beats with a swing rhythm

// Example usage:
// n = 1: straight (eighth beats at 0.5, 1.5, etc. in 4 half-cycles)
// n = 1.7095: triplet-like swing (first trough near 0.5)

// If you have 16 sixteenth-beat positions in the measure:
// const sixteenthBeats = [1/16, 2/16, 3/16, ..., 16/16];
// const swungBeats = quantiseBeats(sixteenthBeats, 1.7095);


const { asin, sin, log, pow, floor, round, PI } = Math;
const tau = 2 * PI;


/**
swingToExponent(x, k=1)
For the `k`th zero crossing of sin(2πx^n) happening at `x`, where `k` must be
a positive integer, returns exponent `n`.
**/

function swingToExponent(x, k = 1) {
    if (k <= 0) throw new Error("k must be a positive integer for real solutions with x < 1");
    return log(k/2) / log(x);
}

/**
qsin(scale, x)
Takes some value `x`, finds `y = sin(x)`, then scales `y` by multiplying by
`scale`, in effect reducing the range of y from `[-1, 1]` to `[-scale, scale]`,
and returns the inverse sin of that, giving a 'quantised' version of x.
**/

export function qsin(scale = 1, x = 0) {
    const crossing = round(x / PI);
    const y = scale * sin(x);
    return crossing % 2 === 0 ?
        crossing * PI + asin(y) :
        crossing * PI - asin(y) ;
}

/**
quantiseSin(swing, strength, beat)

Quantises `beat` 0-1 to beat with `swing` 0-1 (where 0.5 means straight eighths)
by `strength` 0-1 (where 0 has no effect and 1 is full quantisation), and using
the formula `sin(2π * beat^n)`, where n is derived from `swing`.

Examples plotted at https://www.desmos.com/calculator/lgjq6btx2y
**/

export function quantiseSin(swing, strength, beat) {
    const b     = floor(beat);
    const n     = swingToExponent(swing);
    const x1    = pow(beat - b, n) * tau;
    const scale = 1 - strength;
    const x2    = qsin(scale, x1);
    return b + pow(x2 / tau, 1 / n);
}

/**
quantiseReversedSin(swing, strength, beat)

Quantises `beat` 0-1 to beat with `swing` 0-1 (where 0.5 means straight eighths)
by `strength` 0-1 (where 0 has no effect and 1 is full quantisation), and using
the formula `1 - sin(2π * (1 - beat)^n)`, where n is derived from `swing`.

Examples plotted at https://www.desmos.com/calculator/lgjq6btx2y
**/

export function quantiseReversedSin(swing, strength, beat) {
    const b     = floor(beat);
    const n     = swingToExponent(1 - swing);
    const x1    = pow(1 - (beat - b), n) * tau;
    const scale = 1 - strength;
    const x2    = qsin(scale, x1);
    return b + 1 - pow(x2 / tau, 1 / n);
}

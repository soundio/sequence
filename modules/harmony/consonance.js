
import gcd from 'fn/gcd.js';


const { min, sqrt } = Math;

// A multiplication factor we use to turn floats into integer maths to avoid
// rounding errors. Essentially a common numerator. Stack all the primes.
const factor = 37 * 31 * 29 * 23 * 19 * 17 * 13 * 11 * 7 * 5 * 3 * 2;

// Just interval ratios
const intervals = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 10/6, 9/5, 15/8];
let i = intervals.length - 1;
while (++i < 128) {
    intervals.push(intervals[i - 12] * 2);
}

// Just intervals expressed as integers
const factorvals = intervals.map((n) => n * factor);

function toFactorval(n) {
    return factorvals[n];
}

// Get consonance of array of note numbers
export default function consonance(numbers) {
    const m = min.apply(Math, numbers);
    let n = -1;
    let d = factor;
    let x;
    // Transpose so lowest number is 0, get factorval, find common denominator
    while ((x = numbers[++n]) !== undefined) d = gcd(d, toFactorval(x - m));
    // Square root is an attempt to linearise the resulting number scale, I
    // think, but I suspect some logarithmic thing is more suitable
    return d / factor;

    // The old way
    //var arr = floorAll(numbers);
    //return sqrt(arr.map(toFactorval).reduce(gcd, factor) / factor);
}


import { CURVENAMES, CURVENUMBERS } from '../event/curves.js';
import { PARAMNAMES, PARAMNUMBERS } from '../event/params.js';

export const PARAMBITS = 12;
export const PARAMMASK = Math.pow(2, PARAMBITS) - 1;
export const CURVEBITS = 4;
export const CURVEMASK = Math.pow(2, CURVEBITS) - 1;


/**
parseAddress(path)
Parses a string like "gain.exponential" into a 16-bit packed address.
Format: [PPPPPPPPPPPP][CCCC] - param(12 bits), curve(4 bits)
**/
export function parseAddress(path) {
    const parts = path.split('.');
    const curvePart = parts[1];
    const paramPart = parts[0];

    const curveNumber = curvePart ? (CURVENUMBERS[curvePart] || 0) : 0;
    const paramNumber = PARAMNUMBERS[paramPart] || 0;

    return (paramNumber << CURVEBITS) | curveNumber;
}

/**
toPath(n)
Converts a 16-bit packed address back to a string path.
**/
export function toPath(n) {
    const curveNumber = n & CURVEMASK;
    const paramNumber = (n >> CURVEBITS) & PARAMMASK;

    const param = PARAMNAMES[paramNumber] || paramNumber;
    const curve = CURVENAMES[curveNumber];

    return curve ? param + '.' + curve : param;
}

/**
toParamNumber(n)
Extracts the 12-bit param number from packed address.
**/
export function toParamNumber(n) {
    return (n >> CURVEBITS) & PARAMMASK;
}

/**
toCurveNumber(n)
Extracts the 4-bit curve number from packed address.
**/
export function toCurveNumber(n) {
    return n & CURVEMASK;
}

/**
toParamName(n)
Extracts the param name string from packed address.
**/
export function toParamName(n) {
    const paramNumber = toParamNumber(n);
    return PARAMNAMES[paramNumber] || paramNumber;
}

/**
toCurveName(n)
Extracts the curve name string from packed address.
**/
export function toCurveName(n) {
    return CURVENAMES[toCurveNumber(n)];
}

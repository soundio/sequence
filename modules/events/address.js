
import { CURVENAMES, CURVENUMBERS } from '../event/curves.js';
import { PARAMNAMES, PARAMNUMBERS } from '../event/params.js';
import { TYPENAMES, TYPENUMBERS }   from '../event/types.js';

export const ROUTEBITS = 2;
export const PARAMBITS = 10;
export const CURVEBITS = 4;

export const ROUTEMASK = (1 << ROUTEBITS) - 1;
export const PARAMMASK = (1 << PARAMBITS) - 1;
export const CURVEMASK = (1 << CURVEBITS) - 1;


/**
packAddress(route, name, curve)
Packs route, name, and curve into a 16-bit address.
Format: [RR][NNNNNNNNNN][CCCC] - route(2 bits), name(10 bits), curve(4 bits)
**/
export function packAddress(route, name, curve) {
    return (route << 14) | (name << 4) | curve;
}

/**
unpackAddress(address)
Unpacks a 16-bit address into route, param, and curve components.
Returns an object: { route, param, curve }
**/
export function unpackAddress(address) {
    return {
        route: address >> 14,
        param: (address >> CURVEBITS) & PARAMMASK,
        curve: address & CURVEMASK
    };
}

/**
toRoute(address)
Extracts the 2-bit route from packed address.
**/
export function toRoute(address) {
    return address >> 14;
}

/**
toParamNumber(address)
Extracts the 10-bit param/name number from packed address.
**/
export function toParamNumber(address) {
    return (address >> CURVEBITS) & PARAMMASK;
}

/**
toCurveNumber(address)
Extracts the 4-bit curve number from packed address.
**/
export function toCurveNumber(address) {
    return address & CURVEMASK;
}

/**
toTypeName(address)
Extracts the type name string from packed address (for route 0).
**/
export function toTypeName(address) {
    const nameNumber = toParamNumber(address);
    return TYPENAMES[nameNumber] || nameNumber;
}

/**
toParamName(address)
Extracts the param name string from packed address (for route 1).
**/
export function toParamName(address) {
    const nameNumber = toParamNumber(address);
    return PARAMNAMES[nameNumber] || nameNumber;
}

/**
toCurveName(address)
Extracts the curve name string from packed address.
**/
export function toCurveName(address) {
    const curveNumber = toCurveNumber(address);
    return CURVENAMES[curveNumber];
}

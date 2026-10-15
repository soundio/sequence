
//export const ROUTEBITS = 2;
export const PARAMBITS = 12;
export const CURVEBITS = 4;

//export const ROUTEMASK = (1 << ROUTEBITS) - 1;
export const PARAMMASK = (1 << PARAMBITS) - 1;
export const CURVEMASK = (1 << CURVEBITS) - 1;


/**
packAddress(route, name, curve)
Packs route, name, and curve into a 16-bit address.
Format: [RR][NNNNNNNNNN][CCCC] - route(2 bits), name(10 bits), curve(4 bits)
**/
export function packAddress(/*route,*/ name, curve) {
//    return (route << 14) | (name << 4) | curve;
    return (name << CURVEBITS) | curve;
}

/**
unpackAddress(address)
Unpacks a 16-bit address into route, param, and curve components.
Returns an object: { route, param, curve }
**/
export function unpackAddress(address) {
    return {
//        route: address >> 14,
        param: (address >> CURVEBITS) & PARAMMASK,
        curve: address & CURVEMASK
    };
}

/**
unpackRoute(address)
Extracts the 2-bit route from packed address.
**/
/*export function unpackRoute(address) {
    return address >> 14;
}*/

/**
unpackParam(address)
Extracts the 10-bit param/name number from packed address.
**/
export function unpackParam(address) {
    return (address >> CURVEBITS) & PARAMMASK;
}

/**
unpackCurve(address)
Extracts the 4-bit curve number from packed address.
**/
export function unpackCurve(address) {
    return address & CURVEMASK;
}

//import Transform from './transform/transforms.js';
//import Displace  from './transform/displace.js';
//import Rate      from './transform/rate.js';
//import Transpose from './transform/transpose.js';
//import Gain      from './transform/gain.js';
//import Swing     from './transform/swing.js';
//
//Transform.register(Displace);
//Transform.register(Rate);
//Transform.register(Transpose);
//Transform.register(Gain);
//Transform.register(Swing);

//export default Transform;





// ---------------------




function applyTransform(object, transforms, n, fn) {
    switch (fn.length) {
        // If there's a more efficient way I want to know what it is
        case 0: return fn(object);
        case 1: return fn(object, transforms[++n]);
        case 2: return fn(object, transforms[++n], transforms[++n]);
        case 3: return fn(object, transforms[++n], transforms[++n], transforms[++n]);
        case 4: return fn(object, transforms[++n], transforms[++n], transforms[++n], transforms[++n]);
        case 5: return fn(object, transforms[++n], transforms[++n], transforms[++n], transforms[++n], transforms[++n]);
        // Default to dynamic arguments length
        default: {
            const args = [object];
            for (let i = 0; i < fn.length; i++) args.push(transforms[++n]);
            return fn.apply(null, args);
        }
    }
}

function apply(registry, object, transforms, n = 0) {
    const identifier = transforms[n];
    // No transforms left to read, return object
    if (identifier === undefined) return object;
    // Get transform number
    const number = typeof identifier === 'string' ?
        Transform.TRANSFORMNUMBERS[identifier] :
        identifier ;
    // Find function
    const fn = registry[number].apply;
    // Apply current transform
    object = applyTransform(object, transforms, n, fn);
    // Then apply following transforms
    return apply(registry, object, transforms, n + fn.length + 1);
}

function unapply(registry, object, transforms, n = 0) {
    const identifier = transforms[n];
    // No transforms left to read
    if (identifier === undefined) return object;
    // Get transform number
    const number = typeof identifier === 'string' ?
        Transform.TRANSFORMNUMBERS[identifier] :
        identifier ;
    // Find function
    const fn = registry[number].unapply;
    // Apply following transform first
    object = unapply(registry, object, transforms, n + fn.length + 1);
    // Then apply current transform
    return applyTransform(object, transforms, n, fn);
}

export default class Transform {
    constructor(instructions, index = 0) {
        this.instructions = instructions;
        this.index = index;
    }

    apply(object) {
        return apply(Transform.#registry, object, this.instructions, this.index);
    }

    unapply(object) {
        return unapply(Transform.#registry, object, this.instructions, this.index);
    }

    toJSON() {
        const array = [];
        const instructions = this.instructions;
        let n = this.index - 1;
        while (instructions[++n]) array.push(instructions[n]);
        return array;
    }

    toString() {
        return this.toJSON().join(' ');
    }

    static from(array, index) { return new Transform(array, index); }
    static of()               { return new Transform(arguments); }

    static #registry = {};
    static #id       = 0;

    static register(transform) {
        // Validate
        const name  = transform.name;
        if (!name)              throw new Error(`Transform.register() transform must have name property`);
        if (!transform.apply)   throw new Error(`Transform.register() transform must have function apply()`);
        if (!transform.unapply) throw new Error(`Transform.register() transform must have function unapply()`);
        if (!transform.BYTES)   throw new Error(`Transform.register() class ${ transform.BYTES } must have static property BYTES`);
        if (transform.apply.length !== transform.unapply.length) throw new Error(`Transform.register() transform apply() and unapply() must take the same number of parmaeters`);
        if (Transform.TRANSFORMNUMBERS[name]) throw new Error(`Transform.register() transform name ${ name } already registered`);

        // Register
        const registry = Transform.#registry;
        const id       = ++Transform.#id;

        console.log(`Transform registering ${ id } "${ name }" ${ constructor.BYTES } Bytes`);
        registry[id] = transform;
        Transform.TRANSFORMLENGTHS[id]   = transform.apply.length;
        Transform.TRANSFORMBYTES[id]     = transform.BYTES;
        Transform.TRANSFORMNAMES[id]     = name;
        Transform.TRANSFORMNUMBERS[name] = id;
    }

    static TRANSFORMBYTES   = {};
    static TRANSFORMLENGTHS = {};
    static TRANSFORMNAMES   = {};
    static TRANSFORMNUMBERS = {};
}

/**
toTransformName(value)
Converts a transform name or number to a transform name string.
**/
export function toTransformName(value) {
    if (typeof value === 'string' && value in TRANSFORMNUMBERS) return value;
    if (typeof value === 'number' && value in TRANSFORMNAMES) return TRANSFORMNAMES[value];
    throw new Error(`Transform "${ value }" not recognised`);
}


export function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}

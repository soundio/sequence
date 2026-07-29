
import * as identity from './identity.js';

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
    const number = transforms[n];
    // No transforms left to read, return object
    if (number === undefined) return object;
    // Find function
    const fn = registry[number].apply;
    // Apply current transform
    object = applyTransform(object, transforms, n, fn);
    // Then apply following transforms
    return apply(registry, object, transforms, n + fn.length + 1);
}

function unapply(registry, object, transforms, n = 0) {
    const number = transforms[n];
    // No transforms left to read
    if (number === undefined) return object;
    // Find function
    const fn = registry[number].unapply;
    // Apply following transform first
    object = unapply(registry, object, transforms, n + fn.length + 1);
    // Then apply current transform
    return applyTransform(object, transforms, n, fn);
}

export default class Transform {
    constructor(instructions, index = 0) {
        // Validate
        if (!instructions) throw new Error(`Transform() requires array, got ${ instructions}`);
        // Set
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
        while (instructions[++n]) {
            const id   = instructions[n];
            // Push in transform name
            const name = Transform.NAMES[id];
            array.push(name);
            // Push in transform params
            let p = Transform.TRANSFORMLENGTHS[id];
            while (p--) array.push(instructions[++n]);
        }
        return array;
    }

    toString() {
        return this.toJSON().join(' ');
    }

    static from(array, index) {
        return new Transform(array, index);
    }

    static of() {
        const array = [];
        let n = -1;
        while(arguments[++n] !== undefined) {
            // Get transform number for looking up parameter count
            const number = typeof arguments[n] === 'string' ?
                Transform.TYPES[arguments[n]] :
                arguments[n] ;
            array.push(number);
            // Copy transform parameters without conversion
            let m = Transform.TRANSFORMLENGTHS[number];
            while (m--) array.push(arguments[++n]);
        }

        return new Transform(array);
    }

    static #registry = {};
    static #id       = -1;

    static BYTES = {};
    static TRANSFORMLENGTHS = {};
    static NAMES = {};
    static TYPES = {};

    static identity = identity;

    static register(transform) {
        const { name, apply, unapply, BYTES } = transform;

        // Validate
        if (!name)    throw new Error(`Transform.register() transform must export const name`);
        if (!apply)   throw new Error(`Transform.register() transform "${ name }" must export function apply()`);
        if (!unapply) throw new Error(`Transform.register() transform "${ name }" must export function unapply()`);
        if (!BYTES)   throw new Error(`Transform.register() transform "${ name }" must export const BYTES`);
        if (apply.length !== unapply.length) throw new Error(`Transform.register() transform apply() and unapply() must take same parmaeters`);
        if (Transform.TYPES[name]) throw new Error(`Transform.register() transform name ${ name } already registered`);

        // Register
        const registry = Transform.#registry;
        const id       = ++Transform.#id;

        registry[id] = transform;
        Transform.TRANSFORMLENGTHS[id] = apply.length - 1;
        Transform.BYTES[id]   = BYTES;
        Transform.NAMES[id]   = name;
        Transform.TYPES[name] = id;

        console.log(`%cTransform %ctype ${ id } - ${ BYTES } bytes (${ apply.length - 1 } params) - "${ name }"`, 'color:#b5002f;font-weight:600;', 'color:#8e9e9d;');

        return transform;
    }
}

Transform.identity = Transform.register(identity);

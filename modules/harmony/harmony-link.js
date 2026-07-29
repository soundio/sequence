
import cache      from 'fn/cache-by-key.js';
import last       from 'fn/last.js';
import intersect  from 'fn/lists/intersect.js';
import mod        from 'fn/mod.js';
import mod12      from '../number/mod-12.js';
import difference from './difference.js';
import define     from './define.js';
import { parallelism, contraryParallelism } from './parallelism.js';


function increment(n) {
    return n + 1;
}

function decrement(n) {
    return n - 1;
}

function countUnion(array1, array2) {
    let length = array1.length + array2.length;
    let n = array1.length;
    while (n--) if (array2.includes(array1[n])) --length;
    return length;
}

function isDiatonicTo(arr1, arr2, wrap = 12) {
    // We may only be diatonic to scales within an octave
    if (last(arr1) > 11) return false;

    // Check if every member of arr2, wrapped, exists in arr1
    let n = -1;
    while (arr2[++n] !== undefined) {
        if (!arr1.includes(mod(wrap, arr2[n]))) {
            return false;
        }
    }
    return true;
}

const sum = cache((a) => (b) => a + b);

export default class HarmonyLink {
    constructor(a, b, shift = 0) {
        const key = `${ a.id }:${ b.id }:${ shift }`;
        if (HarmonyLink[key]) return HarmonyLink[key];
        HarmonyLink[key] = this;
        this.id      = key;
        this.source  = a;
        this.target  = b;
        this.shift   = shift;
        // Increment link count
        ++HarmonyLink.count;
    }

    get numbers() {
        const value = this.shift ?
            Int8Array.from(this.target.numbers, sum(this.shift)) :
            this.target.numbers ;
        define('numbers', this, value);
        return value;
    }

    get superset() {
        const { source, numbers } = this;
        const value =
            numbers.length < source.numbers.length + 1 ? false :
            difference(source.numbers, numbers).length ? false :
            true ;
        define('superset', this, value);
        return value;
    }

    get subset() {
        const { source, numbers } = this;
        const value =
            numbers[0] < 0 ? false :
            numbers.length > source.numbers.length - 1 ? false :
            difference(numbers, source.numbers).length ? false :
            true ;

        define('subset', this, value);
        return value;
    }

    get chromaticism() {
        const { source, numbers } = this;
        const down = intersect(source.numbers, numbers.map(increment));
        const up   = intersect(source.numbers, numbers.map(decrement));
        const value = countUnion(down, up) / source.numbers.length;
        define('chromaticism', this, value);
        return value;
    }

    get parallelism() {
        const { source, target } = this;
        const value = parallelism(source.numbers, target.numbers);
        define('parallelism', this, value);
        return value;
    }

    get contraryParallelism() {
        const { source, target } = this;
        const value = contraryParallelism(source.numbers, target.numbers);
        define('contraryParallelism', this, value);
        return value;
    }

    get diatonic() {
        // We may only be diatonic to scales within an octave
        if (last(this.target.numbers) > 11) return false;
        //
        const numbers = this.shift ?
            this.numbers.map(mod12) :
            this.numbers ;
        return isDiatonicTo(numbers, this.source.numbers);
    }

    /**
    .link(object, shift)
    Calls the target node's `.link` with this link's `.shift` subtracted to
    provide simple chaining of harmony links. Not clear that this is useful yet!
    ```
    node.link().link();
    ```
    **
    link(object, shift = 0) {
        return this.target.link(object, shift - this.shift);
    }
    */

    static count = 0;
    static from(a, b, shift) { return new HarmonyLink(a, b, shift); }
}

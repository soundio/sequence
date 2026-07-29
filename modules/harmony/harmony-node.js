
import cache       from 'fn/cache-by-key.js';
import last        from 'fn/last.js';
import mod         from 'fn/mod.js';
import nothing     from 'fn/nothing.js';
import { hsidToNumbers, hsidFrom as toHSID, MAX_INTERVAL } from './hsid.js';
import mod12       from '../number/mod-12.js';
import difference from './difference.js';
import union       from './union.js';
import consonance  from './consonance.js';
import define      from './define.js';
import HarmonyLink from './harmony-link.js';


const assign = Object.assign;
const freeze = Object.freeze;
const { ceil, floor } = Math;


function isSubset(arr1, arr2) {
    // Is arr2 a subset of arr1?
    var n = arr2.length;

    while (n--) {
        if (arr1.indexOf(arr2[n]) === -1) {
            return false;
        }
    }

    return true;
}

function indexOfGreater(array, n) {
    let i = array.length;
    while (i--) {
        if (array[i] === n) return -1;
        if (array[i] < n) return i + 1;
    }
    return i;
}

function pushsubsetsOfLength(results, node, length, a = [], n = -1) {
    const numbers = node.numbers;
    // Get index we are writing to at this level of recursion
    const i = a.length;
    // Loop through remaining numbers
    while (numbers[++n] !== undefined) {
        // Ignore intervals greater than MAX_INTERVAL
        if (i && numbers[n] - a[i - 1] > MAX_INTERVAL) continue;
        // Write to index
        a[i] = numbers[n];
        // We are at last index for this length
        if (a.length === length) {
            // Push result into results array
            results.push(node.link(a));
        }
        else {
            // Write to remaining indexes by recursion
            pushsubsetsOfLength(results, node, length, a, n);
            // Return a to correct length
            a.length = i + 1;
        }
    }
    // Return results
    return results;
}

function intoOpen(n, i) {
    const numbers = this;
    //[0,1,2,3]   => [0,2]
    //[0,1,2,3,4] => [0,2,4]
    if (numbers[2 * i] !== undefined) return numbers[2 * i];
    //[0,1,2,3]   => [_,_,1,3]
    //[0,1,2,3,4] => [_,_,_,1,3]
    return numbers[floor(i - numbers.length / 2) * 2 + 1] + 12;
}

export default class HarmonyNode {
    constructor(hsid) {
        // Return cached node
        if (HarmonyNode[hsid]) return HarmonyNode[hsid];
        // Create node and cache it
        this.id = hsid;
        HarmonyNode[this.id] = this;
        // Increment node count
        ++HarmonyNode.count;
    }

    get numbers() {
        const value = hsidToNumbers(this.id);
        define('numbers', this, value);
        return value;
    }

    get consonance() {
        const value = consonance(this.numbers);
        define('consonance', this, value);
        return value;
    }

    get density() {
        const value = this.numbers.length / (this.range + 1);
        define('density', this, value);
        return value;
    }

    get range() {
        const value = Math.max.apply(Math, this.numbers) - Math.min.apply(Math, this.numbers);
        define('range', this, value);
        return value;
    }

    get modes() {
        const scale = this.scale;
        const n = -1;
        const l = modes.length;
        const results = [];
        let rootMode;

        while (++n < l) {
            if (isSubset(modes[n].scale, scale)) {
                rootMode = rootModes[modes[n].group];
                results.push([wrap12(min - modes[n].tonic), rootMode]);
            }
        }

        const value = results.map(HarmonyNode.from);
        define('modes', this, value);
        return value;
    }

    /**
    .open
    Open harmony of node. Open nodes refer to themselves.
    **/
    get open() {
        const { numbers } = this.close;
        const array = Array.from(numbers, intoOpen, numbers);
        const node  = HarmonyNode.from(array);
        define('open', this, node);
        return node;
    }

    /**
    .close
    Closed harmony of node, the node of the same notes fitted into 1 octave.
    Already closed nodes refer to themselves.
    **/
    get close() {
        const { numbers } = this;
        // Fast out for already closed nodes
        if (numbers[numbers.length - 1] < 12) {
            define('closed', this, this);
            return this;
        }
        // Make unique set of mod12 numbers
        const array = [0];
        let n = 0;
        let value, i;
        while (++n < numbers.length) {
            value = mod12(numbers[n]);
            i = indexOfGreater(array, value);
            if (i === -1) continue;
            array.splice(i, 0, value);
        }
        // Get its node
        const node = HarmonyNode.from(array);
        define('close', this, node);
        return node;
    }

    /**
    .tones
    Links to subset nodes of length 1.
    **/
    get tones() {
        const voice = HarmonyNode.from(0);
        const array = Array.from(this.numbers, (n) => this.link(voice, n));
        define('tones', this, freeze(array));
        return array;
    }

    /**
    .intervals
    Links to subset nodes of length 2.
    **/
    get intervals() {
        const array = pushsubsetsOfLength([], this, 2);
        define('intervals', this, freeze(array));
        return array;
    }

    /**
    .triads
    Links to subset nodes of length 3.
    **/
    get triads() {
        const array = pushsubsetsOfLength([], this, 3);
        define('triads', this, freeze(array));
        return array;
    }

    /**
    .subsets
    Links to subset nodes.
    **/
    get subsets() {
        const array = Array.from(this.tones);
        const { numbers } = this;
        let l = 1;
        while (++l < numbers.length) pushsubsetsOfLength(array, this, l);
        define('subsets', this, freeze(array));
        return array;
    }

    /**
    .inversions
    Links to inversions.
    **/
    get inversions() {
        // No inversions if only 1 note
        if (this.id === 0) return nothing;
        const { numbers } = this;
        // Results array
        const array = [this];
        // Decide how many octaves we are inverting over
        const limit = 12 * ceil((numbers[numbers.length - 1] + 1) / 12);
        // Loop through numbers from 1 to end
        const a = Array.from(numbers);
        let n = 0;
        let link;
        while (numbers[++n]) {
            // Shift first number and push it + limit onto end
            a.push(a.shift() + limit);
            // Get inversion
            array.push(HarmonyNode.from(a));
            // Get link to inversion
            //link = this.link(HarmonyNode.from(a));
            // If link targets this node we have discovered a symmetry
            //if (link.target === this) break;
            // Store link
            //array.push(link);
        }
        define('inversions', this, freeze(array));
        return array;
    }

    /**
    .modes
    Links to modes that this node is diatonic to.
    **/
    get modes() {
        const array = [];
        const modes = HarmonyNode.modes;
        let m = -1, link;
        while (modes[++m]) {
            link = this.link(modes[m]);
            if (link.diatonic) array.push(modes[m]);
        }
        define('modes', this, freeze(array));
        return array;
    }

    /**
    .majorModes
    Links to major modes that this node is diatonic to.
    **/
    get majorModes() {
        const array = [];
        const modes = HarmonyNode.major.inversions;
        let link;
        let m = -1;
        while (modes[++m]) {
            link = this.link(modes[m]);
            if (link.diatonic) array.push(modes[m]);
        }
        define('majorModes', this, freeze(array));
        return array;
    }

    /**
    .chromaticLinks
    Chromatic links to nodes.
    **/
    get chromaticLinks() {
        // TODO Partly done!
        const set = new Set();
        const subsets = this.subsets;
        // Loop through subsets
        let n = -1, link, shifted;
        while ((link = subsets[++n]) !== undefined) {
            const length      = link.numbers.length;
            const remaining   = difference(this.numbers, link.numbers);
            const shifted     = this.link(link.target, link.shift - 1);
            //set.add(shifted);
            const shiftedLink = this.link(union(remaining, shifted.numbers));
            const diff = difference(remaining, shifted.numbers);
            // If shifted numbers don't echo remaining numbers add shifted link
            if (diff.length) set.add(shiftedLink);
        }
        set.add(this.link(this, -1));
        define('chromaticLinks', this, set);
        return set;
    }

    diatonicDecrement(node, shift = 0) {
        if (last(node.numbers) > 11) {
            throw new Error(`HarmonyNode.diatonicDecrement() argument (${ link.numbers }) must be a scale in the range 0-12`);
        }

        if (node === this) {

        }
        // Check node is a superset of closed version of this
        else if (!this.close.link(node, shift).superset) {
            throw new Error(`HarmonyNode.diatonicDecrement() argument (${ link.numbers }) must be a superset of closed node (${ this.close.numbers })`);
        }

        const { numbers } = this;
        const transposed = Int8Array.from(numbers, (n) => {
            const m = mod12(n);
            const d = n - m;
            const i = node.numbers.indexOf(m);
            return i === 0 ?
                d + last(node.numbers) - 12:
                d + node.numbers[i - 1] ;
        });

        return this.link(transposed);
    }

    diatonicIncrement(node, shift = 0) {
        if (last(node.numbers) > 11) {
            throw new Error(`HarmonyNode.diatonicIncrement() argument (${ link.numbers }) must be a scale in the range 0-12`);
        }

        if (node === this) {

        }
        // Check node is a superset of closed version of this
        else if (!this.close.link(node, shift).superset) {
            throw new Error(`HarmonyNode.diatonicDecrement() argument (${ link.numbers }) must be a superset of closed node (${ this.close.numbers })`);
        }

        const { numbers } = this;
        const transposed = Int8Array.from(numbers, (n) => {
            const m = mod12(n);
            const d = n - m;
            const i = node.numbers.indexOf(m);
            return i === node.numbers.length - 1 ?
                d + 12 + node.numbers[0] :
                d + node.numbers[i + 1] ;
        });

        return this.link(transposed);
    }

    link(object, shift = 0) {
        const node = typeof object === 'number' ? HarmonyNode.from(object) :
            object instanceof HarmonyNode ? object :
            HarmonyNode.from(object) ;
        const s = (typeof object === 'object' && object[0]) || 0;
        return HarmonyLink.from(this, node, shift + s);
    }

    toString() {
        return `${ this.label } ${ this.numbers }`;
    }

    static count = 0;

    /**
    HarmonyNode.of(...numbers)
    **/
    static of() {
        return HarmonyNode.from(arguments);
    }

    /**
    HarmonyNode.from(hsid)
    HarmonyNode.from(numbers)
    **/
    static from(numbers) {
        const type = typeof numbers;
        const hsid =
            type === 'number' ? numbers :
            type === 'string' ? numbers :
            toHSID(numbers) ;

        return new HarmonyNode(hsid);
    }
}

export const intervals = [
    assign(HarmonyNode.of(0,1),  { label: 'Semitone' }),
    assign(HarmonyNode.of(0,2),  { label: 'Tone' }),
    assign(HarmonyNode.of(0,3),  { label: 'Minor 3rd' }),
    assign(HarmonyNode.of(0,4),  { label: 'Major 3rd' }),
    assign(HarmonyNode.of(0,5),  { label: 'Perfect 4th' }),
    assign(HarmonyNode.of(0,6),  { label: 'Tritone' }),
    assign(HarmonyNode.of(0,7),  { label: 'Perfect 5th' }),
    assign(HarmonyNode.of(0,8),  { label: 'Minor 6th' }),
    assign(HarmonyNode.of(0,9),  { label: 'Major 6th' }),
    assign(HarmonyNode.of(0,10), { label: 'Minor 7th' }),
    assign(HarmonyNode.of(0,11), { label: 'Major 7th' }),
    assign(HarmonyNode.of(0,12), { label: 'Octave' }),
    assign(HarmonyNode.of(0,13), { label: '♭9th' }),
    assign(HarmonyNode.of(0,14), { label: '9th' }),
    assign(HarmonyNode.of(0,15), { label: '♯9th' }),
    assign(HarmonyNode.of(0,16), { label: '10th' }),
    assign(HarmonyNode.of(0,17), { label: '11th' }),
    assign(HarmonyNode.of(0,18), { label: '♯11th' }),
    assign(HarmonyNode.of(0,19), { label: '12th' }),
    assign(HarmonyNode.of(0,20), { label: '♭13th' }),
    assign(HarmonyNode.of(0,21), { label: '13th' })
];

HarmonyNode.intervals = intervals;

export const triads = [
    assign(HarmonyNode.of(0,5,10), { label: 'Quartal triad' }),
    assign(HarmonyNode.of(0,4,8),  { label: 'Augmented triad' }),
    assign(HarmonyNode.of(0,4,7),  { label: 'Major triad' }),
    assign(HarmonyNode.of(0,3,8),  { label: 'Major triad (1st inversion)' }),
    assign(HarmonyNode.of(0,5,9),  { label: 'Major triad (2nd inversion)' }),
    assign(HarmonyNode.of(0,3,7),  { label: 'Minor triad' }),
    assign(HarmonyNode.of(0,4,9),  { label: 'Minor triad (1st inversion)' }),
    assign(HarmonyNode.of(0,5,8),  { label: 'Minor triad (2nd inversion)' }),
    assign(HarmonyNode.of(0,3,6),  { label: 'Diminished triad' }),
    assign(HarmonyNode.of(0,2,7),  { label: 'Moo triad' })
];

HarmonyNode.triads = triads;

export const modes = [
    assign(HarmonyNode.of(0,2,4,7,9),         { label: "Major pentatonic" }),
    assign(HarmonyNode.of(0,2,5,7,10),        { label: "Major Pentatonic (2nd mode)" }),
    assign(HarmonyNode.of(0,3,5,8,10),        { label: "Major Pentatonic (3rd mode)" }),
    assign(HarmonyNode.of(0,2,5,7,9),         { label: "Major Pentatonic (4th mode)" }),
    assign(HarmonyNode.of(0,3,5,7,10),        { label: "Minor pentatonic" }),
    assign(HarmonyNode.of(0,1,5,7,10),        { label: "Insen" }),
    assign(HarmonyNode.of(0,4,6,9,11),        { label: "Insen (2nd mode)" }),
    assign(HarmonyNode.of(0,2,5,7,8),         { label: "Insen (3rd mode)" }),
    assign(HarmonyNode.of(0,3,5,6,10),        { label: "Insen (4th mode)" }),
    assign(HarmonyNode.of(0,2,3,7,9),         { label: "Insen (5th mode)" }),
    assign(HarmonyNode.of(0,2,4,7,9,11),      { label: "Major hexatonic" }),
    assign(HarmonyNode.of(2,4,7,9,11,12),     { label: "Major hexatonic (2nd mode)" }),
    assign(HarmonyNode.of(4,7,9,11,12,14),    { label: "Major hexatonic (3rd mode)" }),
    assign(HarmonyNode.of(7,9,11,12,14,16),   { label: "Major hexatonic (4th mode)" }),
    assign(HarmonyNode.of(9,11,12,14,16,19),  { label: "Major hexatonic (5th mode)" }),
    assign(HarmonyNode.of(11,12,14,16,19,21), { label: "Major hexatonic (6th mode)" }),
    assign(HarmonyNode.of(0,2,4,6,8,10),      { label: "Whole tone" }),
    assign(HarmonyNode.of(0,2,4,5,7,9,11),    { label: "Major (1st mode ionic)" }),
    assign(HarmonyNode.of(0,2,3,5,7,9,10),    { label: "Major (2nd mode dorian)" }),
    assign(HarmonyNode.of(0,1,3,5,7,8,10),    { label: "Major (3rd mode phrygian)" }),
    assign(HarmonyNode.of(0,2,4,6,7,9,11),    { label: "Major (4th mode lydian)" }),
    assign(HarmonyNode.of(0,2,4,5,7,9,10),    { label: "Major (5th mode mixolydian)" }),
    assign(HarmonyNode.of(0,2,3,5,7,8,10),    { label: "Major (6th mode aeolian)" }),
    assign(HarmonyNode.of(0,1,3,5,6,8,10),    { label: "Major (7th mode locrian)" }),
    assign(HarmonyNode.of(0,2,3,5,7,9,11),    { label: "Melodic minor" }),
    assign(HarmonyNode.of(0,1,3,5,7,9,10),    { label: "Melodic minor (2nd mode)" }),
    assign(HarmonyNode.of(0,2,4,6,8,9,11),    { label: "Melodic minor (3rd mode)" }),
    assign(HarmonyNode.of(0,2,4,6,7,9,10),    { label: "Melodic minor (4th mode)" }),
    assign(HarmonyNode.of(0,2,4,5,7,8,10),    { label: "Melodic minor (5th mode)" }),
    assign(HarmonyNode.of(0,2,3,5,6,8,10),    { label: "Melodic minor (6th mode)" }),
    assign(HarmonyNode.of(0,1,3,4,6,8,10),    { label: "Melodic minor (7th mode)" }),
    assign(HarmonyNode.of(0,2,3,5,7,8,11),    { label: "Harmonic minor" }),
    assign(HarmonyNode.of(0,1,3,5,6,9,10),    { label: "Harmonic minor (2nd mode)" }),
    assign(HarmonyNode.of(0,2,4,5,8,9,11),    { label: "Harmonic minor (3rd mode)" }),
    assign(HarmonyNode.of(0,2,3,6,7,9,10),    { label: "Harmonic minor (4th mode)" }),
    assign(HarmonyNode.of(0,1,4,5,7,8,10),    { label: "Harmonic minor (5th mode)" }),
    assign(HarmonyNode.of(0,3,4,6,7,9,11),    { label: "Harmonic minor (6th mode)" }),
    assign(HarmonyNode.of(0,1,3,4,6,8,9),     { label: "Harmonic minor (7th mode)" }),
    assign(HarmonyNode.of(0,2,4,5,7,8,11),    { label: "Harmonic major" }),
    assign(HarmonyNode.of(0,2,3,5,6,9,10),    { label: "Harmonic major (2nd mode)" }),
    assign(HarmonyNode.of(0,1,3,4,7,8,10),    { label: "Harmonic major (3rd mode)" }),
    assign(HarmonyNode.of(0,2,3,6,7,9,11),    { label: "Harmonic major (4th mode)" }),
    assign(HarmonyNode.of(0,1,4,5,7,9,10),    { label: "Harmonic major (5th mode)" }),
    assign(HarmonyNode.of(0,3,4,6,8,9,11),    { label: "Harmonic major (6th mode)" }),
    assign(HarmonyNode.of(0,1,3,5,6,8,9),     { label: "Harmonic major (7th mode)" }),
    assign(HarmonyNode.of(0,1,4,5,7,8,11),    { label: "Double harmonic major" }),
    assign(HarmonyNode.of(0,3,4,6,7,10,11),   { label: "Double harmonic major (2nd mode)" }),
    assign(HarmonyNode.of(0,1,3,4,7,8,9),     { label: "Double harmonic major (3rd mode)" }),
    assign(HarmonyNode.of(0,2,3,6,7,8,11),    { label: "Double harmonic major (4th mode)" }),
    assign(HarmonyNode.of(0,1,4,5,6,9,10),    { label: "Double harmonic major (5th mode)" }),
    assign(HarmonyNode.of(0,3,4,5,8,9,11),    { label: "Double harmonic major (6th mode)" }),
    assign(HarmonyNode.of(0,1,2,5,6,8,9),     { label: "Double harmonic major (7th mode)" }),
    assign(HarmonyNode.of(0,2,4,5,7,8,9,11),  { label: "Major bebop" }),
    assign(HarmonyNode.of(0,2,3,5,6,7,9,10),  { label: "Major bebop (2nd mode)" }),
    assign(HarmonyNode.of(0,1,3,4,5,7,8,10),  { label: "Major bebop (3rd mode)" }),
    assign(HarmonyNode.of(0,2,3,4,6,7,9,11),  { label: "Major bebop (4th mode)" }),
    assign(HarmonyNode.of(0,1,2,4,5,7,9,10),  { label: "Major bebop (5th mode)" }),
    assign(HarmonyNode.of(0,1,3,4,6,8,9,11),  { label: "Major bebop (6th mode)" }),
    assign(HarmonyNode.of(0,2,3,5,7,8,10,11), { label: "Major bebop (7th mode)" }),
    assign(HarmonyNode.of(0,1,3,5,6,8,9,10),  { label: "Major bebop (8th mode)" }),
    assign(HarmonyNode.of(0,2,3,5,6,8,9,11),  { label: "Diminished whole step / half step" }),
    assign(HarmonyNode.of(0,1,3,4,6,7,9,10),  { label: "Diminished half step / whole step" }),
];

HarmonyNode.modes = modes;


HarmonyNode.major = HarmonyNode.of(0,2,4,5,7,9,11);


import { CHORDNAMES } from '../event/chord.js';
const chords = [];
let hsid;
for (hsid in CHORDNAMES) {
    const node = HarmonyNode.from(hsid);
    node.extension = CHORDNAMES[hsid];
    chords.push(node);
}

HarmonyNode.chords = chords;

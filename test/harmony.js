
import {
    assert,
    assertEquals as equals,
    assertGreaterOrEqual as gte,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import HarmonyNode from '../modules/harmony/harmony-node.js';
import HarmonyLink from '../modules/harmony/harmony-link.js';


// node -> link -> node
// node -> link -> node


Deno.test('HarmonyNode() cache', () => {
    const node1 = HarmonyNode.of(0, 1);
    const node2 = HarmonyNode.of(0, 1);
    const node3 = HarmonyNode.of(4, 5);
    assert(node1 === node2);
    assert(node1 === node3);
});

Deno.test('HarmonyNode.from(0)', () => {
    const node = HarmonyNode.from(0);
    equals(node.numbers.length, 1);
    equals(node.numbers[0], 0);
    equals(node.consonance, 1);
    equals(node.density, 1);
    equals(node.range, 0);
    equals(node.close, node); // node.close refers to itself
});

Deno.test('HarmonyNode.modes', () => {
    const node = HarmonyNode.of(0,2,4,7,10);
    gte(node.modes.length, 2);
});

Deno.test('HarmonyNode.majorModes', () => {
    const node = HarmonyNode.of(0,2,4,7,10);
    equals(node.majorModes[0], HarmonyNode.of(0,2,4,5,7,9,10));  // Mixolydian
    equals(node.majorModes[0], HarmonyNode.major.inversions[4]); // Mixolydian - 5th mode, or 4th inversion
});

Deno.test('HarmonyLink.subset, HarmonyLink.superset', () => {
    const node1 = HarmonyNode.from(0);
    const node2 = HarmonyNode.from(3);
    equals(node1.link(node1).subset, false);
    equals(node1.link(node1).superset, false);
    equals(node1.link(node2).subset, false);
    equals(node1.link(node2).superset, true);
    equals(node2.link(node1).subset, true);
    equals(node2.link(node1).superset, false);
    equals(node1.link(node2, -1).superset, false);
    equals(node1.link(node2, -2).superset, false);
    equals(node1.link(node2, -3).superset, true);
    equals(node1.link(node2, -4).superset, false);
});

Deno.test('HarmonyNode.subsets', () => {
    const node1 = HarmonyNode.of(0, 1);
    equals(node1.subsets.length, 2);
    const node2 = HarmonyNode.of(0, 3, 7);
    equals(node2.subsets.length, 3 + 3);       // 3 single notes, 3 intervals
    const node3 = HarmonyNode.of(0, 4, 7, 11);
    equals(node3.subsets.length, 4 + 6 + 4);   // 4 single notes, 6 intervals, 4 triads
    const node4 = HarmonyNode.of(0, 8, 40);
    equals(node4.subsets.length, 3 + 2);       // 3 single notes, 2 intervals, other intervals too big
});

Deno.test('HarmonyNode.chromaticLinks', () => {
    const node1 = HarmonyNode.of(0, 7);
    equals(node1.chromaticLinks.size, 3); // [-1,7] and [0,6] and [-1,6]
    // Chromatics don't count if they merge over existing numbers
    const node2 = HarmonyNode.of(0, 1);
    equals(node2.chromaticLinks.size, 2); // [-1,1] and [-1,0] not [0] which doesn't count
    const node3 = HarmonyNode.of(0, 4, 7);
    equals(node3.chromaticLinks.size, 7); // [-1,4,7], [-1,3,7], [-1,3,6],[-1,4,6],[0,3,7],[0,3,6],[0,4,6]
});

Deno.test('harmonyNode.inversions', () => {
    const node1 = HarmonyNode.of(0, 4, 7, 11);
    equals(node1.inversions.length, 4);
    const node2 = HarmonyNode.of(0, 7, 16);
    equals(node2.inversions.length, 3);
    const node3 = HarmonyNode.of(0, 1, 3);
    equals(node3.inversions[0], node3); // Inversion 0 always refers to node
});

Deno.test('harmonyNode.close', () => {
    const maj     = HarmonyNode.of(0,4,7);
    const min     = HarmonyNode.of(0,3,7);
    const dim     = HarmonyNode.of(0,3,6);
    const openmaj = HarmonyNode.of(0,7,16);
    const openmin = HarmonyNode.of(0,7,15);
    const opendim = HarmonyNode.of(0,6,15);

    equals(openmaj.close, maj);
    equals(openmin.close, min);
    equals(opendim.close, dim);
    equals(dim.close, dim); // Closed node refers to itself
});

Deno.test('harmonyNode.open', () => {
    const maj     = HarmonyNode.of(0,4,7);
    const min     = HarmonyNode.of(0,3,7);
    const dim     = HarmonyNode.of(0,3,6);
    const openmaj = HarmonyNode.of(0,7,16);
    const openmin = HarmonyNode.of(0,7,15);
    const opendim = HarmonyNode.of(0,6,15);

    equals(maj.open, openmaj);
    equals(min.open, openmin);
    equals(dim.open, opendim);
    equals(opendim.open, opendim); // Open node refers to itself
});

Deno.test('harmonyNode.diatonicIncrement(scale)', () => {
    const major1 = HarmonyNode.of(0,2,4,5,7,9,11);
    const major2 = HarmonyNode.of(0,2,3,5,7,9,10);
    const major3 = HarmonyNode.of(0,1,3,5,7,8,10);
    const major4 = HarmonyNode.of(0,2,4,6,7,9,11);
    const major5 = HarmonyNode.of(0,2,4,5,7,9,10);
    const major6 = HarmonyNode.of(0,2,3,5,7,8,10);
    const major7 = HarmonyNode.of(0,1,3,5,6,8,10);

    const maj    = HarmonyNode.of(0,4,7);
    const min    = HarmonyNode.of(0,3,7);
    const dim    = HarmonyNode.of(0,3,6);

    equals(maj.diatonicIncrement(major1).target, min);
    equals(min.diatonicIncrement(major2).target, min);
    equals(min.diatonicIncrement(major3).target, maj);
    equals(maj.diatonicIncrement(major4).target, maj);
    equals(maj.diatonicIncrement(major5).target, min);
    equals(min.diatonicIncrement(major6).target, dim);
    equals(dim.diatonicIncrement(major7).target, maj);

    const maj7 = HarmonyNode.of(0,4,7,11);
    const sev7 = HarmonyNode.of(0,4,7,10);
    const min7 = HarmonyNode.of(0,3,7,10);
    const half = HarmonyNode.of(0,3,6,10);

    equals(maj7.diatonicIncrement(major1).target, min7);
    equals(min7.diatonicIncrement(major2).target, min7);
    equals(min7.diatonicIncrement(major3).target, maj7);
    equals(maj7.diatonicIncrement(major4).target, sev7);
    equals(sev7.diatonicIncrement(major5).target, min7);
    equals(min7.diatonicIncrement(major6).target, half);
    equals(half.diatonicIncrement(major7).target, maj7);

    const openmaj = HarmonyNode.of(0,7,16);
    const openmin = HarmonyNode.of(0,7,15);
    const opendim = HarmonyNode.of(0,6,15);

    equals(openmaj.diatonicIncrement(major1).target, openmin);
    equals(openmin.diatonicIncrement(major2).target, openmin);
    equals(openmin.diatonicIncrement(major3).target, openmaj);
    equals(openmaj.diatonicIncrement(major4).target, openmaj);
    equals(openmaj.diatonicIncrement(major5).target, openmin);
    equals(openmin.diatonicIncrement(major6).target, opendim);
    equals(opendim.diatonicIncrement(major7).target, openmaj);
});

Deno.test('harmonyNode.diatonicDecrement(scale)', () => {
    const major1 = HarmonyNode.of(0,2,4,5,7,9,11);
    const major2 = HarmonyNode.of(0,2,3,5,7,9,10);
    const major3 = HarmonyNode.of(0,1,3,5,7,8,10);
    const major4 = HarmonyNode.of(0,2,4,6,7,9,11);
    const major5 = HarmonyNode.of(0,2,4,5,7,9,10);
    const major6 = HarmonyNode.of(0,2,3,5,7,8,10);
    const major7 = HarmonyNode.of(0,1,3,5,6,8,10);

    const maj    = HarmonyNode.of(0,4,7);
    const min    = HarmonyNode.of(0,3,7);
    const dim    = HarmonyNode.of(0,3,6);

    equals(maj.diatonicDecrement(major1).target, dim);
    equals(dim.diatonicDecrement(major7).target, min);
    equals(min.diatonicDecrement(major6).target, maj);
    equals(maj.diatonicDecrement(major5).target, maj);
    equals(maj.diatonicDecrement(major4).target, min);
    equals(min.diatonicDecrement(major3).target, min);
    equals(min.diatonicDecrement(major2).target, maj);

    const maj7 = HarmonyNode.of(0,4,7,11);
    const sev7 = HarmonyNode.of(0,4,7,10);
    const min7 = HarmonyNode.of(0,3,7,10);
    const half = HarmonyNode.of(0,3,6,10);

    equals(maj7.diatonicDecrement(major1).target, half);
    equals(half.diatonicDecrement(major7).target, min7);
    equals(min7.diatonicDecrement(major6).target, sev7);
    equals(sev7.diatonicDecrement(major5).target, maj7);
    equals(maj7.diatonicDecrement(major4).target, min7);
    equals(min7.diatonicDecrement(major3).target, min7);
    equals(min7.diatonicDecrement(major2).target, maj7);

    const openmaj = HarmonyNode.of(0,7,16);
    const openmin = HarmonyNode.of(0,7,15);
    const opendim = HarmonyNode.of(0,6,15);

    equals(openmaj.diatonicDecrement(major1).target, opendim);
    equals(opendim.diatonicDecrement(major7).target, openmin);
    equals(openmin.diatonicDecrement(major6).target, openmaj);
    equals(openmaj.diatonicDecrement(major5).target, openmaj);
    equals(openmaj.diatonicDecrement(major4).target, openmin);
    equals(openmin.diatonicDecrement(major3).target, openmin);
    equals(openmin.diatonicDecrement(major2).target, openmaj);
});

Deno.test('HarmonyNode.from(interval).consonance', () => {
    equals(HarmonyNode.of(0).consonance, 1);
    equals(HarmonyNode.of(0,12).consonance, 1);

    // Intervals listed in order of where the appear in the harmonic series
    const octave   = HarmonyNode.of(0,12); // 8ve
    const fifth    = HarmonyNode.of(0,7);  // 5th
    const fourth   = HarmonyNode.of(0,5);  // 4th
    const sixth    = HarmonyNode.of(0,9);  // 6th
    const maj3     = HarmonyNode.of(0,4);  // 3rd
    const min3     = HarmonyNode.of(0,3);  // -3rd
    const min7     = HarmonyNode.of(0,10); // 7th
    const tritone  = HarmonyNode.of(0,6);  // Tritone
    const min6     = HarmonyNode.of(0,8);  // -6th
    const tone     = HarmonyNode.of(0,2);  // 2nd
    const maj7     = HarmonyNode.of(0,11); // ∆7th
    const semitone = HarmonyNode.of(0,1);  // -2nd

    gte(octave.consonance,  fifth.consonance);
    gte(fifth.consonance,   fourth.consonance);
    gte(fourth.consonance,  sixth.consonance);
    gte(sixth.consonance,   maj3.consonance);
    gte(maj3.consonance,    min3.consonance);
    gte(min3.consonance,    min7.consonance);
    gte(min7.consonance,    tritone.consonance);
    gte(tritone.consonance, min6.consonance);
    gte(min6.consonance,    tone.consonance);
    gte(tone.consonance,    maj7.consonance);
    gte(maj7.consonance,    semitone.consonance);

    //console.log('In order of appearance in the harmonic series...');
    //console.log(octave.consonance,   '8ve');
    //console.log(fifth.consonance,    '5th');
    //console.log(fourth.consonance,   '4th');
    //console.log(sixth.consonance,    '6th');
    //console.log(maj3.consonance,     '3rd');
    //console.log(min3.consonance,     '-3rd');
    //console.log(min7.consonance,     '7th');
    //console.log(tritone.consonance,  'Tritone');
    //console.log(min6.consonance,     '-6th');
    //console.log(tone.consonance,     '2nd');
    //console.log(maj7.consonance,     '∆7th');
    //console.log(semitone.consonance, '-2nd');

    equals(semitone.range, 1);
    equals(tone.range, 2);
    equals(min3.range, 3);
    equals(maj3.range, 4);
    equals(fourth.range, 5);
    equals(tritone.range, 6);
    equals(fifth.range, 7);
    equals(min6.range, 8);
    equals(sixth.range, 9);
    equals(min7.range, 10);
    equals(maj7.range, 11);
});

Deno.test('HarmonyNode.from(triad).consonance', () => {
    gte(HarmonyNode.of(0,5,9).consonance, HarmonyNode.of(0,4,7).consonance);
    gte(HarmonyNode.of(0,4,7).consonance, HarmonyNode.of(0,7,10).consonance);

    // Triads listed in order of where the appear in the harmonic series
    //console.log(HarmonyNode.of(0,5,9]).consonance);
    //console.log(HarmonyNode.of(0,4,7]).consonance);
    //console.log(HarmonyNode.of(0,7,10]).consonance);
    //console.log(HarmonyNode.of(0,3,6]).consonance);
    //console.log(HarmonyNode.of(0,4,10]).consonance); // Odd outlier
    //console.log(HarmonyNode.of(0,6,8]).consonance);
    //console.log(HarmonyNode.of(0,3,8]).consonance);
    //console.log(HarmonyNode.of(0,3,5]).consonance);  // Another odd outlier
    //console.log(HarmonyNode.of(0,3,10]).consonance);
    //console.log(HarmonyNode.of(0,6,10]).consonance);
    //console.log(HarmonyNode.of(0,8,10]).consonance);
    //console.log(HarmonyNode.of(0,3,7]).consonance);
    //console.log(HarmonyNode.of(0,5,7]).consonance);
    //console.log(HarmonyNode.of(0,2,4]).consonance);
});

Deno.test('HarmonyNode.from().link().chromaticism', () => {
    equals(HarmonyNode.of(0,4,7).link([0,4,7], 1).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([1,5,8]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([0,4,7], -1).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([-1,3,6]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([1,3,6]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([-1,5,8]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([1,5,6]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([-1,3,8]).chromaticism, 1);
    equals(HarmonyNode.of(0,4,7).link([0,3,7]).chromaticism, 0.3333333333333333);
});

Deno.test('Counts', () => {
    console.log(`Harmony nodes ${ HarmonyNode.count }, links ${ HarmonyLink.count }`);
});
/**/

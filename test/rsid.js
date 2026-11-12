import {
    assertEquals as equals,
    assertStrictEquals as is
} from 'jsr:@std/assert@1';

import * as RSID from '../modules/rsid.js';


Deno.test('RSID.lengthOf()', () => {
    is(RSID.lengthOf(0), 0);
    is(RSID.lengthOf(1), 1);
    is(RSID.lengthOf(5), 3);    // 101
    is(RSID.lengthOf(11), 4);   // 1011
    is(RSID.lengthOf(13), 4);   // 1101
    is(RSID.lengthOf(45), 6);   // 101101
    is(RSID.lengthOf(0xFFFFFFFF), 32);
});


Deno.test('RSID.trim()', () => {
    is(RSID.trim(0), 0);
    is(RSID.trim(12), 3); // 1100 -> 11
    is(RSID.trim(10), 5); // 1010 -> 101
    is(RSID.trim(8), 1);  // 1000 -> 1
    is(RSID.trim(5), 5);  // 101 -> 101
});


Deno.test('RSID.equals()', () => {
    is(RSID.equals(36, 10), true);
    is(RSID.equals(36, 3), true);
    is(RSID.equals(10, 3), true);
    is(RSID.equals(11, 13), false);
});


Deno.test('RSID.of()', () => {
    is(RSID.of(1, 0, 1), 5);
    is(RSID.of(1, 0, 1, 1), 11);
    is(RSID.of(1, 1, 0, 1), 13);
    is(RSID.of(1, 0, 1, 1, 0, 1), 45);

    // Preserves grid without compression
    is(RSID.of(1, 0, 1, 0), 0b1010);
    is(RSID.of(1, 0, 0, 1, 0, 0), 0b100100);

    // Leading zeros evaluate to same RSID as starting with hit
    is(RSID.of(0, 1, 0, 1), 5);
    is(RSID.of(0, 0, 1, 0, 1), 5);
});


Deno.test('RSID.from()', () => {
    is(RSID.from([1, 0, 1]), 5);
    is(RSID.from([1, 0, 1, 1]), 11);
    is(RSID.from([1, 1, 0, 1]), 13);
    is(RSID.from([1, 0, 1, 1, 0, 1]), 45);

    // Preserves grid without compression
    is(RSID.from([1, 0, 1, 0]), 0b1010);
    is(RSID.from([1, 0, 0, 1, 0, 0]), 0b100100);

    // Leading zeros evaluate to same RSID as starting with hit
    is(RSID.from([0, 1, 0, 1]), 5);
    is(RSID.from([0, 0, 1, 0, 1]), 5);

    // Cascara pattern (16 cells)
    const cascara = RSID.from([1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1]);
    is(cascara, 0b1010110110110101);
});


Deno.test('RSID.densityOf()', () => {
    is(RSID.densityOf(0), 0);
    is(RSID.densityOf(11), 3); // 1011
    is(RSID.densityOf(5), 2);  // 101
    is(RSID.densityOf(45), 4); // 101101
    is(RSID.densityOf(0xFFFFFFFF), 32);
});


Deno.test('RSID.clash()', () => {
    const a = 0b10110110;
    const b = 0b10010010;
    const c = 0b01001001;

    is(RSID.clash(a, b), 0b10010010);
    is(RSID.clash(b, c), 0);
});


Deno.test('RSID.rotate()', () => {
    // 1011 (11) rotated in time
    is(RSID.rotate(11, 0, 4), 11);         // 1011
    is(RSID.rotate(11, 1, 4), 13);         // 1101
    is(RSID.rotate(11, 2, 4), 14);         // 1110
    is(RSID.rotate(11, 3, 4), 0b0111);     // 0111
    is(RSID.rotate(11, 4, 4), 11);         // 1011 (full cycle)
    is(RSID.rotate(11, -1, 4), 0b0111);    // 0111 (anticipation)
});


Deno.test('RSID.reverse()', () => {
    // 11001 (25) -> 10011 (19)
    is(RSID.reverse(0b11001), 0b10011);

    // 11001000 (200) -> 10011 (19)
    is(RSID.reverse(0b11001000), 0b10011);

    // Palindrome: 101 -> 101
    is(RSID.reverse(0b101), 0b101);

    // Involutory pair: 1011 (11) <-> 1101 (13)
    is(RSID.reverse(11), 13);
    is(RSID.reverse(13), 11);
});


Deno.test('RSID.euclidean()', () => {
    // E(3, 8): Tresillo (10010010)
    is(RSID.euclidean(3, 8), 0b10010010);

    // E(5, 8): Cinquillo (10110110)
    is(RSID.euclidean(5, 8), 0b10110110);

    // E(5, 16): Bossa Nova (1001001001001000)
    is(RSID.euclidean(5, 16), 0b1001001001001000);

    // E(4, 12): 100100100100 reduces to 1111 (15)
    is(RSID.euclidean(4, 12), 0b1111);
});


Deno.test('RSID.stringify() and RSID.toArray()', () => {
    is(RSID.stringify(11, 4), '1011');
    is(RSID.stringify(5, 4), '0101');
    equals(RSID.toArray(11, 4), [1, 0, 1, 1]);
    equals(RSID.toArray(5, 4), [0, 1, 0, 1]);
});

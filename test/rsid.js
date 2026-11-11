import {
    assertEquals as equals,
    assertStrictEquals as is
} from 'jsr:@std/assert@1';

import {
    lengthOfRSID,
    trimRSID,
    compressRSID,
    isRSID,
    sameRhythm,
    toRSID,
    densityOfRSID,
    clashRSID,
    rotateRSID,
    reverseRSID,
    euclideanRSID,
    rsidToString,
    rsidToArray
} from '../modules/rsid.js';


Deno.test('lengthOfRSID()', () => {
    is(lengthOfRSID(0), 0);
    is(lengthOfRSID(1), 1);
    is(lengthOfRSID(5), 3);    // 101
    is(lengthOfRSID(11), 4);   // 1011
    is(lengthOfRSID(13), 4);   // 1101
    is(lengthOfRSID(45), 6);   // 101101
    is(lengthOfRSID(0xFFFFFFFF), 32);
});


Deno.test('trimRSID()', () => {
    is(trimRSID(0), 0);
    is(trimRSID(12), 3); // 1100 -> 11
    is(trimRSID(10), 5); // 1010 -> 101
    is(trimRSID(8), 1);  // 1000 -> 1
    is(trimRSID(5), 5);  // 101 -> 101
});


Deno.test('compressRSID()', () => {
    // 100100 (36) and 1010 (10) both compress to 11 (3)
    is(compressRSID(36), 3);
    is(compressRSID(10), 3);
    is(compressRSID(3), 3);

    // 1100 (12) and 101101 (45) cannot be compressed further
    is(compressRSID(12), 12);
    is(compressRSID(45), 45);
});


Deno.test('isRSID() and sameRhythm()', () => {
    is(isRSID(3), true);
    is(isRSID(11), true);
    is(isRSID(13), true);
    is(isRSID(45), true);
    is(isRSID(5), true);

    // 10 and 36 are not valid canonical RSIDs because they reduce to 3
    is(isRSID(10), false);
    is(isRSID(36), false);

    is(sameRhythm(36, 10), true);
    is(sameRhythm(36, 3), true);
    is(sameRhythm(10, 3), true);
    is(sameRhythm(11, 13), false);
});


Deno.test('toRSID()', () => {
    is(toRSID(1, 0, 1), 5);
    is(toRSID(1, 0, 1, 1), 11);
    is(toRSID(1, 1, 0, 1), 13);
    is(toRSID(1, 0, 1, 1, 0, 1), 45);

    // Automatic compression to canonical RSID
    is(toRSID(1, 0, 1, 0), 3);
    is(toRSID(1, 0, 0, 1, 0, 0), 3);
    is(toRSID([1, 0, 1, 0]), 3);
    is(toRSID('1010'), 3);
    is(toRSID(10), 3);

    // Leading zeros evaluate to same RSID as starting with hit
    is(toRSID(0, 1, 0, 1), 5);
    is(toRSID(0, 0, 1, 0, 1), 5);

    // Cascara pattern (16 cells)
    const cascara = toRSID('1010110110110101');
    is(cascara, 0b1010110110110101);
});


Deno.test('densityOfRSID()', () => {
    is(densityOfRSID(0), 0);
    is(densityOfRSID(11), 3); // 1011
    is(densityOfRSID(5), 2);  // 101
    is(densityOfRSID(45), 4); // 101101
    is(densityOfRSID(0xFFFFFFFF), 32);
});


Deno.test('clashRSID()', () => {
    const a = 0b10110110;
    const b = 0b10010010;
    const c = 0b01001001;

    is(clashRSID(a, b), 0b10010010);
    is(clashRSID(b, c), 0);
});


Deno.test('rotateRSID()', () => {
    // 1011 (11) rotated in time
    is(rotateRSID(11, 0, 4), 11);         // 1011
    is(rotateRSID(11, 1, 4), 13);         // 1101
    is(rotateRSID(11, 2, 4), 14);         // 1110
    is(rotateRSID(11, 3, 4), 0b0111);     // 0111
    is(rotateRSID(11, 4, 4), 11);         // 1011 (full cycle)
    is(rotateRSID(11, -1, 4), 0b0111);    // 0111 (anticipation)
});


Deno.test('reverseRSID()', () => {
    // 11001 (25) -> 10011 (19)
    is(reverseRSID(0b11001), 0b10011);

    // 11001000 (200) -> 10011 (19)
    is(reverseRSID(0b11001000), 0b10011);

    // Palindrome: 101 -> 101
    is(reverseRSID(0b101), 0b101);

    // Involutory pair: 1011 (11) <-> 1101 (13)
    is(reverseRSID(11), 13);
    is(reverseRSID(13), 11);
});


Deno.test('euclideanRSID()', () => {
    // E(3, 8): Tresillo (10010010)
    is(euclideanRSID(3, 8), 0b10010010);

    // E(5, 8): Cinquillo (10110110)
    is(euclideanRSID(5, 8), 0b10110110);

    // E(5, 16): Bossa Nova (1001001001001000)
    is(euclideanRSID(5, 16), 0b1001001001001000);

    // E(4, 12): 100100100100 reduces to 1111 (15)
    is(euclideanRSID(4, 12), 0b1111);
});


Deno.test('rsidToString() and rsidToArray()', () => {
    is(rsidToString(11, 4), '1011');
    is(rsidToString(5, 4), '0101');
    equals(rsidToArray(11, 4), [1, 0, 1, 1]);
    equals(rsidToArray(5, 4), [0, 1, 0, 1]);
});

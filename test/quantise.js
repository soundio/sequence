
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertAlmostEquals as almost,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import { qsin, quantiseSinReverse as quantise } from '../modules/rhythm/quantise.js';

Deno.test('qsin()', () => {
    equals(qsin(1, -0.5 * Math.PI), -0.5 * Math.PI);
    equals(qsin(1, 0    * Math.PI),    0 * Math.PI);
    equals(qsin(1, 0.5  * Math.PI),  0.5 * Math.PI);
    equals(qsin(1, 1    * Math.PI),    1 * Math.PI);
    equals(qsin(1, 1.5  * Math.PI),  1.5 * Math.PI);
    equals(qsin(1, 2    * Math.PI),    2 * Math.PI);
    equals(qsin(1, 2.5  * Math.PI),  2.5 * Math.PI);
    equals(qsin(1, 3    * Math.PI),    3 * Math.PI);

    equals(qsin(0, 0    * Math.PI), 0 * Math.PI);
    equals(qsin(0, 0.25 * Math.PI), 0 * Math.PI);
    equals(qsin(0, 0.5  * Math.PI), 1 * Math.PI);
    equals(qsin(0, 0.75 * Math.PI), 1 * Math.PI);
    equals(qsin(0, 1    * Math.PI), 1 * Math.PI);
    equals(qsin(0, 1.25 * Math.PI), 1 * Math.PI);
    equals(qsin(0, 1.5  * Math.PI), 2 * Math.PI);
    equals(qsin(0, 1.75 * Math.PI), 2 * Math.PI);
    equals(qsin(0, 2    * Math.PI), 2 * Math.PI);
    equals(qsin(0, 2.25 * Math.PI), 2 * Math.PI);
    equals(qsin(0, 2.5  * Math.PI), 3 * Math.PI);
    equals(qsin(0, 3    * Math.PI), 3 * Math.PI);
});

Deno.test('quantise()', () => {
    // Strength 0 should always return input beat unaltered
    equals(quantise(0.5, 0, 0),    0);
    almost(quantise(0.5, 0, 0.24), 0.24);
    almost(quantise(0.5, 0, 0.33), 0.33);
    equals(quantise(0.5, 0, 0.5),  0.5);
    equals(quantise(0.5, 0, 0.7),  0.7);
    equals(quantise(0.5, 0, 0.95), 0.95);
    // Swing 50% strength 1 should quantise strictly
    equals(quantise(0.5, 1, 0),    0);
    equals(quantise(0.5, 1, 0.24), 0);
    equals(quantise(0.5, 1, 0.33), 0.5);
    equals(quantise(0.5, 1, 0.5),  0.5);
    equals(quantise(0.5, 1, 0.7),  0.5);
    equals(quantise(0.5, 1, 0.95), 1);
    // Swing 60% should quantise to 60%
    equals(quantise(0.6, 1, 0),    0);
    equals(quantise(0.6, 1, 0.24), 0);
    equals(quantise(0.6, 1, 0.33), 0.6);
    equals(quantise(0.6, 1, 0.5),  0.6);
    equals(quantise(0.6, 1, 0.7),  0.6);
    equals(quantise(0.6, 1, 0.95), 1);
    // Swing 66.6666% should quantise to 66.6666%
    equals(quantise(0.666667, 1, 0),    0);
    equals(quantise(0.666667, 1, 0.24), 0);
    equals(quantise(0.666667, 1, 0.33), 0);
    equals(quantise(0.666667, 1, 0.5),  0.666667);
    equals(quantise(0.666667, 1, 0.7),  0.666667);
    equals(quantise(0.666667, 1, 0.95), 1);
    // Swing 75% should quantise to 75%
    equals(quantise(0.75, 1, 0),    0);
    equals(quantise(0.75, 1, 0.24), 0);
    equals(quantise(0.75, 1, 0.33), 0);
    equals(quantise(0.75, 1, 0.5),  0.75);
    equals(quantise(0.75, 1, 0.7),  0.75);
    equals(quantise(0.75, 1, 0.95), 1);
});
/**/

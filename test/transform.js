
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Transform from '../modules/transform.js';

Deno.test('Transform.of()', () => {
    const transform = Transform.of();
    equals(transform.toJSON(), []);
});

Deno.test('Transform.from(array)', () => {
    const transform = Transform.from([]);
    equals(transform.toJSON(), []);
});

Deno.test('Transform.of("displace")', () => {
    const transform = Transform.of('displace', 1);
    equals(transform.toJSON(), ['displace', 1]);
    equals(transform.apply([0]), [1]);
    equals(transform.unapply([0]), [-1]);
});

Deno.test('Transform.of("gain")', () => {
    const transform = Transform.of('rate', 0.5);
    equals(transform.toJSON(), ['rate', 0.5]);
    equals(transform.apply({ 0: 1, type: "note", duration: 1 }), { 0: 2, type: "note", duration: 2 });
    equals(transform.unapply({ 0: 1, type: "note", duration: 1 }), { 0: 0.5, type: "note", duration: 0.5 });
});

Deno.test('Transform.of("gain")', () => {
    const transform = Transform.of('gain', 0.5);
    equals(transform.toJSON(), ['gain', 0.5]);
    equals(transform.apply({ type: "note", 3: 1 }), { type: "note", 3: 0.5 });
    equals(transform.unapply({ type: "note", 3: 1 }), { type: "note", 3: 2 });
});

Deno.test("Transform === Transform", () => {
    const transform1 = Transform.of('gain', 0.5);
    const transform2 = Transform.of('gain', 0.5);
    assert(transform1 + '' === transform2 + '');
});

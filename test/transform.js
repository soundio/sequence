
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

Deno.test('Transform.of("transpose", "gain")', () => {
    const transform = Transform.of('transpose', 2, 'gain', 0.5);
    equals(transform.toJSON(), ['transpose', 2, 'gain', 0.5]);
    const event = { 0: 0, type: "note", 2: 60, 3: 1, 4: 1, transpose(n) { this[2] += n; } };
    transform.apply(event);
    equals(event[2], 62);  // Transposed +2 semitones
    equals(event[3], 0.5); // Gain scaled to 0.5
});

Deno.test('Transform.of("transpose", "rate")', () => {
    const transform = Transform.of('transpose', -3, 'rate', 2);
    equals(transform.toJSON(), ['transpose', -3, 'rate', 2]);
    const event = { 0: 2, duration: 1, transpose(n) { this[2] += n; } };
    transform.apply(event);
    equals(event[0], 1);         // Beat 2 / 2 = 1
    equals(event.duration, 0.5); // Duration 1 / 2 = 0.5
});

Deno.test("Transform === Transform", () => {
    const transform1 = Transform.of('gain', 0.5);
    const transform2 = Transform.of('gain', 0.5);
    assert(transform1 + '' === transform2 + '');
});

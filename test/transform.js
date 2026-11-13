
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Transform from '../modules/transform.js';
import Event     from '../modules/event.js';
import * as HSID from '../modules/hsid.js';
import reflect   from '../modules/transform/reflect.js';

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

Deno.test('reflect() negative harmony and involution across axes', () => {
    // Axis 3.5 (between Eb and E): C <-> G, D <-> F, Eb <-> E
    equals(reflect(3.5, 60), 55); // C4 -> G3
    equals(reflect(3.5, 62), 65); // D4 -> F4
    equals(reflect(3.5, 63), 64); // Eb4 -> E4
    equals(reflect(3.5, 64), 63); // E4 -> Eb4
    equals(reflect(3.5, 65), 62); // F4 -> D4
    equals(reflect(3.5, 67), 72); // G4 -> C5

    // Involution check across integer and half-integer axes (including negative n and tritone midpoints)
    for (const axis of [0, 2, 3.5, 5, 11.5]) {
        for (let n = -24; n <= 127; n++) {
            const r = reflect(axis, n);
            is(reflect(axis, r), n);
            assert(Math.abs(r - n) <= 6);
        }
    }
});

Deno.test('Transform.of("reflect") on note and chord events', () => {
    const negHarmony = Transform.of('reflect', 3.5);
    equals(negHarmony.toJSON(), ['reflect', 3.5]);

    // Pitched NoteEvent
    const note = Event.from([0, 'note', 60, 0.8, 1]);
    negHarmony.apply(note);
    is(note[2], 55);
    negHarmony.unapply(note);
    is(note[2], 60);

    // Drum note is left untouched
    const drum = Event.from([0, 'note', 'kick', 0.8, 1]);
    const kickNumber = drum[2];
    negHarmony.apply(drum);
    is(drum[2], kickNumber);

    // Symmetrical Dorian scale-chord (D-7) around D (axis 2) maps to itself
    const dorian = Transform.of('reflect', 2);
    const dm7 = Event.from([0, 'chord', 'D', '-7', 4]);
    const dm7Hsid = dm7[3];
    dorian.apply(dm7);
    is(dm7[2], 2);
    is(dm7[3], dm7Hsid);

    // Lydian dominant (C7♯11) reflects across 3.5 to half-diminished 9 (Gø9) and back,
    // without mutating cached HSID numbers
    const lydDom = Event.from([0, 'chord', 'C', '7♯11', 4]);
    const lydDomHsid = lydDom[3];
    const origNumbers = Array.from(HSID.toNumbers(lydDomHsid));
    negHarmony.apply(lydDom);
    is(lydDom[2], 7);
    is(lydDom.extension, 'ø9');
    equals(Array.from(HSID.toNumbers(lydDomHsid)), origNumbers);
    negHarmony.unapply(lydDom);
    is(lydDom[2], 0);
    is(lydDom[3], lydDomHsid);

    // C major reflects across 3.5 to C-11/G and back
    const cmaj = Event.from([0, 'chord', 'C', '', 4]);
    const cmajHsid = cmaj[3];
    negHarmony.apply(cmaj);
    is(cmaj[2], 7);
    is(cmaj.extension, '{5}-11/');
    is(cmaj.toChordSymbol(), 'C-11/G');
    negHarmony.unapply(cmaj);
    is(cmaj[2], 0);
    is(cmaj[3], cmajHsid);

    // G7 reflects across 3.5 to F-6/C and back
    const g7 = Event.from([0, 'chord', 'G', '7', 4]);
    const g7Hsid = g7[3];
    negHarmony.apply(g7);
    is(g7[2], 0);
    is(g7.extension, '{5}-6/');
    is(g7.toChordSymbol(), 'F-6/C');
    negHarmony.unapply(g7);
    is(g7[2], 7);
    is(g7[3], g7Hsid);

    // Bare triad [0, 4, 7] still reflects cleanly to [0, 5, 8] and back (with a console.warn)
    const triadHsid = HSID.of(0, 4, 7);
    const triad = Event.from([0, 'chord', 0, triadHsid, 4]);
    negHarmony.apply(triad);
    is(triad[2], 7);
    is(triad[3], HSID.of(0, 5, 8));
    negHarmony.unapply(triad);
    is(triad[2], 0);
    is(triad[3], triadHsid);
});

Deno.test('Transform.of("reflect") on key events', () => {
    const keyC = Event.from([0, 'key', 'C']);

    Transform.of('reflect', 3.5).apply(keyC);
    is(keyC.name, 'E♭');
    Transform.of('reflect', 3.5).unapply(keyC);
    is(keyC.name, 'C');

    Transform.of('reflect', 5).apply(keyC);
    is(keyC.name, 'F♯');
    Transform.of('reflect', 5).unapply(keyC);
    is(keyC.name, 'C');

    Transform.of('reflect', 2).apply(keyC);
    is(keyC.name, 'C');

    // Every axis (0..11.5) and key (-5..6) preserves the reflected diatonic pitch-class set and round-trips
    const majorScale = [0, 2, 4, 5, 7, 9, 11];
    for (let axis = 0; axis < 12; axis += 0.5) {
        const t = Transform.of('reflect', axis);
        for (let k = -5; k <= 6; k++) {
            const ev = Event.from([0, 'key', k]);
            t.apply(ev);
            const expectedNotes = new Set(majorScale.map(n => ((reflect(axis, n + k * 7) % 12) + 12) % 12));
            const actualNotes   = new Set(majorScale.map(n => ((n + ev[2] * 7) % 12 + 12) % 12));
            equals(actualNotes, expectedNotes);
            t.unapply(ev);
            is(ev[2], k);
        }
    }
});

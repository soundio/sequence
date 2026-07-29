
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Event     from '../modules/event.js';
import Transform from '../modules/transform.js';

/*
Deno.test('Event()', () => {
    equals(Event.of(0, 'note', 'C4', 0.1, 1), [0, "note", 60, 0.1, 1]);
    equals(JSON.stringify(Event.of(0, 'note', 'C4', 0.1, 1)), '[0,"note",60,0.1,1]');
});
*/

Deno.test('Event.from(chord)', () => {
    const event = Event.of(0, "chord", "C", "-", 1);
    equals(Event.from(event).toJSON(), [0, Event.TYPES.chord, 0, 5222, 1, 0]);
});

Deno.test('Event.of(key)', () => {
    equals(Event.of(0, "key", "F𝄫").toJSON(), [0, Event.TYPES.key, -15]);
    equals(Event.of(0, "key", "C𝄫").toJSON(), [0, Event.TYPES.key, -14]);
    equals(Event.of(0, "key", "G𝄫").toJSON(), [0, Event.TYPES.key, -13]);
    equals(Event.of(0, "key", "D𝄫").toJSON(), [0, Event.TYPES.key, -12]);
    equals(Event.of(0, "key", "A𝄫").toJSON(), [0, Event.TYPES.key, -11]);
    equals(Event.of(0, "key", "E𝄫").toJSON(), [0, Event.TYPES.key, -10]);
    equals(Event.of(0, "key", "B𝄫").toJSON(), [0, Event.TYPES.key, -9]);
    equals(Event.of(0, "key", "F♭").toJSON(), [0, Event.TYPES.key, -8]);
    equals(Event.of(0, "key", "C♭").toJSON(), [0, Event.TYPES.key, -7]);
    equals(Event.of(0, "key", "G♭").toJSON(), [0, Event.TYPES.key, -6]);
    equals(Event.of(0, "key", "D♭").toJSON(), [0, Event.TYPES.key, -5]);
    equals(Event.of(0, "key", "A♭").toJSON(), [0, Event.TYPES.key, -4]);
    equals(Event.of(0, "key", "E♭").toJSON(), [0, Event.TYPES.key, -3]);
    equals(Event.of(0, "key", "B♭").toJSON(), [0, Event.TYPES.key, -2]);
    equals(Event.of(0, "key", "F").toJSON(),  [0, Event.TYPES.key, -1]);
    equals(Event.of(0, "key", "C").toJSON(),  [0, Event.TYPES.key, 0]);
    equals(Event.of(0, "key", "G").toJSON(),  [0, Event.TYPES.key, 1]);
    equals(Event.of(0, "key", "D").toJSON(),  [0, Event.TYPES.key, 2]);
    equals(Event.of(0, "key", "A").toJSON(),  [0, Event.TYPES.key, 3]);
    equals(Event.of(0, "key", "E").toJSON(),  [0, Event.TYPES.key, 4]);
    equals(Event.of(0, "key", "B").toJSON(),  [0, Event.TYPES.key, 5]);
    equals(Event.of(0, "key", "F♯").toJSON(), [0, Event.TYPES.key, 6]);
    equals(Event.of(0, "key", "C♯").toJSON(), [0, Event.TYPES.key, 7]);
    equals(Event.of(0, "key", "G♯").toJSON(), [0, Event.TYPES.key, 8]);
    equals(Event.of(0, "key", "D♯").toJSON(), [0, Event.TYPES.key, 9]);
    equals(Event.of(0, "key", "A♯").toJSON(), [0, Event.TYPES.key, 10]);
    equals(Event.of(0, "key", "E♯").toJSON(), [0, Event.TYPES.key, 11]);
    equals(Event.of(0, "key", "B♯").toJSON(), [0, Event.TYPES.key, 12]);
    equals(Event.of(0, "key", "F𝄪").toJSON(), [0, Event.TYPES.key, 13]);
    equals(Event.of(0, "key", "C𝄪").toJSON(), [0, Event.TYPES.key, 14]);
    equals(Event.of(0, "key", "G𝄪").toJSON(), [0, Event.TYPES.key, 15]);
    equals(Event.of(0, "key", "D𝄪").toJSON(), [0, Event.TYPES.key, 16]);
    equals(Event.of(0, "key", "A𝄪").toJSON(), [0, Event.TYPES.key, 17]);
    equals(Event.of(0, "key", "E𝄪").toJSON(), [0, Event.TYPES.key, 18]);
    equals(Event.of(0, "key", "B𝄪").toJSON(), [0, Event.TYPES.key, 19]);
});

Deno.test('Event.from(key)', () => {
    const event = Event.of(0, "key", "C");
    equals(Event.from(event).toJSON(), [0, Event.TYPES.key, 0]);
});

Deno.test('Event.from(note)', () => {
    const event = Event.of(0, "note", "C3", "0dB", 1);
    equals(Event.from(event).toJSON(), [0, Event.TYPES.note, 48, 1, 1]);
});

Deno.test('Event.from(note).gain', () => {
    // Test round-trip gain conversion
    const e1  = Event.of(0, "note", "C", "0dB",   1);   equals(e1.gain,  "0dB");
    const e2  = Event.of(0, "note", "C", "-4.5dB", 1);  equals(e2.gain,  "-4.5dB");
    const e3  = Event.of(0, "note", "C", "-6dB",  1);   equals(e3.gain,  "-6dB");
    const e4  = Event.of(0, "note", "C", "-9dB",  1);   equals(e4.gain,  "-9dB");
    const e5  = Event.of(0, "note", "C", "-12dB", 1);   equals(e5.gain,  "-12dB");
    const e6  = Event.of(0, "note", "C", "-18dB", 1);   equals(e6.gain,  "-18dB");
    const e7  = Event.of(0, "note", "C", "-20dB", 1);   equals(e7.gain,  "-20dB");
    const e8  = Event.of(0, "note", "C", "-24dB", 1);   equals(e8.gain,  "-24dB");
    const e9  = Event.of(0, "note", "C", "-30dB", 1);   equals(e9.gain,  "-30dB");
    const e10 = Event.of(0, "note", "C", "-31.5dB", 1); equals(e10.gain, "-31.5dB");
    const e11 = Event.of(0, "note", "C", "-36dB", 1);   equals(e11.gain, "-36dB");
    const e12 = Event.of(0, "note", "C", "-40dB", 1);   equals(e12.gain, "-40dB");
    const e13 = Event.of(0, "note", "C", "-48dB", 1);   equals(e13.gain, "-48dB");
    const e14 = Event.of(0, "note", "C", "-60dB", 1);   equals(e14.gain, "-60dB");
});

Deno.test('Event.from(param)', () => {
    const e1 = Event.of(0, "param", "gain", 2);
    equals(Event.from(e1).toJSON(), [0, Event.TYPES.param, 6, 2, 0, 0]);

    const e2 = Event.of(0, "param", "gain", 2, "linear");
    equals(Event.from(e2).toJSON(), [0, Event.TYPES.param, 6, 2, 1, 0]);

    const e3 = Event.of(0, "param", "gain", 2, "exponential");
    equals(Event.from(e3).toJSON(), [0, Event.TYPES.param, 6, 2, 2, 0]);

    const e4 = Event.of(0, "param", "gain", 2, "target", 5);
    equals(Event.from(e4).toJSON(), [0, Event.TYPES.param, 6, 2, 3, 5]);

    //const e5 = Event.of(0, "rate", 2, "curve", 5);
    //equals(Event.from(e5).toJSON(), [0, Event.TYPES.rate, 6, 2, 3, 5]);

    const e6 = Event.of(0, "param", "gain", 2, "hold");
    equals(Event.from(e6).toJSON(), [0, Event.TYPES.param, 6, 2, 5, 0]);

    const e7 = Event.of(0, "param", "gain", 2, "cancel");
    equals(Event.from(e7).toJSON(), [0, Event.TYPES.param, 6, 2, 6, 0]);
});

Deno.test('Event.from(rate)', () => {
    const e1 = Event.of(0, "rate", 2);
    equals(Event.from(e1).toJSON(), [0, Event.TYPES.rate, 2, 0, 0]);

    const e2 = Event.of(0, "rate", 2, "linear");
    equals(Event.from(e2).toJSON(), [0, Event.TYPES.rate, 2, 1, 0]);

    const e3 = Event.of(0, "rate", 2, "exponential");
    equals(Event.from(e3).toJSON(), [0, Event.TYPES.rate, 2, 2, 0]);

    const e4 = Event.of(0, "rate", 2, "target", 5);
    equals(Event.from(e4).toJSON(), [0, Event.TYPES.rate, 2, 3, 5]);

    //const e5 = Event.of(0, "rate", 2, "curve", 5);
    //equals(Event.from(e5).toJSON(), [0, Event.TYPES.rate, 2, 3, 5]);

    const e6 = Event.of(0, "rate", 2, "hold");
    equals(Event.from(e6).toJSON(), [0, Event.TYPES.rate, 2, 5, 0]);

    const e7 = Event.of(0, "rate", 2, "cancel");
    equals(Event.from(e7).toJSON(), [0, Event.TYPES.rate, 2, 6, 0]);
});

Deno.test('Event.from(sequence)', () => {
    const e1 = Event.of(0, "sequence", 1, 1, 1);
    equals(Event.from(e1).toJSON(), [0, Event.TYPES.sequence, 1, 1, 1]);
});

Deno.test('Event.of(sequence).transforms', () => {
    const e1 = Event.of(0, "sequence", 1, 1, 1);
    equals(e1.toJSON(), [0, Event.TYPES.sequence, 1, 1, 1]);
    equals(e1.transforms, []);

    const e2 = Event.of(0, "sequence", 1, 1, 1, "displace", 2);
    equals(e2.toJSON(), [0, Event.TYPES.sequence, 1, 1, 1, 1, 2]);
    equals(e2.transforms, ["displace", 2]);

    const e3 = Event.of(0, "sequence", 1, 1, 1, "displace", 2, "transpose", 4);
    equals(e3.toJSON(), [0, Event.TYPES.sequence, 1, 1, 1, Transform.TYPES.displace, 2, Transform.TYPES.transpose, 4]);
    equals(e3.transforms, ["displace", 2, "transpose", 4]);
});

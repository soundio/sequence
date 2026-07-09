
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Event from '../modules/event.js';

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
    equals(e3.toJSON(), [0, Event.TYPES.sequence, 1, 1, 1, 1, 2, 5, 4]);
    equals(e3.transforms, ["displace", 2, "transpose", 4]);
});


import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Event     from '../modules/event.js';
import Transform from '../modules/transform.js';
import { packAddress } from '../modules/event/address.js';

const CHORD    = Event.TYPES.chord;
const KEY      = Event.TYPES.key;
const NOTE     = Event.TYPES.note;
const CONTROL  = Event.TYPES.control;
const RATE     = Event.TYPES.rate;
const SEQUENCE = Event.TYPES.sequence;

/*
Deno.test('Event()', () => {
    equals(Event.of(0, 'note', 'C4', 0.1, 1), [0, "note", 60, 0.1, 1]);
    equals(JSON.stringify(Event.of(0, 'note', 'C4', 0.1, 1)), '[0,"note",60,0.1,1]');
});
*/

Deno.test('Event.from(chord)', () => {
    const event = Event.of(0, "chord", "C", "-", 1);
    equals(Event.from(event).toJSON(), [0, CHORD, 0, 5222, 1]);
});

Deno.test('Event.from(chord) slash chord', () => {
    const event = Event.of(0, "chord", "E", "{8}/", 2);
    is(event.root, "E");
    is(event.extension, "{8}/");
    is(event.bass, undefined);
    is(event.toChordSymbol(), "C/E");
    is(event.toChordSymbol(0), "C/E");
    is(event.toString(), "0 chord C/E 2");
    equals(Event.from(event).toJSON(), [0, CHORD, 4, 2775, 2]);
});

Deno.test('ChordEvent.toChordSymbol()', () => {
    const c7g = Event.of(1, "chord", "G", "{5}7/", 4);
    is(c7g.toChordSymbol(), "C7/G");
    is(c7g.toString(), "1 chord C7/G 4");

    const cmEb = Event.of(2, "chord", "E♭", "{9}-/", 3);
    is(cmEb.toChordSymbol(), "C-/E♭");
    is(cmEb.toString(), "2 chord C-/E♭ 3");

    const dm7 = Event.of(0, "chord", "D", "-7", 4);
    is(dm7.toChordSymbol(), "D-7");
    is(dm7.toString(), "0 chord D-7 4");

    // Key-aware rendering of chords
    const chord1 = Event.of(0, "chord", 1, "7", 4);
    is(chord1.toChordSymbol("E♭"), "D♭7");
    is(chord1.toChordSymbol("D"), "C♯7");

    // A/C# in key C (extension {8}/ on root 1):
    const aCsharp = Event.of(0, "chord", 1, "{8}/", 4);
    is(aCsharp.toChordSymbol("C"), "A/C♯");

    // D♭ major in key C (extension '' on root 1):
    const dbMaj = Event.of(0, "chord", 1, "", 4);
    is(dbMaj.toChordSymbol("C"), "D♭");

    // C♯°7 in key C (extension '°7' on root 1):
    const csharpDim = Event.of(0, "chord", 1, "°7", 4);
    is(csharpDim.toChordSymbol("C"), "C♯°7");
});

Deno.test('ChordEvent.of() parsing chord symbols', () => {
    // Slash chord with explicit duration
    const ce = Event.of(0, "chord", "C/E", 2);
    is(ce.root, "E");
    is(ce.sourcePitch, "E");
    is(ce.extension, "{8}/");
    is(ce.duration, 2);
    is(ce.toChordSymbol(), "C/E");
    is(ce.toString(), "0 chord C/E 2");
    equals(ce.toJSON(), [0, CHORD, 4, 2775, 2]);

    // Slash chord with 7th
    const c7g = Event.of(1, "chord", "C7/G", 4);
    is(c7g.root, "G");
    is(c7g.sourcePitch, "G");
    is(c7g.extension, "{5}7/");
    is(c7g.duration, 4);
    is(c7g.toChordSymbol(), "C7/G");

    // Minor slash chord with flat accidental
    const cmEb = Event.of(2, "chord", "C-/E♭", 3);
    is(cmEb.root, "E♭");
    is(cmEb.sourcePitch, "E♭");
    is(cmEb.extension, "{9}-/");
    is(cmEb.duration, 3);
    is(cmEb.toChordSymbol(), "C-/E♭");

    // Standard chord with alias 'm7' -> '-7'
    const dm7 = Event.of(0, "chord", "Dm7", 4);
    is(dm7.root, "D");
    is(dm7.sourcePitch, "D");
    is(dm7.extension, "-7");
    is(dm7.duration, 4);
    is(dm7.toChordSymbol(), "D-7");

    // Major triad with duration
    const c = Event.of(0, "chord", "C", 4);
    is(c.root, "C");
    is(c.extension, "");
    is(c.duration, 4);
    is(c.toChordSymbol(), "C");

    // Default duration (2)
    const ceDef = Event.of(0, "chord", "C/E");
    is(ceDef.root, "E");
    is(ceDef.extension, "{8}/");
    is(ceDef.duration, 2);

    // Key-aware slash chord: A/C# in key C
    const aCsharp = Event.of(0, "chord", "A/C#", 4);
    is(aCsharp.root, "C♯");
    is(aCsharp.extension, "{8}/");
    is(aCsharp.toChordSymbol("C"), "A/C♯");

    // 6/9 chord with slash in extension
    const c69 = Event.of(0, "chord", "C∆6/9", 2);
    is(c69.root, "C");
    is(c69.extension, "∆6/9");
    is(c69.duration, 2);
    is(c69.toChordSymbol(), "C∆6/9");

    const c69alias = Event.of(0, "chord", "C6/9", 2);
    is(c69alias.root, "C");
    is(c69alias.extension, "∆6/9");
    is(c69alias.duration, 2);
    is(c69alias.toChordSymbol(), "C∆6/9");
});

Deno.test('Event.of(meter)', () => {
    // 4/4 meter: rsid 10 (0b1010), divisor 1
    const m44 = Event.of(0, "meter", 0b1010, 1);
    is(m44.rsid, 10);
    is(m44.divisor, 1);
    is(m44.duration, 4);
    is(m44.timesig, '4/4');
    equals(m44.divisions, [2, 4]);

    // 3/4 meter: rsid 7 (0b111), divisor 1
    const m34 = Event.of(0, "meter", 0b111, 1);
    is(m34.rsid, 7);
    is(m34.divisor, 1);
    is(m34.duration, 3);
    is(m34.timesig, '3/4');

    // 6/8 meter: rsid 36 (0b100100), divisor 0.5
    const m68 = Event.of(0, "meter", 0b100100, 0.5);
    is(m68.rsid, 36);
    is(m68.divisor, 0.5);
    is(m68.duration, 3);
    is(m68.timesig, '6/8');
    equals(m68.divisions, [1.5, 3]);

    // 2/2 meter: rsid 3 (0b11), divisor 2
    const m22 = Event.of(0, "meter", 0b11, 2);
    is(m22.rsid, 3);
    is(m22.divisor, 2);
    is(m22.duration, 4);
    is(m22.timesig, '2/2');
    equals(m22.divisions, [2, 4]);
});

Deno.test('Event.from(meter)', () => {
    const m = Event.from([0, "meter", 0b1010, 1]);
    is(m.rsid, 10);
    is(m.divisor, 1);
    is(m.duration, 4);
    is(m.timesig, '4/4');
    equals(m.divisions, [2, 4]);
});

Deno.test('Event.of(key)', () => {
    equals(Event.of(0, "key", "F𝄫").toJSON(), [0, KEY, -15]);
    equals(Event.of(0, "key", "C𝄫").toJSON(), [0, KEY, -14]);
    equals(Event.of(0, "key", "G𝄫").toJSON(), [0, KEY, -13]);
    equals(Event.of(0, "key", "D𝄫").toJSON(), [0, KEY, -12]);
    equals(Event.of(0, "key", "A𝄫").toJSON(), [0, KEY, -11]);
    equals(Event.of(0, "key", "E𝄫").toJSON(), [0, KEY, -10]);
    equals(Event.of(0, "key", "B𝄫").toJSON(), [0, KEY, -9]);
    equals(Event.of(0, "key", "F♭").toJSON(), [0, KEY, -8]);
    equals(Event.of(0, "key", "C♭").toJSON(), [0, KEY, -7]);
    equals(Event.of(0, "key", "G♭").toJSON(), [0, KEY, -6]);
    equals(Event.of(0, "key", "D♭").toJSON(), [0, KEY, -5]);
    equals(Event.of(0, "key", "A♭").toJSON(), [0, KEY, -4]);
    equals(Event.of(0, "key", "E♭").toJSON(), [0, KEY, -3]);
    equals(Event.of(0, "key", "B♭").toJSON(), [0, KEY, -2]);
    equals(Event.of(0, "key", "F").toJSON(),  [0, KEY, -1]);
    equals(Event.of(0, "key", "C").toJSON(),  [0, KEY, 0]);
    equals(Event.of(0, "key", "G").toJSON(),  [0, KEY, 1]);
    equals(Event.of(0, "key", "D").toJSON(),  [0, KEY, 2]);
    equals(Event.of(0, "key", "A").toJSON(),  [0, KEY, 3]);
    equals(Event.of(0, "key", "E").toJSON(),  [0, KEY, 4]);
    equals(Event.of(0, "key", "B").toJSON(),  [0, KEY, 5]);
    equals(Event.of(0, "key", "F♯").toJSON(), [0, KEY, 6]);
    equals(Event.of(0, "key", "C♯").toJSON(), [0, KEY, 7]);
    equals(Event.of(0, "key", "G♯").toJSON(), [0, KEY, 8]);
    equals(Event.of(0, "key", "D♯").toJSON(), [0, KEY, 9]);
    equals(Event.of(0, "key", "A♯").toJSON(), [0, KEY, 10]);
    equals(Event.of(0, "key", "E♯").toJSON(), [0, KEY, 11]);
    equals(Event.of(0, "key", "B♯").toJSON(), [0, KEY, 12]);
    equals(Event.of(0, "key", "F𝄪").toJSON(), [0, KEY, 13]);
    equals(Event.of(0, "key", "C𝄪").toJSON(), [0, KEY, 14]);
    equals(Event.of(0, "key", "G𝄪").toJSON(), [0, KEY, 15]);
    equals(Event.of(0, "key", "D𝄪").toJSON(), [0, KEY, 16]);
    equals(Event.of(0, "key", "A𝄪").toJSON(), [0, KEY, 17]);
    equals(Event.of(0, "key", "E𝄪").toJSON(), [0, KEY, 18]);
    equals(Event.of(0, "key", "B𝄪").toJSON(), [0, KEY, 19]);
});

Deno.test('Event.from(key)', () => {
    const event = Event.of(0, "key", "C");
    equals(Event.from(event).toJSON(), [0, KEY, 0]);
});

Deno.test('Event.from(note)', () => {
    const event = Event.of(0, "note", "C3", "0dB", 1);
    equals(Event.from(event).toJSON(), [0, NOTE, 48, 1, 1]);
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

Deno.test('Event.from(control)', () => {
    const e1 = Event.of(0, "control", "gain", "step", 2);
    equals(Event.from(e1).toJSON(), [0, CONTROL, packAddress(7, 0), 2, 0]);

    const e2 = Event.of(0, "control", "gain", "linear", 2);
    equals(Event.from(e2).toJSON(), [0, CONTROL, packAddress(7, 1), 2, 0]);

    const e3 = Event.of(0, "control", "gain", "exponential", 2);
    equals(Event.from(e3).toJSON(), [0, CONTROL, packAddress(7, 2), 2, 0]);

    const e4 = Event.of(0, "control", "gain", "target", 2, 5);
    equals(Event.from(e4).toJSON(), [0, CONTROL, packAddress(7, 3), 2, 5]);

    const e6 = Event.of(0, "control", "gain", "hold");
    equals(Event.from(e6).toJSON(), [0, CONTROL, packAddress(7, 5), 0, 0]);

    const e7 = Event.of(0, "control", "gain", "cancel");
    equals(Event.from(e7).toJSON(), [0, CONTROL, packAddress(7, 6), 0, 0]);
});
Deno.test('Event.from(rate)', () => {
    const e1 = Event.of(0, "rate", "step", 2);
    equals(Event.from(e1).toJSON(), [0, RATE, 0, 2, 0]);

    const e2 = Event.of(0, "rate", "linear", 2);
    equals(Event.from(e2).toJSON(), [0, RATE, 1, 2, 0]);

    const e3 = Event.of(0, "rate", "exponential", 2);
    equals(Event.from(e3).toJSON(), [0, RATE, 2, 2, 0]);

    const e4 = Event.of(0, "rate", "target", 2, 5);
    equals(Event.from(e4).toJSON(), [0, RATE, 3, 2, 5]);

    //const e5 = Event.of(0, "rate", "curve", [2, 3], 5);
    //equals(Event.from(e5).toJSON(), [0, RATE, 4, 2, 3, 5]);

    const e6 = Event.of(0, "rate", "hold");
    equals(Event.from(e6).toJSON(), [0, RATE, 5, 0, 0]);

    const e7 = Event.of(0, "rate", "cancel");
    equals(Event.from(e7).toJSON(), [0, RATE, 6, 0, 0]);
});
Deno.test('Event.from(sequence)', () => {
    const e1 = Event.of(0, "sequence", 1, 1, 1);
    equals(Event.from(e1).toJSON(), [0, SEQUENCE, 1, 1, 1]);
});

Deno.test('Event.of(sequence).transforms', () => {
    const e1 = Event.of(0, "sequence", 1, 1, 1);
    equals(e1.toJSON(), [0, SEQUENCE, 1, 1, 1]);
    equals(e1.transforms, []);

    const e2 = Event.of(0, "sequence", 1, 1, 1, "displace", 2);
    equals(e2.toJSON(), [0, SEQUENCE, 1, 1, 1, 1, 2]);
    equals(e2.transforms, ["displace", 2]);

    const e3 = Event.of(0, "sequence", 1, 1, 1, "displace", 2, "transpose", 4);
    equals(e3.toJSON(), [0, SEQUENCE, 1, 1, 1, Transform.TYPES.displace, 2, Transform.TYPES.transpose, 4]);
    equals(e3.transforms, ["displace", 2, "transpose", 4]);
});

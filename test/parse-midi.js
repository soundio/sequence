
import {
    assert,
    assertEquals as equals,
    assertAlmostEquals as almost,
    assertThrows as throws
} from 'jsr:@std/assert@1';

import { Sequence } from '../module.js';
import parseMIDI from '../modules/parse/parse-midi.js';
import Event from '../modules/event.js';


function encodeVLQ(value) {
    const bytes = [value & 0x7F];
    let v = value >>> 7;
    while (v > 0) {
        bytes.unshift((v & 0x7F) | 0x80);
        v >>>= 7;
    }
    return bytes;
}

function asciiBytes(str) {
    return Array.from(new TextEncoder().encode(str));
}

function buildTrack(bodyBytes) {
    const len = bodyBytes.length;
    return [
        ...asciiBytes('MTrk'),
        (len >>> 24) & 0xFF,
        (len >>> 16) & 0xFF,
        (len >>> 8) & 0xFF,
        len & 0xFF,
        ...bodyBytes
    ];
}

function buildMidi({ format = 1, division = 480, tracks = [] }) {
    const ntrks = tracks.length;
    const chunks = [
        ...asciiBytes('MThd'),
        0, 0, 0, 6,
        (format >>> 8) & 0xFF, format & 0xFF,
        (ntrks >>> 8) & 0xFF, ntrks & 0xFF,
        (division >>> 8) & 0xFF, division & 0xFF
    ];

    for (const body of tracks) {
        chunks.push(...buildTrack(body));
    }

    return new Uint8Array(chunks);
}


Deno.test('parseMIDI: Logic Pro real export deduplicates 64 repeated region tracks', async () => {
    const bytes    = await Deno.readFile('./test/midi/logic-selection-as-midi.mid');
    const sequence = parseMIDI(bytes);
    const flat     = parseMIDI(bytes, { flat: true });

    equals(sequence.name, undefined);
    equals(parseMIDI(bytes, { name: 'Selection' }).name, 'Selection');

    // 1 deduplicated sub-sequence ("Bloomsbury") scheduled 64 times across 1024 beats
    equals(sequence.sequences.length, 1);
    equals(sequence.sequences[0].id, 1);
    equals(sequence.sequences[0].name, 'Bloomsbury');
    equals(sequence.sequences[0].events.length, 19);

    const rootSeqEvents = sequence.events.filter(Event.isSequence);
    const rootRateEvents = sequence.events.filter(Event.isRate);
    const rootMeterEvents = sequence.events.filter(Event.isMeter);
    const rootKeyEvents = sequence.events.filter(Event.isKey);

    equals(rootRateEvents.length, 1);
    almost(rootRateEvents[0].value, 80 / 60, 1e-6);

    equals(rootMeterEvents.length, 1);
    equals(rootMeterEvents[0].divisor, 1);

    equals(rootKeyEvents.length, 1);
    equals(rootKeyEvents[0].name, 'C');

    equals(rootSeqEvents.length, 64);
    equals(rootSeqEvents[0][0], 0);
    equals(rootSeqEvents[0][3], 1);
    equals(rootSeqEvents[1][0], 16);
    equals(rootSeqEvents[63][0], 1008);

    equals(sequence.parts, [
        { name: 'Bloomsbury', staff: 'grand', routing: { 1: 0 } }
    ]);

    // Iterating nested sequence yields the exact same 1216 notes as flat parse
    const nestedNotes = [...sequence].filter(Event.isNote);
    const flatNotes = [...flat].filter(Event.isNote);
    equals(nestedNotes.length, 64 * 19);
    equals(flatNotes.length, nestedNotes.length);

    for (let i = 0; i < nestedNotes.length; i++) {
        almost(nestedNotes[i][0], flatNotes[i][0], 1e-9);
        equals(nestedNotes[i].number, flatNotes[i].number);
        almost(nestedNotes[i][3], flatNotes[i][3], 1e-6);
        almost(nestedNotes[i].duration, flatNotes[i].duration, 1e-9);
    }

    // Record serialisation round-trip preserves numeric target IDs
    const record = Sequence.toRecord(sequence);
    const restored = Sequence.fromRecord(record);
    const restoredNotes = [...restored].filter(Event.isNote);
    equals(restoredNotes.length, nestedNotes.length);
    equals(restored.events.filter(Event.isSequence)[0][3], 1);
});


Deno.test('parseMIDI: temporary parts inference uses GM ch 10 drum and pitch-range fallbacks', () => {
    // Unnamed multi-channel Format 0: ch0 low bass notes (36..48), ch9 drums
    const bassAndDrums = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            0, 0x90, 36, 90,
            0, 0x99, 36, 100,
            ...encodeVLQ(480), 0x80, 36, 0,
            0, 0x89, 36, 0,
            0, 0x90, 48, 90,
            ...encodeVLQ(480), 0x80, 48, 0,
            0, 0xFF, 0x2F, 0
        ]]
    });

    const seq = parseMIDI(bassAndDrums);
    equals(seq.parts, [
        { name: 'Channel 1',  staff: 'bass', routing: { 1: 0 } },
        { name: 'Channel 10', staff: 'drum', routing: { 2: 0 } }
    ]);

    // Unnamed single-channel wide-range keyboard spans treble & bass -> 'grand'
    const wideRange = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            0, 0x90, 36, 90,
            0, 0x90, 84, 90,
            ...encodeVLQ(480), 0x80, 36, 0,
            0, 0x80, 84, 0,
            0, 0xFF, 0x2F, 0
        ]]
    });

    const grandSeq = parseMIDI(wideRange);
    equals(grandSeq.parts, [
        { name: 'Channel 1', staff: 'grand', routing: { 0: 0 } }
    ]);
});


Deno.test('parseMIDI: Format 0 single-channel parses flat with conductor metadata and text', () => {
    const midi = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            // Track name: "Lead"
            0, 0xFF, 0x03, 4, ...asciiBytes('Lead'),
            // Marker: "Chorus"
            0, 0xFF, 0x06, 6, ...asciiBytes('Chorus'),
            // Tempo: 120 BPM (500,000 us = 0x07A120)
            0, 0xFF, 0x51, 3, 0x07, 0xA1, 0x20,
            // Time sig: 3/4 (nn=3, dd=2 -> 4)
            0, 0xFF, 0x58, 4, 3, 2, 24, 8,
            // Key sig: E flat (-3 = 0xFD, major=0)
            0, 0xFF, 0x59, 2, 0xFD, 0,
            // Note On C4 vel 64 at tick 0
            0, 0x90, 60, 64,
            // Note Off C4 at tick 480 (beat 1)
            ...encodeVLQ(480), 0x80, 60, 0,
            // End of Track
            0, 0xFF, 0x2F, 0
        ]]
    });

    const seq = parseMIDI(midi);
    equals(seq.name, undefined);
    equals(seq.parts, [{ name: 'Lead', staff: 'treble', routing: { 0: 0 } }]);
    equals(seq.sequences, undefined);

    const events = [...seq];
    const key = events.find(Event.isKey);
    const meter = events.find(Event.isMeter);
    const rate = events.find(Event.isRate);
    const text = events.find(Event.isText);
    const notes = events.filter(Event.isNote);

    equals(key.name, 'E♭');
    equals(meter.timesig, '3/4');
    almost(rate.value, 2, 1e-6);
    equals(text.text, 'Chorus');
    equals(notes.length, 1);
    equals(notes[0].number, 60);
    almost(notes[0][3], (64 / 127) ** 2, 1e-6);
    // Beat duration in seq.events is 1 beat; at rate=2 bps, iterated location duration is 0.5s
    equals(seq.events.find(Event.isNote).duration, 1);
    almost(notes[0].duration, 0.5, 1e-6);
});


Deno.test('parseMIDI: Format 0 multi-channel splits into sequences unless flat option set', () => {
    const orderedMidi = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            // t=0: ch0 Note On C4
            0, 0x90, 60, 100,
            // t=480: ch0 Note Off C4 (running via vel 0)
            ...encodeVLQ(480), 60, 0,
            // t=960 (delta 480): ch1 Note On G4
            ...encodeVLQ(480), 0x91, 67, 80,
            // t=1440 (delta 480): ch1 Note Off G4
            ...encodeVLQ(480), 0x81, 67, 0,
            // EOT
            0, 0xFF, 0x2F, 0
        ]]
    });

    const seq = parseMIDI(orderedMidi);
    equals(seq.sequences.length, 2);
    const notes = [...seq].filter(Event.isNote);
    equals(notes.length, 2);
    equals(notes[0].number, 60);
    equals(notes[0][0], 0);
    equals(notes[0].duration, 1);
    equals(notes[1].number, 67);
    equals(notes[1][0], 2);
    equals(notes[1].duration, 1);

    const flat = parseMIDI(orderedMidi, { flat: true });
    equals(flat.sequences, undefined);
    equals([...flat].filter(Event.isNote).length, 2);
});


Deno.test('parseMIDI: running status, velocity-0 note off, overlapping same-pitch & EOF closure', () => {
    const midi = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            // SysEx ignored cleanly (and clears running status)
            0, 0xF0, 3, 0x7E, 0x7F, 0xF7,
            // t=0: Note On C4 vel 100
            0, 0x90, 60, 100,
            // t=240: running status Note On C4 vel 80 (overlap)
            ...encodeVLQ(240), 60, 80,
            // t=480: running status Note On C4 vel 0 (closes first C4: dur 1 beat)
            ...encodeVLQ(240), 60, 0,
            // t=960: Note Off C4 (closes second C4: 0.5..2 -> dur 1.5 beats)
            ...encodeVLQ(480), 0x80, 60, 64,
            // t=960: Unclosed E4 Note On
            0, 0x90, 64, 90,
            // t=1080: EOT 0.25 beats later -> E4 dur = 0.25
            ...encodeVLQ(120), 0xFF, 0x2F, 0
        ]]
    });

    const seq = parseMIDI(midi);
    const notes = [...seq].filter(Event.isNote);
    equals(notes.length, 3);

    equals(notes[0].number, 60);
    equals(notes[0][0], 0);
    equals(notes[0].duration, 1);

    equals(notes[1].number, 60);
    equals(notes[1][0], 0.5);
    equals(notes[1].duration, 1.5);

    equals(notes[2].number, 64);
    equals(notes[2][0], 2);
    equals(notes[2].duration, 0.25);
});


Deno.test('parseMIDI: mapped CCs, unmapped CC skip, pitch bend, channel pressure & 14-bit RPN', () => {
    const midi = buildMidi({
        format: 0,
        division: 480,
        tracks: [[
            // CC 1 (modulation) = 127 -> 1.0
            0, 0xB0, 1, 127,
            // CC 10 (pan) = 0 -> 0.0
            0, 0xB0, 10, 0,
            // CC 64 (sustain) = 127 -> 1.0
            0, 0xB0, 64, 127,
            // Unmapped CC 3 = 50 -> ignored safely (no throw)
            0, 0xB0, 3, 50,
            // Poly aftertouch 0xA0 -> consumed cleanly (2 data bytes)
            0, 0xA0, 60, 90,
            // Program change 0xC0 -> consumed cleanly (1 data byte)
            0, 0xC0, 12,
            // Channel pressure 0xD0 -> 'expression'
            ...encodeVLQ(480), 0xD0, 127,
            // Pitch bend 0xE0 max upward (lsb=127, msb=127 -> 16383)
            0, 0xE0, 127, 127,
            // RPN 0x0000 (pitchBendRange) = 12 semitones + 50 cents -> 12.5
            ...encodeVLQ(480), 0xB0, 101, 0,
            0, 0xB0, 100, 0,
            0, 0xB0, 6, 12,
            0, 0xB0, 38, 50,
            // Reset RPN (0x7F7F)
            0, 0xB0, 101, 127,
            0, 0xB0, 100, 127,
            0, 0xFF, 0x2F, 0
        ]]
    });

    const seq = parseMIDI(midi);
    const controls = [...seq].filter(Event.isControl);

    equals(controls.length, 6);
    equals(controls[0].name, 'modulation');
    almost(controls[0].value, 1, 1e-6);

    equals(controls[1].name, 'pan');
    almost(controls[1].value, 0, 1e-6);

    equals(controls[2].name, 'sustain');
    almost(controls[2].value, 1, 1e-6);

    equals(controls[3].name, 'expression');
    equals(controls[3][0], 1);
    almost(controls[3].value, 1, 1e-6);

    equals(controls[4].name, 'pitch');
    equals(controls[4][0], 1);
    almost(controls[4].value, (16383 - 8192) / 8192, 1e-5);

    equals(controls[5].name, 'pitchBendRange');
    equals(controls[5][0], 2);
    almost(controls[5].value, 12.5, 1e-5);
});


Deno.test('parseMIDI: unusual meter fallback, sharp key, SMPTE division & RIFF wrapper', () => {
    // SMPTE: -24 fps (0xE8 = 232), 40 subframes/frame -> 960 ticks/sec
    // Default tempo 120 BPM (2 beats/sec) -> 480 ticks/beat
    const division = 0xE828;
    const rawMidi = buildMidi({
        format: 0,
        division,
        tracks: [[
            // Unknown 7/16 time sig (nn=7, dd=4 -> 16)
            0, 0xFF, 0x58, 4, 7, 4, 24, 8,
            // Sharp key sig F# (6)
            0, 0xFF, 0x59, 2, 6, 0,
            // Note at t=0, length 960 ticks = 1 sec = 2 beats at 120 BPM
            0, 0x90, 72, 100,
            ...encodeVLQ(960), 0x80, 72, 0,
            0, 0xFF, 0x2F, 0
        ]]
    });

    // Wrap rawMidi in a RIFF/RMID envelope
    const riffSize = 4 + 8 + rawMidi.length;
    const riff = new Uint8Array(8 + riffSize);
    const view = new DataView(riff.buffer);
    riff.set(asciiBytes('RIFF'), 0);
    view.setUint32(4, riffSize, true);
    riff.set(asciiBytes('RMID'), 8);
    riff.set(asciiBytes('data'), 12);
    view.setUint32(16, rawMidi.length, true);
    riff.set(rawMidi, 20);

    const seq = parseMIDI(riff);
    const events = [...seq];
    const key = events.find(Event.isKey);
    const meter = events.find(Event.isMeter);
    const notes = events.filter(Event.isNote);

    equals(key.name, 'F♯');
    equals(meter.divisor, 0.25); // 4 / 16
    equals(notes.length, 1);
    equals(notes[0].number, 72);
    almost(notes[0].duration, 2, 1e-6);
});


Deno.test('parseMIDI: handles 0-track MIDI and rejects invalid or truncated buffers cleanly', () => {
    const emptyMidi = buildMidi({ format: 0, division: 480, tracks: [] });
    const emptySeq = parseMIDI(emptyMidi);
    equals(emptySeq.events.length, 0);
    equals(emptySeq.sequences, undefined);

    throws(() => parseMIDI(new Uint8Array([1, 2, 3])));
    throws(() => parseMIDI(new Uint8Array(asciiBytes('NOPE000000000000'))));
});

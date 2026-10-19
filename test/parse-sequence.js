
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import parseSequence from '../modules/parse/parse-sequence.js';
import Sequence      from '../modules/sequence.js';
import Event         from '../modules/event.js';

const NOTE     = Event.TYPES.note;
const KEY      = Event.TYPES.key;
const METER    = Event.TYPES.meter;
const RATE     = Event.TYPES.rate;
const SEQUENCE = Event.TYPES.sequence;
const CHORD    = Event.TYPES.chord;
const CONTROL  = Event.TYPES.control;


Deno.test('parseSequence() specification example', () => {
    const text = `
    # Sequence name
    0 key C
    0 meter 4/4
    0 rate 1.8

    0 sequence 1 piano 4
    0 sequence 2 bass
    4 sequence 1 piano
    3 chord Dm7
    4 chord G∆

    #1 Sequence id 1 name

    0 note 69 mp 1
    1 B4 mf 1
    2 C5 2
    4 F5 3
    4 D#5 3
    7 G♯5 1
    7 E♭5 1

    #2
    2 C2 0.34 1
    3 G2 0.33 5
    4 control modulation 0.1
    5 control modulation.set 0.2
    6 control modulation.exponential 0.3
    7 control modulation.linear 0.4
    9.75 control modulation.target 1 4
    `;

    const sequence = parseSequence(text);

    assert(sequence instanceof Sequence, 'parseSequence should return a Sequence instance');
    is(sequence.name, 'Sequence name');
    is(sequence.events.length, 8);
    is(sequence.sequences.length, 2);

    // Check top-level events
    is(sequence.events[0][0], 0);
    is(sequence.events[0].type, 'key');
    is(sequence.events[0].name, 'C');

    is(sequence.events[1][0], 0);
    is(sequence.events[1].type, 'meter');
    is(sequence.events[1].numerator, 4);
    is(sequence.events[1].denominator, 1);

    is(sequence.events[2][0], 0);
    is(sequence.events[2].type, 'rate');
    is(sequence.events[2].value, Math.fround(1.8));

    is(sequence.events[3][0], 0);
    is(sequence.events[3].type, 'sequence');
    is(sequence.events[3].identifier, 1);
    is(sequence.events[3].TARGET, 'piano');
    is(sequence.events[3].duration, 4);

    is(sequence.events[4][0], 0);
    is(sequence.events[4].type, 'sequence');
    is(sequence.events[4].identifier, 2);
    is(sequence.events[4].TARGET, 'bass');
    is(sequence.events[4].duration, 0);

    is(sequence.events[5][0], 4);
    is(sequence.events[5].type, 'sequence');
    is(sequence.events[5].identifier, 1);
    is(sequence.events[5].TARGET, 'piano');
    is(sequence.events[5].duration, 0);

    is(sequence.events[6][0], 3);
    is(sequence.events[6].type, 'chord');
    is(sequence.events[6].root, 'D');
    is(sequence.events[6].extension, '-7'); // Dm7 normalised to -7 in ChordEvent
    is(sequence.events[6].duration, 4);

    is(sequence.events[7][0], 4);
    is(sequence.events[7].type, 'chord');
    is(sequence.events[7].root, 'G');
    is(sequence.events[7].extension, '∆');
    is(sequence.events[7].duration, 4);

    // Sequence 1
    const seq1 = sequence.sequences[0];
    is(seq1.id, 1);
    is(seq1.name, 'Sequence id 1 name');
    is(seq1.events.length, 7);
    is(seq1.events[0].number, 69);
    is(seq1.events[1].pitch, 'B4');
    is(seq1.events[2].pitch, 'C5');
    is(seq1.events[2].gain, '-20dB'); // 0.1 default gain = -20dB

    // Sequence 2
    const seq2 = sequence.sequences[1];
    is(seq2.id, 2);
    is(seq2.name, undefined);
    is(seq2.events.length, 7);
    is(seq2.events[0].pitch, 'C2');
    is(seq2.events[2].type, 'control');
    is(seq2.events[2].name, 'modulation');
    is(seq2.events[2].curve, 'step');
    is(seq2.events[6].type, 'control');
    is(seq2.events[6].curve, 'target');
    is(seq2.events[6].duration, 4);
});


Deno.test('parseSequence() comments and permissive formatting', () => {
    const text = `
    // Leading file comment
    # Top Level // inline comment on header

    // Empty line with spaces

    0 key D // D major
    0 meter 3/4
    1 G4 1 // Note with omitted dynamic and duration 1
    2 chord A7 2 // Chord with explicit duration 2
    3 sequence 1 synth 0 transpose 2 // Sequence with transform
    `;

    const seq = parseSequence(text);
    is(seq.name, 'Top Level');
    is(seq.events.length, 5);

    is(seq.events[0].name, 'D');
    is(seq.events[1].numerator, 3);
    is(seq.events[1].denominator, 1);
    is(seq.events[2].pitch, 'G4');
    is(seq.events[2].gain, '-20dB');
    is(seq.events[3].root, 'A');
    is(seq.events[3].extension, '7');
    is(seq.events[3].duration, 2);
    is(seq.events[4].duration, 0);
    equals(seq.events[4].transforms, ['transpose', 2]);
});

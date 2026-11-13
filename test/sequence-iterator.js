
import {
    assert,
    assertEquals as equals,
    assertAlmostEquals as almost,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';


import Sequence from '../modules/sequence.js';
import SequenceIterator from '../modules/sequence-iterator.js';


const { fround } = Math;


Deno.test('Sequence for...of iteration with step rate and nested sequences', () => {
    const sequence = Sequence.from({
        events: [
            [0,  "note", "A4", 0.1, 1],
            [10, "sequence", 1, 0, 4],
            [12, "rate", "step", 2, 0],
            [20, "sequence", 1, 0, 4, "rate", 2]
        ],

        sequences: [{
            id: 1,
            events: [
                [0, "note", "A4", 0.1, 0.5],
                [1, "note", "A4", 0.1, 0.5],
                [2, "note", "A4", 0.1, 0.5]
            ]
        }]
    });

    const output = Array.from(sequence, (event) => [event[0], event.type, event.duration]);

    equals(output, [
        [0,     'note',     1],
        [10,    'sequence', 3],
        [10,    'note',     0.5],
        [11,    'note',     0.5],
        [12,    'rate',     0],
        [12,    'note',     0.25],
        [16,    'sequence', 2],
        [16,    'note',     0.125],
        [16.25, 'note',     0.125],
        [16.5,  'note',     0.125]
    ]);
});

Deno.test('Sequence iteration with linear, exponential and target rate ramps', () => {
    const sequence = Sequence.from({
        events: [
            [0, "rate", "step", 1],
            [0, "note", "C4", 0.5, 4],
            [4, "rate", "linear", 3],
            [4, "note", "E4", 0.5, 4],
            [8, "rate", "exponential", 1],
            [8, "rate", "target", 2, 2],
            [8, "note", "G4", 0.5, 2]
        ]
    });

    const notes = Array.from(sequence).filter((e) => e.type === 'note');

    // Note 1 spans beats 0..4 during linear ramp 1 -> 3 (avg rate 2, duration = 4 / 2 = 2)
    almost(notes[0][0], 0, 1e-12);
    almost(notes[0].duration, 2, 1e-12);

    // Note 2 spans beats 4..8 during exponential ramp 3 -> 1 (duration = 4 * ln(3) / 2 = 2 * ln(3))
    const expDur = 2 * Math.log(3);
    almost(notes[1][0], 2, 1e-12);
    almost(notes[1].duration, expDur, 1e-12);

    // Note 3 starts at beat 8 (location 2 + expDur) and spans 2 beats (1 beatConstant) of target 1 -> 2
    const targetTau = 2 / (1 * (1 - 1 / Math.E) + 2 * (1 / Math.E));
    almost(notes[2][0], 2 + expDur, 1e-12);
    almost(notes[2].duration, targetTau, 1e-11);
});

Deno.test('Sequence iteration with target curve held into linear ramp', () => {
    const sequence = Sequence.from({
        events: [
            [0, "rate", "step", 1],
            [0, "rate", "target", 3, 2],
            [2, "rate", "hold"],
            [6, "rate", "linear", 4],
            [6, "note", "A4", 0.5, 4]
        ]
    });

    const notes = Array.from(sequence).filter((e) => e.type === 'note');

    // Over beats 0..2 (1 beatConstant), target 1 -> 3 reaches rate vHold = 1 + 2 * (1 - 1/e)
    // and takes time tau = 2 / (1 * (1 - 1/e) + 3 * (1/e))
    const vHold   = 1 + 2 * (1 - 1 / Math.E);
    const tau     = 2 / (1 * (1 - 1 / Math.E) + 3 * (1 / Math.E));
    // Over beats 2..6 (4 beats), linear ramp from vHold to 4 takes time 2 * 4 / (vHold + 4)
    const rampDur = 8 / (vHold + 4);

    almost(notes[0][0], tau + rampDur, 1e-6);
    // At beat 6 rate is 4, so 4-beat note has duration 1
    almost(notes[0].duration, 1, 1e-6);
});

Deno.test('SequenceIterator caches parent next event across child yields', () => {
    const sequence = Sequence.from({
        events: [
            [0, "sequence", 1, 0, 6],
            [6, "note", "C5", 0.5, 1]
        ],
        sequences: [{
            id: 1,
            events: [
                [0, "note", "A4", 0.5, 0.5],
                [1, "note", "A4", 0.5, 0.5],
                [2, "note", "A4", 0.5, 0.5],
                [3, "note", "A4", 0.5, 0.5],
                [4, "note", "A4", 0.5, 0.5]
            ]
        }]
    });

    let c5Count = 0;
    const spyTransform = {
        apply(event) {
            if (event[2] === 72) c5Count++;
            return event;
        }
    };

    const output = [...new SequenceIterator(sequence, spyTransform)];
    equals(output.length, 7);
    // C5 is only transformed once even though 5 child events yield before it
    is(c5Count, 1);
});

Deno.test('SequenceIterator rate cursor handles long durations and nested sequences across rate ramps', () => {
    const sequence = Sequence.from({
        events: [
            [0,  "rate", "step", 1],
            [0,  "note", "C4", 0.5, 12],
            [0,  "sequence", 1, 0, 8],
            [4,  "rate", "linear", 3],
            [8,  "rate", "step", 2],
            [10, "note", "G4", 0.5, 2]
        ],
        sequences: [{
            id: 1,
            events: [
                [1, "note", "E4", 0.5, 2],
                [6, "note", "F4", 0.5, 2]
            ]
        }]
    });

    const notes = Array.from(sequence).filter((e) => e.type === 'note');
    equals(notes.length, 4);

    // 0..4: linear ramp 1 -> 3 (loc at 4 is 2)
    // 4..8: step at rate 3 (loc at 8 is 2 + 4/3 = 10/3)
    // 8..12: step at rate 2 (loc at 10 is 13/3, loc at 12 is 16/3)
    almost(notes[0][0], 0, 1e-12);
    almost(notes[0].duration, 16 / 3, 1e-12);
    almost(notes[1][0], Math.sqrt(3) - 1, 1e-12);
    almost(notes[1].duration, Math.sqrt(7) - Math.sqrt(3), 1e-12);
    almost(notes[2][0], 8 / 3, 1e-12);
    almost(notes[2].duration, 2 / 3, 1e-12);
    almost(notes[3][0], 13 / 3, 1e-12);
    almost(notes[3].duration, 1, 1e-12);
});

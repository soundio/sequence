
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';


import Event    from '../modules/event.js';
import Sequence from '../modules/sequence.js';


const { fround } = Math;


Deno.test('Sequence(events)', () => {
    const sequence = Sequence.of(
        [5, "note", "A4", 0.1, 1],
        [6, "note", "B4", 0.1, 1],
    );

    matches([...sequence], [
        { 0: 5, 1: Event.TYPES.note, 2: 69, 3: fround(0.1), 4: 1 },
        { 0: 6, 1: Event.TYPES.note, 2: 71, 3: fround(0.1), 4: 1 }
    ]);
});

Deno.test('Sequence(events, sequences)', () => {
    const sequence = new Sequence([
        [4, "sequence", 1, 0, 2]
    ], [{
        "id": 1,
        "events": [
            [0, "note", "A4", 0.1, 1],
            [1, "note", "B4", 0.1, 1],
            [2, "note", "C5", 0.1, 1],
            [3, "note", "D5", 0.1, 1]
        ]
    }]);

    matches([...sequence], [
        { 0: 4, 1: Event.TYPES.sequence, 2: 1,  3: 0,   4: 2 },
        { 0: 4, 1: Event.TYPES.note,     2: 69, 3: fround(0.1), 4: 1 },
        { 0: 5, 1: Event.TYPES.note,     2: 71, 3: fround(0.1), 4: 1 }
    ]);
});

Deno.test('Sequence(events, sequences) transforms', () => {
    const sequence = new Sequence([
        [4, "sequence", 1, 0, 2, "rate", 2]
    ], [{
        "id": 1,
        "events": [
            [0, "note", "A4", 0.1, 1],
            [1, "note", "B4", 0.1, 1],
            [2, "note", "C5", 0.1, 1],
            [3, "note", "D5", 0.1, 1]
        ]
    }]);

    matches([...sequence], [
        { 0: 4,   1: Event.TYPES.sequence, 2: 1,  3: 0,   4: 2, 5: 2, 6: 2 },
        { 0: 4,   1: Event.TYPES.note,     2: 69, 3: fround(0.1), 4: 0.5 },
        { 0: 4.5, 1: Event.TYPES.note,     2: 71, 3: fround(0.1), 4: 0.5 },
        { 0: 5,   1: Event.TYPES.note,     2: 72, 3: fround(0.1), 4: 0.5 },
        { 0: 5.5, 1: Event.TYPES.note,     2: 74, 3: fround(0.1), 4: 0.5 }
    ]);
});


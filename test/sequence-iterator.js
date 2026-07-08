
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import SequenceIterator from '../modules/sequence-iterator.js';


Deno.test('SequenceIterator(events)', () => {
    const iterator = new SequenceIterator([
        [5, "note", "A4", 0.1, 1],
        [6, "note", "B4", 0.1, 1],
    ]);

    equals([...iterator], [
        [5, "note", 69, 0.1, 1],
        [6, "note", 71, 0.1, 1]
    ]);
});


Deno.test('SequenceIterator(events, sequences)', () => {
    const iterator = new SequenceIterator([
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

    equals([...iterator], [
        [4, "sequence", 1, 0, 2],
        [4, "note", 69, 0.1, 1],
        [5, "note", 71, 0.1, 1]
    ]);
});

Deno.test('SequenceIterator(events, sequences) transforms', () => {
    const iterator = new SequenceIterator([
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

    equals([...iterator], [
        [4,   "sequence", 1, 0, 2, "rate", 2],
        [4,   "note", 69, 0.1, 0.5],
        [4.5, "note", 71, 0.1, 0.5],
        [5,   "note", 72, 0.1, 0.5],
        [5.5, "note", 74, 0.1, 0.5]
    ]);
});

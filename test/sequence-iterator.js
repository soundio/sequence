
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';


import Sequence from '../modules/sequence.js';


const { fround } = Math;


Deno.test('Sequence for...of iteration', () => {
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

    let event;
    for (event of sequence) {
        console.log(event + '');
    }
});

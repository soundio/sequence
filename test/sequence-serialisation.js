
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import { Sequence } from '../module.js';


Deno.test('Sequence.toATProtoRecord() and Sequence.fromRecord()', () => {
    // Create a sequence
    const sourceSequence = new Sequence([
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    // Convert to record
    const record = Sequence.toATProtoRecord(sourceSequence);

    // Verify record structure
    if (record.version !== Sequence.version) throw new Error('Version should match');
    if (!record.events || typeof record.events !== 'object') throw new Error('Events should be an object');
    //if (!('$bytes' in record.events)) throw new Error('Events should have $bytes property');
    //if (typeof record.events.$bytes !== 'string') throw new Error('Events.$bytes should be a string');
    //if (record.events.$bytes.length === 0) throw new Error('Events should have data');

    // Decode back to sequence
    const decodedSequence = Sequence.fromRecord(record);

    // Check events match expected values
    equals([...decodedSequence.events], [
        [0, 'note', 69, Math.fround(0.8), 2],
        [2, 'note', 72, Math.fround(0.6), 1.5]
    ]);
});

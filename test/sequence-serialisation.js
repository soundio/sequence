
import run from 'fn/test.js';
import { Sequence } from '../module.js';

run('Sequence.toRecord() and Sequence.fromRecord()', [
    [0, 'note', 69, Math.fround(0.8), 2],
    [2, 'note', 72, Math.fround(0.6), 1.5]
], (test, done) => {
    // Create a sequence
    const sourceSequence = new Sequence([
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    // Convert to record
    const record = Sequence.toRecord(sourceSequence);

    // Verify record structure
    if (record.version !== Sequence.version) throw new Error('Version should match');
    if (!record.events || typeof record.events !== 'object') throw new Error('Events should be an object');
    if (!('$bytes' in record.events)) throw new Error('Events should have $bytes property');
    if (typeof record.events.$bytes !== 'string') throw new Error('Events.$bytes should be a string');
    if (record.events.$bytes.length === 0) throw new Error('Events should have data');

    // Decode back to sequence
    const decodedSequence = Sequence.fromRecord(record);

    // Check events match expected values
    for (const event of decodedSequence.events) test(event);

    done();
});

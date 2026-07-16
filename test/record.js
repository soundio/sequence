
import {
    assert,
    assertEquals as equals,
    assertAlmostEquals as almost,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import { Sequence } from '../module.js';


// Values are stored as Float32s, so the round-trip introduces rounding errors.
// Float32 gives ~7 significant digits; scale tolerance to value.
function assertEventsMatch(events, decoded) {
    events.forEach((event, i) => {
        let n = -1;
        while (event[++n] !== undefined || decoded[i][n] !== undefined) {
            if (typeof event[n] === 'number') {
                almost(decoded[i][n], event[n], Math.abs(event[n]) * 1e-6 + 1e-6);
            }
            else {
                equals(decoded[i][n], event[n]);
            }
        }
    });
}

// Builds a sequence, records it, decodes it back and asserts the events survive
// the round-trip.
function assertRoundTrip(events) {
    const sequence = new Sequence(events);
    const record   = Sequence.toRecord(sequence);

    if (record.version !== Sequence.version) throw new Error('Version should match');
    if (!record.events || typeof record.events !== 'object') throw new Error('Events should be an object');

    assertEventsMatch(sequence.events, Sequence.fromRecord(record).events);
}


Deno.test('Sequence.toRecord() round-trip', () => {
    // Create a sequence
    const sequence = new Sequence([
        [0, 'key', 3],
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    // Convert to record
    const record = Sequence.toRecord(sequence);

    // Verify record structure
    if (record.version !== Sequence.version) throw new Error('Version should match');
    if (!record.events || typeof record.events !== 'object') throw new Error('Events should be an object');

    // Decode back to sequence
    const decodedSequence = Sequence.fromRecord(record);
    const events  = sequence.events;
    const decoded = decodedSequence.events;

    assertEventsMatch(events, decoded);
});

Deno.test('Sequence.toATProtoRecord() round-trip', () => {
    // Create a sequence
    const sequence = new Sequence([
        [0, 'key', 3],
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);

    // Convert to record
    const record = Sequence.toATProtoRecord(sequence);

    // Verify record structure
    if (record.version !== Sequence.version) throw new Error('Version should match');
    if (!record.events || typeof record.events !== 'object') throw new Error('Events should be an object');

    // Decode back to sequence
    const decodedSequence = Sequence.fromRecord(record);
    const events  = sequence.events;
    const decoded = decodedSequence.events;

    assertEventsMatch(events, decoded);
});


Deno.test('Round-trip "note" events', () => {
    assertRoundTrip([
        [0, 'note', 69, 0.8, 2],
        [2, 'note', 72, 0.6, 1.5]
    ]);
});


Deno.test('Round-trip "meter", "chord", "key" events', () => {
    assertRoundTrip([
        [0, 'meter', 4, 1],
        [0, 'key', 2],
        [4, 'chord', 0, '-7', 4]
    ]);
});


Deno.test('Round-trip "sequence" events', () => {
    assertRoundTrip([
        [1, 'sequence', 1, 0, 8],
        [2, 'sequence', 1, 0, 8, 'transpose', 2, 'rate', 0.5]
    ]);
});


Deno.test('Round-trip "param" events', () => {
    assertRoundTrip([
        [0,   'param', 'gain', 0.1, 'step'],
        [0.7, 'param', 'gain', 0.5, 'exponential'],
        [1.9, 'param', 'gain', 0,   'target', 3]
    ]);
});


Deno.test('Round-trip "rate" events', () => {
    assertRoundTrip([
        [0,  'rate', 120, 'step'],
        [24, 'rate', 90, 'exponential']
    ]);
});


Deno.test('Round-trip "text" events', () => {
    assertRoundTrip([
        [0, 'text', 4, 'Hello world']
    ]);
});

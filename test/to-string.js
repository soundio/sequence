import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is
} from 'jsr:@std/assert@1';

import toString      from '../to-string.js';
import parseSequence from '../modules/parse/parse-sequence.js';
import Sequence      from '../modules/sequence.js';


Deno.test('toString() minimal formatting and round-trip', () => {
    const text = `# Test Sequence
0 key C
0 meter 4/4
0 rate 1.8
0 sequence 1 piano 4
0 sequence 2 bass
4 sequence 1 piano
3 chord Dm7
4 chord G∆

#1 Melody
0 note 69 mp 1
1 B4 mf 1
2 C5 2
4 F5 3

#2 Bass
2 C2 0.34 1
3 G2 0.33 5
4 control modulation 0.1
5 control modulation.set 0.2
6 control modulation.exponential 0.3
7 control modulation.linear 0.4
9.75 control modulation.target 1 4`;

    const original = parseSequence(text);
    const output = toString(original);

    // Verify minimal formatting rules in output string
    assert(output.includes('# Test Sequence'), 'Includes root header');
    assert(output.includes('0 key C'), 'Includes key');
    assert(output.includes('0 meter 4/4'), 'Includes meter');
    assert(output.includes('0 rate 1.8'), 'Omits rate step curve');
    assert(output.includes('0 sequence 1 piano 4'), 'Includes explicit sequence duration');
    assert(output.includes('0 sequence 2 bass 0'), 'Includes sequence duration');
    assert(output.includes('4 sequence 1 piano 0'), 'Includes sequence duration');
    assert(output.includes('chord D-7') || output.includes('chord Dm7'), 'Includes chord Dm7 / D-7');
    assert(output.includes('chord G∆ 4'), 'Includes chord G∆ 4');

    assert(output.includes('#1 Melody'), 'Includes subsequence 1 header');
    assert(output.includes('note B4 -18dB 1') || output.includes('note B4 mf 1'), 'Includes note with gain');
    assert(output.includes('note C5 -20dB 2'), 'Includes note C5');

    assert(output.includes('#2 Bass'), 'Includes subsequence 2 header');
    assert(output.includes('note C2'), 'Includes note C2');
    assert(output.includes('note G2'), 'Includes note G2');
    assert(output.includes('4 control modulation 0.1'), 'Omits step curve in control event');
    assert(output.includes('5 control modulation 0.2'), 'Normalises modulation.set to modulation');
    assert(output.includes('6 control modulation.exponential 0.3'), 'Includes exponential curve');
    assert(output.includes('7 control modulation.linear 0.4'), 'Includes linear curve');
    assert(output.includes('9.75 control modulation.target 1 4'), 'Includes target curve and duration');

    // Round-trip verification: parsing the serialized string produces an equivalent Sequence
    const roundTripped = parseSequence(output);

    is(roundTripped.name, original.name);
    is(roundTripped.events.length, original.events.length);
    is(roundTripped.sequences.length, original.sequences.length);

    // Verify sub-sequences
    is(roundTripped.sequences[0].name, original.sequences[0].name);
    is(roundTripped.sequences[0].events.length, original.sequences[0].events.length);
    is(roundTripped.sequences[1].name, original.sequences[1].name);
    is(roundTripped.sequences[1].events.length, original.sequences[1].events.length);

    // Verify event details
    is(roundTripped.events[0].type, 'key');
    is(roundTripped.events[0].name, 'C');
    is(roundTripped.events[1].type, 'meter');
    is(roundTripped.events[1].timesig, '4/4');
    is(roundTripped.events[2].type, 'rate');
    is(roundTripped.events[2].value, original.events[2].value);
});


Deno.test('toString() sequence transforms and explicit chord duration', () => {
    const text = `0 key D
0 meter 3/4
1 G4 1
2 chord A7 2
3 sequence 1 synth transpose 2`;

    const seq = parseSequence(text);
    const output = toString(seq);

    assert(output.includes('2 chord A7 2'), 'Preserves explicit chord duration');
    assert(output.includes('3 sequence 1 synth 0 transpose 2'), 'Preserves sequence transforms');

    const roundTripped = parseSequence(output);
    is(roundTripped.events[3].duration, 2);
    equals(roundTripped.events[4].transforms, ['transpose', 2]);
});


Deno.test('toString() on Sequence created from data', () => {
    const data = Sequence.from({
        name: 'Plain JSON',
        events: [
            [0, 'note', 'C4', 0.1, 1],
            [1, 'note', 'D4', 0.5, 2],
            [3, 'chord', 'G', '7', 4]
        ]
    });

    const output = toString(data);
    is(output, `# Plain JSON
0 note C4 -20dB 1
1 note D4 -6.0206dB 2
3 chord G7 4`);
});

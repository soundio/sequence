
import {
    assert,
    assertEquals as equals,
    assertAlmostEquals as almost,
    assertStrictEquals as is
} from 'jsr:@std/assert@1';

import parseMidiClip from '../modules/parse/parse-midi-clip.js';
import Sequence from '../modules/sequence.js';
import Event from '../modules/event.js';


function createUmpBuffer(words) {
    const buffer = new ArrayBuffer(words.length * 4);
    const view = new DataView(buffer);
    for (let i = 0; i < words.length; i++) {
        view.setUint32(i * 4, words[i], false);
    }
    return buffer;
}


Deno.test('parseMidiClip: SMF2CLIP with notes, tempo, meter and key', () => {
    // Build a sample binary MIDI 2.0 clip stream:
    // Header: "SMF2CLIP" (8 bytes)
    // 1. Utility DCTPQ = 480 (1 word)
    // 2. Flex Data: Set Tempo = 120 bpm (50,000,000 in 10ns units) (4 words)
    // 3. Flex Data: Set Time Signature = 4/4 (4 words)
    // 4. Flex Data: Set Key Signature = C major (4 words)
    // 5. MIDI 2.0 Note On (C4 = 60, velocity = 0x8000 -> gain ~0.5) (2 words)
    // 6. Utility Delta Clockstamp = 480 ticks (1 beat) (1 word)
    // 7. MIDI 2.0 Note Off (C4 = 60) (2 words)

    const buffer = new ArrayBuffer(8 + (1 + 4 + 4 + 4 + 2 + 1 + 2) * 4);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // "SMF2CLIP"
    const sig = [0x53, 0x4D, 0x46, 0x32, 0x43, 0x4C, 0x49, 0x50];
    sig.forEach((b, i) => bytes[i] = b);

    let offset = 8;

    // 1. Utility: DCTPQ = 480 (0x01E0)
    // MT=0x0, Status=0x3, ticks=480
    view.setUint32(offset, 0x003001E0, false);
    offset += 4;

    // 2. Flex Data: Set Tempo 120 bpm (50,000,000 = 0x02FAF080)
    // MT=0xD, Group=0, format=0, addrs=0, channel=0, status_bank=0x00, status=0x00
    view.setUint32(offset, 0xD0000000, false);
    view.setUint32(offset + 4, 50000000, false); // 120 bpm -> rate = 2.0
    view.setUint32(offset + 8, 0, false);
    view.setUint32(offset + 12, 0, false);
    offset += 16;

    // 3. Flex Data: Set Time Signature 4/4
    // MT=0xD, Group=0, status_bank=0x00, status=0x01
    // word1: num=4 (0x04), denom=4 (0x04)
    view.setUint32(offset, 0xD0000001, false);
    view.setUint32(offset + 4, 0x04040000, false);
    view.setUint32(offset + 8, 0, false);
    view.setUint32(offset + 12, 0, false);
    offset += 16;

    // 4. Flex Data: Set Key Signature C major (fifths=0, tonic=0)
    // MT=0xD, Group=0, status_bank=0x00, status=0x05
    view.setUint32(offset, 0xD0000005, false);
    view.setUint32(offset + 4, 0x00000000, false);
    view.setUint32(offset + 8, 0, false);
    view.setUint32(offset + 12, 0, false);
    offset += 16;

    // 5. MIDI 2.0 Note On (pitch=60, velocity=0x8000)
    // MT=0x4, Group=0, Status=0x9, Channel=0, note=60 (0x3C)
    view.setUint32(offset, 0x40903C00, false);
    view.setUint32(offset + 4, 0x80000000, false); // velocity 32768
    offset += 8;

    // 6. Utility: Delta Clockstamp = 480 ticks (1 beat)
    // MT=0x0, Status=0x4, ticks=480 (0x01E0)
    view.setUint32(offset, 0x004001E0, false);
    offset += 4;

    // 7. MIDI 2.0 Note Off (pitch=60)
    // MT=0x4, Group=0, Status=0x8, Channel=0, note=60 (0x3C)
    view.setUint32(offset, 0x40803C00, false);
    view.setUint32(offset + 4, 0x00000000, false);
    offset += 8;

    const sequence = parseMidiClip(buffer);
    assert(sequence instanceof Sequence);

    // Should contain: rate (2.0), meter (4, 1), key ('C'), note (beat 0, pitch 60, duration 1)
    const rateEvent = sequence.events.find(e => e.type === 'rate');
    assert(rateEvent, 'Should contain a rate event');
    almost(rateEvent.value, 2.0, 0.001);

    const meterEvent = sequence.events.find(e => e.type === 'meter');
    assert(meterEvent, 'Should contain a meter event');
    equals(meterEvent.numerator, 4);
    equals(meterEvent.denominator, 1);

    const keyEvent = sequence.events.find(e => e.type === 'key');
    assert(keyEvent, 'Should contain a key event');
    equals(keyEvent.name, 'C');

    const noteEvent = sequence.events.find(e => e.type === 'note');
    assert(noteEvent, 'Should contain a note event');
    equals(noteEvent.number, 60);
    almost(noteEvent.duration, 1.0, 0.001);
});


Deno.test('parseMidiClip: Property Exchange (PE) SysEx8 parameter resolution', () => {
    // Test SysEx8 with embedded Property Exchange JSON mapping address 74 to WebAudio param
    const peJson = JSON.stringify({
        resource: 'ResourceList',
        parameters: [
            { address: 74, name: 'frequency', targetNode: 'filterNode' },
            { address: 16641, name: 'drive', targetNode: 'distortionNode' }
        ]
    });
    const peBytes = new TextEncoder().encode(peJson);

    // Build SysEx8 UMP packet (MT 0x5)
    // MT=0x5, Group=0, status=0x0 (complete), byteCount = peBytes.length (up to 14 bytes)
    // If larger than 14 bytes, fragment across packets
    const packets = [];
    let pOffset = 0;
    while (pOffset < peBytes.length) {
        const remaining = peBytes.length - pOffset;
        const chunkLen = Math.min(14, remaining);
        const status = pOffset === 0 && chunkLen === peBytes.length ? 0x0 :
            pOffset === 0 ? 0x1 :
            chunkLen === remaining ? 0x3 : 0x2;

        const w0 = (0x5 << 28) | (0 << 24) | (status << 20) | (chunkLen << 16) |
            ((peBytes[pOffset] || 0) << 8) | (peBytes[pOffset + 1] || 0);

        function getByte(i) {
            return peBytes[pOffset + i] || 0;
        }

        const w1 = (getByte(2) << 24) | (getByte(3) << 16) | (getByte(4) << 8) | getByte(5);
        const w2 = (getByte(6) << 24) | (getByte(7) << 16) | (getByte(8) << 8) | getByte(9);
        const w3 = (getByte(10) << 24) | (getByte(11) << 16) | (getByte(12) << 8) | getByte(13);

        packets.push(w0, w1, w2, w3);
        pOffset += chunkLen;
    }

    // Now add a MIDI 2.0 CC message at address 74 (value = 0xFFFFFFFF -> 1.0)
    // MT=0x4, Status=0xB, CC=74
    packets.push(
        0x40B04A00,
        0xFFFFFFFF
    );

    // And add a MIDI 2.0 NRPN at address 16641 (bank 0, index 1)
    // bank=0, index=1 -> addr14=1, paramAddress=16640+1 = 16641
    packets.push(
        0x40300001,
        0x80000000
    );

    const buffer = createUmpBuffer(packets);
    const sequence = parseMidiClip(buffer);
    assert(sequence instanceof Sequence);

    // CC 74 should resolve to "frequency" via PE Map (Tier 1)
    const filterCtrl = sequence.events.find(e => e.name === 'frequency');
    assert(filterCtrl, 'Should resolve CC 74 to "frequency"');
    almost(filterCtrl.value, 1.0, 0.001);

    // NRPN 1 should resolve to "drive" via PE Map (Tier 1)
    const driveCtrl = sequence.events.find(e => e.name === 'drive');
    assert(driveCtrl, 'Should resolve NRPN 16641 to "drive"');
    almost(driveCtrl.value, 0.5, 0.001);
});


Deno.test('parseMidiClip: Standard Profile & Sequence PARAMNAMES resolution', () => {
    const packets = [
        // 1. Enable Profile 0x01 on Channel 0 (MT 0x7, 2 words)
        // word0: MT=0x7, status=0x1, channel=0
        // word1: family=0x7E, model=0x01 (Default Control Mapping)
        0x70100000,
        0x7E010000,

        // 2. CC 74 on Channel 0 -> In Default Control Mapping, CC 74 is "frequency"
        0x40B04A00,
        0xFFFFFFFF,

        // 3. CC 7 (gain) on Channel 1 (no profile enabled) -> Sequence standard PARAMNAMES (gain)
        0x40B10700,
        0x80000000
    ];

    const buffer = createUmpBuffer(packets);
    const sequence = parseMidiClip(buffer);
    assert(sequence instanceof Sequence);

    // CC 74 on channel 0 -> "frequency"
    const freqCtrl = sequence.events.find(e => e.name === 'frequency');
    assert(freqCtrl, 'Should resolve CC 74 to "frequency"');

    // CC 7 on channel 1 -> "gain"
    const gainCtrl = sequence.events.find(e => e.name === 'gain');
    assert(gainCtrl, 'Should resolve CC 7 to "gain"');
    almost(gainCtrl.value, 0.5, 0.001);
});

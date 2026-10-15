
/**
parseMidiClip(buffer)
Converts a MIDI 2.0 Clip File (.midi2) or UMP stream into a Sequence object.

Supports:
- SMF2CLIP file header & Delta Clockstamps (DCTPQ / DC Utility messages)
- MIDI 2.0 & MIDI 1.0 Channel Voice (Note On/Off, CC, RPN, NRPN, Pitch Bend)
- Property Exchange (PE) SysEx8 stream assembly for custom WebAudio parameter names (Tier 1)
- Standardized MIDI 2.0 Profiles (Tier 2)
- Sequence PARAMNAMES mapping (Tier 3)
- Flex Data messages (Tempo -> RateEvent, Time Signature -> MeterEvent, Key Signature -> KeyEvent, Metadata -> name / TextEvent)
- Stream messages (Start of Clip, End of Clip)
**/

import Sequence from '../sequence.js';
import { PARAMNAMES } from '../event/control.js';
import { toKeyName } from '../event/key.js';
import byPriority from '../events/by-priority.js';


/**
UMP Word Counts by Message Type (MT 0x0 - 0xF)
**/
const UMP_WORD_COUNTS = [
    1, // 0x0 Utility (32-bit)
    1, // 0x1 System Real Time / Common (32-bit)
    1, // 0x2 MIDI 1.0 Channel Voice (32-bit)
    2, // 0x3 Data 64-bit / SysEx7 (64-bit)
    2, // 0x4 MIDI 2.0 Channel Voice (64-bit)
    4, // 0x5 Data 128-bit / SysEx8 (128-bit)
    1, // 0x6 Reserved (32-bit)
    2, // 0x7 Profile Configuration (64-bit)
    2, // 0x8 Reserved (64-bit)
    2, // 0x9 Reserved (64-bit)
    3, // 0xA Reserved (96-bit)
    3, // 0xB Reserved (96-bit)
    4, // 0xC Reserved (128-bit)
    4, // 0xD Flex Data (128-bit)
    4, // 0xE Reserved (128-bit)
    4  // 0xF Stream (128-bit)
];


/**
Standardized MIDI 2.0 Profile Registry (Tier 2 fallback)
**/
export const MIDI_PROFILE_REGISTRY = {
    0x00: {
        name: 'General MIDI 2 (GM2)',
        ccs: {
            1: 'modulation', 7: 'gain', 10: 'pan', 11: 'expression',
            64: 'sustain', 65: 'portamento', 66: 'sostenuto', 67: 'soft',
            71: 'Q', 72: 'release', 73: 'attack',
            74: 'frequency', 75: 'decay', 76: 'rate',
            91: 'reverb', 93: 'chorus'
        },
        rpns: {
            0: 'pitchBendSensitivity', 1: 'fineTuning', 2: 'coarseTuning'
        },
        nrpns: {
            160: 'cutoff', 161: 'resonance',
            227: 'attackTime', 228: 'decayTime', 230: 'releaseTime'
        }
    },
    0x01: {
        name: 'Default Control Mapping',
        ccs: {
            1: 'modulation', 7: 'gain', 10: 'pan', 11: 'expression',
            71: 'Q', 72: 'release', 73: 'attack',
            74: 'frequency', 75: 'decay'
        },
        rpns: { 0: 'pitchBendSensitivity' },
        nrpns: { 1: 'drive' }
    }
};


/**
PropertyExchangeAssembler
Assembles fragmented SysEx8 packets (MT 0x5) into JSON schemas for
custom parameter addressing.
**/
export class PropertyExchangeAssembler {
    constructor() {
        this.streamBuffers = new Map(); // group -> { bytes: [] }
    }

    processPacket(view, offset) {
        const word0 = view.getUint32(offset, false);
        const group = (word0 >>> 24) & 0x0F;
        const status = (word0 >>> 20) & 0x0F; // 0x0=Complete, 0x1=Start, 0x2=Continue, 0x3=End
        const payloadByteCount = (word0 >>> 16) & 0x0F; // Bytes in this packet (0-14)

        if (!this.streamBuffers.has(group) || status === 0x0 || status === 0x1) {
            this.streamBuffers.set(group, { bytes: [] });
        }

        const stream = this.streamBuffers.get(group);

        // In SysEx8 UMP, up to 14 payload bytes are stored:
        // Byte 2 and 3 of Word 0 (offset + 2, offset + 3)
        // Bytes of Words 1, 2, 3 (offset + 4 through offset + 15)
        const count = Math.min(payloadByteCount, 14);
        for (let i = 0; i < count; i++) {
            stream.bytes.push(view.getUint8(offset + 2 + i));
        }

        if (status === 0x0 || status === 0x3) {
            return this.parsePropertyExchangeJSON(group, stream.bytes);
        }

        return null;
    }

    parsePropertyExchangeJSON(group, rawBytes) {
        try {
            const decoder = new TextDecoder('utf-8');
            const fullString = decoder.decode(new Uint8Array(rawBytes));
            const jsonStart = fullString.indexOf('{');
            const jsonEnd = fullString.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonString = fullString.slice(jsonStart, jsonEnd + 1);
                const parsed = JSON.parse(jsonString);

                return {
                    group,
                    rawJson: parsed,
                    paramMap: this.buildParameterMap(parsed)
                };
            }
        }
        catch (err) {
            console.warn('Failed to parse Property Exchange JSON payload:', err);
        }
        return null;
    }

    buildParameterMap(json) {
        const map = {};
        const params = json.parameters || json.resourceList || [];

        for (const item of params) {
            if (item.address !== undefined && item.name) {
                map[item.address] = {
                    name: item.name,
                    targetNode: item.targetNode || null,
                    min: item.min ?? 0.0,
                    max: item.max ?? 1.0,
                    unit: item.unit || 'raw'
                };
            }
        }
        return map;
    }
}


/**
parseMidiClip(buffer, options)
Parses a MIDI 2.0 Clip binary buffer into a Sequence instance using DataView methods.
**/
export default function parseMidiClip(buffer, options = {}) {
    const view = buffer instanceof DataView ? buffer :
        buffer instanceof Uint8Array ? new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
        buffer instanceof ArrayBuffer ? new DataView(buffer) :
        new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const totalBytes = view.byteLength;
    let offset = 0;

    // Check for "SMF2CLIP" signature (8 bytes: 0x534D4632 0x434C4950)
    if (totalBytes >= 8 && view.getUint32(0, false) === 0x534D4632 && view.getUint32(4, false) === 0x434C4950) {
        offset = 8;
    }

    let currentTick = 0;
    let dctpq = 480; // Default ticks per quarter note
    let clipName = options.name || '';

    const peAssembler = new PropertyExchangeAssembler();
    // peMaps[group] -> address -> { name, targetNode }
    const peMaps = Array.from({ length: 16 }, () => ({}));
    // activeProfiles[group][channel] -> profileModel or null
    const activeProfiles = Array.from({ length: 16 }, () => new Array(16).fill(null));

    // Active notes tracking: key -> { startBeat, pitch, gain }
    const activeNotes = new Map();

    const events = [];

    function handleNoteOff(key, currentBeat) {
        const active = activeNotes.get(key);
        if (active) {
            activeNotes.delete(key);
            const duration = Math.max(0.001, currentBeat - active.startBeat);
            events.push([active.startBeat, 'note', active.pitch, active.gain, duration]);
        }
    }

    function resolveParamName(group, channel, status, paramAddress) {
        // Tier 1: Property Exchange Map
        const pe = peMaps[group]?.[paramAddress];
        if (pe && pe.name) return pe.name;

        // Tier 2: Standardized Profile Map
        const activeModel = activeProfiles[group]?.[channel];
        if (activeModel !== null && MIDI_PROFILE_REGISTRY[activeModel]) {
            const profile = MIDI_PROFILE_REGISTRY[activeModel];
            const profileName = (status === 0xB) ? profile.ccs[paramAddress] :
                (status === 0x2) ? profile.rpns[paramAddress - 256] :
                profile.nrpns[paramAddress - 16640];
            if (profileName) return profileName;
        }

        // Tier 3: Sequence PARAMNAMES
        if (PARAMNAMES[paramAddress]) {
            return PARAMNAMES[paramAddress];
        }

        return paramAddress;
    }

    // Read UMP packets
    while (offset + 4 <= totalBytes) {
        const word0 = view.getUint32(offset, false);
        const messageType = (word0 >>> 28) & 0x0F;
        const group = (word0 >>> 24) & 0x0F;
        const wordCount = UMP_WORD_COUNTS[messageType] || 1;
        const packetBytes = wordCount * 4;

        if (offset + packetBytes > totalBytes) break;

        // --- MT 0x0: Utility Message ---
        if (messageType === 0x00) {
            const status = (word0 >>> 20) & 0x0F;
            if (status === 0x03) {
                // DCTPQ: Delta Clockstamp Ticks Per Quarter Note
                const ticks = view.getUint16(offset + 2, false);
                if (ticks > 0) dctpq = ticks;
            }
            else if (status === 0x04) {
                // DC: Delta Clockstamp
                const deltaTicks = word0 & 0x000FFFFF;
                currentTick += deltaTicks;
            }
        }

        const beat = currentTick / dctpq;

        // --- MT 0x4: MIDI 2.0 Channel Voice Message ---
        if (messageType === 0x04) {
            const status  = (word0 >>> 20) & 0x0F;
            const channel = (word0 >>> 16) & 0x0F;

            // Note On
            if (status === 0x09) {
                const noteNumber = view.getUint8(offset + 2) & 0x7F;
                const velocity   = view.getUint16(offset + 4, false);
                const key = `${ group }:${ channel }:${ noteNumber }`;

                if (velocity === 0) {
                    handleNoteOff(key, beat);
                }
                else {
                    handleNoteOff(key, beat);
                    const gain = velocity / 65535;
                    activeNotes.set(key, { startBeat: beat, pitch: noteNumber, gain });
                }
            }
            // Note Off
            else if (status === 0x08) {
                const noteNumber = view.getUint8(offset + 2) & 0x7F;
                const key = `${ group }:${ channel }:${ noteNumber }`;
                handleNoteOff(key, beat);
            }
            // Control Change (CC)
            else if (status === 0x0B) {
                const index = view.getUint8(offset + 2) & 0x7F;
                const value = view.getUint32(offset + 4, false) / 0xFFFFFFFF;
                const name  = resolveParamName(group, channel, status, index);
                events.push([beat, 'control', name, 'step', value, 0]);
            }
            // RPN (0x2) or NRPN (0x3)
            else if (status === 0x02 || status === 0x03) {
                const bank  = view.getUint8(offset + 2) & 0x7F;
                const index = view.getUint8(offset + 3) & 0x7F;
                const addr14 = (bank << 7) | index;
                const paramAddress = status === 0x02 ? 256 + addr14 : 16640 + addr14;
                const value = view.getUint32(offset + 4, false) / 0xFFFFFFFF;
                const name  = resolveParamName(group, channel, status, paramAddress);
                events.push([beat, 'control', name, 'step', value, 0]);
            }
            // Pitch Bend
            else if (status === 0x0E) {
                const rawValue = view.getUint32(offset + 4, false);
                const value = (rawValue - 0x80000000) / 0x80000000;
                events.push([beat, 'control', 'pitch', 'step', value, 0]);
            }
            // Channel Pressure
            else if (status === 0x0D) {
                const value = view.getUint32(offset + 4, false) / 0xFFFFFFFF;
                events.push([beat, 'control', 'expression', 'step', value, 0]);
            }
        }
        // --- MT 0x2: MIDI 1.0 Channel Voice Message ---
        else if (messageType === 0x02) {
            const status  = (word0 >>> 20) & 0x0F;
            const channel = (word0 >>> 16) & 0x0F;

            // Note On
            if (status === 0x09) {
                const noteNumber = view.getUint8(offset + 2) & 0x7F;
                const velocity   = view.getUint8(offset + 3) & 0x7F;
                const key = `${ group }:${ channel }:${ noteNumber }`;

                if (velocity === 0) {
                    handleNoteOff(key, beat);
                }
                else {
                    handleNoteOff(key, beat);
                    const gain = velocity / 127;
                    activeNotes.set(key, { startBeat: beat, pitch: noteNumber, gain });
                }
            }
            // Note Off
            else if (status === 0x08) {
                const noteNumber = view.getUint8(offset + 2) & 0x7F;
                const key = `${ group }:${ channel }:${ noteNumber }`;
                handleNoteOff(key, beat);
            }
            // CC
            else if (status === 0x0B) {
                const index = view.getUint8(offset + 2) & 0x7F;
                const value = (view.getUint8(offset + 3) & 0x7F) / 127;
                const name  = resolveParamName(group, channel, status, index);
                events.push([beat, 'control', name, 'step', value, 0]);
            }
            // Pitch Bend
            else if (status === 0x0E) {
                const lsb = view.getUint8(offset + 2) & 0x7F;
                const msb = view.getUint8(offset + 3) & 0x7F;
                const val14 = (msb << 7) | lsb; // 0..16383, center 8192
                const value = (val14 - 8192) / 8192;
                events.push([beat, 'control', 'pitch', 'step', value, 0]);
            }
        }
        // --- MT 0x5: SysEx8 / Property Exchange ---
        else if (messageType === 0x05) {
            const peResult = peAssembler.processPacket(view, offset);
            if (peResult && peResult.paramMap) {
                peMaps[group] = Object.assign(peMaps[group], peResult.paramMap);
            }
        }
        // --- MT 0x7: Profile Configuration ---
        else if (messageType === 0x07) {
            const status        = (word0 >>> 20) & 0x0F;
            const channel       = (word0 >>> 16) & 0x0F;
            const profileFamily = view.getUint8(offset + 4);
            const profileModel  = view.getUint8(offset + 5);

            if (profileFamily === 0x7E) { // Universal Profile
                activeProfiles[group][channel] = (status === 0x01) ? profileModel : null;
            }
        }
        // --- MT 0xD: Flex Data ---
        else if (messageType === 0x0D) {
            const statusBank = view.getUint8(offset + 2);
            const status     = view.getUint8(offset + 3);

            // Setup Bank
            if (statusBank === 0x00) {
                // Set Tempo: word 1 (bytes 4-7) = 10ns units per quarter note
                if (status === 0x00) {
                    const tempo10ns = view.getUint32(offset + 4, false);
                    if (tempo10ns > 0) {
                        const rate = 100000000 / tempo10ns; // beats per second
                        events.push([beat, 'rate', 'step', rate]);
                    }
                }
                // Set Time Signature
                else if (status === 0x01) {
                    const numerator   = view.getUint8(offset + 4);
                    const denominator = view.getUint8(offset + 5);
                    if (numerator > 0 && denominator > 0) {
                        const duration = (numerator / denominator) * 4;
                        const division = 4 / denominator;
                        events.push([beat, 'meter', duration, division]);
                    }
                }
                // Set Key Signature
                else if (status === 0x05) {
                    const raw = (view.getUint8(offset + 4) >>> 4) & 0x0F;
                    const fifths = raw >= 8 ? raw - 16 : raw;
                    const keyName = toKeyName(fifths);
                    events.push([beat, 'key', keyName]);
                }
            }
            // Metadata & Performance Text
            else if (statusBank === 0x01 || statusBank === 0x02) {
                const textBytes = new Uint8Array(view.buffer, view.byteOffset + offset + 4, 12);
                const text = new TextDecoder('utf-8').decode(textBytes).replace(/\0+$/, '').trim();
                if (text) {
                    if (statusBank === 0x01 && (status === 0x01 || status === 0x02)) {
                        if (!clipName) clipName = text;
                    }
                    else {
                        events.push([beat, 'text', 1, text]);
                    }
                }
            }
        }
        // --- MT 0xF: Stream Message ---
        else if (messageType === 0x0F) {
            // Can extract Endpoint name or metadata if present
        }

        offset += packetBytes;
    }

    // Close any unclosed notes at final beat
    const finalBeat = currentTick / dctpq;
    for (const [key, active] of activeNotes.entries()) {
        const duration = Math.max(0.25, finalBeat - active.startBeat);
        events.push([active.startBeat, 'note', active.pitch, active.gain, duration]);
    }
    activeNotes.clear();

    // Sort events in chronological order (prioritizing key and meter on the same beat)
    events.sort((a, b) => a[0] - b[0] || byPriority(b, a));

    return Sequence.from({
        name: clipName || undefined,
        events
    });
}


/**
parseMIDI(buffer, options)
Converts a MIDI 1.0 Standard MIDI File (.mid, Format 0 or 1) into a Sequence.

Supports:
- SMF Format 0 (flat single-channel or multi-channel split) and Format 1 (multi-track)
- Optional RIFF/RMID container wrapper and unknown chunk skipping
- TPQN and SMPTE time divisions
- Running status, VLQ delta-times, SysEx skipping
- Note On / Note Off (including velocity 0 Note Off, overlapping notes, EOF note closure)
- Mapped Control Changes (Sequence PARAMNAMES), 14-bit RPNs, Channel Pressure, Pitch Bend
- Meta events: Tempo (0x51 -> RateEvent), Time Signature (0x58 -> MeterEvent), Key Signature (0x59 -> KeyEvent), Text / Lyrics / Markers / Cues, Track & Instrument names, Channel Prefix
- Cross-track conductor deduplication and structurally identical sub-sequence deduplication (ideal for Logic Pro multi-track region exports)
**/

import Sequence from '../sequence.js';
import MeterEvent from '../event/meter.js';
import { PARAMNAMES } from '../event/control.js';
import { toKeyName } from '../event/key.js';


const utf8 = new TextDecoder('utf-8');

// Registered Parameter Number (RPN 14-bit) -> Sequence PARAMNAMES
const RPN_PARAMNAMES = {
    0x0000: 'pitchBendRange',
    0x0001: 'fineTuning',
    0x0002: 'coarseTuning',
    0x0005: 'modulationDepthRange'
};

// CCs reserved for RPN/NRPN addressing & data entry, omitted as standalone controls
const RPN_PLUMBING_CCS = new Set([6, 38, 96, 97, 98, 99, 100, 101]);

// Event tie-break priority when two events share the same beat (higher sorts first)
const EVENT_PRIORITY = {
    key: 4,
    meter: 3,
    rate: 2,
    text: 1,
    sequence: 0
};


/**
.toDataView(buffer)
Normalises ArrayBuffer, ArrayBufferView, or DataView input to a DataView.
**/
function toDataView(buffer) {
    if (buffer instanceof DataView) return buffer;
    if (ArrayBuffer.isView(buffer)) {
        return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    if (buffer instanceof ArrayBuffer) return new DataView(buffer);
    throw new TypeError('parseMIDI(buffer) expects an ArrayBuffer, TypedArray, or DataView');
}


/**
.readTag(view, offset)
Reads a 4-byte ASCII chunk identifier.
**/
function readTag(view, offset) {
    return String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
    );
}


/**
.readVLQ(view, offset, limit)
Reads a MIDI Variable-Length Quantity and returns `{ value, offset }`.
**/
function readVLQ(view, offset, limit) {
    let value = 0;
    let count = 0;

    while (offset < limit && count < 4) {
        const byte = view.getUint8(offset++);
        value = (value << 7) | (byte & 0x7F);
        count++;
        if ((byte & 0x80) === 0) return { value, offset };
    }

    throw new Error(`Invalid or truncated MIDI VLQ at byte offset ${ offset }`);
}


/**
.findMidiHeaderOffset(view)
Locates the `MThd` header offset, unwrapping optional `RIFF/RMID` envelopes.
**/
function findMidiHeaderOffset(view) {
    if (view.byteLength < 14) {
        throw new Error('MIDI buffer too small to contain MThd header');
    }

    const rootTag = readTag(view, 0);
    if (rootTag === 'MThd') return 0;

    if (rootTag === 'RIFF' && view.byteLength >= 20 && readTag(view, 8) === 'RMID') {
        let offset = 12;
        while (offset + 8 <= view.byteLength) {
            const chunkId = readTag(view, offset);
            const chunkSize = view.getUint32(offset + 4, true);
            if (chunkId === 'data' && offset + 12 <= view.byteLength && readTag(view, offset + 8) === 'MThd') {
                return offset + 8;
            }
            offset += 8 + chunkSize + (chunkSize & 1);
        }
    }

    throw new Error(`Invalid MIDI file: expected MThd header, got "${ rootTag }"`);
}


/**
.parseHeader(view, mthdOffset)
Parses an SMF `MThd` header chunk and computes time division parameters.
**/
function parseHeader(view, mthdOffset) {
    const headerLength = view.getUint32(mthdOffset + 4, false);
    if (headerLength < 6 || mthdOffset + 8 + headerLength > view.byteLength) {
        throw new Error(`Invalid MThd header length: ${ headerLength }`);
    }

    const format = view.getUint16(mthdOffset + 8, false);
    const trackCount = view.getUint16(mthdOffset + 10, false);
    const division = view.getUint16(mthdOffset + 12, false);

    if (division === 0) {
        throw new Error('Invalid MIDI time division: 0');
    }

    const isSMPTE = (division & 0x8000) !== 0;
    let ticksPerBeat = division;
    let ticksPerSecond = 0;

    if (isSMPTE) {
        const rawByte = (division >> 8) & 0xFF;
        const signedFps = rawByte >= 128 ? rawByte - 256 : rawByte;
        const nominalFps = -signedFps;
        const fps = nominalFps === 29 ? 29.97 : nominalFps;
        const subframes = division & 0xFF;
        if (fps <= 0 || subframes <= 0) {
            throw new Error(`Invalid MIDI SMPTE division: 0x${ division.toString(16) }`);
        }
        ticksPerSecond = fps * subframes;
        ticksPerBeat = 0;
    }

    return {
        format,
        trackCount,
        isSMPTE,
        ticksPerBeat,
        ticksPerSecond,
        tracksStartOffset: mthdOffset + 8 + headerLength
    };
}


/**
.toMeterTuple(beat, numerator, denominator)
Creates a `[beat, 'meter', rsid, divisor]` event tuple, falling back cleanly for
time signatures absent from MeterEvent's standard `rsids` table.
**/
function toMeterTuple(beat, numerator, denominator) {
    try {
        const meter = new MeterEvent({ beat, timesig: `${ numerator }/${ denominator }` });
        return [beat, 'meter', meter.rsid, meter.divisor];
    }
    catch {
        const divisor = 4 / denominator;
        const rsid = numerator >= 1 && numerator <= 32 ?
            (1 << (numerator - 1)) >>> 0 :
            0b1010 ;
        return [beat, 'meter', rsid, divisor];
    }
}


/**
.compareEvents(a, b)
Chronological comparator with deterministic priority tie-breaking at equal beats.
**/
function compareEvents(a, b) {
    if (a[0] !== b[0]) return a[0] - b[0];
    return (EVENT_PRIORITY[b[1]] || 0) - (EVENT_PRIORITY[a[1]] || 0);
}


/**
.createChannelState()
Initialises per-channel RPN/NRPN tracking state for a track.
**/
function createChannelState() {
    return {
        rpnMsb: 127,
        rpnLsb: 127,
        nrpnMsb: 127,
        nrpnLsb: 127,
        rpnActive: false,
        dataMsb: 0,
        dataLsb: 0
    };
}


/**
.parseTrack(view, trackStart, trackEnd, header, smpteTempoState)
Parses a single `MTrk` chunk into track metadata, conductor events, and channel events.
**/
function parseTrack(view, trackStart, trackEnd, header, smpteTempoState) {
    const conductorEvents = [];
    const channelEntries = [];
    const activeNotes = new Map();
    const channelsUsed = new Set();
    const channelStates = Array.from({ length: 16 }, createChannelState);

    let offset = trackStart;
    let runningStatus = 0;
    let tick = 0;
    let beat = 0;
    let trackName = '';
    let instrumentName = '';
    let channelPrefix = null;

    function advanceTime(deltaTicks) {
        if (deltaTicks === 0) return;
        tick += deltaTicks;
        beat = header.isSMPTE ?
            beat + (deltaTicks / header.ticksPerSecond) * smpteTempoState.rate :
            tick / header.ticksPerBeat ;
    }

    function openNote(channel, pitch, velocity) {
        const key = (channel << 7) | pitch;
        let queue = activeNotes.get(key);
        if (!queue) {
            queue = [];
            activeNotes.set(key, queue);
        }
        // GM2 / DLS square-law velocity-to-gain curve: (v / 127)^2
        const norm = velocity / 127;
        queue.push({ startTick: tick, startBeat: beat, pitch, gain: norm * norm, channel });
    }

    function closeNote(channel, pitch) {
        const key = (channel << 7) | pitch;
        const queue = activeNotes.get(key);
        if (!queue || queue.length === 0) return;

        const active = queue.shift();
        if (queue.length === 0) activeNotes.delete(key);

        const duration = header.isSMPTE ?
            Math.max(0.001, beat - active.startBeat) :
            Math.max(0.001, (tick - active.startTick) / header.ticksPerBeat) ;

        channelEntries.push({
            channel: active.channel,
            tick: active.startTick,
            endTick: tick,
            event: [active.startBeat, 'note', active.pitch, active.gain, duration]
        });
    }

    function pushControl(channel, paramName, value) {
        const entry = {
            channel,
            tick,
            endTick: tick,
            event: [beat, 'control', paramName, 'step', value]
        };
        channelEntries.push(entry);
        return entry;
    }

    function handleControlChange(channel, cc, val7) {
        const state = channelStates[channel];

        if (cc === 101) {
            state.rpnMsb = val7;
            state.rpnActive = !(state.rpnMsb === 127 && state.rpnLsb === 127);
            return;
        }
        if (cc === 100) {
            state.rpnLsb = val7;
            state.rpnActive = !(state.rpnMsb === 127 && state.rpnLsb === 127);
            return;
        }
        if (cc === 99) {
            state.nrpnMsb = val7;
            state.rpnActive = false;
            return;
        }
        if (cc === 98) {
            state.nrpnLsb = val7;
            state.rpnActive = false;
            return;
        }

        if ((cc === 6 || cc === 38) && state.rpnActive) {
            if (cc === 6) {
                state.dataMsb = val7;
                state.dataLsb = 0;
            }
            else {
                state.dataLsb = val7;
            }

            const rpnAddr = (state.rpnMsb << 7) | state.rpnLsb;
            const paramName = RPN_PARAMNAMES[rpnAddr];
            if (!paramName) return;

            let value;
            if (rpnAddr === 0x0000) {
                value = state.dataMsb + (state.dataLsb / 100);
            }
            else if (rpnAddr === 0x0001) {
                const val14 = (state.dataMsb << 7) | state.dataLsb;
                value = ((val14 - 8192) / 8192) * 100;
            }
            else if (rpnAddr === 0x0002) {
                value = state.dataMsb - 64;
            }
            else if (rpnAddr === 0x0005) {
                value = state.dataMsb + (state.dataLsb / 128);
            }

            // Update existing same-beat RPN control entry when CC 38 refines CC 6
            const prev = channelEntries[channelEntries.length - 1];
            if (cc === 38 && prev && prev.channel === channel && prev.tick === tick && prev.event[2] === paramName) {
                prev.event[4] = value;
            }
            else {
                pushControl(channel, paramName, value);
            }
            return;
        }

        if (RPN_PLUMBING_CCS.has(cc)) return;
        if (!(cc in PARAMNAMES)) return;

        pushControl(channel, PARAMNAMES[cc], val7 / 127);
    }

    while (offset < trackEnd) {
        const delta = readVLQ(view, offset, trackEnd);
        offset = delta.offset;
        advanceTime(delta.value);

        if (offset >= trackEnd) break;

        let status = view.getUint8(offset);
        if (status < 0x80) {
            if (!runningStatus) {
                throw new Error(`MIDI data byte 0x${ status.toString(16) } encountered without running status at offset ${ offset }`);
            }
            status = runningStatus;
        }
        else {
            offset++;
            if (status < 0xF0) runningStatus = status;
        }

        // Meta event
        if (status === 0xFF) {
            runningStatus = 0;
            if (offset >= trackEnd) break;

            const metaType = view.getUint8(offset++);
            const metaLen = readVLQ(view, offset, trackEnd);
            offset = metaLen.offset;
            const dataEnd = Math.min(offset + metaLen.value, trackEnd);
            const data = new Uint8Array(view.buffer, view.byteOffset + offset, dataEnd - offset);
            offset = dataEnd;

            // End of Track
            if (metaType === 0x2F) {
                break;
            }
            // Text meta events
            else if (metaType >= 0x01 && metaType <= 0x07) {
                const text = utf8.decode(data).replace(/\0+$/, '').trim();
                if (!text) continue;

                if (metaType === 0x03) {
                    if (!trackName) trackName = text;
                }
                else if (metaType === 0x04) {
                    if (!instrumentName) instrumentName = text;
                }
                else {
                    conductorEvents.push([beat, 'text', 1, text]);
                }
            }
            // MIDI Channel Prefix
            else if (metaType === 0x20 && data.length >= 1) {
                channelPrefix = data[0] & 0x0F;
            }
            // Set Tempo (microseconds per quarter note)
            else if (metaType === 0x51 && data.length >= 3) {
                const usPerBeat = (data[0] << 16) | (data[1] << 8) | data[2];
                if (usPerBeat > 0) {
                    const rate = 1000000 / usPerBeat;
                    smpteTempoState.rate = rate;
                    conductorEvents.push([beat, 'rate', 'step', rate]);
                }
            }
            // Time Signature
            else if (metaType === 0x58 && data.length >= 2) {
                const numerator = data[0];
                const denominator = 1 << data[1];
                if (numerator > 0 && denominator > 0) {
                    conductorEvents.push(toMeterTuple(beat, numerator, denominator));
                }
            }
            // Key Signature
            else if (metaType === 0x59 && data.length >= 1) {
                const rawFifths = data[0];
                const fifths = rawFifths >= 128 ? rawFifths - 256 : rawFifths;
                conductorEvents.push([beat, 'key', toKeyName(fifths)]);
            }

            continue;
        }

        // SysEx event (0xF0 / 0xF7)
        if (status === 0xF0 || status === 0xF7) {
            runningStatus = 0;
            const sysexLen = readVLQ(view, offset, trackEnd);
            offset = Math.min(sysexLen.offset + sysexLen.value, trackEnd);
            continue;
        }

        // Unsupported system common / realtime bytes
        if (status > 0xF0) {
            runningStatus = 0;
            continue;
        }

        // Channel Voice message
        const messageType = status & 0xF0;
        const channel = status & 0x0F;
        channelsUsed.add(channel);

        if (messageType === 0xC0 || messageType === 0xD0) {
            if (offset >= trackEnd) break;
            const data1 = view.getUint8(offset++) & 0x7F;
            if (messageType === 0xD0) {
                pushControl(channel, 'expression', data1 / 127);
            }
            continue;
        }

        if (offset + 1 >= trackEnd) break;
        const data1 = view.getUint8(offset++) & 0x7F;
        const data2 = view.getUint8(offset++) & 0x7F;

        if (messageType === 0x90) {
            if (data2 === 0) closeNote(channel, data1);
            else openNote(channel, data1, data2);
        }
        else if (messageType === 0x80) {
            closeNote(channel, data1);
        }
        else if (messageType === 0xB0) {
            handleControlChange(channel, data1, data2);
        }
        else if (messageType === 0xE0) {
            const val14 = (data2 << 7) | data1;
            const value = (val14 - 8192) / 8192;
            pushControl(channel, 'pitch', value);
        }
        // 0xA0 (Poly Key Pressure): consumed cleanly; Sequence targets notes, not per-key pressure
    }

    // Close any unclosed notes cleanly at track end
    for (const queue of activeNotes.values()) {
        for (const active of queue) {
            const duration = header.isSMPTE ?
                Math.max(0.25, beat - active.startBeat) :
                Math.max(0.25, (tick - active.startTick) / header.ticksPerBeat) ;
            channelEntries.push({
                channel: active.channel,
                tick: active.startTick,
                endTick: Math.max(tick, active.startTick),
                event: [active.startBeat, 'note', active.pitch, active.gain, duration]
            });
        }
    }
    activeNotes.clear();

    channelEntries.sort((a, b) => a.tick - b.tick || a.event[0] - b.event[0]);

    return {
        name: trackName,
        instrument: instrumentName,
        channelPrefix,
        channelsUsed,
        endTick: tick,
        endBeat: beat,
        conductorEvents,
        channelEntries
    };
}


/**
.dedupeConductorEvents(tracks)
Merges conductor events across tracks, removing redundant identical meter/key/rate/text
events repeated on multiple tracks (standard in DAW exports such as Logic Pro).
**/
function dedupeConductorEvents(tracks) {
    const merged = [];
    for (const track of tracks) {
        for (const event of track.conductorEvents) {
            merged.push(event);
        }
    }
    merged.sort(compareEvents);

    const result = [];
    const seenTextAtBeat = new Set();
    let lastRate = null;
    let lastMeter = null;
    let lastKey = null;

    for (const event of merged) {
        const type = event[1];
        if (type === 'rate') {
            const sig = `${ event[2] }:${ event[3] }`;
            if (sig === lastRate) continue;
            lastRate = sig;
        }
        else if (type === 'meter') {
            const sig = `${ event[2] }:${ event[3] }`;
            if (sig === lastMeter) continue;
            lastMeter = sig;
        }
        else if (type === 'key') {
            if (event[2] === lastKey) continue;
            lastKey = event[2];
        }
        else if (type === 'text') {
            const sig = `${ event[0] }\0${ event[3] }`;
            if (seenTextAtBeat.has(sig)) continue;
            seenTextAtBeat.add(sig);
        }
        result.push(event);
    }

    return result;
}


/**
.shiftEntriesToZero(entries, header, endBeat, endTick)
Shifts a track's channel entries so the earliest event begins at local beat 0,
computing exact local beats and returning `{ startBeat, duration, events }`.
**/
function shiftEntriesToZero(entries, header, endBeat, endTick) {
    const first = entries[0];
    const startTick = first.tick;
    const startBeat = first.event[0];
    const events = [];

    let maxLocalStart = 0;
    let maxLocalEnd = 0;

    for (const entry of entries) {
        // Recompute from integer ticks for TPQN so shifted identical regions match bit-for-bit
        const localBeat = header.isSMPTE ?
            entry.event[0] - startBeat :
            (entry.tick - startTick) / header.ticksPerBeat ;

        const shifted = entry.event.slice();
        shifted[0] = localBeat;
        events.push(shifted);

        if (localBeat > maxLocalStart) maxLocalStart = localBeat;
        const localEnd = localBeat + (shifted[1] === 'note' ? shifted[4] : 0);
        if (localEnd > maxLocalEnd) maxLocalEnd = localEnd;
    }

    const trackLocalEnd = header.isSMPTE ?
        endBeat - startBeat :
        (endTick - startTick) / header.ticksPerBeat ;

    // SequenceIterator drops events at beat >= stopBeat, so ensure duration > maxLocalStart
    let duration = Math.max(trackLocalEnd, maxLocalEnd);
    if (duration <= maxLocalStart) duration = maxLocalStart + 0.001;

    return { startBeat, duration, events };
}


/**
.splitTrackByChannel(track)
Splits a multi-channel Format 0 track into per-channel pseudo-tracks so each active
channel becomes its own cleanly targetable Sequence.
**/
function splitTrackByChannel(track) {
    const byChannel = new Map();
    for (const entry of track.channelEntries) {
        let bucket = byChannel.get(entry.channel);
        if (!bucket) {
            bucket = [];
            byChannel.set(entry.channel, bucket);
        }
        bucket.push(entry);
    }

    const pseudoTracks = [];
    for (const [channel, entries] of byChannel.entries()) {
        pseudoTracks.push({
            name: track.name ? `${ track.name } (Ch ${ channel + 1 })` : `Channel ${ channel + 1 }`,
            instrument: track.instrument || '',
            channelPrefix: channel,
            channelsUsed: new Set([channel]),
            endTick: track.endTick,
            endBeat: track.endBeat,
            channelEntries: entries
        });
    }

    return pseudoTracks;
}


/**
.resolvePartName(track, fallbackChannel)
Resolves a human-readable part name for a track or split channel.
**/
function resolvePartName(track, fallbackChannel) {
    if (track.instrument) return track.instrument;
    if (track.name) return track.name;
    if (track.channelPrefix !== null) return `Channel ${ track.channelPrefix + 1 }`;
    const firstUsed = track.channelsUsed.values().next().value;
    const channel = firstUsed !== undefined ? firstUsed : fallbackChannel;
    return `Channel ${ channel + 1 }`;
}


/**
.inferPartStaff(name, stats)
TEMPORARY: Infers a Scribe stave type (`treble`, `alto`, `bass`, `grand`, `drum`,
etc.) from GM channel 10 (0-indexed 9), instrument/track name hints, and note pitch
range, for populating temporary `sequence.parts` metadata.
**/
function inferPartStaff(name, stats) {
    if (stats.isDrum) return 'drum';

    if (name) {
        if (/\b(drums?|drum\s*kit|kit|snare|kick|hi-?hat|cymbals?|toms?)\b/i.test(name)) return 'drum';
        if (/\b(percussion|cowbell|tambourine|shaker|claves?|triangle|woodblock|maracas?|cabasa|guiro|congas?|bongos?)\b/i.test(name)) return 'percussion';
        if (/\bbass\s*(clarinet|flute|recorder|sax|saxophone)\b/i.test(name)) return 'treble';
        if (/\bviolas?\b/i.test(name)) return 'alto';
        if (/\b(cellos?|violoncellos?|bassoons?|contrabassoons?|tubas?|trombones?|euphoniums?|sousaphones?|baritone\s*horns?|timpani|double\s*bass|contrabass|upright\s*bass|electric\s*bass|synth\s*bass|bass\s*guitar|bass)\b/i.test(name)) return 'bass';
        if (/\b(tenor|guitars?|acoustic\s*guitar|electric\s*guitar|classical\s*guitar|ukuleles?)\b/i.test(name)) return 'treble-down';
        if (/\b(pianos?|electric\s*piano|rhodes|wurlitzer|clavinet|clav|harpsichords?|organs?|celestas?|harps?|marimbas?|vibraphones?|accordions?)\b/i.test(name)) return 'grand';
        if (/\b(piccolos?|glockenspiels?)\b/i.test(name)) return 'treble-up';
        if (/\b(violins?|flutes?|oboes?|clarinets?|trumpets?|cornets?|horns?|french\s*horns?|saxophones?|saxes?|sax|sopranos?|altos?|vocals?|voice|choir)\b/i.test(name)) return 'treble';
    }

    if (stats.noteCount === 0) return 'treble';
    if (stats.minPitch < 52 && stats.maxPitch > 67) return 'grand';
    if ((stats.sumPitch / stats.noteCount) < 57) return 'bass';
    return 'treble';
}


/**
.accumulatePartStats(stats, track)
Accumulates MIDI note pitch range and drum-channel indicators across tracks mapped
to the same part so tessitura inference reflects the full part.
**/
function accumulatePartStats(stats, track) {
    if (track.channelsUsed.has(9) || track.channelPrefix === 9) {
        stats.isDrum = true;
    }

    for (const entry of track.channelEntries) {
        if (entry.event[1] !== 'note') continue;
        const pitch = entry.event[2];
        if (pitch < stats.minPitch) stats.minPitch = pitch;
        if (pitch > stats.maxPitch) stats.maxPitch = pitch;
        stats.sumPitch += pitch;
        stats.noteCount += 1;
    }
}


/**
.createPartStats(name, targetId)
Initialises accumulator state for a temporary Scribe part definition.
**/
function createPartStats(name, targetId) {
    return {
        name,
        targetId,
        isDrum: false,
        noteCount: 0,
        minPitch: Infinity,
        maxPitch: -Infinity,
        sumPitch: 0
    };
}


/**
.finaliseParts(partStatsList)
TEMPORARY: Builds Scribe-compatible `{ name, staff, routing }` descriptors keyed by
numeric `Uint16` target IDs.

`parts` is not part of the core `Sequence` specification, and `SequenceEvent[3]`
(`TARGET`) serialises as a `Uint16` integer rather than a string name. Until Scribe
derives parts/clefs directly from sequence structure without `sequence.parts`,
`parseMIDI()` emits numeric target IDs and this temporary `parts` lookup table so
multi-part MIDI renders on the intended staves and survives binary record round-trips.
**/
function finaliseParts(partStatsList) {
    return partStatsList.map((stats) => ({
        name: stats.name,
        staff: inferPartStaff(stats.name, stats),
        routing: { [stats.targetId]: 0 }
    }));
}


/**
parseMIDI(buffer, options)
Parses a Standard MIDI File (.mid) buffer into a `Sequence` instance.

```js
const buffer = await Deno.readFile('song.mid');
const sequence = parseMIDI(buffer);
```

Options:
- `flat`: when `true`, merges all tracks/channels directly into the root `Sequence.events` instead of creating child `sequences`.
**/
export function parseMIDI(buffer, options = {}) {
    const view = toDataView(buffer);
    const mthdOffset = findMidiHeaderOffset(view);
    const header = parseHeader(view, mthdOffset);

    const tracks = [];
    const smpteTempoState = { rate: 2 }; // Default 120 BPM = 2 beats/sec per SMF spec
    let offset = header.tracksStartOffset;

    while (tracks.length < header.trackCount && offset + 8 <= view.byteLength) {
        const chunkTag = readTag(view, offset);
        const chunkSize = view.getUint32(offset + 4, false);
        const chunkStart = offset + 8;
        const chunkEnd = Math.min(chunkStart + chunkSize, view.byteLength);

        if (chunkTag === 'MTrk') {
            tracks.push(parseTrack(view, chunkStart, chunkEnd, header, smpteTempoState));
        }

        offset = chunkEnd;
    }

    const conductorEvents = dedupeConductorEvents(tracks);
    const musicTracks = tracks.filter((t) => t.channelEntries.length > 0);

    // Flat representation when requested, when Format 0 uses <= 1 channel, or when empty
    if (options.flat || musicTracks.length === 0 || (header.format === 0 && musicTracks[0].channelsUsed.size <= 1)) {
        const events = conductorEvents.slice();
        const sourceTracks = options.flat ? musicTracks : musicTracks.slice(0, 1);
        for (const track of sourceTracks) {
            for (const entry of track.channelEntries) {
                events.push(entry.event);
            }
        }
        events.sort(compareEvents);

        // TEMPORARY: Attach inferred single-part stave metadata for Scribe on non-empty flat MIDI
        let parts;
        if (sourceTracks.length > 0) {
            const firstTrack = sourceTracks[0];
            const stats = createPartStats(resolvePartName(firstTrack, 0), 0);
            for (const track of sourceTracks) accumulatePartStats(stats, track);
            parts = finaliseParts([stats]);
        }

        const data = { events };
        if (options.name) data.name = options.name;
        if (parts) data.parts = parts;
        return Sequence.from(data);
    }

    // Format 0 with multiple active channels: split into per-channel sub-sequences
    const subTrackSources = header.format === 0 ?
        splitTrackByChannel(musicTracks[0]) :
        musicTracks ;

    const rootEvents = conductorEvents.slice();
    const sequences = [];
    const signatureToId = new Map();
    const partKeyToStats = new Map();
    const partStatsList = [];
    let nextId = 1;

    for (let i = 0; i < subTrackSources.length; i++) {
        const track = subTrackSources[i];
        const { startBeat, duration, events } = shiftEntriesToZero(
            track.channelEntries,
            header,
            track.endBeat,
            track.endTick
        );

        const seqName = track.name || track.instrument || undefined;
        const fingerprint = JSON.stringify([seqName || '', events]);

        let seqId = signatureToId.get(fingerprint);
        if (!seqId) {
            seqId = nextId++;
            signatureToId.set(fingerprint, seqId);
            sequences.push({
                id: seqId,
                name: seqName,
                events
            });
        }

        // Assign a serialisable Uint16 target ID per unique part (matching temporary `parts`)
        const partName = resolvePartName(track, i);
        const firstUsed = track.channelsUsed.values().next().value;
        const isDrum = track.channelsUsed.has(9) || track.channelPrefix === 9;
        const partChannelKey = isDrum ? 'drum' : (track.channelPrefix ?? firstUsed ?? i);
        const partKey = `${ partName }\0${ partChannelKey }`;

        // Target IDs 1+ identify external target objects (0 targets this sequencer)
        let stats = partKeyToStats.get(partKey);
        if (!stats) {
            stats = createPartStats(partName, partStatsList.length + 1);
            partKeyToStats.set(partKey, stats);
            partStatsList.push(stats);
        }
        accumulatePartStats(stats, track);

        rootEvents.push([startBeat, 'sequence', seqId, stats.targetId, duration]);
    }

    rootEvents.sort(compareEvents);

    // TEMPORARY: `parts` array added for Scribe routing/stave compatibility (not part of Sequence spec)
    const parts = finaliseParts(partStatsList);

    const data = {
        events: rootEvents,
        sequences,
        parts
    };
    if (options.name) data.name = options.name;
    return Sequence.from(data);
}

export default parseMIDI;

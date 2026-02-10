
import { CURVENUMBERS }     from '../event/curves.js';
import { TYPENUMBERS, TYPEBYTES }      from '../event/types.js';
import { TRANSFORMNUMBERS, TRANSFORMBYTES, TRANSFORMLENGTHS } from '../event/transforms.js';
import { CHORDNUMBERS }     from '../event/chords.js';
import { PARAMNUMBERS }     from '../event/params.js';


/**
serialise(events)
Serialises an array of Sequence events to a Uint8Array binary format.

Event structure: beat(8) | type(1) | length(1) | values(variable)
**/

// Maximum string bytes for text events
// length field max: 255 bytes
// text values overhead: duration(8) = 8 bytes
// max string: 255 - 8 = 247 bytes
const MAX_TEXT_BYTES = 247;

function truncateUTF8(bytes, maxLength) {
    if (bytes.length <= maxLength) return bytes;

    // Walk backwards from maxLength to find start of last complete character
    // UTF-8 continuation bytes have pattern 10xxxxxx (0x80-0xBF)
    let i = maxLength;
    while (i > 0 && (bytes[i] & 0xC0) === 0x80) {
        i--;
    }

    return bytes.slice(0, i);
}

function getEventBytes(event) {
    const t = TYPENUMBERS[event[1]];
    if (t in TYPEBYTES) return TYPEBYTES[t];

    switch(t) {
        case TYPENUMBERS['text']: {
            const string    = event[2];
            const encoded   = new TextEncoder().encode(string);
            const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
            return 8 + truncated.length; // duration(8) + string(N)
        }

        case TYPENUMBERS['sequence']: {
            let bytes = 12; // id(2) + target(2) + duration(8)
            // Transforms start at index 5
            let i = 4;
            while (++i < event.length) {
                const n = TRANSFORMNUMBERS[event[i]];
                bytes += TRANSFORMBYTES[n];
                i += TRANSFORMLENGTHS[n];
            }
            return bytes;
        }

        default: {
            throw new Error(`Unknown event type "${ event[1] }"`);
        }
    }
}

export default function serialise(events) {
    // First pass: calculate total size
    let totalSize = 0;
    for (const event of events) {
        totalSize += 10; // beat(8) + type(1) + length(1)
        totalSize += getEventBytes(event);
    }

    // Allocate buffer
    const buffer = new Uint8Array(totalSize);
    const view   = new DataView(buffer.buffer);

    let offset = 0;

    // Second pass: write events
    let n = -1, event;
    while(event = events[++n]) {
        const type = event[1];
        const t    = TYPENUMBERS[type];

        if (t === undefined) throw new Error(`Unknown event type: ${ type }`);

        // Write beat (float64)
        view.setFloat64(offset, event[0], true);
        offset += 8;

        // Write type (uint8)
        buffer[offset] = t;
        offset += 1;

        // Write length (uint8)
        buffer[offset] = getEventBytes(event);
        offset += 1;

        // Write type-specific data
        switch(type) {
            case 'note':
                view.setFloat32(offset, event[2], true);      // pitch
                view.setFloat32(offset + 4, event[3], true);  // dynamic
                view.setFloat64(offset + 8, event[4], true);  // duration
                offset += 16;
                break;

            case 'param': {
                const nameId = typeof event[2] === 'string' ? (PARAMNUMBERS[event[2]] || 0) : event[2];
                view.setUint16(offset, nameId, true);         // name
                view.setFloat32(offset + 2, event[3], true);  // value
                const c = CURVENUMBERS[event[4]] ?? 0;
                buffer[offset + 6] = c;                 // curve
                view.setFloat64(offset + 7, event[5] || 0, true); // duration
                offset += 15;
                break;
            }

            case 'rate': {
                view.setFloat32(offset, event[2], true);      // rate
                const c = event[3] ? (CURVENUMBERS[event[3]] ?? 0) : 0;
                buffer[offset + 4] = c;                 // curve
                view.setFloat64(offset + 5, event[4] || 0, true); // duration
                offset += 13;
                break;
            }

            case 'meter':
                view.setFloat16(offset, event[2], true);      // duration
                view.setFloat16(offset + 2, event[3], true);  // divisor
                offset += 4;
                break;

            case 'chord': {
                const rootId = typeof event[2] === 'number' ? event[2] : 0;
                buffer[offset] = rootId;                      // root
                const modeId = typeof event[3] === 'string' ? (CHORDNUMBERS[event[3]] || 0) : event[3];
                buffer[offset + 1] = modeId;                  // mode
                view.setFloat64(offset + 2, event[4], true);  // duration
                const bassId = typeof event[5] === 'number' ? event[5] : 0;
                buffer[offset + 10] = bassId;                 // bass
                offset += 11;
                break;
            }

            case 'key': {
                // Map key name to ID (TODO: implement mapping)
                const keyId = typeof event[2] === 'number' ? event[2] : 0;
                buffer[offset] = keyId;                       // name
                offset += 1;
                break;
            }

            case 'sequence': {
                // Map sequence id to number (TODO: implement mapping)
                const seqId = typeof event[2] === 'number' ? event[2] : 0;
                view.setUint16(offset, seqId, true);          // id
                // Map target id to number (TODO: implement mapping)
                const targetId = typeof event[3] === 'number' ? event[3] : 0;
                view.setUint16(offset + 2, targetId, true);   // target
                view.setFloat64(offset + 4, event[4], true);  // duration
                offset += 12;

                // Write transforms
                let i = 4;
                while (++i < event.length) {
                    const transformName = event[i];
                    const n = TRANSFORMNUMBERS[transformName];
                    if (n === undefined) {
                        throw new Error(`Unknown transform type: ${ transformName }`);
                    }

                    buffer[offset] = n;
                    offset += 1;

                    // Write parameters based on transform type
                    switch(transformName) {
                        case 'displace':
                            view.setFloat64(offset, event[i + 1], true);
                            offset += 8;
                            break;

                        case 'rate':
                        case 'gain':
                        case 'quantize':
                            view.setFloat32(offset, event[i + 1], true);
                            offset += 4;
                            break;

                        case 'transpose':
                            view.setInt8(offset, event[i + 1]);
                            offset += 1;
                            break;

                        default:
                            throw new Error(`Unknown transform type: ${ transformName }`);
                    }

                    i += TRANSFORMLENGTHS[n];
                }
                break;
            }

            case 'text': {
                const string = event[2];
                const encoded = new TextEncoder().encode(string);
                const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
                view.setFloat64(offset, event[3], true);        // duration
                buffer.set(truncated, offset + 8);              // string bytes
                offset += 8 + truncated.length;
                break;
            }

            case 'start':
            case 'stop':
                view.setFloat32(offset, event[2], true);      // pitch
                view.setFloat32(offset + 4, event[3], true);  // dynamic
                offset += 8;
                break;
        }
    }

    return buffer;
}

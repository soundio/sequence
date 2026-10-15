
import Event     from '../event.js';
import Transform from '../transform.js';
import { unpackCurve } from '../event/address.js';
import { CURVES, CURVEBYTES } from '../event/curves.js';
import { toKeyNumber } from '../event/key.js';
import { MAX_TEXT_BYTES } from '../event/text.js';


const { TYPES, TYPENAMES, TYPEBYTES } = Event;
const { TRANSFORMLENGTHS } = Transform;

/**
VERSION
**/

export const VERSION = 0;


/**
serialise(events)
Serialises an array of events to a Uint8Array binary format.
Event structure: Float64 beat | Uint16 type | (Uint16 address/curve if control/rate) | data...
**/

function truncateUTF8(bytes, maxLength) {
    if (bytes.length <= maxLength) return bytes;

    // Walk backwards from maxLength to find start of last complete character
    // UTF-8 continuation bytes have pattern 10xxxxxx (0x80-0xBF)
    let i = maxLength;
    while (i > 0 && (bytes[i] & 0xC0) === 0x80) i--;
    return bytes.slice(0, i);
}

function getEventBytes(event) {
    const type = event[1];

    let bytes = 10; // beat 8 | type 2
    if (type in TYPEBYTES) return bytes + TYPEBYTES[type];

    let i;
    switch(type) {
        case TYPES.text: {
            // Layout: duration at [2], text string at [3]
            const encoded   = new TextEncoder().encode(event[3]);
            const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
            return bytes + 8 + 1 + truncated.length; // duration(8) + length(1) + string(N)
        }

        case TYPES.sequence: {
            bytes += 13; // id 2 | target 2 | duration 8 | byteslength 1
            i = 4;
            while (event[++i] !== undefined) {
                // Transforms are stored as numbers on the event
                const n = event[i];
                bytes += Transform.BYTES[n];
                i += TRANSFORMLENGTHS[n];
            }
            return bytes;
        }

        case TYPES.control:
        case TYPES.rate: {
            // Control and rate events store slot [2] as another 16-bit number
            bytes += 2;

            const curve = type === TYPES.control ?
                unpackCurve(event[2]) :
                event[2];

            // For curve type, always include length field (array is at [3])
            return curve === CURVES.curve ?
                bytes + 8 + 2 + event[3].length * 4 :
                bytes + CURVEBYTES[curve] ;
        }

        default:
            throw new Error(`Event type ${ TYPENAMES[type] || type } not recognised`);
    }
}

export default function serialise(events) {
    // First pass: normalise events and calculate total size
    const normalised = [];
    let bytes = 0;
    for (let event of events) {
        if (!(event instanceof Event)) event = Event.from(event);
        normalised.push(event);
        bytes += getEventBytes(event);
    }

    // Allocate buffer
    const buffer = new Uint8Array(bytes);
    const view   = new DataView(buffer.buffer);

    // Second pass: write events
    let n = -1, event, offset = 0;
    while(event = normalised[++n]) {
        // Write beat Float64
        view.setFloat64(offset, event[0], true);
        offset += 8;

        // Write type Uint16
        view.setUint16(offset, event[1], true);
        offset += 2;

        // Write event-specific data
        switch(event[1]) {
            case TYPES.note:
                view.setFloat32(offset, event[2], true);      // pitch
                view.setFloat32(offset + 4, event[3], true);  // dynamic
                view.setFloat64(offset + 8, event[4], true);  // duration
                offset += 16;
                break;

            case TYPES.control:
            case TYPES.rate: {
                // Write slot [2] as Uint16
                view.setUint16(offset, event[2], true);
                offset += 2;

                const curve = event[1] === TYPES.control ?
                    unpackCurve(event[2]) :
                    event[2];

                switch (curve) {
                    case CURVES.step:
                    case CURVES.linear:
                    case CURVES.exponential:
                        view.setFloat32(offset, event[3], true);          // value
                        offset += 4;
                        break;

                    case CURVES.target:
                        view.setFloat32(offset, event[3], true);          // value
                        view.setFloat64(offset + 4, event[4] || 0, true); // duration time constant
                        offset += 12;
                        break;

                    case CURVES.curve: {
                        // curve: duration(8) + byteslength(2) + values(n * 4)
                        view.setFloat64(offset, event[4] || 0, true);
                        offset += 8;

                        const values = event[3];
                        const bytes  = values.length * 4;

                        // Write length as Uint16
                        view.setUint16(offset, bytes, true);
                        offset += 2;

                        // Write Float32 values if present
                        let n = -1;
                        while (values[++n] !== undefined) {
                            view.setFloat32(offset + n * 4, values[n], true);
                        }

                        offset += bytes;
                        break;
                    }
                }

                break;
            }

            case TYPES.meter:
                view.setFloat16(offset, event[2], true);      // duration
                view.setFloat16(offset + 2, event[3], true);  // divisor
                offset += 4;
                break;

            case TYPES.chord: {
                const rootId = event[2];
                view.setUint8(offset, rootId);                // root
                const hsId   = event[3];
                view.setFloat64(offset + 1, hsId, true);      // hsid
                view.setFloat64(offset + 9, event[4], true);  // duration
                const bassId = event[5];
                view.setUint8(offset + 17, bassId);           // bass
                offset += 18;
                break;
            }

            case TYPES.key: {
                view.setInt8(offset, toKeyNumber(event[2]));
                offset += 1;
                break;
            }

            case TYPES.sequence: {
                view.setUint16(offset, event[2], true);       // id
                view.setUint16(offset + 2, event[3], true);   // target
                view.setFloat64(offset + 4, event[4], true);  // duration
                offset += 12;

                // Write length byte (transform bytes only)
                const bytesIndex = offset;
                offset += 1;

                // Write transforms
                let i = 4;
                while (event[++i] !== undefined) {
                    // Transforms are stored as numbers on the event
                    const n = event[i];

                    view.setUint8(offset, n);
                    offset += 1;

                    // Write parameters based on transform number
                    switch(n) {
                        case Transform.TYPES.displace:
                            view.setFloat64(offset, event[i + 1], true);
                            offset += 8;
                            break;

                        case Transform.TYPES.rate:
                        case Transform.TYPES.gain:
                        case Transform.TYPES.quantize:
                            view.setFloat32(offset, event[i + 1], true);
                            offset += 4;
                            break;

                        case Transform.TYPES.transpose:
                            view.setInt8(offset, event[i + 1]);
                            offset += 1;
                            break;

                        default:
                            throw new Error(`Transform number ${ n } not recognised`);
                    }

                    i += TRANSFORMLENGTHS[n];
                }

                // Fill in bytes length
                view.setUint8(bytesIndex, offset - bytesIndex - 1);
                break;
            }

            case TYPES.text: {
                // Layout: duration at [2], text string at [3]
                const encoded = new TextEncoder().encode(event[3]);
                const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
                view.setFloat64(offset, event[2], true);        // duration
                view.setUint8(offset + 8, truncated.length);    // length byte (string bytes only)
                buffer.set(truncated, offset + 9);              // string bytes
                offset += 9 + truncated.length;
                break;
            }

            case TYPES.clef: {
                const clefId = typeof event[2] === 'number' ? event[2] : 0;
                view.setUint8(offset, clefId);
                offset += 1;
                break;
            }
        }
    }

    return buffer;
}


import Event from '../event.js';
import { packAddress }              from '../event/address.js';
import { CURVENUMBERS, CURVEBYTES } from '../event/curves.js';
import { TRANSFORMNUMBERS, TRANSFORMBYTES, TRANSFORMLENGTHS } from '../event/transforms.js';
import { toKeyNumber }  from '../event/key.js';


const { TYPES, TYPENAMES, TYPEBYTES } = Event;


/**
VERSION
**/

export const VERSION = 0;


/**
serialise(events)
Serialises an array of events to a Uint8Array binary format.
Event structure: Float64 beat | Int16 address | data...
Address structure: 2-bit route | 10-bit name | 4-bit curve
**/

// Maximum string bytes for text events
// length field stores string bytes only (0-255)
const MAX_TEXT_BYTES = 255;

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

    let bytes = 10; // beat 8 | address 2
    if (type in TYPEBYTES) return bytes + TYPEBYTES[t];

    let i;
    switch(type) {
        case TYPES.text: {
            const encoded   = new TextEncoder().encode(event[2]);
            const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
            return bytes + 8 + 1 + truncated.length; // duration(8) + length(1) + string(N)
        }

        case TYPES.sequence: {
            bytes += 13; // id 2 | target 2 | duration 8 | byteslength 1
            i = 4;
            while (event[++i] !== undefined) {
                const n = TRANSFORMNUMBERS[event[i]];
                bytes += TRANSFORMBYTES[n];
                i += TRANSFORMLENGTHS[n];
            }
            return bytes;
        }

        case TYPES.param:
            i = 4;
        case TYPES.rate:
            if (i === undefined) i = 3;

        default: {
            // Different curves take up different bytelengths
            const number = event[i];

            // For curve type, always include length field (array is at i-1)
            return number === CURVENUMBERS.curve ?
                bytes + 8 + 2 + event[i - 1].length * 4 :
                bytes + CURVEBYTES[number] ;
        }
    }
}

function getAddressFromEvent(event) {
    const type = event[1];

    switch (type) {
        case TYPES.param: {
            // Param event route 1
            return packAddress(1, event[2], event[4]);
        }

        case TYPES.rate: {
            // Param event route 0
            return packAddress(0, type, event[3]);
        }

        default: {
            if (TYPENAMES[type] === undefined) throw new Error(`Event type ${ TYPENAMES[type] } not recognised`);
            // Other sequence targeted events route 0
            return packAddress(0, type, 0);
        }
    }
}

export default function serialise(events) {
    // First pass: calculate total size
    let bytes = 0;
    for (const event of events) bytes += getEventBytes(event);

    // Allocate buffer
    const buffer = new Uint8Array(bytes);
    const view   = new DataView(buffer.buffer);

    // Second pass: write events
    let n = -1, event, offset = 0;
    while(event = events[++n]) {
        // Make sure event is a normalised event object
        if (!(event instanceof Event)) event = Event.from(event);

        // Write beat Float64
        view.setFloat64(offset, event[0], true);
        offset += 8;

        // Write address Uint16
        const address = getAddressFromEvent(event);
        view.setUint16(offset, address, true);
        offset += 2;

        // Write event-specific data
        switch(event[1]) {
            case TYPES.note:
                view.setFloat32(offset, event[2], true);      // pitch
                view.setFloat32(offset + 4, event[3], true);  // dynamic
                view.setFloat64(offset + 8, event[4], true);  // duration
                offset += 16;
                break;

            case TYPES.param:
            case TYPES.rate: {
                const i = event[1] === TYPES.rate ? 2 : 3;
                const number = event[i + 1];

                switch (number) {
                    case CURVENUMBERS.step:
                    case CURVENUMBERS.linear:
                    case CURVENUMBERS.exponential:
                        // step/linear/exponential: value(4) only
                        view.setFloat32(offset, event[i], true);
                        offset += 4;
                        break;

                    case CURVENUMBERS.target:
                        // target: value(4) + timeConstant(8)
                        view.setFloat32(offset, event[i], true);
                        view.setFloat64(offset + 4, event[i + 2] || 0, true);
                        offset += 12;
                        break;

                    case CURVENUMBERS.curve:
                        // curve: duration(8) + byteslength(2) + values(n * 4)
                        view.setFloat64(offset, event[i + 2] || 0, true);
                        offset += 8;

                        const values = event[i];
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

                    // hold/cancel: no data, no offset change
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
                buffer[offset] = rootId;                      // root
                const hsId   = event[3];
                view.setFloat64(offset + 1, hsId, true);      // hsid
                view.setFloat64(offset + 9, event[4], true);  // duration
                const bassId = event[5];
                buffer[offset + 17] = bassId;                 // bass
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
                    const n = event[i];

                    if (TRANSFORMNAMES[n]) throw new Error(`Transform name "${ TRANSFORMNAMES[n] }" not recognised`);

                    buffer[offset] = n;
                    offset += 1;

                    // Write parameters based on transform number
                    switch(n) {
                        case TRANSFORMNUMBERS.displace:
                            view.setFloat64(offset, event[i + 1], true);
                            offset += 8;
                            break;

                        case TRANSFORMNUMBERS.rate:
                        case TRANSFORMNUMBERS.gain:
                        case TRANSFORMNUMBERS.quantize:
                            view.setFloat32(offset, event[i + 1], true);
                            offset += 4;
                            break;

                        case TRANSFORMNUMBERS.transpose:
                            view.setInt8(offset, event[i + 1]);
                            offset += 1;
                            break;

                        default:
                            throw new Error(`Transform number ${ n } not recognised`);
                    }

                    i += TRANSFORMLENGTHS[n];
                }

                // Fill in bytes length
                buffer[bytesIndex] = offset - bytesIndex - 1;
                break;
            }

            case TYPES.text: {
                const encoded = new TextEncoder().encode(event[2]);
                const truncated = truncateUTF8(encoded, MAX_TEXT_BYTES);
                view.setFloat64(offset, event[3], true);        // duration
                buffer[offset + 8] = truncated.length;          // length byte (string bytes only)
                buffer.set(truncated, offset + 9);              // string bytes
                offset += 9 + truncated.length;
                break;
            }

            case TYPES.start:
            case TYPES.stop:
                view.setFloat32(offset, event[2], true);      // pitch
                view.setFloat32(offset + 4, event[3], true);  // dynamic
                offset += 8;
                break;

            // TODO: This does not really deserve to be here. We could make
            // the remaining curve types in the last 4 bits of address identify
            // data signatures for unknown events ... but then we need to tell
            // the event how to be encoded ... not great. For now, we'll spec it
            // here.
            case TYPES.clef:
                const clefId = typeof event[2] === 'number' ? event[2] : 0;
                buffer[offset] = clefId;
                offset += 1;
                break;
        }
    }

    return buffer;
}

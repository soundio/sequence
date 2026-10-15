
import Event      from '../event.js';
import Transform  from '../transform.js';
import { CURVES } from '../event/curves.js';
import { PARAMS } from '../event/control.js';
import { TYPES }  from '../event/event.js';
import { unpackParam, unpackCurve } from '../event/address.js';


/**
deserialise(buffer)
Deserialises a Uint8Array binary format to an array of Sequence events.
Event structure: Float64 beat | Uint16 type | (Uint16 address/curve if control/rate) | data...
**/

export default function deserialise(buffer) {
    const view   = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const events = [];

    let offset = 0;
    while (offset < buffer.length) {
        const beat = view.getFloat64(offset, true);    // Read beat (float64)
        const type = view.getUint16(offset + 8, true); // Read type (uint16)
        offset += 10;

        switch (type) {
            case TYPES['note']:
                events.push(Event.of(
                    beat,
                    type,
                    view.getFloat32(offset, true),      // pitch
                    view.getFloat32(offset + 4, true),  // dynamic
                    view.getFloat64(offset + 8, true)   // duration
                ));
                offset += 16;
                break;

            case TYPES['meter']:
                events.push(Event.of(
                    beat,
                    type,
                    view.getFloat16(offset, true),      // duration
                    view.getFloat16(offset + 2, true)   // divisor
                ));
                offset += 4;
                break;

            case TYPES['chord']:
                events.push(Event.of(
                    beat,
                    type,
                    view.getUint8(offset),               // root
                    view.getFloat64(offset + 1, true),   // hsId (harmonic structure id)
                    view.getFloat64(offset + 9, true),   // duration
                    view.getUint8(offset + 17)           // bass
                ));
                offset += 18;
                break;

            case TYPES['key']:
                events.push(Event.of(
                    beat,
                    type,
                    view.getInt8(offset)
                ));
                offset += 1;
                break;

            case TYPES['clef']:
                events.push(Event.of(
                    beat,
                    type,
                    view.getUint8(offset)
                ));
                offset += 1;
                break;

            // id | target | duration | bytelength | transforms...
            case TYPES['sequence']: {
                const id       = view.getUint16(offset, true);
                const target   = view.getUint16(offset + 2, true);
                const duration = view.getFloat64(offset + 4, true);
                const bytes    = view.getUint8(offset + 12);
                const params   = [beat, type, id, target, duration];
                offset += 13;

                // Read transforms
                let o = 0;
                while (o < bytes) {
                    const number = view.getUint8(offset + o);
                    o += 1;
                    params.push(number);

                    // Read parameters based on transform number
                    switch(number) {
                        case Transform.TYPES.displace:
                            params.push(view.getFloat64(offset + o, true));
                            o += 8;
                            break;

                        case Transform.TYPES.rate:
                        case Transform.TYPES.gain:
                        case Transform.TYPES.quantize:
                            params.push(view.getFloat32(offset + o, true));
                            o += 4;
                            break;

                        case Transform.TYPES.transpose:
                            params.push(view.getInt8(offset + o));
                            o += 1;
                            break;

                        default:
                            throw new Error(`Unknown transform number: ${ number }`);
                    }
                }

                events.push(Event.from(params));
                offset += bytes;
                break;
            }

            // duration | bytelength | string...
            case TYPES['text']: {
                const duration = view.getFloat64(offset, true);
                const bytes    = view.getUint8(offset + 8);
                offset += 9;

                // Get string data
                const data = buffer.subarray(offset, offset + bytes);
                events.push(Event.of(
                    beat,
                    type,
                    duration,
                    new TextDecoder().decode(data)
                ));
                offset += bytes;
                break;
            }

            case TYPES['control']: {
                const address = view.getUint16(offset, true);
                const name    = unpackParam(address);
                const curve   = unpackCurve(address);
                offset += 2;

                switch (curve) {
                    case CURVES.step:
                    case CURVES.linear:
                    case CURVES.exponential:
                        events.push(Event.control(
                            beat,
                            name,
                            curve,
                            view.getFloat32(offset, true),
                            0
                        ));
                        offset += 4;
                        break;

                    case CURVES.target:
                        events.push(Event.control(
                            beat,
                            name,
                            curve,
                            view.getFloat32(offset, true),
                            view.getFloat64(offset + 4, true)
                        ));
                        offset += 12;
                        break;

                    case CURVES.curve: {
                        const duration = view.getFloat64(offset, true);
                        const bytes    = view.getUint16(offset + 8, true);
                        offset += 10;

                        if (bytes < 8) throw new Error(`Invalid bytes count ${ bytes } (must hold at least 2 * Float32 bytes)`);
                        if (bytes % 4 !== 0) throw new Error(`Invalid bytes count ${ bytes } (must hold n * Float32 bytes)`);

                        const slice  = buffer.slice(offset, offset + bytes);
                        const values = new Float32Array(slice.buffer);
                        offset += bytes;

                        events.push(Event.control(beat, name, curve, values, duration));
                        break;
                    }

                    case CURVES.hold:
                    case CURVES.cancel:
                        events.push(Event.control(beat, name, curve));
                        break;

                    default: {
                        throw new Error('Cannot deserialise unrecognised curve ' + curve);
                    }
                }
                break;
            }

            case TYPES['rate']: {
                const curve = view.getUint16(offset, true);
                offset += 2;

                switch (curve) {
                    case CURVES.step:
                    case CURVES.linear:
                    case CURVES.exponential:
                        events.push(Event.rate(
                            beat,
                            curve,
                            view.getFloat32(offset, true)
                        ));
                        offset += 4;
                        break;

                    case CURVES.target:
                        events.push(Event.rate(
                            beat,
                            curve,
                            view.getFloat32(offset, true),
                            view.getFloat64(offset + 4, true)
                        ));
                        offset += 12;
                        break;

                    case CURVES.curve: {
                        const duration = view.getFloat64(offset, true);
                        const bytes    = view.getUint16(offset + 8, true);
                        offset += 10;

                        if (bytes < 8) throw new Error(`Invalid bytes count ${ bytes } (must hold at least 2 * Float32 bytes)`);
                        if (bytes % 4 !== 0) throw new Error(`Invalid bytes count ${ bytes } (must hold n * Float32 bytes)`);

                        const slice  = buffer.slice(offset, offset + bytes);
                        const values = new Float32Array(slice.buffer);
                        offset += bytes;

                        events.push(Event.rate(beat, curve, values, duration));
                        break;
                    }

                    case CURVES.hold:
                    case CURVES.cancel:
                        events.push(Event.rate(beat, curve));
                        break;

                    default: {
                        throw new Error('Cannot deserialise unrecognised curve ' + curve);
                    }
                }
                break;
            }

            default:
                throw new Error(`Cannot deserialise unknown event type ${ type }`);
        }
    }

    return events;
}

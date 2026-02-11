
import { TYPENAMES }      from '../event/types.js';
import { TRANSFORMNUMBERS } from '../event/transforms.js';
import { toParamNumber, toCurveNumber } from './address.js';
import Event              from '../event.js';


/**
deserialise(buffer)
Deserialises a Uint8Array binary format to an array of Sequence events.

Event structure: beat(8) | type(1) | length(1) | values(variable)
**/

export default function deserialise(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const events = [];
    let offset = 0;

    while (offset < buffer.length) {
        // Read beat (float64)
        const beat = view.getFloat64(offset, true);
        offset += 8;

        // Read type (uint8)
        const typeNumber = buffer[offset];
        offset += 1;

        const type = TYPENAMES[typeNumber];
        if (type === undefined) {
            throw new Error(`Unknown event type number: ${ typeNumber }`);
        }

        // Read length (uint8)
        const length = buffer[offset];
        offset += 1;

        // Read type-specific data
        let event;

        switch(type) {
            case 'note':
                event = Event.of(
                    beat,
                    type,
                    view.getFloat32(offset, true),      // pitch
                    view.getFloat32(offset + 4, true),  // dynamic
                    view.getFloat64(offset + 8, true)   // duration
                );
                offset += 16;
                break;

            case 'param': {
                const address = view.getUint16(offset, true);
                const paramNumber = toParamNumber(address);
                const value = view.getFloat32(offset + 2, true);
                const curveNumber = toCurveNumber(address);
                const duration = view.getFloat64(offset + 6, true);
                event = Event.of(beat, type, paramNumber, value, curveNumber, duration);
                offset += 14;
                break;
            }

            case 'rate': {
                const rate = view.getFloat32(offset, true);
                const curveNumber = buffer[offset + 4];
                const duration = view.getFloat64(offset + 5, true);
                event = Event.of(beat, type, rate, curveNumber, duration);
                offset += 13;
                break;
            }

            case 'meter':
                event = Event.of(
                    beat,
                    type,
                    view.getFloat16(offset, true),      // duration
                    view.getFloat16(offset + 2, true)   // divisor
                );
                offset += 4;
                break;

            case 'chord': {
                const root = buffer[offset];
                const modeNumber = buffer[offset + 1];
                const duration = view.getFloat64(offset + 2, true);
                const bass = buffer[offset + 10];
                event = Event.of(beat, type, root, modeNumber, duration, bass);
                offset += 11;
                break;
            }

            case 'key': {
                const name = buffer[offset];
                event = Event.of(beat, type, name);
                offset += 1;
                break;
            }

            case 'sequence': {
                const id = view.getUint16(offset, true);
                const target = view.getUint16(offset + 2, true);
                const duration = view.getFloat64(offset + 4, true);
                const params = [beat, type, id, target, duration];
                offset += 12;

                // Read transforms
                const transformsEnd = offset + length - 12;
                while (offset < transformsEnd) {
                    const transformNumber = buffer[offset];
                    offset += 1;

                    params.push(transformNumber);

                    // Read parameters based on transform number
                    switch(transformNumber) {
                        case TRANSFORMNUMBERS['displace']:
                            params.push(view.getFloat64(offset, true));
                            offset += 8;
                            break;

                        case TRANSFORMNUMBERS['rate']:
                        case TRANSFORMNUMBERS['gain']:
                        case TRANSFORMNUMBERS['quantize']:
                            params.push(view.getFloat32(offset, true));
                            offset += 4;
                            break;

                        case TRANSFORMNUMBERS['transpose']:
                            params.push(view.getInt8(offset));
                            offset += 1;
                            break;

                        default:
                            throw new Error(`Unknown transform number: ${ transformNumber }`);
                    }
                }
                event = Event.from(params);
                break;
            }

            case 'text': {
                const duration = view.getFloat64(offset, true);
                const stringLength = length - 8;
                const stringBytes = buffer.subarray(offset + 8, offset + 8 + stringLength);
                const string = new TextDecoder().decode(stringBytes);
                event = Event.of(beat, type, string, duration);
                offset += 8 + stringLength;
                break;
            }

            case 'start':
            case 'stop':
                event = Event.of(
                    beat,
                    type,
                    view.getFloat32(offset, true),      // pitch
                    view.getFloat32(offset + 4, true)   // dynamic
                );
                offset += 8;
                break;

            default:
                throw new Error(`Unhandled event type: ${ type }`);
        }

        events.push(event);
    }

    return events;
}

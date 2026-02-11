
import { TYPENAMES }      from '../event/types.js';
import { TRANSFORMNUMBERS } from '../event/transforms.js';
import { toRoute, toParamNumber, toTypeName, toParamName, toCurveName } from './address.js';
import Event              from '../event.js';


/**
deserialise(buffer)
Deserialises a Uint8Array binary format to an array of Sequence events.

Event structure: beat(8) | address(2) | length(1) | values(variable)
Address structure: route(2 bits) | name(10 bits) | curve(4 bits)
**/

export default function deserialise(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const events = [];
    let offset = 0;

    while (offset < buffer.length) {
        // Read beat (float64)
        const beat = view.getFloat64(offset, true);
        offset += 8;

        // Read address (uint16)
        const address = view.getUint16(offset, true);
        offset += 2;

        const route = toRoute(address);
        const nameNumber = toParamNumber(address);

        // Read length (uint8)
        const length = buffer[offset];
        offset += 1;

        // Read event data based on route
        let event;

        if (route === 0) {
            // Route 0: sequence control event
            const type = toTypeName(address);
            if (type === undefined) {
                throw new Error(`Unknown event type number: ${ nameNumber }`);
            }

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
        } else if (route === 1) {
            // Route 1: param event
            const paramNumber = nameNumber;
            const curveNumber = toCurveName(address);
            const value = view.getFloat32(offset, true);
            const duration = view.getFloat64(offset + 4, true);
            event = Event.of(beat, 'param', paramNumber, value, curveNumber, duration);
            offset += 12;
        } else {
            throw new Error(`Unknown route: ${ route }`);
        }

        events.push(event);
    }

    return events;
}

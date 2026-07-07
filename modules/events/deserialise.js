
import { TRANSFORMNUMBERS } from '../event/transforms.js';
import { CURVENUMBERS, CURVEBYTES }     from '../event/curves.js';
import { toRoute, toParamNumber, toCurveNumber } from './address.js';
import Event, { TYPENUMBERS, TYPEBYTES } from '../event.js';


/**
deserialise(buffer)
Deserialises a Uint8Array binary format to an array of Sequence events.
Event structure: Float64 beat | Int16 address | data...
Address structure: 2-bit route | 10-bit name | 4-bit curve
**/

export default function deserialise(buffer) {
    const view   = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
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
        const param = toParamNumber(address);

        // Read event data based on route
        switch (route) {
            // Route 0: sequence control event
            case 0:
                switch (param) {
                    case TYPENUMBERS['note']:
                        events.push(Event.of(
                            beat,
                            param,
                            view.getFloat32(offset, true),      // pitch
                            view.getFloat32(offset + 4, true),  // dynamic
                            view.getFloat64(offset + 8, true)   // duration
                        ));
                        offset += 16;
                        break;

                    case TYPENUMBERS['meter']:
                        events.push(Event.of(
                            beat,
                            param,
                            view.getFloat16(offset, true),      // duration
                            view.getFloat16(offset + 2, true)   // divisor
                        ));
                        offset += 4;
                        break;

                    case TYPENUMBERS['chord']:
                        events.push(Event.of(
                            beat,
                            param,
                            buffer[offset],                      // root
                            view.getFloat64(offset + 1, true),   // hsId (harmonic structure id)
                            view.getFloat64(offset + 9, true),   // duration
                            buffer[offset + 17]                  // bass
                        ));
                        offset += 18;
                        break;

                    case TYPENUMBERS['key']:
                        events.push(Event.of(
                            beat,
                            param,
                            view.getInt8(offset)
                        ));
                        offset += 1;
                        break;

                    case TYPENUMBERS['clef']:
                        events.push(Event.of(
                            beat,
                            param,
                            buffer[offset]
                        ));
                        offset += 1;
                        break;

                    // id | target | duration | bytelength | transforms...
                    case TYPENUMBERS['sequence']: {
                        const id       = view.getUint16(offset, true);
                        const target   = view.getUint16(offset + 2, true);
                        const duration = view.getFloat64(offset + 4, true);
                        const bytes    = buffer[offset + 12];
                        const params   = [beat, param, id, target, duration];
                        offset += 13;

                        // Read transforms
                        let o = 0;
                        while (o < bytes) {
                            const number = buffer[offset + o];
                            o += 1;
                            params.push(number);

                            // Read parameters based on transform number
                            switch(number) {
                                case TRANSFORMNUMBERS['displace']:
                                    params.push(view.getFloat64(offset + o, true));
                                    o += 8;
                                    break;

                                case TRANSFORMNUMBERS['rate']:
                                case TRANSFORMNUMBERS['gain']:
                                case TRANSFORMNUMBERS['quantize']:
                                    params.push(view.getFloat32(offset + o, true));
                                    o += 4;
                                    break;

                                case TRANSFORMNUMBERS['transpose']:
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
                    case TYPENUMBERS['text']: {
                        const duration = view.getFloat64(offset, true);
                        const bytes    = buffer[offset + 8];
                        offset += 9;

                        // Get string data
                        const data = buffer.subarray(offset, offset + bytes);
                        events.push(Event.of(
                            beat,
                            param,
                            new TextDecoder().decode(data),
                            duration
                        ));
                        offset += bytes;
                        break;
                    }

                    case TYPENUMBERS['start']:
                    case TYPENUMBERS['stop']:
                        events.push(Event.of(
                            beat,
                            param,
                            view.getFloat32(offset, true),      // pitch
                            view.getFloat32(offset + 4, true)   // dynamic
                        ));
                        offset += 8;
                        break;

                    default: {
                        // Default handler for route 0 events with variable-length encoding (rate, etc.)
                        const curveNumber = toCurveNumber(address);

                        switch (curveNumber) {
                            case CURVENUMBERS['step']:
                            case CURVENUMBERS['linear']:
                            case CURVENUMBERS['exponential']:
                                // step/linear/exponential: value(4) only
                                events.push(Event.of(beat, param, view.getFloat32(offset, true), curveNumber));
                                offset += 4;
                                break;

                            case CURVENUMBERS['target']:
                                // target: value(4) + timeConstant(8)
                                events.push(Event.of(
                                    beat,
                                    param,
                                    view.getFloat32(offset, true),
                                    curveNumber,
                                    view.getFloat64(offset + 4, true)
                                ));
                                offset += 12;
                                break;

                            case CURVENUMBERS['curve']:
                                // curve: duration(8) + bytelength(2) + arraydata(n * 4)
                                const duration = view.getFloat64(offset, true);
                                const bytes    = view.getUint16(offset + 8, true);
                                offset += 10;

                                if (bytes < 8) throw new Error(`Invalid bytes count ${ bytes } (must hold at least 2 * Float32 bytes)`);
                                if (bytes % 4 !== 0) throw new Error(`Invalid bytes count ${ bytes } (must hold n * Float32 bytes)`);

                                // Copy bytes to new aligned buffer and create Float32Array
                                const slice = buffer.slice(offset, offset + bytes);
                                const values = new Float32Array(slice.buffer);
                                offset += bytes;

                                events.push(Event.of(beat, param, values, curveNumber, duration));
                                break;

                            default: // hold/cancel
                                events.push(Event.of(beat, param, undefined, curveNumber));
                                break;
                        }
                        break;
                    }
                }

                break;

            // Route 1: param event
            case 1: {
                const number = toCurveNumber(address);

                switch (number) {
                    case CURVENUMBERS['step']:
                    case CURVENUMBERS['linear']:
                    case CURVENUMBERS['exponential']:
                        // step/linear/exponential: value(4) only
                        events.push(Event.of(beat, 'param', param, view.getFloat32(offset, true), number));
                        offset += 4;
                        break;

                    case CURVENUMBERS['target']:
                        // target: value(4) + timeConstant(8)
                        events.push(Event.of(
                            beat,
                            'param',
                            param,
                            view.getFloat32(offset, true),
                            number,
                            view.getFloat64(offset + 4, true)
                        ));
                        offset += 12;
                        break;

                    case CURVENUMBERS['curve']:
                        // curve: duration(8) + bytelength(2) + arraydata(n * 4)
                        const duration = view.getFloat64(offset, true);
                        const bytes    = view.getUint16(offset + 8, true);
                        offset += 10;

                        if (bytes < 8) throw new Error(`Invalid bytes count ${ bytes } (must hold at least 2 * Float32 bytes)`);
                        if (bytes % 4 !== 0) throw new Error(`Invalid bytes count ${ bytes } (must hold n * Float32 bytes)`);

                        // Copy bytes to new aligned buffer and create Float32Array
                        const slice = buffer.slice(offset, offset + bytes);
                        const values = new Float32Array(slice.buffer);
                        offset += bytes;

                        events.push(Event.of(beat, 'param', param, values, number, duration));
                        break;

                    // hold/cancel
                    default:
                        events.push(Event.of(beat, 'param', param, undefined, number));
                        break;
                }
                break;
            }

            default:
                throw new Error(`Cannot deserialise unknown address ${ route }.${ param }.${ toCurveNumber(address) }`);
        }
    }

    return events;
}

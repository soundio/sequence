
export { default as Event } from './modules/event.js';

import Event         from './modules/event.js';
import Sequence      from './modules/sequence.js';
import parse         from './modules/parse/parse-sequence.js';
import parseMIDI     from './modules/parse/parse-midi.js';
import parseMIDIClip from './modules/parse/parse-midi-clip.js';
import { VERSION }   from './modules/record/serialise.js';
import { toRecord, toATProtoRecord, fromRecord } from './modules/record.js';


const assign = Object.assign;


function isBuffer(data) {
    return data instanceof ArrayBuffer || ArrayBuffer.isView(data);
}

function toView(data) {
    return data instanceof DataView ? data :
        ArrayBuffer.isView(data) ? new DataView(data.buffer, data.byteOffset, data.byteLength) :
        new DataView(data);
}
function fromBuffer(buffer) {
    const view = toView(buffer);
    if (view.byteLength < 8) throw new Error('Sequence.from() unrecognised buffer format');

    const w0 = view.getUint32(0, false);
    const w1 = view.getUint32(4, false);

    // MIDI 2.0 Clip: "SMF2CLIP"
    if (w0 === 0x534D4632 && w1 === 0x434C4950) {
        return parseMIDIClip(view);
    }

    // MIDI 1.0 SMF ("MThd", len >= 6) or RIFF/RMID
    if (
        (w0 === 0x4D546864 && w1 >= 6 && view.byteLength >= 14) ||
        (w0 === 0x52494646 && view.byteLength >= 12 && view.getUint32(8, false) === 0x524D4944)
    )
    {
        return parseMIDI(view);
    }
}

// The Sequence() constructor delegates to Sequence.from() to recursively
// instantiate nested sequences, so Sequence.from() must be overridden to
// provide deserialisation of nested records' events.

const fromData = Sequence.from;

Sequence.from = function from(data) {
    // data is a binary buffer
    return isBuffer(data) ? fromBuffer(data) :
    // events is a Uint8Array
        data.events && data.events instanceof Uint8Array ? fromRecord(data) :
    // events is an ATProto bytes object
        data.events && typeof data.events.$bytes === 'string' ? fromRecord(data) :
    // events is something else
        fromData(data) ;
};

assign(Sequence, {
    /**
    Sequence.version
    Version number for the revision of the sequence spec this Sequence object
    implements.
    **/
    version: VERSION,

    /**
    Sequence.parse(string);
    **/
    parse,

    /**
    Sequence.parseMIDI(string);
    **/
    parseMIDI,

    /**
    Sequence.toRecord(sequence);
    **/
    toRecord,
    toATProtoRecord,

    /**
    Sequence.fromRecord(record);
    **/
    fromRecord
});


assign(Sequence.prototype, {
    /**
    .toRecord()
    **/
    toRecord: function() {
        return toRecord(this);
    },

    /**
    .toString()
    **/
    toString: function() {
        // Top-level sequence header (only if named)
        let string = this.id || this.name ?
            `#${ this.id || '' } ${ this.name || '' }` :
            '' ;

        // Top-level sequence events
        let event, beat, duration;
        for (event of this.events) {
            if (event[0] >= beat + duration) string += '\n';
            while (event[0] >= beat + duration) beat += duration;

            if (Event.isMeter(event)) {
                beat     = event.beat;
                duration = event.duration;
            }

            string += '\n' + event.toString();
        }

        // Sub-sequences
        let sequence;
        if (this.sequences) for (sequence of this.sequences) {
            string += '\n' + sequence.toString();
        }

        return string;
    },
});


export default Sequence;
export { Sequence };

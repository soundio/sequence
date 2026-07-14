
import Sequence      from './sequence.js';
import serialise, { VERSION } from './record/serialise.js';
import deserialise   from './record/deserialise.js';
import validate      from './validate.js';


const assign = Object.assign;


/**
toRecord(sequence)
Creates a storage record from a `sequence`, with `events` serialised to a
`Uint8Array`. Metadata fields are validated against the io.sound.sequence
lexicon. Use `toATProtoRecord()` for the base64-encoded ATProto wire form.
**/

export function toRecord(sequence) {
    const { events, sequences, ...record } = sequence;

    // Create record object from sequence
    assign(record, {
        version: VERSION,
        events: serialise(events)
    });

    // Validate against schema
    validate(record);

    // Assign sequences property if it exists
    if (sequences) record.sequences = sequences.map(toRecord);

    return record;
}


/**
toATProtoRecord(sequence)
Creates an ATProto record object that conforms to the io.sound.sequence
lexicon.
**/

export function toATProtoRecord(sequence) {
    return recordToATProto(toRecord(sequence));
}

// Recursively base64-encode the events of an already-built toRecord() record.
function recordToATProto(record) {
    record.events = { $bytes: record.events.toBase64() };
    if (record.sequences) record.sequences = record.sequences.map(recordToATProto);
    return record;
}


/**
fromRecord(record)
Creates a Sequence from a record object.
**/

export function fromRecord(record) {
    const { version, events, sequences, ...props } = record;

    const bytes = events instanceof Uint8Array ?
        // Support Uint8Array
        events :
        // Support ATProto record 64-bit encoding objects
        Uint8Array.fromBase64(events.$bytes) ;

    switch (version) {
        case VERSION:
            return assign(new Sequence(deserialise(bytes), sequences), props);
        default:
            throw new Error(`Cannot decode Sequence record version ${ version }`);
    }
}

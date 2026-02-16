
import Sequence    from './sequence.js';
import deserialise from './events/deserialise.js';
import serialise   from './events/serialise.js';
import lexicon     from '../lexicons/io.sound.sequence.json' with { type: 'json' };


const assign  = Object.assign;
const schema  = lexicon.defs.main.record.properties;


export const VERSION = 0;


/**
toRecord(sequence)
Creates an ATProto record object that conforms to the io.sound.sequence
lexicon.
**/

export function toRecord(sequence) {
    // Validate against schema
    //validate(schema, this);

    // Create record object from sequence
    const record = assign({}, sequence, {
        version: VERSION,
        events: { $bytes: serialise(sequence.events).toBase64() }
    });

    // Assign sequences property if it exists
    if (sequence.sequences) {
        record.sequences = sequence.sequences.map(toRecord);
    }

    return record;
}


/**
fromRecord(record)
Creates a Sequence from an ATProto record object conforming to the
io.sound.sequence lexicon.
**/

export function fromRecord(record) {
    const { version, events, sequences, ...props } = record;
    if (version !== VERSION) throw new Error(`Cannot decode record version ${ version } with decoder version ${ VERSION }`);
    const bytes = Uint8Array.fromBase64(events.$bytes);
    return assign(new Sequence(deserialise(bytes), sequences), props);
};

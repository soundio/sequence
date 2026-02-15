import Sequence    from './modules/sequence.js';
import deserialise from './modules/events/deserialise.js';
import serialise, { VERSION } from './modules/events/serialise.js';
//import lexicon from '../lexicons/io.sound.sequence.json' with { type: 'json' };


const assign = Object.assign;
//const schema = lexicon.defs.main.record.properties;


/**
Sequence.fromRecord(record);
**/

// The Sequence() constructor delegates to Sequence.from() to recursively
// instantiate nested sequences, so Sequence.from() must be overridden to
// provide deserialisation of record events.

Sequence.from = function from(data) {
    // data is an events array
    if (data.length) return new Sequence(data);
    // data is a record
    if (data.events instanceof Uint8Array) return Sequence.fromRecord(data);
    // data is an object
    const { events, sequences, ...props } = data;
    return assign(new Sequence(events, sequences), props);
};

Sequence.fromRecord = function fromRecord(record) {
    const { events, sequences, ...props } = record;
    return assign(new Sequence(deserialise(events), sequences), record);
};


/**
Sequence.toRecord(sequence);
**/

//function validate(schema, object) {}

Sequence.toRecord = function toRecord(sequence) {
    // Validate against schema
    //validate(schema, this);

    return assign({}, sequence, {
        version:   VERSION,
        events:    serialise(sequence.events),
        sequences: sequence.sequences ? sequence.sequences.map(toRecord) : undefined
    });
};

/**
.toRecord()
**/

Sequence.prototype.toRecord = function() {
    return Sequence.toRecord(this);
};

export default Sequence;

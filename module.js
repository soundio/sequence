import Event       from './modules/event.js';
import Sequence    from './modules/sequence.js';
import deserialise from './modules/events/deserialise.js';
import serialise, { VERSION } from './modules/events/serialise.js';
//import lexicon from '../lexicons/io.sound.sequence.json' with { type: 'json' };


const assign = Object.assign;
//const schema = lexicon.defs.main.record.properties;

/**
Sequence.version
A version number for the revision of the sequence spec this Sequence object
implements.
**/
Sequence.version = VERSION;


/**
Sequence.fromRecord(record);
**/

// The Sequence() constructor delegates to Sequence.from() to recursively
// instantiate nested sequences, so Sequence.from() must be overridden to
// provide deserialisation of record events.

const from = Sequence.from;

Sequence.from = function from(data) {
    // data is a record
    return data.events && data.events instanceof Uint8Array ?
        Sequence.fromRecord(data) :
        from(data) ;
};

Sequence.fromRecord = function fromRecord(record) {
    const { events, sequences, ...props } = record;
    return assign(new Sequence(deserialise(events), sequences), props);
};


/**
Sequence.toRecord(sequence);
**/

//function validate(schema, object) {}

Sequence.toRecord = function toRecord(sequence) {
    // Validate against schema
    //validate(schema, this);

    return assign({}, sequence, {
        version:   Sequence.version,
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


export { Event, Sequence };

import Event       from './modules/event.js';
import Sequence    from './modules/sequence.js';
import { toRecord, fromRecord, validateRecord, VERSION } from './modules/record.js';

const assign = Object.assign;


/**
Sequence.version
Version number for the revision of the sequence spec this Sequence object
implements.
**/

/**
Sequence.fromRecord(record);
**/

/**
Sequence.toRecord(sequence);
**/

// The Sequence() constructor delegates to Sequence.from() to recursively
// instantiate nested sequences, so Sequence.from() must be overridden to
// provide deserialisation of nested records' events.

const fromData = Sequence.from;

Sequence.from = function from(data) {
    return data.events && typeof data.events.$bytes === 'string' ?
        fromRecord(data) :
        fromData(data) ;
};

assign(Sequence, {
    version: VERSION,
    toRecord,
    fromRecord,
    validateRecord
});


/**
.toRecord()
**/

assign(Sequence.prototype, {
    toRecord: function() {
        return toRecord(this);
    }
});


export { Event, Sequence };

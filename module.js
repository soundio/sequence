import Event         from './modules/event.js';
import Sequence      from './modules/sequence.js';
import parse         from './modules/parse/parse-sequence.js';
import { VERSION }   from './modules/record/serialise.js';
import { toRecord, toATProtoRecord, fromRecord } from './modules/record.js';


const assign = Object.assign;


/**
Sequence.version
Version number for the revision of the sequence spec this Sequence object
implements.
**/

/**
Sequence.parse(string);
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
    // events is a Uint8Array
    return data.events && data.events instanceof Uint8Array ? fromRecord(data) :
    // events is an ATProto bytes object
        data.events && typeof data.events.$bytes === 'string' ? fromRecord(data) :
    // events is something else
        fromData(data) ;
};

assign(Sequence, {
    version: VERSION,
    parse,
    toRecord,
    toATProtoRecord,
    fromRecord
});


/**
.toRecord()
**/

assign(Sequence.prototype, {
    toRecord: function() {
        return toRecord(this);
    },

    toString: function() {
        // Top-level sequence header (only if named)
        let string = this.id || this.name ?
            `#${ this.id || '' } ${ this.name || '' }` :
            '' ;

        // Top-level sequence events
        let event;
        for (event of this.events) {
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


export { Event, Sequence };

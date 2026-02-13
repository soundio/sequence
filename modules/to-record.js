
import serialise, { VERSION } from './events/serialise.js';
//import lexicon from '../lexicons/io.sound.sequence.json' with { type: 'json' };


const assign = Object.assign;


export default function toRecord(sequence) {
    // Validate against schema
    //validate(lexicon.defs.main.record.properties, this);

    return assign({}, sequence, {
        version:   VERSION,
        events:    serialise(sequence.events),
        sequences: sequence.sequences ? sequence.sequences.map(toRecord) : undefined
    });
}

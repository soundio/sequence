
import id            from 'fn/id.js';
import get           from 'fn/get.js';
import overload      from 'fn/overload.js';
import Sequence      from './sequence.js';
import deserialise   from './events/deserialise.js';
import serialise     from './events/serialise.js';
import ioSoundSequence from '../lexicons/io.sound.sequence.json' with { type: 'json' };
import ioSoundCredit   from '../lexicons/io.sound.credit.json' with { type: 'json' };


const assign         = Object.assign;
const sequenceSchema = ioSoundSequence.defs.main.record;
const creditSchema   = ioSoundCredit.defs.main;


// Lexicon validation

// RFC 3339 / ISO 8601 with uppercase T and required timezone
const rdatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// Basic structure check: at://authority[/collection[/rkey]]
const raturi = /^at:\/\/[^/\s]+(\/([\w.-]+)(\/[\w.-]+)?)?$/;

// Handle validation: max 253 chars, specific format
const rhandle = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// NSID validation: max 317 chars, specific format
const rnsid = /^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/;

// Check for disallowed TLDs
const disallowedTlds = ['alt', 'arpa', 'example', 'internal', 'invalid', 'local', 'localhost', 'onion'];

// Grapheme counter using Intl.Segmenter
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
function countGraphemes(str) {
    return [...graphemeSegmenter.segment(str)].length;
}

// Byte counter using TextEncoder
const textEncoder = new TextEncoder();
function countBytes(str) {
    return textEncoder.encode(str).byteLength;
}

// String format validators
const validateFormat = overload(id, {
    datetime: (format, name, value) => {
        if (!rdatetime.test(value)) throw new Error(`Record "${ name }" invalid datetime format "${ value }"`);
        if (value.includes('t') || (value.endsWith('z') && !value.endsWith('Z'))) throw new Error(`Record "${ name }" datetime must use uppercase T and Z`);
    },

    uri: (format, name, value) => {
        if (countBytes(value) > 8192) throw new Error(`Record "${ name }" URI exceeds 8KB maximum`);
        try { new URL(value); } catch(e) { throw new Error(`Record "${ name }" ${ e.message }`); }
    },

    'at-uri': (format, name, value) => {
        if (countBytes(value) > 8192) throw new Error(`Record "${ name }" AT URI exceeds 8KB maximum`);
        if (!value.startsWith('at://')) throw new Error(`Record "${ name }" AT URI must start with at://`);
        if (!raturi.test(value)) throw new Error(`Record "${ name }" invalid AT URI format`);
    },

    handle: (format, name, value) => {
        if (value.length > 253) throw new Error(`Record "${ name }" handle exceeds 253 characters`);
        if (!rhandle.test(value)) throw new Error(`Record "${ name }" invalid handle format`);

        // Check for disallowed TLDs
        const tld = value.split('.').pop().toLowerCase();
        if (disallowedTlds.includes(tld)) throw new Error(`Record "${ name }" handle has disallowed TLD "${ tld }"`);
    },

    nsid: (format, name, value) => {
        if (value.length > 317) throw new Error(`Record "${ name }" NSID "${ value }" exceeds 317 characters`);
        if (!rnsid.test(value)) throw new Error(`Record "${ name }" Invalid NSID format "${ value }"`);
    }
});

const validateRule = overload(get('type'), {
    boolean: (rule, name, value) => {
        if (typeof value !== 'boolean') throw new Error(`Record "${ name }" not of type "boolean"`);
        if (rule.const !== undefined && value !== rule.const) throw new Error(`Record "${ name }" must be ${ rule.const }`);
    },

    integer: (rule, name, value) => {
        if (!Number.isInteger(value)) throw new Error(`Record "${ name }" not of type "integer" but type "${ typeof value }"`);
        if (rule.minimum !== undefined && value < rule.minimum) throw new Error(`Record "${ name }" is ${ value }, minimum ${ rule.minimum }`);
        if (rule.maximum !== undefined && value > rule.maximum) throw new Error(`Record "${ name }" is ${ value }, maximum ${ rule.maximum }`);
        if (rule.enum && !rule.enum.includes(value)) throw new Error(`Record "${ name }" must be one of [${ rule.enum.join(', ') }]`);
    },

    string: (rule, name, value) => {
        if (typeof value !== 'string') throw new Error(`Record "${ name }" not of type "string"`);
        if (rule.minLength && countBytes(value) < rule.minLength) throw new Error(`Record "${ name }" has ${ countBytes(value) } bytes, minimum ${ rule.minLength }`);
        if (rule.maxLength && countBytes(value) > rule.maxLength) throw new Error(`Record "${ name }" has ${ countBytes(value) } bytes, maximum ${ rule.maxLength }`);
        if (rule.minGraphemes && countGraphemes(value) < rule.minGraphemes) throw new Error(`Record "${ name }" has ${ countGraphemes(value) } graphemes, minimum ${ rule.minGraphemes }`);
        if (rule.maxGraphemes && countGraphemes(value) > rule.maxGraphemes) throw new Error(`Record "${ name }" has ${ countGraphemes(value) } graphemes, maximum ${ rule.maxGraphemes }`);
        if (rule.format) validateFormat(rule.format, name, value);
    },

    bytes: (rule, name, value) => {
        if (!(value && typeof value === 'object' && '$bytes' in value)) throw new Error(`Record "${ name }" not of type "bytes"`);
        if (typeof value.$bytes !== 'string') throw new Error(`Record "${ name }".$bytes must be a string`);
        const approxBytes = value.$bytes.length * 0.75;
        if (rule.minLength && approxBytes < rule.minLength) throw new Error(`Record "${ name }" has ${ Math.floor(approxBytes) } bytes, minimum ${ rule.minLength }`);
        if (rule.maxLength && approxBytes > rule.maxLength) throw new Error(`Record "${ name }" has ${ Math.floor(approxBytes) } bytes, maximum ${ rule.maxLength }`);
    },

    array: (rule, name, value) => {
        if (!Array.isArray(value)) throw new Error(`Record "${ name }" not of type "array"`);
        if (rule.minLength && value.length < rule.minLength) throw new Error(`Record "${ name }" has ${ value.length } items, minimum ${ rule.minLength }`);
        if (rule.maxLength && value.length > rule.maxLength) throw new Error(`Record "${ name }" has ${ value.length } items, maximum ${ rule.maxLength }`);
        if (rule.items) value.forEach((item, index) => {
            validateRule(rule.items, `${ name }[${ index }]`, item);
        });
    },

    object: (rule, name, value) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Record "${ name }" not of type "object"`);
        validateObject(rule, value);
    },

    ref: (rule, name, value) => {
        switch (rule.ref) {
            case 'io.sound.sequence': validateObject(sequenceSchema, value); break;
            case 'io.sound.credit':   validateObject(creditSchema, value); break;
            default: console.log(`External schema ref ${ rule.ref } not validated`);
        }
    }
});

function validateRequired(required = [], data) {
    let name;
    for (name of required) if (!(name in data)) {
        throw new Error(`Record missing required "${ name }" property`);
    }
}

function validateObject(schema, data) {
    const { type, required, properties } = schema;
    if (type !== 'object') throw new Error(`Attempting to validate object with schema of type "${ type }"`);

    validateRequired(required, data);

    let name, rule;
    for (name in data) {
        // Skip properties with no validation rule
        if (!(name in properties)) continue;
        rule = properties[name];
        validateRule(rule, name, data[name]);
    }
}


/**
VERSION
**/

export const VERSION = 0;


/**
validateRecord(record)
Validates an 'io.sound.sequence' record.
**/

export function validateRecord(record) {
    return validateObject(sequenceSchema, record);
}


/**
toRecord(sequence)
Creates an ATProto record object that conforms to the io.sound.sequence
lexicon.
**/

export function toRecord(sequence) {
    const { events, sequences, ...record } = sequence;

    // Create record object from sequence
    assign(record, {
        version: VERSION,
        events: { $bytes: serialise(events).toBase64() }
    });

    // Validate against schema
    validateRecord(record);

    // Assign sequences property if it exists
    if (sequences) record.sequences = sequences.map(toRecord);

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

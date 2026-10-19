/*
parseSequence(string)

Takes a string of text and parses it as a Sequence. Sequence text is in the format:

```
 # Sequence name
 0 key C
 0 meter 4/4
 0 rate 1.8
 0 sequence 1 piano 4
 0 sequence 2 bass
 4 sequence 1 piano
 3 chord Dm7
 4 chord G∆

 #1 Sequence id 1 name
 0 note 69 mp 1
 1 B4 mf 1
 2 C5 2
 4 F5 3
 4 D#5 3
 7 G♯5 1
 7 E♭5 1

 #2
 2 C2 0.34 1
 3 G2 0.33 5
 4 control modulation 0.1
 5 control modulation.set 0.2
 6 control modulation.exponential 0.3
 7 control modulation.linear 0.4
 9.75 control modulation.target 1 4
```

1. Events, and sequence names, are separated by (any number of) new lines
2. Lines may have any amount of spaces or tabs at the start
3. Having a name is entirely optional
4. For the top-level sequence, having an id is also entirely optional. The top-level sequence does not have to have a '#' line at all
5. Events may not be authored in beat order. (Normally they are sorted by the Sequence constructor so this is not an issue).
6. Sequence events not given duration are assumed to have a duration up to the end of the last event in the sequence they identify.
7. Note events are not required to be written with type 'note' where they use a pitch name (this includes drum and percussion pitch names).
8. Note events without dynamic information are assigned a gain of 0.1 (-20dB) by default.
9. Chord events without an explicit duration are assumed to have duration 4.

*/

import Sequence from '../sequence.js';
import { toCurveNumber } from '../event/curves.js';


const DEBUG   = globalThis.DEBUG;
const rdata   = /^[A-G](?:bb|##|[𝄫𝄪♭♯#b])?/u;
const rheader = /^#\s*(?:(\d+)\s*)?(.*)$/;
const rline   = /[^\S\r\n]*(.*?)[^\S\r\n]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/gy;


/**
grammar
Declarative event parsers. Each handler receives (beat, args) and returns
a Sequence JSON event tuple. Custom event types can be added or overridden.
**/
export const grammar = {
    key(beat, [name]) {
        return [beat, 'key', name];
    },

    meter(beat, [sigOrDur = '4/4', div]) {
        if (typeof sigOrDur === 'string' && sigOrDur.includes('/')) {
            const [num, den] = sigOrDur.split('/').map(Number);
            const d = 4 / (den || 4);
            return [beat, 'meter', (num || 4) * d, d];
        }
        return [beat, 'meter', Number(sigOrDur) || 4, Number(div) || 1];
    },

    rate(beat, [first = '1', second, third]) {
        const val = Number(first);
        if (Number.isNaN(val)) {
            // First arg is curve name (e.g. "linear", "exponential")
            return [beat, 'rate', toCurveNumber(first), Number(second) || 0, Number(third) || 0];
        }
        // Default rate event with curve = 0 (step)
        return [beat, 'rate', 0, val];
    },

    sequence(beat, [id = 0, target = '', dur, ...transforms]) {
        let duration = 0;
        let xforms = transforms;

        if (dur !== undefined) {
            const num = Number(dur);
            if (!Number.isNaN(num)) {
                duration = num;
            } else {
                // dur is actually the first transform parameter
                xforms = [dur, ...transforms];
            }
        }

        const parsedTransforms = xforms.map((t) => (Number.isNaN(Number(t)) ? t : Number(t)));
        return [beat, 'sequence', Number(id) || 0, target, duration, ...parsedTransforms];
    },

    chord(beat, [symbol = 'C', extOrDur, maybeDur]) {
        let data = symbol;
        let extension = '';
        let duration = 4;

        const match = rdata.exec(symbol);
        if (match) {
            data = match[0];
            extension = symbol.slice(data.length);
        }

        if (extOrDur !== undefined) {
            const num = Number(extOrDur);
            if (Number.isNaN(num)) {
                if (!extension) extension = extOrDur;
                if (maybeDur !== undefined && !Number.isNaN(Number(maybeDur))) {
                    duration = Number(maybeDur);
                }
            } else {
                duration = num;
            }
        }

        return [beat, 'chord', data, extension, duration];
    },

    control(beat, [address = 'gain.set', value = 0, duration = 0]) {
        const addr = address.includes('.') ? address : `${ address }.set`;
        const val = Number(value) || 0;
        const dur = Number(duration) || 0;
        return dur ? [beat, 'control', addr, val, dur] : [beat, 'control', addr, val];
    },

    note(beat, [pitch = 60, arg1, arg2]) {
        const p = !Number.isNaN(Number(pitch)) ? Number(pitch) : pitch;
        let gain = 0.1;
        let duration = 1;

        if (arg1 !== undefined && arg2 === undefined) {
            const d = Number(arg1);
            if (!Number.isNaN(d)) duration = d;
        } else if (arg1 !== undefined && arg2 !== undefined) {
            const g = Number(arg1);
            gain = Number.isNaN(g) ? arg1 : g;
            const d = Number(arg2);
            if (!Number.isNaN(d)) duration = d;
        }

        return [beat, 'note', p, gain, duration];
    },

    text(beat, [dur = 1, ...words]) {
        return [beat, 'text', Number(dur) || 1, words.join(' ')];
    }
};


/**
parseSequence(source)
Parses sequence text directly into a Sequence object instance.
**/

export default function parseSequence(source) {
    rline.lastIndex = 0;

    const data = {
        events: []
    };

    let sequence  = data;
    let lineIndex = 0;
    let match;

    while (rline.lastIndex < source.length && (match = rline.exec(source))) {
        lineIndex++;
        const line = match[1];
        if (!line) continue;

        // Sequence section header
        if (line.startsWith('#')) {
            const match = rheader.exec(line);
            const id    = match[1] ? parseInt(match[1], 10) : undefined;
            const name  = match[2]?.trim() || undefined;

            if (id === undefined && sequence === data && data.events.length === 0) {
                if (name) data.name = name;
            }
            else {
                sequence = { id, events: [] };
                if (name) sequence.name = name;
                (data.sequences || (data.sequences = [])).push(sequence);
            }

            continue;
        }

        // Event line: <beat> <type | pitch> <args...>
        const tokens = line.match(/\S+/g);
        if (!tokens || tokens.length === 0) continue;

        const beat = Number(tokens[0]);
        if (Number.isNaN(beat)) {
            if (DEBUG) console.warn(`Invalid beat on line ${ lineIndex }: "${ line }"`);
            continue;
        }

        const type  = tokens[1];
        const args  = tokens.slice(2);
        const event = grammar[type] ?
            // Where type is given find the right parser in grammar
            grammar[type](beat, args) :
            // Where type is not given type is assumed to be a pitch string
            grammar.note(beat, [type, ...args]) ;

        sequence.events.push(event);
    }

    return Sequence.from(data);
}

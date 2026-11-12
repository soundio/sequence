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

 #1 Sub sequence (id1) name
 0 note 69 mp 1
 1 B4 mf 1
 2 C5 2
 4 F5 3
 4 D#5 3
 7 G♯5 1
 7 E♭5 1

 #2
 2 C2 0.34 1      // The format supports comments
 3 G2 0.33 5
 4 control modulation 0.1
 5 control modulation.set 0.2
 6 control modulation.exponential 0.3
 7 control modulation.linear 0.4
 9.75 control modulation.target 1 4
```

- Events, and sequence names, are separated by (any number of) new lines
- Lines may have any amount of spaces or tabs at the start
- The first sequence is the top-level sequence, where `#`, id, and name are optional
- A `#id` (optionally followed by a name) declares a new child sequence
- Events do not have to be authored in beat order
- Sequence events not given duration are assumed to have a duration up to the end of the last event in the sequence they identify
- Note events are not required to be written with type 'note' where they use a pitch name, including drum and percussion pitch names
- Note events without dynamic information are assigned a gain of 0.1 (-20dB) by default
- Chord events without an explicit duration are assumed to have duration 2

*/

import Event    from '../event.js';
import Sequence from '../sequence.js';


const DEBUG   = globalThis.DEBUG;
const rheader = /^#\s*(?:(\d+)\s*)?(.*)$/;
const rline   = /[^\S\r\n]*(.*?)[^\S\r\n]*(?:\|[^\S\r\n]*(.*?)[^\S\r\n]*)?(?:\/\/[^\r\n]*)?(?:\r?\n|$)/gy;


/**
grammar
Declarative event parsers. Each handler receives (beat, args) and returns
an Event instance. Custom event types can be added or overridden.
**/
export const grammar = {
    key(beat, [name]) {
        return Event.key(beat, name);
    },

    meter(beat, [timesig = '4/4']) {
        return new Event.MeterEvent({ beat, timesig });
    },

    rate(beat, [first = 1, second, third]) {
        return Number.isNaN(Number(first)) ?
            // First arg is curve name (e.g. "linear", "exponential")
            Event.rate(beat, first, second, third) :
            // Default rate event with curve = 0 (step)
            Event.rate(beat, 0, first) ;
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
        return Event.sequence(beat, id, target, duration, ...parsedTransforms);
    },

    chord(beat, [symbol = 'C', duration = 2]) {
        return Event.chord(beat, symbol, Number(duration));
    },

    control(beat, [address = 'gain', value = 0, duration = 0]) {
        return Event.control(beat, address, Number(value), Number(duration));
    },

    note(beat, [pitch = 60, arg1, arg2]) {
        const p = !Number.isNaN(Number(pitch)) ? Number(pitch) : pitch;
        return arg2 === undefined ?
            Event.note(beat, p, 0.1, arg1 ?? 1) :
            Event.note(beat, p, arg1, arg2) ;
    },

    text(beat, [dur = 1, ...words]) {
        return Event.text(beat, dur, words.join(' '));
    }
};


/**
parseSequence(source)
Parses sequence text directly into a Sequence object instance.
**/

export default function parseSequence(source) {
    rline.lastIndex = 0;

    const root = Sequence.of();

    let sequence  = root;
    let lineIndex = 0;
    let match;

    while (rline.lastIndex < source.length && (match = rline.exec(source))) {
        lineIndex++;
        const line  = match[1];
        const label = match[2];
        if (!line) continue;

        // Sequence section header
        if (line.startsWith('#')) {
            const match = rheader.exec(line);
            const id    = match[1] ? parseInt(match[1], 10) : undefined;
            const name  = match[2]?.trim() || undefined;

            if (id === undefined && sequence === root && root.events.length === 0) {
                if (name) root.name = name;
            }
            else {
                sequence = Sequence.of();
                if (id !== undefined) sequence.id = id;
                if (name) sequence.name = name;
                root.addSequence(sequence);
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

        if (label) event.label = label;
        sequence.add(event);
    }

    return root;
}

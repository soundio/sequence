
import run from 'fn/test.js';
import importMusicXML from '../modules/parse/parse-music-xml.js';
import Sequence from '../modules/sequence.js';


// Test Chant.musicxml - simple single-part Gregorian chant
const chantXML = await Deno.readTextFile('xmlsamples/Chant.musicxml');

run('importMusicXML() - Chant.musicxml', [{
    "name": "Quem queritis",
    "hasValidSequenceEvent": true,
    "sequenceEventLength": 5
}], (test, done) => {
    const sequence = importMusicXML(chantXML);

    // Find sequence event
    const sequenceEvent = sequence.events.find(e => e[1] === 'sequence');

    // Test structure
    test({
        name: sequence.name,
        hasValidSequenceEvent: sequenceEvent && sequenceEvent[3] !== undefined && sequenceEvent[4] !== undefined,
        sequenceEventLength: sequenceEvent ? sequenceEvent.length : 0
    });

    // Verify it's a Sequence instance
    if (!(sequence instanceof Sequence)) {
        console.error('Not a Sequence instance');
    }

    // Verify has notes
    const partSeq = sequence.sequences.find(s => s.id.includes('P1'));
    if (!partSeq) {
        console.error('No part sequence found');
    } else {
        const noteEvents = partSeq.events.filter(e => e[1] === 'note');
        if (noteEvents.length !== 27) {
            console.error(`Expected 27 notes, got ${noteEvents.length}`);
        }
    }

    done();
});


// Test BeetAnGeSample.musicxml - Piano/voice multi-part piece
const beethovenXML = await Deno.readTextFile('xmlsamples/BeetAnGeSample.musicxml');

run('importMusicXML() - BeetAnGeSample.musicxml structure', [{
    name: "An die ferne Geliebte (Page 1)",
    hasKeyEvent: true,
    hasMeterEvent: true,
    hasSequenceEvent: true,
    hasTwoParts: true,
    partNamesPresent: true
}], (test, done) => {
    const sequence = importMusicXML(beethovenXML);

    const keyEvent = sequence.events.find(e => e[1] === 'key');
    const meterEvent = sequence.events.find(e => e[1] === 'meter');
    const sequenceEvent = sequence.events.find(e => e[1] === 'sequence');

    // Find part sequences (not section sequences)
    const partSequences = sequence.sequences.filter(s => s.id.includes('P'));

    test({
        name: sequence.name,
        hasKeyEvent: !!keyEvent,
        hasMeterEvent: !!meterEvent,
        hasSequenceEvent: !!sequenceEvent,
        hasTwoParts: partSequences.length === 2,
        partNamesPresent: partSequences.every(s => s.name)
    });

    done();
});


// Test Binchois.musicxml - 4-part Renaissance polyphony
const binchoisXML = await Deno.readTextFile('xmlsamples/Binchois.musicxml');

run('importMusicXML() - Binchois.musicxml multi-part', [{
    hasMultipleParts: true,
    allPartsHaveNotes: true,
    isSequenceInstance: true
}], (test, done) => {
    const sequence = importMusicXML(binchoisXML);

    const partSequences = sequence.sequences.filter(s => s.id.includes('P'));
    const allPartsHaveNotes = partSequences.every(part =>
        part.events.some(e => e[1] === 'note')
    );

    test({
        hasMultipleParts: partSequences.length > 1,
        allPartsHaveNotes: allPartsHaveNotes,
        isSequenceInstance: sequence instanceof Sequence
    });

    done();
});


// Test iteration works on real files
const chantSequence = importMusicXML(chantXML);

run('importMusicXML() - iteration over Chant sequence', [{
    canIterateMain: true,
    canIteratePart: true,
    hasNotes: true
}], (test, done) => {
    let mainEventCount = 0;

    // Iterate over main sequence (flattens sub-sequences)
    for (const event of chantSequence) {
        mainEventCount++;
    }

    // Get part sequence directly
    const partSeq = chantSequence.sequences.find(s => s.id.includes('P1'));
    let partEventCount = 0;
    let hasNotes = false;

    for (const event of partSeq) {
        partEventCount++;
        if (event[1] === 'note') hasNotes = true;
    }

    test({
        canIterateMain: mainEventCount > 0,
        canIteratePart: partEventCount > 0,
        hasNotes: hasNotes
    });

    done();
});

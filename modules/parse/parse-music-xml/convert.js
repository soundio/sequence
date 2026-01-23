
/**
convertToEvents(parts, sections)
Converts MusicXML parts and sections to Sequence JSON events.

Returns object with:
- mainEvents: Array of events for main sequence
- sequences: Array of nested section/part sequences
**/

import { toNoteNumber } from 'midi/note.js';
import parseGain from '../../parse/parse-gain.js';
import toGain from 'fn/to-gain.js';
import dB from 'fn/to-db.js';
import { fifthsToKeyName } from '../../pitch.js';
import { clefToName } from './clef.js';


/**
Helpers for dB/gain conversion
**/

function interpolateDb(startDb, endDb, position, duration) {
    // Linear interpolation in dB space
    return startDb + (position / duration) * (endDb - startDb);
}


/**
convertToEvents(parts, sections)
Main conversion function.
**/

export default function convertToEvents(parts, sections) {
    const sequences = [];
    const mainEvents = [];

    // Extract initial attributes from first measure of first part
    const firstMeasure = parts[0]?.measures[0];
    if (firstMeasure) {
        // Initial key
        if (firstMeasure.key) {
            const keyName = fifthsToKeyName(firstMeasure.key.fifths);
            mainEvents.push([0, 'key', keyName]);
        }

        // Initial tempo (rate event)
        if (firstMeasure.tempo) {
            const rate = firstMeasure.tempo / 60; // Convert BPM to beats per second
            mainEvents.push([0, 'rate', rate]);
        }

        // Initial meter
        if (firstMeasure.time) {
            const duration = (firstMeasure.time.beats / firstMeasure.time.beatType) * 4; // Duration in quarter notes
            const division = 4 / firstMeasure.time.beatType; // Division in quarter notes
            mainEvents.push([0, 'meter', duration, division]);
        }
    }

    // Generate section sequences
    let sectionBeat = 0;
    sections.forEach((section, sectionIndex) => {
        const sectionId = `section-${sectionIndex}`;
        const sectionSequence = {
            id: sectionId,
            events: []
        };

        // Generate part sequences for this section
        const partSequences = [];
        const sectionClefChanges = [];
        parts.forEach((part, partIndex) => {
            const partId = `${sectionId}-${part.id}`;
            const { events: partEvents, clefChanges } = convertPartMeasures(
                part.measures,
                section.start,
                section.end
            );

            // Collect clef changes for section
            clefChanges.forEach(([beat, clefName]) => {
                // Only add if not already present at this beat
                if (!sectionClefChanges.some(([b, c]) => b === beat && c === clefName)) {
                    sectionClefChanges.push([beat, clefName]);
                }
            });

            if (partEvents.length > 0) {
                partSequences.push({
                    id: partId,
                    name: part.name,
                    events: partEvents
                });
            }
        });

        // Calculate section duration (needed for scheduling)
        const sectionDuration = calculateSectionDuration(
            parts[0].measures,
            section.start,
            section.end
        );

        // Add clef events to section sequence (before scheduling part sequences)
        sectionClefChanges.forEach(([beat, clefName]) => {
            sectionSequence.events.push([beat, 'clef', clefName]);
        });

        // Schedule part sequences from section sequence
        // All parts play simultaneously from beat 0 with full section duration
        partSequences.forEach(partSeq => {
            sectionSequence.events.push([0, 'sequence', partSeq.id, 0, sectionDuration]);
            sequences.push(partSeq);
        });

        // Schedule section from main sequence
        mainEvents.push([sectionBeat, 'sequence', sectionId, 0, sectionDuration]);
        sectionBeat += sectionDuration;

        sequences.push(sectionSequence);
    });

    return { mainEvents, sequences };
}


/**
convertPartMeasures(measures, startNum, endNum)
Converts a range of measures from a single part to Sequence events.
Returns { events, clefChanges } where clefChanges is array of [beat, clefName].
**/

function convertPartMeasures(measures, startNum, endNum) {
    const events = [];
    const clefChanges = [];
    let currentBeat = 0;
    let currentDivisions = 1;
    let currentDynamic = 0.1; // Default dynamic (-20dB)

    // Filter measures in this section
    const sectionMeasures = measures.filter(m =>
        m.number >= startNum && m.number <= endNum
    );

    // PASS 1: Process all directions to build complete wedge list
    let activeWedge = null;
    const completedWedges = [];

    currentBeat = 0;
    sectionMeasures.forEach(measure => {
        // Update divisions if changed
        if (measure.divisions !== undefined) {
            currentDivisions = measure.divisions;
        }

        // Process directions (dynamics and wedges)
        if (measure.directions && measure.directions.length > 0) {
            measure.directions.forEach(direction => {
                if (direction.type === 'dynamic') {
                    // Update current dynamic
                    try {
                        currentDynamic = parseGain(direction.marking);
                    } catch (e) {
                        console.warn('Failed to parse dynamic:', direction.marking, e);
                    }
                } else if (direction.type === 'wedge') {
                    if (direction.wedgeType === 'crescendo' || direction.wedgeType === 'diminuendo') {
                        // Start a new wedge
                        activeWedge = {
                            startBeat: currentBeat,
                            startDb: dB(currentDynamic),
                            type: direction.wedgeType
                        };
                    } else if (direction.wedgeType === 'stop' && activeWedge) {
                        // Complete the wedge
                        completedWedges.push({
                            startBeat: activeWedge.startBeat,
                            endBeat: currentBeat,
                            startDb: activeWedge.startDb,
                            endDb: dB(currentDynamic)
                        });
                        activeWedge = null;
                    }
                }
            });
        }

        // Advance to next measure
        const measureDuration = calculateMeasureDuration(measure, currentDivisions);
        currentBeat += measureDuration;
    });

    // PASS 2: Process notes and apply wedge interpolation
    currentBeat = 0;
    currentDivisions = 1;
    currentDynamic = 0.1;
    let currentClef = null;

    sectionMeasures.forEach(measure => {
        // Update divisions if changed
        if (measure.divisions !== undefined) {
            currentDivisions = measure.divisions;
        }

        // Track clef changes
        if (measure.clef) {
            const clefName = clefToName(measure.clef);
            if (clefName && clefName !== currentClef) {
                clefChanges.push([currentBeat, clefName]);
                currentClef = clefName;
            }
        }

        // Update current dynamic from directions
        if (measure.directions && measure.directions.length > 0) {
            measure.directions.forEach(direction => {
                if (direction.type === 'dynamic') {
                    try {
                        currentDynamic = parseGain(direction.marking);
                    } catch (e) {
                        console.warn('Failed to parse dynamic:', direction.marking, e);
                    }
                }
            });
        }

        // Track cursor position within measure
        const measureCursor = new MeasureCursor(currentDivisions);

        // Convert harmonies to chord events
        measure.harmonies.forEach(harmony => {
            const chordBeat = currentBeat + measureCursor.position;
            events.push([
                chordBeat,
                'chord',
                harmony.root,
                harmony.extension,
                4 // Default duration of 4 beats (1 bar in 4/4)
            ]);
        });

        // Convert notes to note events
        // Group notes by cursor position for chord detection
        const noteGroups = [];
        let currentGroup = [];

        measure.notes.forEach(note => {
            if (note.isChord) {
                // Part of previous note's chord
                currentGroup.push(note);
            } else {
                // Start of new note/chord
                if (currentGroup.length > 0) {
                    noteGroups.push({
                        beat: measureCursor.position,
                        notes: currentGroup
                    });
                    // Advance cursor by duration of first note in group
                    measureCursor.advance(currentGroup[0].duration);
                }
                currentGroup = [note];
            }
        });

        // Push final group
        if (currentGroup.length > 0) {
            noteGroups.push({
                beat: measureCursor.position,
                notes: currentGroup
            });
            measureCursor.advance(currentGroup[0].duration);
        }

        // Convert note groups to events
        noteGroups.forEach(group => {
            const noteBeat = currentBeat + group.beat;

            group.notes.forEach(note => {
                // Skip rests and notes without pitch
                if (note.isRest || !note.pitch) return;

                // Convert duration from divisions to quarter notes
                const durationBeats = note.duration / currentDivisions;

                // Convert pitch to note number or keep as string
                let pitch = note.pitch;
                try {
                    pitch = toNoteNumber(note.pitch);
                } catch (e) {
                    // Keep as string if conversion fails
                }

                // Calculate dynamic for this note (check if it's within a wedge)
                let noteDynamic = currentDynamic;

                for (const wedge of completedWedges) {
                    if (noteBeat >= wedge.startBeat && noteBeat <= wedge.endBeat) {
                        // Interpolate in dB space
                        const position = noteBeat - wedge.startBeat;
                        const duration = wedge.endBeat - wedge.startBeat;
                        const db = interpolateDb(wedge.startDb, wedge.endDb, position, duration);
                        noteDynamic = toGain(db);
                        break;
                    }
                }

                events.push([
                    noteBeat,
                    'note',
                    pitch,
                    noteDynamic,
                    durationBeats
                ]);
            });
        });

        // Advance to next measure
        const measureDuration = calculateMeasureDuration(measure, currentDivisions);
        currentBeat += measureDuration;
    });

    return { events, clefChanges };
}


/**
MeasureCursor
Tracks cursor position within a measure (in quarter note beats).
**/

class MeasureCursor {
    constructor(divisions) {
        this.divisions = divisions;
        this.position = 0; // In quarter note beats
    }

    advance(duration) {
        // Duration is in divisions, convert to quarter notes
        this.position += duration / this.divisions;
    }

    backup(duration) {
        this.position -= duration / this.divisions;
    }
}


/**
calculateMeasureDuration(measure, divisions)
Calculates the duration of a measure in quarter note beats.
**/

function calculateMeasureDuration(measure, divisions) {
    if (measure.time) {
        // Duration = beats * (4 / beat-type)
        // e.g., 3/4 time = 3 * (4/4) = 3 quarter notes
        // e.g., 6/8 time = 6 * (4/8) = 3 quarter notes
        return measure.time.beats * (4 / measure.time.beatType);
    }

    // Fallback: calculate from notes
    let maxDuration = 0;
    measure.notes.forEach(note => {
        if (!note.isChord) {
            maxDuration += note.duration;
        }
    });

    return maxDuration / divisions;
}


/**
calculateSectionDuration(measures, startNum, endNum)
Calculates total duration of a section in quarter note beats.
**/

function calculateSectionDuration(measures, startNum, endNum) {
    const sectionMeasures = measures.filter(m =>
        m.number >= startNum && m.number <= endNum
    );

    let totalDuration = 0;
    let currentDivisions = 1;

    sectionMeasures.forEach(measure => {
        if (measure.divisions !== undefined) {
            currentDivisions = measure.divisions;
        }
        totalDuration += calculateMeasureDuration(measure, currentDivisions);
    });

    return totalDuration;
}

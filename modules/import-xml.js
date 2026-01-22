
/**
importMusicXML(xmlString)
Converts MusicXML 4.0 to Sequence JSON.

Returns a Sequence instance with nested structure:
- Main sequence contains key/tempo/meter and schedules sections
- Section sequences schedule part sequences
- Part sequences contain note/chord events

Sections are detected from barline styles (double, heavy, repeat) and endings.
**/

import { toNoteNumber } from 'midi/note.js';
import Sequence from './sequence.js';
import parseXML, { getText, getAttr, getChild, getChildren, findDeep } from './import/parse-xml.js';
import extractSections from './import/section.js';
import convertToEvents from './import/convert.js';


export default function importMusicXML(xmlString) {
    // Parse XML and extract structure
    const doc = parseXML(xmlString);

    // Extract parts, measures, and timing
    const structure = extractStructure(doc);

    // Detect sections from barlines/repeats
    const sections = extractSections(structure);

    // Convert to nested sequence structure
    const sequence = buildSequence(structure, sections);

    return sequence;
}


/**
extractStructure(doc)
Extracts parts, measures, and timing from parsed XML document.
**/

function extractStructure(doc) {
    const scorePartwise = doc['score-partwise'];
    if (!scorePartwise) {
        throw new Error('Not a score-partwise MusicXML document');
    }

    // Get work title (try work-title first, then movement-title)
    let name;
    const workTitle = findDeep(doc, 'work-title');
    const movementTitle = findDeep(doc, 'movement-title');

    if (workTitle) {
        name = getText(workTitle).trim();
    } else if (movementTitle) {
        name = getText(movementTitle).trim();
    }

    // Extract part list
    const partListObj = getChild(scorePartwise, 'part-list');
    const scoreParts = getChildren(partListObj, 'score-part');
    const partList = scoreParts.map(scorePart => {
        const id = getAttr(scorePart, 'id');
        const partName = getChild(scorePart, 'part-name');
        return {
            id,
            name: partName ? getText(partName).trim() : id
        };
    });

    // Extract all parts with their measures
    const partObjs = getChildren(scorePartwise, 'part');
    const parts = partObjs.map(part => {
        const id = getAttr(part, 'id');
        const partInfo = partList.find(p => p.id === id);

        const measureObjs = getChildren(part, 'measure');
        const measures = measureObjs.map(measure => extractMeasure(measure));

        return {
            id,
            name: partInfo ? partInfo.name : id,
            measures
        };
    });

    return { name, parts };
}


/**
extractMeasure(measure)
Extracts all data from a single measure element.
**/

function extractMeasure(measure) {
    const number = getAttr(measure, 'number');

    // Extract attributes (divisions, key, time, clef)
    const attributes = getChild(measure, 'attributes');
    const divisionsObj = getChild(attributes, 'divisions');
    const divisions = divisionsObj ? parseFloat(getText(divisionsObj)) : undefined;

    const key = getChild(attributes, 'key');
    const keyData = key ? {
        fifths: parseInt(getText(getChild(key, 'fifths')) || '0'),
        mode: getText(getChild(key, 'mode')) || 'major'
    } : undefined;

    const time = getChild(attributes, 'time');
    const timeData = time ? {
        beats: parseInt(getText(getChild(time, 'beats')) || '4'),
        beatType: parseInt(getText(getChild(time, 'beat-type')) || '4')
    } : undefined;

    const clef = getChild(attributes, 'clef');
    const clefData = clef ? {
        sign: getText(getChild(clef, 'sign')),
        line: parseInt(getText(getChild(clef, 'line')) || '2')
    } : undefined;

    // Extract sound/tempo
    const sound = getChild(measure, 'sound');
    const tempo = sound ? parseFloat(getAttr(sound, 'tempo')) : undefined;

    // Extract barline
    const barline = getChild(measure, 'barline');
    const barlineData = barline ? {
        location: getAttr(barline, 'location') || 'right',
        style: getText(getChild(barline, 'bar-style')),
        repeat: getChild(barline, 'repeat') ? {
            direction: getAttr(getChild(barline, 'repeat'), 'direction')
        } : undefined,
        ending: getChild(barline, 'ending') ? {
            type: getAttr(getChild(barline, 'ending'), 'type'),
            number: getAttr(getChild(barline, 'ending'), 'number')
        } : undefined
    } : undefined;

    // Extract notes, chords (harmonies), dynamics, wedges
    const notes = getChildren(measure, 'note').map(note => extractNote(note));
    const harmonies = getChildren(measure, 'harmony').map(h => extractHarmony(h));
    const directions = getChildren(measure, 'direction').map(d => extractDirection(d)).filter(d => d);

    return {
        number: parseInt(number),
        divisions,
        key: keyData,
        time: timeData,
        clef: clefData,
        tempo,
        barline: barlineData,
        notes,
        harmonies,
        directions
    };
}


/**
extractNote(note)
Extracts note data including pitch, duration, and voice.
**/

function extractNote(note) {
    // Check for chord element (means this note is part of a chord with previous note)
    const isChord = !!getChild(note, 'chord');

    // Check for rest
    const rest = getChild(note, 'rest');
    const isRest = !!rest;

    // Extract pitch
    let pitch;
    if (!isRest) {
        const pitchEl = getChild(note, 'pitch');
        if (pitchEl) {
            const step = getText(getChild(pitchEl, 'step'));
            const alter = getText(getChild(pitchEl, 'alter'));
            const octave = getText(getChild(pitchEl, 'octave'));

            // Convert to pitch string like "C4", "C#4", "Db4"
            const alterSymbol = alter ? (parseInt(alter) > 0 ? '♯' : '♭').repeat(Math.abs(parseInt(alter))) : '';
            pitch = step + alterSymbol + octave;
        }
    }

    // Extract duration
    const duration = parseFloat(getText(getChild(note, 'duration')) || '0');

    // Extract voice
    const voice = getText(getChild(note, 'voice')) || '1';

    // Extract type and dots
    const type = getText(getChild(note, 'type'));
    const dots = getChildren(note, 'dot').length;

    return {
        isChord,
        isRest,
        pitch,
        duration,
        voice,
        type,
        dots
    };
}


/**
extractHarmony(harmony)
Extracts chord symbol data.
**/

function extractHarmony(harmony) {
    const root = getChild(harmony, 'root');
    const rootStep = getText(getChild(root, 'root-step'));
    const rootAlter = getText(getChild(root, 'root-alter'));

    const alterSymbol = rootAlter ? (parseInt(rootAlter) > 0 ? '♯' : '♭').repeat(Math.abs(parseInt(rootAlter))) : '';
    const rootName = rootStep + alterSymbol;

    const kind = getText(getChild(harmony, 'kind')) || 'major';

    // Map kind to Sequence chord extension
    const extensionMap = {
        'major': '',
        'minor': '-',
        'augmented': '+',
        'diminished': 'dim',
        'dominant': '7',
        'major-seventh': '∆',
        'minor-seventh': '-7',
        'diminished-seventh': 'dim7',
        'augmented-seventh': '+7',
        'half-diminished': 'ø'
    };
    const extension = extensionMap[kind] || '';

    // Extract bass if present (for slash chords)
    const bass = getChild(harmony, 'bass');
    const bassStep = getText(getChild(bass, 'bass-step'));
    const bassAlter = getText(getChild(bass, 'bass-alter'));
    const bassAlterSymbol = bassAlter ? (parseInt(bassAlter) > 0 ? '♯' : '♭').repeat(Math.abs(parseInt(bassAlter))) : '';
    const bassName = bassStep ? bassStep + bassAlterSymbol : undefined;

    return {
        root: rootName,
        extension,
        bass: bassName
    };
}


/**
extractDirection(direction)
Extracts dynamic markings and wedges from a direction element.
Returns object with type and data if found, null otherwise.
**/

function extractDirection(direction) {
    const directionType = getChild(direction, 'direction-type');
    if (!directionType) return null;

    // Check for dynamics marking
    const dynamics = getChild(directionType, 'dynamics');
    if (dynamics) {
        // Dynamics are represented as empty elements like <p/>, <f/>, <ff/>, etc.
        // In deno.land/x/xml parser, these appear as properties with null value
        const dynamicTags = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];

        for (const tag of dynamicTags) {
            if (dynamics.hasOwnProperty(tag)) {
                return { type: 'dynamic', marking: tag };
            }
        }
    }

    // Check for wedge (crescendo/diminuendo)
    const wedge = getChild(directionType, 'wedge');
    if (wedge) {
        const wedgeType = getAttr(wedge, 'type'); // "crescendo", "diminuendo", or "stop"
        return { type: 'wedge', wedgeType };
    }

    return null;
}


/**
buildSequence(structure, sections)
Builds nested Sequence instance from structure and section information.
**/

function buildSequence(structure, sections) {
    const { name, parts } = structure;

    // Convert sections and parts to events
    const { mainEvents, sequences } = convertToEvents(parts, sections);

    const data = {
        events: mainEvents
    };

    if (name) data.name = name;
    if (sequences.length > 0) data.sequences = sequences;

    return Sequence.from(data);
}

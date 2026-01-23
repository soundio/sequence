
/**
clefToName(clefData)
Convert MusicXML clef data (sign + line) to standard clef name.
**/

export function clefToName(clefData) {
    if (!clefData) return undefined;

    const { sign, line } = clefData;

    // G clef (treble family)
    if (sign === 'G') {
        if (line === 2) return 'treble';
        // G clef on other lines is rare, default to treble
        return 'treble';
    }

    // F clef (bass family)
    if (sign === 'F') {
        if (line === 4) return 'bass';
        if (line === 3) return 'baritone';
        if (line === 5) return 'subbass';
        return 'bass';
    }

    // C clef (alto/tenor family)
    if (sign === 'C') {
        if (line === 3) return 'alto';
        if (line === 4) return 'tenor';
        if (line === 1) return 'soprano';
        if (line === 2) return 'mezzo-soprano';
        return 'alto';
    }

    // Percussion
    if (sign === 'percussion') {
        return 'percussion';
    }

    // Tab
    if (sign === 'TAB') {
        return 'tab';
    }

    return undefined;
}

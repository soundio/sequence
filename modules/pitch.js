export const rflatsharp = /b|#/g;

const flatsharps = {
    'b': '♭',
    '#': '♯'
};

export function toUnicode(char) {
    return flatsharps[char];
}

/**
fifthsToKeyName(fifths)
Convert circle of fifths (-7 to 7) to key name.
**/

export function fifthsToKeyName(fifths) {
    const keys = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
    return keys[fifths + 7] || 'C';
}

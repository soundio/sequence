export const rflatsharp = /b|#/g;

const flatsharps = {
    'b': '♭',
    '#': '♯'
};

export function toUnicode(char) {
    return flatsharps[char];
}

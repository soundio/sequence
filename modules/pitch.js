export const rflatsharp = /b{1,2}|#{1,2}/g;

const flatsharps = {
    'b': '♭',
    '#': '♯',
    'bb': '𝄫',
    '##':  '𝄪'
};

export function toUnicode(char) {
    return flatsharps[char];
}

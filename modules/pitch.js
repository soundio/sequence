
export const rroot        = /^([A-G])(bb|𝄫|##|𝄪|[b#♭♯])?/u;
export const rpitch       = /^([A-G])(bb|𝄫|##|𝄪|[b#♭♯])?(-?\d)?$/u;
export const rpitches     = /([A-G])(bb|𝄫|##|𝄪|[b#♭♯])?(-?\d)?/gu;
export const rflat        = /b|♭/u;
export const rsharp       = /#|♯/u;
export const rdoubleflat  = /bb|𝄫/u;
export const rdoublesharp = /##|𝄪/u;
export const rflatsharp   = /bb|##|[𝄫𝄪b♭#♯]/gu;
export const raccidental  = /(♮)|(bb|𝄫)|(##|𝄪)|(b|♭)|(#|♯)/gu;


/**
normalisePitch(pitch)
**/

const rasciiflatsharp = /bb|##|[b#]/g;

const ascii = {
    'b':  '♭',
    '#':  '♯',
    'bb': '𝄫',
    '##': '𝄪'
};

function toUnicode(char) {
    return ascii[char] || char;
}

export function normalisePitch(pitch) {
    return typeof pitch === 'string' ?
        pitch.replaceAll(rasciiflatsharp, toUnicode) :
        pitch;
}

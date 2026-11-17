
import mod12        from './number/mod-12.js';
import fifths       from './transforms/fifths.js';
import { KEYNAMES } from './event/key.js';


/**
spell(number, key = 0)
spellRoot(number, key = 0)
Gets the note spelling for `number` in `key`, or if the note is not in `key`,
the nearest spelling to the dorian root of `key` along the line of fifths.

                D
         G             A

   C                         E


 F              ●              B


   B♭                        F♯

       E♭/D♯          C♯/D♭
              A♭/G♯

**/

function toRootFifth(number, key = 0) {
    // Dorian centre of key
    const dorian     = key + 2;
    // Circle of fifths representation of number
    const fifth      = fifths(number);
    const distance   = mod12(fifth - dorian + 6) - 6;
    // distance is now ±6 from dorian
    return dorian + distance;
}

export function spellRoot(number, key = 0) {
    const rootfifth = toRootFifth(number, key);
    return KEYNAMES[rootfifth];
}

export default function spell(number, key = 0) {
    const rootfifth = toRootFifth(number, key);
    // Count the accidentals
    const accidentals = Math.floor((rootfifth + 1) / 7);
    // Get octave number
    const octave = Math.floor((number - accidentals) / 12) - 1;
    // Return full spelling
    return KEYNAMES[rootfifth] + octave;
}

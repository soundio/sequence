
import mod12          from '../number/mod-12.js';
import * as HSID      from '../hsid.js';
import { CHORDNAMES } from '../event/chord.js';

/*
reflect(axis, n)

Reflects note `n` around `axis`, where `axis` is a root number in the range
`0-12`, step `0.5`. The classic reflection is the negative harmony transform,
`reflect(3.5, n)` in the key of C, which essentially means reflect all notes
over the axis that crosses between E♭ and E on a chromatic circle, or C and G on
a circle of 5ths.

Note that in the major scale the root of the dorian mode is on an axis that does
not change the key when used to reflect – the dorian mode (m6) is symmetrical up
or down from that root. In the melodic minor scale the 5th mode (7♭13) is
symmetrical, as is the whole tone (+7) scale.

              axis = 2

                 D           axis = 3.5
          A      |      G
                 |         ╱
     E           |      ╱    C
                 |   ╱
                 | ╱
  B –––––––––––– ● –––––––––––– F   axis = 5
               ╱ |
             ╱   |
   F♯/G♭  ╱      |           B♭
       ╱         |
          D♭     |      E♭
                 A♭

Talking in the key of C, axis 3.5 will reflect a tune into the key of E♭
(known as negative harmony) while axis 5 will sort of invert and tritone
substitute a G7 chord.
*/

export default function reflect(axis, n) {
    // Distance from axis in range 0-12
    const d = mod12(n - axis);
    // Reflect across near end of axis
    return d < 3 ? n - 2 * d :
        // Reflect across far end of axis
        d <= 9 ? n - 2 * (d - 6) :
        // Reflect across near end of axis
        n - 2 * (d - 12) ;
}

export const name = 'reflect';

export function apply(event, axis) {
    switch (event.type) {
        case 'key':
            // Reflect key's Dorian centre (k + 2) across 7 * axis on the circle of fifths,
            // wrapped into the standard -5..6 (F..F#) key number range
            event[2] = mod12(14 * axis - event[2] + 1) - 5;
            break;
        case 'note':
            if (event.isDrumNote) break;
            event[2] = reflect(axis, event[2]);
            break;
        case 'chord': {
            const root   = event[2];
            const source = HSID.toNumbers(event[3]);

            // Reflect root of chord
            event[2] = mod12(reflect(axis, root));
            if (!source.length) break;

            // Reflect HSID of chord
            const numbers = new Uint8Array(source.length);
            let n = source.length;
            while (--n) {
                numbers[n] = mod12(reflect(axis, source[n] + root) - event[2]);
            }
            numbers.sort();
            const hsid = HSID.from(numbers);

            // Sanity check, is new hsid in chord names?
            if (!(hsid in CHORDNAMES)) {
                console.warn(`Reflected chord ${ source.join(', ') } -> ${ numbers.join(', ') } (HSID ${ hsid }) not a known HSID for a chord name`);
            }

            event[3] = hsid;
            break;
        }
    }

    return event;
}

export const unapply = apply;

// Int8 name + Float16 axis. We could encode axis into UInt8 to save a byte.
// That would require some per-transform serialisation shenanigans.
export const BYTES = 3;

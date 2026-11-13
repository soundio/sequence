
import * as HSID from '../hsid.js';

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
     F♯   ╱      |           B♭
       ╱         |
          C♯     |       E♭
               G♯/A♭

Talking in the key of C, axis 3.5 will reflect a tune into the key of E♭
(known as negative harmony) while axis 5 will sort of invert and tritone
substitute a G7 chord.
*/

export default function reflect(a, n) {
    // Add 12 to keep number positive, subtract reflection axis so we are reflecting around 0
    const x = n + 12 - a;
    // Get the modulus in the range -3, 3
    let m = (x + 3) % 6 - 3;
    // Special case when n is 3 semitones from a, we need to decide direction
    if (m === -3) {
        // Are we at the far side of the circle from point that defines the axis?
        console.log("distance", Math.abs(n % 12 - a));
        if (Math.abs(n % 12 - a) === 9) m = 9;
    }

    // Get the whole number floor
    const b = 6 * Math.round(x / 6);
    // Add axis, floor, 12, invert m and subtract it
    return b + a - 12 - m;
}

export function apply(event, axis) {
    switch (event.type) {
        case 'key':
            // HMMM.. not straightforward, actually
            break;
        case 'note':
            if (!event.pitched) break;
            event[2] = reflect(axis, event[2]);
            break;
        case 'chord': {
            const numbers = HSID.toNumbers(event[3]);
            let n = numbers.length;
            while (n--) numbers[n] = reflect(axis, numbers[n] + event[2] + 12); // Add 12 to avoid negatives
            event[2] = numbers[0] % 12;
            n = numbers.length;
            while (n--) numbers[n] = (numbers[n] - numbers[0] + 12) % 12;

            // Sanity check
            if (max.apply(Math, numbers) > 11) throw new Error('Chord HSID numbers should not exceed 11');

            event[3] = HSID.from(numbers);
            break;
        }
    }

    return event;
}

export const unapply = apply;

// Int8 name Float16 axis. We could encode axis into UInt8 to save a byte. That
// would require some per-transform serialisation shenanigans.
export const BYTES = 3;

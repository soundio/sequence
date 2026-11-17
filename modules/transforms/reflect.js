
import mod12 from '../number/mod-12.js';

/*
reflect(axis, n)

Reflects note `n` around `axis`, where `axis` is a root number in the range
`0-12`, step `0.5`. The classic reflection is the negative harmony transform,
`reflect(3.5, n)` in the key of C, which essentially means reflect all notes
over the axis that crosses between E♭ and E on a chromatic circle, or C and G on
a circle of 5ths.

In the major scale the root of the dorian mode is on an axis that does not
change the key when used to reflect – the dorian mode (m6) is symmetrical up
or down. (In the melodic minor scale the 5th mode (7♭13) is symmetrical, as is
the whole tone (+7) scale.)

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

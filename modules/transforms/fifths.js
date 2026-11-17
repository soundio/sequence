
import mod12 from '../number/mod-12.js';


/**
fifths(n)
Transforms note numbers in the chromatic circle to numbers in the circle of
fifths and vice versa. This transform is an involution.


               D                                           D
     C♯/D♭            E♭/D♯                         G             A
               •                                           •
  C                         E                 C                         E
      •                 •                         •                 •

B              ●              F     <=>     F              ●              B

      •                 •                         •                 •
B♭/A♯                      F♯/G♭            B♭/A♯                      F♯/G♭
               •                                           •
       A               G                         E♭/D♯            C♯/D♭
             A♭/G♯                                        A♭/G♯


Note that 6 notes remain unchanged, the hexagon of a whole tone scale.
**/

export default function fifths(n) {
    return mod12(7 * n);
}

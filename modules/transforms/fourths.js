
import mod12 from '../number/mod-12.js';


/**
fourths(n)
Transforms note numbers in the chromatic circle to numbers in the circle of
fourths and vice versa. This transform is an involution.


               D                                         B♭/A♯
     C♯/D♭            E♭/D♯                         F            E♭/D♯
                     •                                          •
  C                         E                 C                        A♭/G♯
      •                                           •

B              ●              F     <=>     G              ●             C♯/D♭

                        •                                           •
B♭/A♯                      F♯/G♭               D                       F♯/G♭
         •                                            •
       A               G                            A             B
             A♭/G♯                                         E


Note that 4 notes remain unchanged, the square of a diminished tetrad.
**/

export function fourths(n) {
    return mod12(5 * n);
}



import mod12 from '../number/mod-12.js';


/**
invert(n)
Inverts note numbers round the chromatic circle. This transform is an involution.


               D                                           B♭
        C♯            E♭                            B             A

  C                         E                 C                        A♭/G♯
      •                                           •

B              ●              F     <=>     C♯             ●              G

                        •                                           •
  B♭                        F♯                D                         F♯

       A               G                           E♭             F
             A♭/G♯                                         E


This is the same operation as `reflect(0, n)` or indeed `fifths(fourths(n))`
or `fourths(fifths(n))`. In fact, combining any 2 of these three transforms
always produces the third, and combining all three is the same as the identity
(no change) transform.
**/

export function invert(n) {
    return mod12(11 * n);
}

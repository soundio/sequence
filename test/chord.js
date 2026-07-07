
import run   from 'fn/test.js';
import { CHORDNUMBERS, CHORDNAMES, getChordOf } from '../modules/event/chord.js';

run('Chord maps have same number of entries', [Object.keys(CHORDNUMBERS).length], (test, done) => {
    test(Object.keys(CHORDNUMBERS).length);
    done();
});

run('getChordOf(), getChordFrom()', [
    undefined,
    '+',
    '+',
    'sus',
    'sus',
    '',
    '',
    '',
    '-',
    '-',
    '°',
    '°',
    '/{4}',
    '/{4}',
    '/{7}',
    '/{7}',
    '/{8}',
    '/{11}',
    '/{1}',
    '-/{3}',
    '-/{3}',
    '-/{7}',
    '-/{7}',
    '7/{4}',
    '7/{7}',
    '7/{7}',
    '∆♯11',
    '∆♯11',
    '∆♯11',
    '∆',
    '∆',
    '∆6',
    '∆6/9',
    '7',
    '7',
    '13',
    '13',
    '7sus',
    '7sus',
    '7sus',
    '7sus',
    '13sus',
    '-7',
    '-7',
    '-7',
    '-6',
    '-11',
//    '-11',
    '-♭6',
    'sus♭9',
    'sus♭9',
    '7sus♭9',
    '7sus♭9',
    '-♭9',
    'ø',
    '7♯11',
    '7♯11',
    '7♯11',
    '7♯11',
    '7♯11',
    '7♯11',
    '-∆',
    '-∆',
    '7♭13',
    '7♭13',
    '7♭13',
    '13sus♭9',
    '13sus♭9',
    'ø9',
    '∆♯4♯5',
    '∆♯4♯5',
    '∆♯4♯5',
    '7alt',
    '7alt',
    '7alt',
    '7alt',
    '7alt',
    '7alt',
    '7alt',
    '7alt',
    '-∆♭6',
    '7♭9♭13',
    '7♭9♭13',
    '7♭9♭13',
    '∆♭6',
    '∆♭6',
    '7♯9',
    '7♯9',
    '7♯9',
    '7♭9',
    '7♭9',
    '13♭9',
    '13♭9',
    '°7',
    '°7',
    '°7',
    '°7',
    '°7',
    '°7',
    '+7'
], (test, done) => {
    test(getChordOf(0, 4));                     // undefined
    test(getChordOf(0, 4, 8));                  // +
    test(getChordOf(0, 2, 4, 8));               // +
    test(getChordOf(0, 5, 7));                  // sus
    test(getChordOf(0, 2, 5, 7));               // sus
    test(getChordOf(0, 4, 7));                  //
    test(getChordOf(0, 2, 4));                  //
    test(getChordOf(0, 2, 4, 7));               //
    test(getChordOf(0, 3, 7));                  // -
    test(getChordOf(0, 2, 3, 7));               // -
    test(getChordOf(0, 3, 6));                  // °
    test(getChordOf(0, 2, 3, 6));               // °
    test(getChordOf(0, 3, 8));                  // C/E   1st inversion
    test(getChordOf(0, 3, 8, 10));              // C/E   1st inversion
    test(getChordOf(0, 5, 9));                  // C/G   2nd inversion
    test(getChordOf(0, 5, 7, 9));               // C/G   2nd inversion
    test(getChordOf(0, 4, 8, 11));              // C/Ab
    test(getChordOf(0, 1, 5, 8));               // C/B
    test(getChordOf(0, 3, 6, 11));              // C/Db
    test(getChordOf(0, 4, 9));                  // C-/Eb 1st inversion
    test(getChordOf(0, 4, 9, 11));              // C-/Eb 1st inversion
    test(getChordOf(0, 5, 8));                  // C-/G  2nd inversion
    test(getChordOf(0, 5, 7, 8));               // C-/G  2nd inversion
    test(getChordOf(0, 6, 8, 10));              // C7/E
    test(getChordOf(0, 3, 5));                  // C7/G
    test(getChordOf(0, 3, 9));                  // C7/G
    test(getChordOf(0, 9, 14, 18));             // ∆♯11
    test(getChordOf(0, 2, 6, 7));               // ∆♯11
    test(getChordOf(0, 2, 4, 6));               // ∆♯11  HMMM. TRICKY
    test(getChordOf(0, 4, 7, 11));              // ∆
    test(getChordOf(0, 2, 7, 11));              // ∆
    test(getChordOf(0, 4, 7, 9));               // ∆6
    test(getChordOf(0, 4, 7, 9, 14));           // ∆6/9
    test(getChordOf(0, 4, 10));                 // 7
    test(getChordOf(0, 4, 7, 10));              // 7
    test(getChordOf(0, 10, 16, 21));            // 13
    test(getChordOf(0, 10, 14, 16, 21));        // 13
    test(getChordOf(0, 5, 7, 10));              // 7sus
    test(getChordOf(0, 2, 5, 10));              // 7sus
    test(getChordOf(0, 2, 5, 7, 10));           // 7sus
    test(getChordOf(0, 2, 7, 10));              // 7sus
    test(getChordOf(0, 2, 9, 10));              // 13sus
    test(getChordOf(0, 3, 7, 10));              // -7
    test(getChordOf(0, 2, 3, 7, 10));           // -7
    test(getChordOf(0, 3, 5, 7, 10));           // -7
    test(getChordOf(0, 3, 7, 9));               // -6
    test(getChordOf(0, 3, 5, 10));              // -11
//    test(getChordOf(0, 3, 5, 7));               // -11
    test(getChordOf(0, 3, 7, 8));               // -♭6
    test(getChordOf(0, 1, 5, 7));               // sus♭9
    test(getChordOf(0, 1, 5));                  // sus♭9
    test(getChordOf(0, 1, 5, 7, 10));           // 7sus♭9
    test(getChordOf(0, 1, 5, 10));              // 7sus♭9
    test(getChordOf(0, 1, 3, 5, 7, 8, 10));     // -♭9    DODGY. NOT REALLY A THING?
    test(getChordOf(0, 3, 6, 10));              // ø
    test(getChordOf(0, 6, 7, 10));              // 7♯11
    test(getChordOf(0, 6, 9, 10));              // 7♯11
    test(getChordOf(0, 4, 6, 10));              // 7♯11
    test(getChordOf(0, 2, 6, 9, 10));           // 7♯11
    test(getChordOf(0, 4, 6, 7, 10));           // 7♯11
    test(getChordOf(0, 2, 4, 6, 7, 10));        // 7♯11
    test(getChordOf(0, 3, 7, 11));              // -∆
    test(getChordOf(0, 3, 9, 11));              // -∆
    test(getChordOf(0, 4, 8, 10));              // 7♭13
    test(getChordOf(0, 2, 8, 10));              // 7♭13
    test(getChordOf(0, 2, 4, 8, 10));           // 7♭13
    test(getChordOf(0, 1, 5, 9, 10));           // 13sus♭9
    test(getChordOf(0, 1, 5, 9));               // 13sus♭9
    test(getChordOf(0, 2, 3, 6, 10));           // ø9
    test(getChordOf(0, 4, 6, 8, 11));           // ∆♯4♯5  I DO WONDER IF THESE SHOULD BE E/C
    test(getChordOf(0, 4, 6, 8, 9, 11));        // ∆♯4♯5  I DO WONDER IF THESE SHOULD BE E/C
    test(getChordOf(0, 2, 4, 6, 8, 9, 11));     // ∆♯4♯5
    test(getChordOf(0, 1, 4, 8));               // 7alt
    test(getChordOf(0, 3, 4, 8));               // 7alt
    test(getChordOf(0, 1, 4, 8, 10));           // 7alt
    test(getChordOf(0, 1, 6, 10));              // 7alt   F# triad / C
    test(getChordOf(0, 3, 4, 8, 10));           // 7alt
    test(getChordOf(0, 3, 4, 6, 8, 10));        // 7alt
    test(getChordOf(0, 1, 3, 4, 8, 10));        // 7alt
    test(getChordOf(0, 1, 3, 4, 6, 8, 10));     // 7alt
    test(getChordOf(0, 3, 7, 8, 11));           // -∆♭6
    test(getChordOf(0, 1, 4, 5, 7, 8, 10));     // 7♭9♭13
    test(getChordOf(0, 1, 4, 5, 8, 10));        // 7♭9♭13
    test(getChordOf(0, 1, 4, 7, 8, 10));        // 7♭9♭13
    test(getChordOf(0, 2, 4, 7, 8, 11));        // ∆♭6
    test(getChordOf(0, 4, 7, 8, 11));           // ∆♭6
    test(getChordOf(0, 3, 4, 10));              // 7♯9
    test(getChordOf(0, 3, 4, 7, 10));           // 7♯9
    test(getChordOf(0, 3, 4, 7, 9, 10));        // 7♯9
    test(getChordOf(0, 1, 3, 4, 6, 7, 10));     // 7♭9
    test(getChordOf(0, 1, 4, 7, 10));           // 7♭9
    test(getChordOf(0, 1, 4, 7, 9, 10));        // 13♭9
    test(getChordOf(0, 1, 4, 9, 10));           // 13♭9
    test(getChordOf(0, 3, 6, 9));               // °7
    test(getChordOf(0, 2, 3, 6, 9));            // °7
    test(getChordOf(0, 3, 5, 6, 9));            // °7
    test(getChordOf(0, 3, 6, 8, 9));            // °7
    test(getChordOf(0, 3, 6, 9, 11));           // °7
    test(getChordOf(0, 2, 3, 5, 6, 8, 9, 11));  // °7
    test(getChordOf(0, 4, 6, 8));               // +7  // POSSIBLE 7alt
    /**/
    done();
});

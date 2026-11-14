import toGain     from 'fn/to-gain.js';
import parseValue from 'fn/parse-value.js';

/**

MIDI velocities are converted to gain using the GM2 square law, which produces
the scale:

dB      Velocity
----------------
 0      127
-1.5    116
-3      107
-4.5    98
-6      90
-9      76
-12     64
-15     54
-18     45
-21     38
-24     32
-27	    27
-30     23
-33     19
-36     16

**/

const dynamics = {
    // Arbitrary map
    'fff': toGain(-2.5),
    'ff':  toGain(-7),
    'f':   toGain(-11.5),
    'mf':  toGain(-16),
    'mp':  toGain(-20.5),
    'p':   toGain(-25),
    'pp':  toGain(-29.5),
    'ppp': toGain(-34)
};

export default parseValue({
    '': parseFloat,
    db: toGain,
    dB: toGain,
    catch: (string) => {
        if (!dynamics[string]) throw new Error('Sequence: dynamic "' + string + '" not recognised');
        return dynamics[string];
    }
});

import toGain     from 'fn/to-gain.js';
import parseValue from 'fn/parse-value.js';

const dynamics = {
    // Arbitrary map
    'fff': toGain(-4.5),
    'ff':  toGain(-9),
    'f':   toGain(-13.5),
    'mf':  toGain(-18),
    'mp':  toGain(-22.5),
    'p':   toGain(-27),
    'pp':  toGain(-31.5),
    'ppp': toGain(-36)
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

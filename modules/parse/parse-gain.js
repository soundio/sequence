import toGain     from 'fn/to-gain.js';
import parseValue from 'fn/parse-value.js';

const dynamics = {
    'fff': toGain(-5),
    'ff':  toGain(-10),
    'f':   toGain(-15),
    'mf':  toGain(-20),
    'mp':  toGain(-25),
    'p':   toGain(-30),
    'pp':  toGain(-35),
    'ppp': toGain(-40)
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

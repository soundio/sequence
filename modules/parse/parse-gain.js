import toGain     from 'fn/to-gain.js';
import parseValue from 'fn/parse-value.js';

export default parseValue({
    '':   parseFloat,
    'db': toGain,
    'dB': toGain
});

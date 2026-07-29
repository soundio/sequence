
import Transform      from './transform/transform.js';
import * as displace  from './transform/displace.js';
import * as rate      from './transform/rate.js';
import * as transpose from './transform/transpose.js';
import * as gain      from './transform/gain.js';
import * as swing     from './transform/swing.js';

Transform.register(displace);
Transform.register(rate);
Transform.register(transpose);
Transform.register(gain);
Transform.register(swing);

export default Transform;




/**
toTransformName(value)
Converts a transform name or number to a transform name string.
**/
export function toTransformName(value) {
    if (typeof value === 'string' && value in TRANSFORMNUMBERS) return value;
    if (typeof value === 'number' && value in TRANSFORMNAMES) return TRANSFORMNAMES[value];
    throw new Error(`Transform "${ value }" not recognised`);
}


export function transform(transforms, event) {
    let n = -1, type;
    while (type = transforms[++n]) n = types[type](transforms, n, event);
    return event;
}

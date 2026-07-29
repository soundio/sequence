
import Transform      from './transform/transform.js';
import * as displace  from './transform/displace.js';
import * as rate      from './transform/rate.js';
import * as transpose from './transform/transpose.js';
import * as gain      from './transform/gain.js';
import * as swing     from './transform/swing.js';

// The order of these matters to the serialiser as they are assigned ascending
// ids. Do not change the order without changing the serialiser VERSION and
// providing an updater.
Transform.register(displace);
Transform.register(rate);
Transform.register(transpose);
Transform.register(gain);
Transform.register(swing);

export default Transform;

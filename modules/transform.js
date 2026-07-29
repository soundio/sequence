
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

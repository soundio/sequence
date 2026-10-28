/**
Transform()
A bidirectional mutable event transform pipe.
**/

/**
Transform.of(name, parameter...)
Returns transform of any number of `name, parameter` instructions.
**/

/**
Transform.from(instructions, index)
Returns transform of a numeric `instructions` array starting at `index` (or `0`).
**/

/**
Transform.register(module)
Registers a transform module (registration order defines the assigned `id` –
order must be strictly preserved to maintain backwards compatibility with
serialised data).

Registered modules must export:

```
{
  name                       // String identifier
  apply(object, params...)   // Forward transform function
  unapply(object, params...) // Inverse transform function
  BYTES                      // Number of bytes occupied in binary format
}
```
**/

/**
Transform.identity
The identity transform, returns objects unaltered.
**/

/**
.apply(object),
.unapply(object)
Iterates through transform instructions, applying or unapplying them to `object`.
**/


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

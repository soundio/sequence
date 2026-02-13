
import Sequence from '../modules/sequence.js';
import { VERSION } from '../modules/events/serialise.js';

// Simple validation tests - just check the structure is correct
const sequence = new Sequence([
    [0, 'note', 69, 0.8, 2],
    [2, 'note', 72, 0.6, 1.5]
]);

const json = sequence.toJSON();

// Test version
console.assert(json.version === VERSION, 'Version should match');

// Test events is Uint8Array
console.assert(json.events instanceof Uint8Array, 'Events should be Uint8Array');

// Test events has data
console.assert(json.events.length > 0, 'Events should have data');

console.log('✔ Passed - Sequence serialisation tests');

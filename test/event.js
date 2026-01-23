
import run   from 'fn/test.js';
import Event from '../modules/event.js';


run('Event()', [
    [0, "note", 60, 0.1, 1],
    '[0,"note",60,0.1,1]'
], (test, done) => {
    // Test
    test(Event.of(0, 'note', 'C4', 0.1, 1));
    // Test JSON
    test(JSON.stringify(Event.of(0, 'note', 'C4', 0.1, 1)));

    done();
});

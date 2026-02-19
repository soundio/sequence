
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

run('Event(0, "key", n)', [
    [0, "key", -15],
    [0, "key", -14],
    [0, "key", -13],
    [0, "key", -12],
    [0, "key", -11],
    [0, "key", -10],
    [0, "key", -9],
    [0, "key", -8],
    [0, "key", -7],
    [0, "key", -6],
    [0, "key", -5],
    [0, "key", -4],
    [0, "key", -3],
    [0, "key", -2],
    [0, "key", -1],
    [0, "key", 0],
    [0, "key", 1],
    [0, "key", 2],
    [0, "key", 3],
    [0, "key", 4],
    [0, "key", 5],
    [0, "key", 6],
    [0, "key", 7],
    [0, "key", 8],
    [0, "key", 9],
    [0, "key", 10],
    [0, "key", 11],
    [0, "key", 12],
    [0, "key", 13],
    [0, "key", 14],
    [0, "key", 15],
    [0, "key", 16],
    [0, "key", 17],
    [0, "key", 18],
    [0, "key", 19]
], (test, done) => {
    test(Event.of(0, "key", "F𝄫"));
    test(Event.of(0, "key", "C𝄫"));
    test(Event.of(0, "key", "G𝄫"));
    test(Event.of(0, "key", "D𝄫"));
    test(Event.of(0, "key", "A𝄫"));
    test(Event.of(0, "key", "E𝄫"));
    test(Event.of(0, "key", "B𝄫"));
    test(Event.of(0, "key", "F♭"));
    test(Event.of(0, "key", "C♭"));
    test(Event.of(0, "key", "G♭"));
    test(Event.of(0, "key", "D♭"));
    test(Event.of(0, "key", "A♭"));
    test(Event.of(0, "key", "E♭"));
    test(Event.of(0, "key", "B♭"));
    test(Event.of(0, "key", "F"));
    test(Event.of(0, "key", "C"));
    test(Event.of(0, "key", "G"));
    test(Event.of(0, "key", "D"));
    test(Event.of(0, "key", "A"));
    test(Event.of(0, "key", "E"));
    test(Event.of(0, "key", "B"));
    test(Event.of(0, "key", "F♯"));
    test(Event.of(0, "key", "C♯"));
    test(Event.of(0, "key", "G♯"));
    test(Event.of(0, "key", "D♯"));
    test(Event.of(0, "key", "A♯"));
    test(Event.of(0, "key", "E♯"));
    test(Event.of(0, "key", "B♯"));
    test(Event.of(0, "key", "F𝄪"));
    test(Event.of(0, "key", "C𝄪"));
    test(Event.of(0, "key", "G𝄪"));
    test(Event.of(0, "key", "D𝄪"));
    test(Event.of(0, "key", "A𝄪"));
    test(Event.of(0, "key", "E𝄪"));
    test(Event.of(0, "key", "B𝄪"));
    done();
});
